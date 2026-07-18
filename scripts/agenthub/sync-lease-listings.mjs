/**
 * Convert Agent Hub transactions → lease listings JSON for the CRM.
 *
 *   node scripts/agenthub/sync-lease-listings.mjs
 *
 * Reads .agenthub/transactions.json, writes public/data/agenthub-leases.json
 */
import fs from "fs";
import path from "path";

const INPUT = path.join(process.cwd(), ".agenthub", "transactions.json");
const OUTPUT = path.join(process.cwd(), "public", "data", "agenthub-leases.json");

function parseAddress(full) {
  const trimmed = full.trim();
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
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseContacts(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

if (!fs.existsSync(INPUT)) {
  console.error(`Missing ${INPUT} — run: npm run agenthub:scrape`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const leases = payload.rows
  .filter((tx) => /lease/i.test(tx.transaction_type))
  .map((tx) => {
    const { address, city } = parseAddress(tx.property_address);
    return {
      id: `agenthub-${tx.ref_number}`,
      ref_number: tx.ref_number,
      address,
      city,
      leaseStart: parseDate(tx.lease_start_date),
      leaseEnd: parseDate(tx.lease_end_date),
      contacts: parseContacts(tx.landlord_name),
      type: "landlord",
      status: tx.status,
      monthly_rent: tx.monthly_rent,
      detail_url: tx.detail_url,
    };
  });

const out = {
  scraped_at: payload.scraped_at,
  source: "agenthub",
  row_count: leases.length,
  rows: leases,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
console.log(`✓ ${leases.length} lease listings → ${OUTPUT}`);
