/**
 * Convert the complete ZipForm Active + Closed transaction roster into
 * CRM Listings JSON.
 *
 *   node scripts/zipform/sync-listings.mjs
 */
import fs from "fs";
import path from "path";

const INPUT = path.join(process.cwd(), ".zipform", "listings.json");
const OUTPUT = path.join(process.cwd(), "public", "data", "zipform-listings.json");

function propertyType(transactionType) {
  const value = String(transactionType || "").toLowerCase();
  if (/vacant land|farm|ranch|\bland\b/.test(value)) return "land";
  if (/commercial/.test(value)) return "commercial";
  if (/condominium|condo/.test(value)) return "condo";
  if (/townhome|townhouse/.test(value)) return "townhome";
  if (/lease-listing/.test(value)) return "lease";
  if (/\blease\b/.test(value)) return "rental";
  return "sfh";
}

function listingStatus(status) {
  return /^closed$/i.test(String(status || "")) ? "sold" : "active";
}

if (!fs.existsSync(INPUT)) {
  console.error(`Missing ${INPUT} — run: npm run zipform:scrape -- --all-transactions`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const syncedAt = payload.scraped_at || new Date().toISOString();
const rows = (payload.rows || []).map((transaction) => {
  const transactionId =
    transaction.transaction_id ||
    String(transaction.transaction_name || "transaction")
      .toLowerCase()
      .replace(/\W+/g, "-");
  const rawAddress = String(transaction.property_address || "").trim();

  return {
    id: `zipform-transaction-${transactionId}`,
    org_id: "",
    title: transaction.transaction_name || rawAddress || `Transaction ${transactionId}`,
    address: rawAddress && !/^no address$/i.test(rawAddress) ? rawAddress : null,
    price_display: null,
    price_cents: null,
    status: listingStatus(transaction.status),
    property_type: propertyType(transaction.transaction_type),
    image_url: null,
    external_source: "zipform-transactions",
    external_id: String(transactionId),
    metadata: {
      zipform_status: transaction.status || "",
      transaction_type: transaction.transaction_type || "",
      seller_landlord: transaction.seller_landlord || "",
      buyer_tenant: transaction.buyer_tenant || "",
      created: transaction.created || "",
      retention_date: transaction.retention_date || "",
    },
    created_at: syncedAt,
    updated_at: syncedAt,
  };
});

const output = {
  scraped_at: syncedAt,
  source: "zipform-transactions",
  row_count: rows.length,
  rows,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
console.log(`✓ ${rows.length} ZipForm transactions → ${OUTPUT}`);
