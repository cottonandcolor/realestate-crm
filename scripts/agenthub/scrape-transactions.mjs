/**
 * Scrape Agent Hub transactions using a saved session.
 * Visits each transaction detail page for lease fields.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/agenthub/scrape-transactions.mjs
 *
 * Requires scripts/agenthub/login.mjs first.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const TRANSACTIONS_URL = "https://www.fullcircle-agenthub.com/backoffice/transactions";
const SESSION_FILE = path.join(process.cwd(), ".agenthub", "session.json");
const OUTPUT_DIR = path.join(process.cwd(), ".agenthub");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "transactions.json");
const OUTPUT_CSV = path.join(OUTPUT_DIR, "transactions.csv");

const CSV_FIELDS = [
  "ref_number",
  "property_address",
  "lease_start_date",
  "lease_end_date",
  "landlord_name",
  "transaction_type",
  "status",
  "close_date",
  "monthly_rent",
  "detail_url",
];

if (!fs.existsSync(SESSION_FILE)) {
  console.error(`No session found at ${SESSION_FILE}`);
  console.error("Run first: PLAYWRIGHT_BROWSERS_PATH=0 node scripts/agenthub/login.mjs");
  process.exit(1);
}

function toCsv(rows) {
  if (!rows.length) return "";
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    CSV_FIELDS.join(","),
    ...rows.map((r) => CSV_FIELDS.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

/** @param {import('playwright').Page} page */
async function scrapeListRows(page) {
  return page.evaluate(() => {
    const table = document.querySelector("table");
    if (!table) return [];

    return [...table.querySelectorAll("tbody tr")].map((tr, index) => {
      const cells = [...tr.querySelectorAll("td")];
      const ref = cells[0]?.textContent?.trim() || "";

      const propCell = cells[1];
      const street =
        propCell?.querySelector("p.font-medium")?.getAttribute("title") ||
        propCell?.querySelector("p")?.textContent?.trim() ||
        "";
      const city =
        propCell?.querySelector("p.text-sm")?.getAttribute("title") ||
        propCell?.querySelectorAll("p")[1]?.textContent?.trim() ||
        "";
      const property_address = [street, city].filter(Boolean).join(", ");

      const transaction_type = cells[2]?.textContent?.trim() || "";
      const buyer_seller = cells[3]?.textContent?.trim() || "";
      const landlord_name = buyer_seller.startsWith("Landlord:")
        ? buyer_seller.replace(/^Landlord:\s*/, "").trim()
        : "";

      return {
        index,
        ref_number: ref,
        property_address,
        transaction_type,
        landlord_name,
        buyer_seller,
        monthly_rent: cells[4]?.textContent?.trim() || "",
        close_date: cells[6]?.textContent?.trim() || "",
        status: cells[7]?.textContent?.trim() || "",
      };
    });
  });
}

/** @param {import('playwright').Page} page */
async function scrapeDetailPage(page) {
  return page.evaluate(() => {
    const fields = {};
    const labelEls = document.querySelectorAll(
      '[class*="tracking-widest"][class*="text-brand-gray-400"]',
    );
    for (const labelEl of labelEls) {
      const label = labelEl.textContent?.trim();
      if (!label || labelEl.children.length > 0) continue;
      const valueEl = labelEl.parentElement?.querySelector(
        ".text-sm.font-semibold, .text-sm.font-medium",
      );
      if (valueEl) fields[label.toLowerCase()] = valueEl.textContent?.trim() || "";
    }

    const property_address = document.querySelector("h1")?.textContent?.trim() || "";

    return {
      property_address,
      lease_start_date: fields["start date"] || "",
      lease_end_date: fields["end date"] || "",
      landlord_name: fields.landlord || "",
      transaction_type: fields["property type"] || "",
      monthly_rent: fields["monthly rent"] || fields["sale price"] || "",
      close_date: fields["close date"] || fields["start date"] || "",
    };
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: SESSION_FILE });
const page = await context.newPage();

try {
  await page.goto(TRANSACTIONS_URL, { waitUntil: "networkidle", timeout: 90000 });

  if (page.url().includes("/login")) {
    throw new Error("Session expired — run login.mjs again.");
  }

  await page.waitForSelector("table tbody tr", { timeout: 30000 });
  await page.waitForTimeout(1500);

  const listRows = await scrapeListRows(page);
  if (!listRows.length) {
    const shot = path.join(OUTPUT_DIR, "transactions-debug.png");
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    await page.screenshot({ path: shot, fullPage: true });
    throw new Error(`No table rows found. Screenshot: ${shot}`);
  }

  console.log(`Found ${listRows.length} transactions — fetching details…`);

  /** @type {Record<string, string>[]} */
  const enriched = [];

  for (const listRow of listRows) {
    const row = page.locator("table tbody tr").nth(listRow.index);
    await row.click();
    await page.waitForURL(/\/backoffice\/transactions\/[a-f0-9-]+/i, { timeout: 30000 });
    await page.waitForTimeout(1000);

    const detail = await scrapeDetailPage(page);
    const detail_url = page.url();

    enriched.push({
      ref_number: listRow.ref_number,
      property_address: detail.property_address || listRow.property_address,
      lease_start_date: detail.lease_start_date,
      lease_end_date: detail.lease_end_date,
      landlord_name: detail.landlord_name || listRow.landlord_name,
      transaction_type: detail.transaction_type || listRow.transaction_type,
      status: listRow.status,
      close_date: detail.close_date || listRow.close_date,
      monthly_rent: detail.monthly_rent || listRow.monthly_rent,
      detail_url,
    });

    console.log(`  ✓ ${listRow.ref_number} — ${detail.property_address || listRow.property_address}`);

    await page.goto(TRANSACTIONS_URL, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForSelector("table tbody tr", { timeout: 30000 });
    await page.waitForTimeout(500);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const payload = {
    scraped_at: new Date().toISOString(),
    source_url: TRANSACTIONS_URL,
    row_count: enriched.length,
    fields: CSV_FIELDS,
    rows: enriched,
  };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2));
  fs.writeFileSync(OUTPUT_CSV, toCsv(enriched));

  console.log(`\n✓ ${enriched.length} transactions → ${OUTPUT_JSON}`);
  console.log(`✓ CSV → ${OUTPUT_CSV}`);
} finally {
  await browser.close();
}
