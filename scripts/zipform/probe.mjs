/**
 * Dump ZipForm page structure (for tuning selectors).
 *
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/probe.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SESSION_FILE = path.join(process.cwd(), ".zipform", "session.json");
const TRANSACTIONS_URL = "https://www.zipformplus.com/default.aspx";
const OUT = path.join(process.cwd(), ".zipform", "probe.json");

if (!fs.existsSync(SESSION_FILE)) {
  console.error(`No session at ${SESSION_FILE} — run: npm run zipform:login`);
  process.exit(1);
}

const headed = process.argv.includes("--headed");
const browser = await chromium.launch({ headless: !headed });
const context = await browser.newContext({ storageState: SESSION_FILE });
const page = await context.newPage();

try {
  await page.goto(TRANSACTIONS_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);

  const dump = await page.evaluate(() => {
    const textSample = (document.body?.innerText || "").slice(0, 4000);
    const links = [...document.querySelectorAll("a")]
      .slice(0, 80)
      .map((a) => ({ text: (a.textContent || "").trim().slice(0, 80), href: a.href }));
    const rows = [...document.querySelectorAll("tr")]
      .slice(0, 30)
      .map((tr) => (tr.innerText || "").replace(/\s+/g, " ").trim().slice(0, 200));
    const iframes = [...document.querySelectorAll("iframe")].map((f) => f.src || f.id || f.name);
    return { url: location.href, title: document.title, iframes, links, rows, textSample };
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(dump, null, 2));
  await page.screenshot({ path: path.join(process.cwd(), ".zipform", "probe.png"), fullPage: true });
  console.log(`✓ Wrote ${OUT}`);
  console.log(`✓ Screenshot .zipform/probe.png`);
  console.log(`URL: ${dump.url}`);
  console.log(`Rows found: ${dump.rows.length}, iframes: ${dump.iframes.length}`);
} finally {
  await browser.close();
}
