/**
 * Dump Commencement / Expiration fields from open lease form (or navigate there).
 * Assumes profile already logged in.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/dump-lease-dates.mjs "1220 Calendula"
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROFILE = path.join(process.cwd(), ".zipform", "browser-profile");
const OUT = path.join(process.cwd(), ".zipform", "lease-date-fields.json");
const search = process.argv[2] || "1220 Calendula";

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  slowMo: 40,
  viewport: null,
});
const page = context.pages()[0] || (await context.newPage());

try {
  await page.goto("https://www.zipformplus.com/default.aspx", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForFunction(
    () => /Active\s*\(\s*\d+\s*\)/i.test(document.body?.innerText || ""),
    undefined,
    { timeout: 60000 },
  );
  await page.keyboard.press("Escape").catch(() => {});
  try {
    await page.locator(".icon-list2").first().click({ force: true, timeout: 2000 });
  } catch {}
  await page.waitForSelector("tr.txn-item", { timeout: 20000 });

  try {
    const box = page.getByPlaceholder(/search/i).first();
    if (await box.count()) {
      await box.fill(search);
      await page.waitForTimeout(1200);
    }
  } catch {}

  await page.locator("tr.txn-item").filter({ hasText: search }).locator("h4").first().click({ force: true });
  await page.waitForTimeout(3000);
  await page.getByText("ALL FORMS", { exact: false }).first().click({ force: true });
  await page.waitForTimeout(1500);

  await page.getByRole("heading", { name: /Residential Lease - 1\/26/i }).first().click({ force: true });
  await page.waitForTimeout(3000);

  const prev = page.getByRole("button", { name: /OPEN MY PREVIOUS WORKSPACE/i }).first();
  if (await prev.count()) {
    await prev.click({ force: true });
    await page.waitForTimeout(3000);
  }
  const lease = page.getByText(/Residential Lease - 1\/26/i).first();
  if (await lease.count()) {
    await lease.click({ force: true });
    await page.waitForTimeout(4000);
  }

  // Wait for form URL
  await page.waitForURL(/\/forms\/form\//, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const fields = await page.evaluate(() => {
    const all = [...document.querySelectorAll("input, textarea, select")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.id || "",
        name: el.name || "",
        title: el.title || el.getAttribute("aria-label") || "",
        placeholder: el.placeholder || "",
        val: (el.value || "").trim(),
        type: el.type || el.tagName,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });

    const interesting = all.filter((f) => {
      const blob = `${f.id} ${f.name} ${f.title} ${f.placeholder} ${f.val}`;
      return /commenc|expir|begin|ending|listing date|lease|term|primary|D213840|D213841|D5009|D5010|D5011/i.test(
        blob,
      );
    });

    // Fields near the "Commencement Date" label on page
    const labels = [...document.querySelectorAll("*")].filter((el) => {
      const t = (el.textContent || "").trim();
      return (
        el.children.length === 0 &&
        (/^Commencement Date/i.test(t) ||
          /^Expiration Date/i.test(t) ||
          t === "Commencement Date:" ||
          t === "Expiration Date:")
      );
    });

    const nearLabels = labels.map((lab) => {
      const lr = lab.getBoundingClientRect();
      const nearby = all
        .filter((f) => f.w > 20 && f.h > 5 && Math.abs(f.y - lr.y) < 40 && f.x > lr.x - 20)
        .sort((a, b) => a.x - b.x || a.y - b.y)
        .slice(0, 5);
      return { label: (lab.textContent || "").trim(), nearby };
    });

    // Also: any date-looking values on page 1 (y small)
    const dateVals = all.filter((f) =>
      /\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Za-z]+ \d{1,2},?\s+\d{4}/.test(f.val),
    );

    return { interesting, nearLabels, dateVals, total: all.length };
  });

  fs.writeFileSync(OUT, JSON.stringify(fields, null, 2));
  await page.screenshot({ path: path.join(process.cwd(), ".zipform", "lease-dates.png") });
  console.log(JSON.stringify(fields.nearLabels, null, 2));
  console.log("interesting:", fields.interesting.length);
  console.log(
    fields.interesting
      .filter((f) => f.val || /commenc|expir|listing/i.test(f.title))
      .slice(0, 30),
  );
  console.log("✓", OUT);
} finally {
  await context.close().catch(() => {});
}
