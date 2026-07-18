/**
 * Open one ZipForm lease by name/id, open Residential Lease (TXR PDF or form),
 * extract dates or save screenshots for manual OCR.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/probe-one-lease.mjs --name="1006 Old Mill"
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/probe-one-lease.mjs --id=122661719
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const TRANSACTIONS_URL = "https://www.zipformplus.com/default.aspx";
const OUTPUT_DIR = path.join(process.cwd(), ".zipform");
const PROFILE_DIR = path.join(OUTPUT_DIR, "browser-profile");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "leases.json");

const nameArg = process.argv.find((a) => a.startsWith("--name="))?.split("=").slice(1).join("=") || "";
const idArg = process.argv.find((a) => a.startsWith("--id="))?.split("=")[1] || "";
const query = nameArg || idArg;
if (!query) {
  console.error("Usage: --name=... or --id=...");
  process.exit(1);
}

function normalizeDate(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  slowMo: 40,
  viewport: null,
});
const page = context.pages()[0] || (await context.newPage());

try {
  console.log(`Probing: ${query}`);
  await page.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  try {
    await page.waitForFunction(
      () =>
        /Active\s*\(\s*\d+\s*\)/i.test(document.body?.innerText || "") ||
        /TRANSACTION NAME/i.test(document.body?.innerText || "") ||
        document.querySelectorAll("tr.txn-item").length > 0,
      undefined,
      { timeout: 45000 },
    );
  } catch {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(3000);
    await page.waitForFunction(
      () =>
        /Active\s*\(\s*\d+\s*\)/i.test(document.body?.innerText || "") ||
        document.querySelectorAll("tr.txn-item").length > 0,
      undefined,
      { timeout: 60000 },
    );
  }
  await page.keyboard.press("Escape").catch(() => {});
  try {
    await page.locator(".icon-list2").first().click({ force: true, timeout: 2000 });
    await page.waitForTimeout(1000);
  } catch {
    /* ignore */
  }
  try {
    await page.getByRole("link", { name: /^Listings$/i }).first().click({ force: true });
    await page.waitForTimeout(1200);
  } catch {
    /* ignore */
  }

  const box = page.getByPlaceholder(/search/i).first();
  if (await box.count()) {
    await box.click({ force: true }).catch(() => {});
    await box.fill(query, { force: true }).catch(async () => {
      await page.evaluate((q) => {
        const el = document.querySelector("#search-input-fld, input[placeholder*='earch' i]");
        if (el) {
          el.focus();
          el.value = q;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
        }
      }, query);
    });
    await page.waitForTimeout(2000);
  }

  const row = page.locator("tr.txn-item").filter({ hasText: query }).first();
  if (!(await row.count())) throw new Error("transaction row not found");
  await row.locator("h4").first().evaluate((el) => el.click());
  await page.waitForTimeout(3500);

  await page.getByText("ALL FORMS", { exact: false }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(3000);

  // Expand folders
  const folders = page.locator("h4, .documentName").filter({ hasText: /Residential Lease/i });
  const n = Math.min(await folders.count(), 8);
  for (let i = 0; i < n; i++) {
    try {
      await folders.nth(i).click({ force: true, timeout: 2000 });
      await page.waitForTimeout(800);
    } catch {
      /* ignore */
    }
  }

  const candidates = [
    page.locator("h4, a, span").filter({ hasText: /Residential Lease\s*\(TXR-?2001\)/i }).first(),
    page.locator("h4").filter({ hasText: /Residential Lease - \d+\/\d+\s*-\s*\[TXR/i }).first(),
    page.locator("h4, a, span").filter({ hasText: /Signed\s*-\s*Residential Lease/i }).first(),
    page.locator("h4, a, span").filter({ hasText: /Residential Lease.*\.pdf/i }).first(),
  ];
  let clicked = false;
  for (const loc of candidates) {
    if (await loc.count()) {
      await loc.click({ force: true });
      clicked = true;
      console.log("Opened lease doc");
      break;
    }
  }
  if (!clicked) {
    const shot = path.join(OUTPUT_DIR, `probe-docs-${query.replace(/\W+/g, "_").slice(0, 40)}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    throw new Error(`no lease doc; ${shot}`);
  }

  await page.waitForTimeout(4000);
  let formPage = page;
  if (context.pages().length > 1) {
    formPage = context.pages()[context.pages().length - 1];
    await formPage.bringToFront();
  }

  const prev = formPage.getByRole("button", { name: /OPEN MY PREVIOUS WORKSPACE/i }).first();
  if (await prev.count()) {
    await prev.click({ force: true });
    await formPage.waitForTimeout(4000);
  }

  // Scroll through PDF/form and capture screenshots
  const slug = query.replace(/\W+/g, "_").slice(0, 40);
  for (let i = 0; i < 6; i++) {
    const shot = path.join(OUTPUT_DIR, `lease-shot-${slug}-${i}.png`);
    await formPage.screenshot({ path: shot, fullPage: false });
    console.log(`shot ${shot}`);
    await formPage.mouse.wheel(0, 900);
    await formPage.waitForTimeout(800);
  }

  const inputs = await formPage.evaluate(() =>
    [...document.querySelectorAll("input, textarea")].map((el) => ({
      title: el.title || el.getAttribute("aria-label") || "",
      id: el.id || "",
      val: (el.value || "").trim(),
    })),
  );
  const byTitle = (re) => inputs.find((i) => re.test(i.title) && i.val)?.val || "";
  let start =
    byTitle(/commencement/i) ||
    byTitle(/listing\s*date/i) ||
    inputs.find((i) => /D213840/i.test(i.id) && i.val)?.val ||
    "";
  let end =
    byTitle(/listing\s*expiration/i) ||
    byTitle(/expiration/i) ||
    inputs.find((i) => /D213841/i.test(i.id) && i.val)?.val ||
    "";
  const rent =
    byTitle(/monthly rent/i) ||
    inputs.find((i) => /D4316/i.test(i.id) && i.val)?.val ||
    "";

  start = normalizeDate(start);
  end = normalizeDate(end);
  console.log(`extracted: ${start || "?"} → ${end || "?"} ${rent || ""}`);

  if ((start || end) && fs.existsSync(OUTPUT_JSON)) {
    const data = JSON.parse(fs.readFileSync(OUTPUT_JSON, "utf8"));
    for (const r of data.rows || []) {
      const match =
        (idArg && r.transaction_id === idArg) ||
        (nameArg && (r.transaction_name || "").includes(nameArg)) ||
        (r.property_address || "").includes(query) ||
        (r.transaction_name || "").includes(query);
      if (match) {
        if (start) r.lease_start_date = start;
        if (end) r.lease_end_date = end;
        if (rent) r.monthly_rent = rent.startsWith("$") ? rent : `$${rent}`;
        console.log(`updated ${r.transaction_name}`);
      }
    }
    data.scraped_at = new Date().toISOString();
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(data, null, 2));
  }
} finally {
  await context.close().catch(() => {});
}
