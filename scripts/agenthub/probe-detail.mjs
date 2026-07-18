import { chromium } from "playwright";
import path from "path";

const SESSION_FILE = path.join(process.cwd(), ".agenthub", "session.json");
const TRANSACTIONS_URL = "https://www.fullcircle-agenthub.com/backoffice/transactions";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: SESSION_FILE });
const page = await context.newPage();

await page.goto(TRANSACTIONS_URL, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForSelector("table tbody tr");
await page.locator("table tbody tr").first().click();
await page.waitForURL(/\/backoffice\/transactions\/[a-f0-9-]+/i);
await page.waitForTimeout(2000);

const dom = await page.evaluate(() => {
  const headings = [...document.querySelectorAll("h1, h2, h3")].map((el) => ({
    tag: el.tagName,
    text: el.textContent?.trim(),
    class: el.className,
  }));

  const nearTop = [...document.querySelectorAll("main p, main span, header p, header span")]
    .slice(0, 30)
    .map((el) => ({
      text: el.textContent?.trim().slice(0, 120),
      class: el.className,
    }));

  const overview = [...document.querySelectorAll("dl dt, dl dd, [class*='overview'] *")]
    .slice(0, 40)
    .map((el) => ({ tag: el.tagName, text: el.textContent?.trim().slice(0, 80) }));

  return { headings, nearTop, overview, url: location.href };
});

console.log(JSON.stringify(dom, null, 2));
await browser.close();
