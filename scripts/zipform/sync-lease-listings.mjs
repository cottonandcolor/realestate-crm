/**
 * Convert ZipForm scrape → CRM lease listings JSON.
 *
 *   node scripts/zipform/sync-lease-listings.mjs
 *
 * Reads .zipform/leases.json, writes public/data/zipform-leases.json
 */
import fs from "fs";
import path from "path";

const INPUT = path.join(process.cwd(), ".zipform", "leases.json");
const OUTPUT = path.join(process.cwd(), "public", "data", "zipform-leases.json");

function parseAddress(full) {
  const trimmed = (full || "").trim();
  const match = trimmed.match(/^(.+),\s*(.+?)\s+([A-Z]{2})$/);
  if (match) return { address: match[1].trim(), city: match[2].trim() };
  const comma = trimmed.lastIndexOf(",");
  if (comma > 0) {
    return {
      address: trimmed.slice(0, comma).trim(),
      city: trimmed.slice(comma + 1).trim(),
    };
  }
  return { address: trimmed, city: "" };
}

function parseDate(value) {
  const s = (value || "").trim();
  if (!s || /^tbd$/i.test(s)) return "";
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseContacts(...parts) {
  return parts
    .join(",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function leaseType(txType) {
  if (/lease-listing/i.test(txType || "")) return "landlord";
  if (/lease/i.test(txType || "")) return "tenant-rep";
  return "landlord";
}

if (!fs.existsSync(INPUT)) {
  console.error(`Missing ${INPUT} — run: npm run zipform:scrape`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const leases = (payload.rows || [])
  .filter((tx) => /lease/i.test(tx.transaction_type || tx.transaction_name || ""))
  .map((tx) => {
    const { address, city } = parseAddress(tx.property_address || tx.transaction_name);
    const id = tx.transaction_id ? `zipform-${tx.transaction_id}` : `zipform-${(tx.transaction_name || address).replace(/\W+/g, "-").toLowerCase()}`;
    return {
      id,
      ref_number: tx.transaction_id || "",
      address: address || tx.transaction_name || "",
      city,
      leaseStart: parseDate(tx.lease_start_date),
      leaseEnd: parseDate(tx.lease_end_date),
      contacts: parseContacts(tx.seller_landlord, tx.buyer_tenant),
      type: leaseType(tx.transaction_type),
      status: tx.status || "",
      monthly_rent: tx.monthly_rent || "",
      transaction_name: tx.transaction_name || "",
      transaction_type: tx.transaction_type || "",
    };
  });

const out = {
  scraped_at: payload.scraped_at,
  source: "zipform",
  row_count: leases.length,
  rows: leases,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
console.log(`✓ ${leases.length} lease listings → ${OUTPUT}`);
