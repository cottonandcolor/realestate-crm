/**
 * Scrape ZipForm lease/lease-listing transactions.
 * Opens each Residential Lease form (TXR-2001) for commencement/expiration.
 *
 *   npm run zipform:scrape
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/scrape-leases.mjs --headed
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/scrape-leases.mjs --limit=3
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/scrape-leases.mjs --listings-only
 *
 * Requires: npm run zipform:login
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const TRANSACTIONS_URL = "https://www.zipformplus.com/default.aspx";
const OUTPUT_DIR = path.join(process.cwd(), ".zipform");
const PROFILE_DIR = path.join(OUTPUT_DIR, "browser-profile");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "leases.json");
const OUTPUT_CSV = path.join(OUTPUT_DIR, "leases.csv");

const CSV_FIELDS = [
  "transaction_name",
  "transaction_id",
  "property_address",
  "transaction_type",
  "status",
  "seller_landlord",
  "buyer_tenant",
  "lease_start_date",
  "lease_end_date",
  "monthly_rent",
  "created",
  "retention_date",
];

const headed = process.argv.includes("--headed");
const listingsOnly = process.argv.includes("--listings-only");
const missingOnly = process.argv.includes("--missing-only");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

if (!fs.existsSync(PROFILE_DIR)) {
  console.error(`No ZipForm profile at ${PROFILE_DIR}`);
  console.error("Run first: npm run zipform:login");
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

/** @param {import('playwright').Page} page */
async function prepareListView(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
  try {
    await page.locator(".icon-list2").first().click({ force: true, timeout: 2000 });
    await page.waitForTimeout(1000);
  } catch {
    /* already list */
  }
  if (listingsOnly) {
    try {
      await page.getByRole("link", { name: /^Listings$/i }).first().click({ force: true });
      await page.waitForTimeout(1500);
    } catch {
      try {
        await page.getByText("Listings", { exact: true }).first().click({ force: true });
        await page.waitForTimeout(1500);
      } catch {
        /* fall through — scrape lease rows from All */
      }
    }
  }
  // Soft wait — don't fail recovery just because rows are slow
  try {
    await page.waitForSelector("tr.txn-item", { timeout: 15000 });
  } catch {
    await page.waitForTimeout(2000);
  }
}

/** @param {import('playwright').Page} page */
async function collectLeaseListRows(page) {
  await prepareListView(page);

  for (let i = 0; i < 35; i++) {
    const before = await page.locator("tr.txn-item").count();
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(200);
    const after = await page.locator("tr.txn-item").count();
    if (after === before && i > 8) break;
  }

  return page.evaluate((listingsOnlyFlag) => {
    const rows = [];
    const seen = new Set();
    for (const tr of document.querySelectorAll("tr.txn-item")) {
      const text = (tr.innerText || "").trim();
      if (!text) continue;
      const typeMatch = text.match(/Type:\s*([^\n\t]+)/i);
      const transaction_type = (typeMatch?.[1] || "").trim();
      const isLease = /lease/i.test(transaction_type) || /\blease\b/i.test(text);
      if (!isLease) continue;
      if (listingsOnlyFlag && !/listing/i.test(transaction_type) && !/Lease-Listing/i.test(transaction_type)) {
        // Listings tab usually Lease-Listing; still keep pure Lease if filter didn't apply
      }

      const name = (tr.querySelector("h4")?.textContent || "").trim();
      const idMatch = text.match(/Transaction ID\s+(\d+)/i);
      const address =
        (tr.querySelector('td[data-th="Prop Address"]')?.textContent || "").trim() ||
        (tr.querySelector('td[data-th="PROP ADDRESS"]')?.textContent || "").trim();
      const seller_landlord =
        (tr.querySelector('td[data-th="Seller/Landlord"]')?.textContent || "").trim() ||
        (tr.querySelector('td[data-th="SELLER/LANDLORD"]')?.textContent || "").trim();
      const buyer_tenant =
        (tr.querySelector('td[data-th="Buyer/Tenant"]')?.textContent || "").trim() ||
        (tr.querySelector('td[data-th="BUYER/TENANT"]')?.textContent || "").trim();
      const status =
        [...tr.querySelectorAll("td")]
          .map((td) => (td.textContent || "").trim())
          .find((t) => /^(Active|Pending|Closed|Inactive|Prospect|Fell Through)$/i.test(t)) || "";
      const created =
        (tr.querySelector('td[data-th="Created"]')?.textContent || "").trim() ||
        (tr.querySelector('td[data-th="CREATED"]')?.textContent || "").trim();
      const retention_date =
        (tr.querySelector('td[data-th="Retention Date"]')?.textContent || "").trim() ||
        (tr.querySelector('td[data-th="RETENTION DATE"]')?.textContent || "").trim();

      const key = (idMatch?.[1] || `${name}|${address}`).toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      rows.push({
        key,
        transaction_name: name,
        transaction_id: idMatch?.[1] || "",
        property_address: address,
        transaction_type: transaction_type || "Lease",
        status,
        seller_landlord,
        buyer_tenant,
        created,
        retention_date,
      });
    }
    return rows;
  }, listingsOnly);
}

/** @param {import('playwright').Page} page */
async function backToList(page) {
  const back = page.locator('span[data-lang="back_to_list"]').filter({ hasText: /Back to List/i }).first();
  try {
    if (await back.count()) {
      await back.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(2000);
    }
  } catch {
    /* ignore */
  }
  if (!(await page.locator("tr.txn-item").count())) {
    await page.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForFunction(
      () => /Active\s*\(\s*\d+\s*\)/i.test(document.body?.innerText || ""),
      undefined,
      { timeout: 45000 },
    );
    await prepareListView(page);
  }
}

function extractLeaseDatesFromInputs(inputs) {
  const byTitle = (re, opts = {}) =>
    inputs.find((i) => re.test(i.title) && i.val && (!opts.exclude || !opts.exclude.test(i.title)))?.val || "";

  let start =
    byTitle(/commencement/i) ||
    byTitle(/lease\s*start/i) ||
    byTitle(/property,\s*listing\s*date/i) ||
    byTitle(/^listing\s*date/i, { exclude: /expiration/i });

  let end =
    byTitle(/listing\s*expiration/i) ||
    byTitle(/^expiration\s*date/i) ||
    byTitle(/lease\s*end/i) ||
    byTitle(/expiration/i, { exclude: /days before|notice/i });

  if (!start) {
    start =
      inputs.find((i) => /D213840/i.test(i.id + i.name) && i.val)?.val ||
      inputs.find((i) => /:D_1_9$/i.test(i.id) && i.val && /[A-Za-z]{3}|\d{4}/.test(i.val))?.val ||
      "";
  }
  if (!end) {
    end =
      inputs.find((i) => /D213841/i.test(i.id + i.name) && i.val)?.val ||
      inputs.find((i) => /:D_1_10$/i.test(i.id) && i.val && /[A-Za-z]{3}|\d{4}/.test(i.val))?.val ||
      "";
  }

  const rent =
    byTitle(/Tenant will pay monthly rent/i) ||
    byTitle(/monthly rent/i) ||
    inputs.find((i) => /D4316/i.test(i.id + i.name) && i.val)?.val ||
    "";

  return { lease_start_date: start, lease_end_date: end, monthly_rent: rent };
}

/** @param {import('playwright').Page} page */
async function extractDatesFromLeaseForm(page) {
  try {
    await page.waitForFunction(
      () =>
        document.querySelectorAll("input[title], textarea[title]").length > 20 ||
        /\/forms\/form\//i.test(location.href),
      undefined,
      { timeout: 25000 },
    );
  } catch {
    /* may still have fields */
  }
  await page.waitForTimeout(1500);

  const inputs = await page.evaluate(() =>
    [...document.querySelectorAll("input, textarea")].map((el) => ({
      id: el.id || "",
      name: el.name || "",
      title: el.title || el.getAttribute("aria-label") || "",
      val: (el.value || "").trim(),
    })),
  );
  return { ...extractLeaseDatesFromInputs(inputs), _inputCount: inputs.length };
}

/**
 * Open Residential Lease form for the current transaction and read dates.
 * @param {import('playwright').Page} page
 * @param {import('playwright').BrowserContext} context
 * @param {string} label
 */
async function scrapeLeaseFormDates(page, context, label = "") {
  await page.getByText("ALL FORMS", { exact: false }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(2000);

  // Expand lease packet folders so TXR forms become visible
  // e.g. "Residential Lease - 722 - 9540..." or "Extension of Residential Lease..."
  const folderNames = page.locator("h4, .documentName, a, span").filter({
    hasText: /(Residential Lease|Extension of Residential Lease)/i,
  });
  const folderCount = Math.min(await folderNames.count(), 10);
  for (let i = 0; i < folderCount; i++) {
    try {
      const t = ((await folderNames.nth(i).innerText()) || "").trim();
      // Skip TXR form titles that look like "Residential Lease - 1/26 - [TXR-...]"
      if (/Residential Lease - \d+\/\d+/i.test(t)) continue;
      if (/Listing Agreement|Exclusive Right|Archive/i.test(t)) continue;
      await folderNames.nth(i).click({ force: true, timeout: 2000 });
      await page.waitForTimeout(1200);
    } catch {
      /* ignore */
    }
  }

  // Prefer TXR Residential Lease form (any version year), not packet folders
  const candidates = [
    page.locator("h4").filter({ hasText: /Residential Lease - \d+\/\d+\s*-\s*\[TXR/i }).first(),
    page.getByText(/Residential Lease - \d+\/\d+\s*-\s*\[TXR-\d+\]/i).first(),
    page.locator("h4").filter({ hasText: /Extension of Residential Lease - \d+\/\d+/i }).first(),
    page.locator("h4.documentName").filter({ hasText: /Residential Lease - \d+\/\d+/ }).first(),
    page.getByRole("heading", { name: /Residential Lease - \d+\/\d+\s*-\s*\[/i }).first(),
    // Uploaded TXR PDFs e.g. "Residential Lease (TXR-2001) (Rev 012026).pdf"
    page.locator("h4, a, span").filter({ hasText: /Residential Lease\s*\(TXR-?2001\)/i }).first(),
    page.locator("h4, a, span").filter({ hasText: /Residential Lease.*\.pdf/i }).first(),
    // Signed PDF uploads (common when TXR form isn't in the packet)
    page.locator("h4, a, span").filter({ hasText: /Signed\s*-\s*Residential Lease/i }).first(),
    page.locator("h4, a, span").filter({ hasText: /^Residential Lease\.pdf$/i }).first(),
  ];

  // Wait for document list to finish loading (spinner)
  await page.waitForTimeout(2500);
  await page
    .waitForFunction(() => !document.querySelector(".loading, .spinner, [class*='spinner']"), undefined, {
      timeout: 8000,
    })
    .catch(() => {});
  await page.waitForTimeout(1000);

  let clicked = false;
  for (const loc of candidates) {
    try {
      if (await loc.count()) {
        await loc.click({ force: true, timeout: 5000 });
        clicked = true;
        break;
      }
    } catch {
      /* try next */
    }
  }
  if (!clicked) {
    const shot = path.join(
      OUTPUT_DIR,
      `docs-miss-${(label || "x").replace(/\W+/g, "_").slice(0, 40)}.png`,
    );
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    console.log(`    (no Residential Lease document found; ${path.basename(shot)})`);
    return { lease_start_date: "", lease_end_date: "", monthly_rent: "" };
  }

  await page.waitForTimeout(2500);
  if (!/\/forms\/form\//i.test(page.url())) {
    const txr = page.locator("h4").filter({ hasText: /Residential Lease - \d+\/\d+\s*-\s*\[TXR/i }).first();
    if (await txr.count()) {
      await txr.dblclick({ force: true }).catch(async () => {
        await txr.click({ force: true });
      });
      await page.waitForTimeout(3500);
    }
  }
  await page.waitForURL(/\/forms\/form\//, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1500);

  let formPage = page;
  if (context.pages().length > 1) {
    formPage = context.pages()[context.pages().length - 1];
    await formPage.bringToFront();
    await formPage.waitForTimeout(1500);
  }

  const prev = formPage.getByRole("button", { name: /OPEN MY PREVIOUS WORKSPACE/i }).first();
  if (await prev.count()) {
    await prev.click({ force: true });
    await formPage.waitForTimeout(4500);
  } else {
    const neu = formPage.getByRole("button", { name: /START A NEW WORKSPACE/i }).first();
    if (await neu.count()) {
      await neu.click({ force: true });
      await formPage.waitForTimeout(4500);
    }
  }

  const leaseInWs = formPage.getByText(/Residential Lease - \d+\/\d+/i).first();
  if (await leaseInWs.count()) {
    await leaseInWs.click({ force: true }).catch(() => {});
    await formPage.waitForTimeout(3500);
  }

  await formPage.waitForURL(/\/forms\/form\//, { timeout: 20000 }).catch(() => {});

  if (!/\/forms\/form\//i.test(formPage.url())) {
    const shot = path.join(
      OUTPUT_DIR,
      `form-miss-${(label || "x").replace(/\W+/g, "_").slice(0, 40)}.png`,
    );
    await formPage.screenshot({ path: shot }).catch(() => {});
    console.log(`    (did not reach form editor; ${path.basename(shot)})`);
    if (formPage !== page) await formPage.close().catch(() => {});
    return { lease_start_date: "", lease_end_date: "", monthly_rent: "" };
  }

  let dates = await extractDatesFromLeaseForm(formPage);
  if (!dates.lease_start_date && !dates.lease_end_date) {
    const again = formPage.getByText(/Residential Lease - \d+\/\d+/i).first();
    if (await again.count()) {
      await again.click({ force: true }).catch(() => {});
      await formPage.waitForTimeout(3500);
      dates = await extractDatesFromLeaseForm(formPage);
    }
  }

  if (!dates.lease_start_date && !dates.lease_end_date) {
    const shot = path.join(
      OUTPUT_DIR,
      `lease-shot-${(label || "x").replace(/\W+/g, "_").slice(0, 40)}.png`,
    );
    await formPage.screenshot({ path: shot, fullPage: true }).catch(() => {});
    console.log(
      `    (form/PDF open but no dates; inputs=${dates._inputCount || 0}; ${path.basename(shot)})`,
    );
  }

  if (formPage !== page) {
    await formPage.close().catch(() => {});
  } else if (/\/forms\/form\//i.test(page.url())) {
    // Leave the form editor so the next list navigation isn't stuck
    await page.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  }

  return {
    lease_start_date: dates.lease_start_date || "",
    lease_end_date: dates.lease_end_date || "",
    monthly_rent: dates.monthly_rent || "",
  };
}

/** True when the transactions list shell is visible. */
function listReadyFn() {
  return () => {
    const t = document.body?.innerText || "";
    return (
      /Active\s*\(\s*\d+\s*\)/i.test(t) ||
      /TRANSACTION NAME/i.test(t) ||
      document.querySelectorAll("tr.txn-item").length > 0
    );
  };
}

/** Close popup/form tabs so we stay on the main ZipForm page. */
async function closeExtraPages(context, keep) {
  for (const p of context.pages()) {
    if (p !== keep) await p.close().catch(() => {});
  }
}

/**
 * Reset to clean transactions list. Returns true on success.
 * Retries with Back → goto → hard reload → Transactions nav click.
 * @param {import('playwright').Page} page
 * @param {import('playwright').BrowserContext} [context]
 */
async function goToTransactionsList(page, context) {
  if (context) await closeExtraPages(context, page);

  const attempts = [
    async () => {
      await page.keyboard.press("Escape").catch(() => {});
      const back = page.locator('span[data-lang="back_to_list"], a, span, button').filter({
        hasText: /^Back to List$/i,
      }).first();
      if (await back.count()) {
        await back.click({ force: true, timeout: 3000 });
        await page.waitForTimeout(2000);
      }
      if (await page.locator("tr.txn-item").count()) return;
      throw new Error("still not on list after Back");
    },
    async () => {
      // Cache-bust SPA — ZipForm sometimes sticks after leaving a form
      const url = `${TRANSACTIONS_URL}${TRANSACTIONS_URL.includes("?") ? "&" : "?"}_=${Date.now()}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(2000);
      await page.waitForFunction(listReadyFn(), undefined, { timeout: 25000 });
    },
    async () => {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForFunction(listReadyFn(), undefined, { timeout: 20000 });
    },
    async () => {
      await page.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
      const nav = page.getByText(/Transactions/i).first();
      if (await nav.count()) {
        await nav.click({ force: true }).catch(() => {});
        await page.waitForTimeout(2000);
      }
      await page.waitForFunction(listReadyFn(), undefined, { timeout: 25000 });
    },
  ];

  let lastErr;
  for (let i = 0; i < attempts.length; i++) {
    try {
      await attempts[i]();
      await page.keyboard.press("Escape").catch(() => {});
      await prepareListView(page);
      try {
        const box = page.getByPlaceholder(/search/i).first();
        if (await box.count()) {
          await box.fill("");
          await page.waitForTimeout(600);
        }
      } catch {
        /* ignore */
      }
      return true;
    } catch (err) {
      lastErr = err;
      console.log(`    (list recovery attempt ${i + 1} failed)`);
    }
  }
  throw lastErr || new Error("could not reach transactions list");
}

function writeProgress(priorByKey) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const finalRows = [...priorByKey.values()];
  const payload = {
    scraped_at: new Date().toISOString(),
    source_url: TRANSACTIONS_URL,
    source: "zipform",
    row_count: finalRows.length,
    fields: CSV_FIELDS,
    rows: finalRows,
  };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2));
  fs.writeFileSync(OUTPUT_CSV, toCsv(finalRows));
}

/** @param {import('playwright').Page} page @param {{ transaction_name?: string, transaction_id?: string, property_address?: string }} row */
async function openTransaction(page, row) {
  const name = row.transaction_name || "";
  const tid = (row.transaction_id || "").trim();
  const addr = (row.property_address || "").trim();
  const searchTerms = [
    tid,
    name.replace(/\s*-\s*LEASE$/i, "").slice(0, 36),
    addr && !/^no address$/i.test(addr) ? addr.split(",")[0].trim().slice(0, 36) : "",
  ].filter(Boolean);

  for (const term of searchTerms) {
    try {
      const box = page.getByPlaceholder(/search/i).first();
      if (await box.count()) {
        await box.fill(term);
        await page.waitForTimeout(1600);
      }
    } catch {
      /* ignore */
    }

    let rowLoc = page.locator("tr.txn-item").filter({ hasText: name }).first();
    if (!(await rowLoc.count()) && tid) {
      rowLoc = page.locator("tr.txn-item").filter({ hasText: tid }).first();
    }
    if (!(await rowLoc.count()) && addr && !/^no address$/i.test(addr)) {
      const street = addr.split(",")[0].trim();
      rowLoc = page.locator("tr.txn-item").filter({ hasText: street }).first();
    }
    if (!(await rowLoc.count())) {
      const short = name.split("-")[0].trim().slice(0, 24);
      rowLoc = page.locator("tr.txn-item").filter({ hasText: short }).first();
    }
    if (!(await rowLoc.count())) continue;

    await rowLoc.scrollIntoViewIfNeeded().catch(() => {});
    const h4 = rowLoc.locator("h4").first();
    try {
      await h4.click({ force: true, timeout: 5000 });
    } catch {
      // Row may be covered by sticky headers — click via DOM
      await h4.evaluate((el) => el.click());
    }
    await page.waitForTimeout(3000);
    const opened = await page.evaluate(() => {
      const t = document.body?.innerText || "";
      return /Transaction details/i.test(t) || /TID\s*\d+/i.test(t) || /Back to List/i.test(t);
    });
    if (opened) return true;
  }
  return false;
}

async function launchZipForm() {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !headed,
    slowMo: headed ? 35 : 0,
    viewport: null,
  });
  const p = ctx.pages()[0] || (await ctx.newPage());
  return { context: ctx, page: p };
}

let { context, page } = await launchZipForm();

try {
  console.log("Opening ZipForm Transactions…");
  await page.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  try {
    await page.waitForFunction(listReadyFn(), undefined, { timeout: 20000 });
  } catch {
    console.log("\nSession needs login. Sign in in the Chromium window…");
    console.log("(Waiting up to 10 minutes for the Transactions list)\n");
    try {
      const { execSync } = await import("child_process");
      execSync(
        `osascript -e 'tell application "Google Chrome for Testing" to activate'`,
        { stdio: "ignore" },
      );
    } catch {
      /* ignore */
    }
    try {
      await page.waitForFunction(listReadyFn(), undefined, { timeout: 600_000 });
      console.log("✓ Logged in — continuing scrape");
      // Let SSO settle back on zipformplus
      for (let i = 0; i < 6; i++) {
        if (/zipformplus\.com/i.test(page.url())) break;
        await page.waitForTimeout(1500);
      }
      if (!/zipformplus\.com/i.test(page.url())) {
        await page.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
        await page.waitForFunction(listReadyFn(), undefined, { timeout: 60000 });
      }
    } catch {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(OUTPUT_DIR, "leases-debug.png"), fullPage: true });
      throw new Error("Session expired or list did not load — run npm run zipform:login");
    }
  }

  await page.keyboard.press("Escape").catch(() => {});
  let listRows = await collectLeaseListRows(page);
  if (!listRows.length) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(OUTPUT_DIR, "leases-debug.png"), fullPage: true });
    throw new Error("No lease rows found");
  }

  // Prefer Active leases first
  listRows.sort((a, b) => {
    const rank = (s) => (/^active$/i.test(s) ? 0 : /^pending$/i.test(s) ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });

  /** @type {Map<string, Record<string, string>>} */
  const priorByKey = new Map();
  if (fs.existsSync(OUTPUT_JSON)) {
    try {
      const prior = JSON.parse(fs.readFileSync(OUTPUT_JSON, "utf8"));
      for (const r of prior.rows || []) {
        const k = (r.transaction_id || `${r.transaction_name}|${r.property_address}`).toLowerCase();
        priorByKey.set(k, r);
      }
    } catch {
      /* ignore */
    }
  }

  if (missingOnly) {
    const before = listRows.length;
    listRows = listRows.filter((row) => {
      const k = (row.transaction_id || row.key || "").toLowerCase();
      const prior = priorByKey.get(k);
      return !(prior?.lease_start_date && prior?.lease_end_date);
    });
    console.log(`Missing-only: ${listRows.length}/${before} still need dates`);
  }

  // Prefer real addresses — no-address home-search rows rarely have TXR leases
  listRows.sort((a, b) => {
    const score = (r) => {
      const addr = (r.property_address || "").trim();
      if (!addr || /^no address$/i.test(addr)) return 2;
      if (/home search/i.test(r.transaction_name || "")) return 2;
      if (/^test$/i.test((r.transaction_name || "").trim())) return 1;
      return 0;
    };
    return score(a) - score(b);
  });

  if (Number.isFinite(limit)) listRows = listRows.slice(0, limit);
  console.log(`Found ${listRows.length} lease transaction(s) — opening Residential Lease forms…`);

  /** @type {Record<string, string>[]} */
  const enriched = [];
  let pageRef = page;
  let consecutiveListFails = 0;

  async function hardRelaunch() {
    console.log("    (relaunching browser profile…)");
    await context.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    ({ context, page } = await launchZipForm());
    pageRef = page;
    await pageRef.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
    await pageRef.waitForFunction(listReadyFn(), undefined, { timeout: 60000 });
    consecutiveListFails = 0;
    console.log("    (relaunch ok)");
  }

  for (const row of listRows) {
    console.log(`  → ${row.transaction_name} (${row.property_address || "—"})`);
    let dates = { lease_start_date: "", lease_end_date: "", monthly_rent: "" };
    try {
      await goToTransactionsList(pageRef, context);
      consecutiveListFails = 0;
      const opened = await openTransaction(pageRef, row);
      if (opened) {
        dates = await scrapeLeaseFormDates(pageRef, context, row.transaction_name);
      } else {
        console.log("    (could not open transaction)");
      }
    } catch (err) {
      console.log(`    (error: ${err instanceof Error ? err.message : err})`);
      consecutiveListFails += 1;
      try {
        if (consecutiveListFails >= 2) {
          await hardRelaunch();
        } else {
          await closeExtraPages(context, pageRef);
          const fresh = await context.newPage();
          await pageRef.close().catch(() => {});
          pageRef = fresh;
          await pageRef.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
          await pageRef.waitForFunction(listReadyFn(), undefined, { timeout: 45000 });
          console.log("    (recovered with fresh page)");
          consecutiveListFails = 0;
        }
      } catch (recoverErr) {
        console.log(
          `    (recovery failed: ${recoverErr instanceof Error ? recoverErr.message : recoverErr})`,
        );
        try {
          await hardRelaunch();
        } catch (relaunchErr) {
          console.log(
            `    (relaunch failed: ${relaunchErr instanceof Error ? relaunchErr.message : relaunchErr})`,
          );
          console.log("    Stopping — run npm run zipform:login then retry.");
          break;
        }
      }
    }

    // Always reset list between rows
    try {
      await goToTransactionsList(pageRef, context);
      consecutiveListFails = 0;
    } catch {
      consecutiveListFails += 1;
      if (consecutiveListFails >= 2) {
        try {
          await hardRelaunch();
        } catch {
          console.log("    Stopping — list unreachable.");
          break;
        }
      }
    }

    const start = normalizeDate(dates.lease_start_date);
    const end = normalizeDate(dates.lease_end_date);
    const key = (row.transaction_id || row.key || "").toLowerCase();
    const prev = priorByKey.get(key) || {};
    // Never wipe manually-entered / previously scraped dates with blanks
    const merged = {
      ...prev,
      ...row,
      lease_start_date: start || dates.lease_start_date || prev.lease_start_date || "",
      lease_end_date: end || dates.lease_end_date || prev.lease_end_date || "",
      monthly_rent: dates.monthly_rent || prev.monthly_rent || "",
    };
    // If this pass got nothing but a sibling address already has dates, copy them
    if (!merged.lease_start_date || !merged.lease_end_date) {
      const addrKey = (merged.property_address || "").toLowerCase().replace(/[^\w]/g, "").slice(0, 24);
      if (addrKey && !/^noaddress/.test(addrKey)) {
        for (const other of priorByKey.values()) {
          const oAddr = (other.property_address || "").toLowerCase().replace(/[^\w]/g, "").slice(0, 24);
          if (
            oAddr === addrKey &&
            other.lease_start_date &&
            other.lease_end_date &&
            (other.transaction_id || "") !== (merged.transaction_id || "")
          ) {
            merged.lease_start_date = merged.lease_start_date || other.lease_start_date;
            merged.lease_end_date = merged.lease_end_date || other.lease_end_date;
            merged.monthly_rent = merged.monthly_rent || other.monthly_rent || "";
            console.log("    (copied dates from sibling address match)");
            break;
          }
        }
      }
    }
    enriched.push(merged);
    priorByKey.set(key, merged);
    writeProgress(priorByKey);
    console.log(
      `    ✓ ${merged.lease_start_date || "?"} → ${merged.lease_end_date || "?"} ${merged.monthly_rent ? `(${merged.monthly_rent})` : ""}`,
    );
  }

  writeProgress(priorByKey);
  const finalRows = [...priorByKey.values()];
  const withDates = finalRows.filter((r) => r.lease_start_date || r.lease_end_date).length;
  console.log(`\n✓ ${finalRows.length} leases → ${OUTPUT_JSON}`);
  console.log(`✓ CSV → ${OUTPUT_CSV}`);
  console.log(`  ${withDates}/${finalRows.length} had lease start/end`);
  console.log("Next: npm run zipform:sync-leases");
} finally {
  await context.close().catch(() => {});
}
