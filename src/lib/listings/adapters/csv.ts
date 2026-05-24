import type { ListingImportAdapter, NormalizedListing, PropertyType } from "./types";
import { PROPERTY_TYPES } from "./types";

function parsePropertyType(raw: string): PropertyType | undefined {
  const s = raw.toLowerCase().trim().replace(/[\s-]/g, "");
  const aliases: Record<string, PropertyType> = {
    sfh: "sfh", singlefamily: "sfh", singlefamilyhome: "sfh", house: "sfh",
    condo: "condo", condominium: "condo",
    townhome: "townhome", townhouse: "townhome",
    land: "land", lot: "land",
    lease: "lease",
    rental: "rental", rent: "rental",
  };
  if (aliases[s]) return aliases[s];
  if (PROPERTY_TYPES.includes(s as PropertyType)) return s as PropertyType;
  return undefined;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function slugId(parts: string[]): string {
  return parts.filter(Boolean).join("-").toLowerCase().replace(/\s+/g, "-").slice(0, 120) || crypto.randomUUID();
}

export const csvListingAdapter: ListingImportAdapter = {
  source: "csv",

  parse(input: string): NormalizedListing[] {
    const text = typeof input === "string" ? input : String(input);
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const listings: NormalizedListing[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? "";
      });

      const title = row.title || row.name || row.property || "Untitled Listing";
      const address = row.address || row.street || "";
      const priceDisplay = row.price || row.price_display || row.rent || "";
      const priceRaw = row.price_cents || row.price_amount || "";
      const priceCents = priceRaw ? Math.round(parseFloat(priceRaw.replace(/[^0-9.]/g, "")) * 100) : undefined;
      const externalId = row.external_id || row.mls_id || row.id || slugId([title, address]);
      const imageUrl = row.image_url || row.photo || row.image || undefined;
      const statusRaw = (row.status || "active").toLowerCase();
      const status = ["active", "pending", "sold", "off_market"].includes(statusRaw)
        ? (statusRaw as NormalizedListing["status"])
        : "active";
      const propertyType = parsePropertyType(
        row.property_type || row.type || row.property_category || ""
      );

      listings.push({
        title,
        address: address || undefined,
        price_display: priceDisplay || undefined,
        price_cents: priceCents,
        status,
        property_type: propertyType,
        image_url: imageUrl,
        external_source: "csv",
        external_id: externalId,
        metadata: row,
      });
    }

    return listings;
  },
};
