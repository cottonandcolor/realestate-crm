import type { ListingImportAdapter, NormalizedListing } from "./types";

/**
 * MLS / RESO webhook adapter — extend when broker API credentials are available.
 * Expects RESO-style JSON array or single property object.
 */
export const mlsListingAdapter: ListingImportAdapter = {
  source: "mls",

  parse(input: unknown): NormalizedListing[] {
    const payload = typeof input === "string" ? JSON.parse(input) : input;
    const items = Array.isArray(payload) ? payload : [payload];

    return items.map((item: Record<string, unknown>) => {
      const listingId = String(
        item.ListingId ?? item.listing_id ?? item.id ?? crypto.randomUUID()
      );
      const unparsed = (item.ListPrice ?? item.price ?? item.price_cents) as
        | number
        | string
        | undefined;
      let priceCents: number | undefined;
      let priceDisplay: string | undefined;

      if (typeof unparsed === "number") {
        priceCents = Math.round(unparsed * 100);
        priceDisplay = `$${unparsed.toLocaleString()}`;
      } else if (typeof unparsed === "string") {
        priceDisplay = unparsed;
        const num = parseFloat(unparsed.replace(/[^0-9.]/g, ""));
        if (!Number.isNaN(num)) priceCents = Math.round(num * 100);
      }

      const addressParts = [
        item.StreetNumber,
        item.StreetName,
        item.City,
        item.StateOrProvince,
        item.PostalCode,
      ].filter(Boolean);

      return {
        title: String(
          item.UnparsedAddress ??
            item.title ??
            addressParts.join(" ") ??
            `Listing ${listingId}`
        ),
        address: addressParts.length ? addressParts.join(" ") : undefined,
        price_display: priceDisplay,
        price_cents: priceCents,
        status: mapMlsStatus(item.StandardStatus ?? item.status),
        image_url: extractPhoto(item),
        external_source: "mls",
        external_id: listingId,
        metadata: item,
      };
    });
  },
};

function mapMlsStatus(
  status: unknown
): NormalizedListing["status"] {
  const s = String(status ?? "active").toLowerCase();
  if (s.includes("pending")) return "pending";
  if (s.includes("sold") || s.includes("closed")) return "sold";
  if (s.includes("withdraw") || s.includes("off")) return "off_market";
  return "active";
}

function extractPhoto(item: Record<string, unknown>): string | undefined {
  const media = item.Media as Array<{ MediaURL?: string }> | undefined;
  if (media?.[0]?.MediaURL) return media[0].MediaURL;
  if (typeof item.image_url === "string") return item.image_url;
  return undefined;
}
