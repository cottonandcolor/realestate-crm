/**
 * Open the ZipForm Residential Lease PDF/form (TXR-2001) and extract dates.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/probe-lease-pdf.mjs "1220 Calendula"
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROFILE = path.join(process.cwd(), ".zipform", "browser-profile");
const OUT = path.join(process.cwd(), ".zipform");
const search = process.argv[2] || "1220 Calendula";

if (!fs.existsSync(PROFILE)) {
  console.error("Run npm run zipform:login first");
  process.exit(1);
}

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  slowMo: 50,
  viewport: null,
  acceptDownloads: true,
});
const page = context.pages()[0] || (await context.newPage());

async function dump(formPage, tag) {
  const data = await formPage.evaluate(() => {
    const text = (document.body?.innerText || "").slice(0, 25000);
    const inputs = [...document.querySelectorAll("input, textarea")]
      .map((el) => ({
        id: el.id || "",
        name: el.name || "",
        title: el.title || el.getAttribute("aria-label") || "",
        val: (el.value || "").slice(0, 120),
      }))
      .filter((x) => x.val);
    const embeds = [...document.querySelectorAll("iframe, embed, object")].map((el) => ({
      tag: el.tagName,
      src: (el.getAttribute("src") || el.getAttribute("data") || "").slice(0, 200),
      type: el.getAttribute("type") || "",
    }));
    return { title: document.title, url: location.href, text, inputs, embeds };
  });

  const frameTexts = [];
  for (const frame of formPage.frames()) {
    if (frame === formPage.mainFrame()) continue;
    try {
      const t = await frame.locator("body").innerText({ timeout: 2500 });
      const inputs = await frame.evaluate(() =>
        [...document.querySelectorAll("input, textarea")]
          .map((el) => ({
            id: el.id || "",
            title: el.title || el.getAttribute("aria-label") || "",
            val: (el.value || "").slice(0, 120),
          }))
          .filter((x) => x.val)
          .slice(0, 120),
      );
      frameTexts.push({ url: frame.url().slice(0, 200), text: t.slice(0, 12000), inputs });
    } catch {
      /* cross-origin */
    }
  }

  fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify({ ...data, frameTexts }, null, 2));
  await formPage.screenshot({ path: path.join(OUT, `${tag}.png`) });
  return { data, frameTexts };
}

try {
  console.log("Opening ZipForm…");
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
  } catch {
    /* ok */
  }
  await page.waitForSelector("tr.txn-item", { timeout: 20000 });

  console.log(`Opening transaction: ${search}`);
  // Use ZipForm search to surface the row
  try {
    const searchBox = page.getByPlaceholder(/search/i).first();
    if (await searchBox.count()) {
      await searchBox.fill(search);
      await page.waitForTimeout(1500);
    }
  } catch {
    /* ignore */
  }

  const row = page.locator("tr.txn-item").filter({ hasText: search }).first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await row.locator("h4").first().click({ force: true });
  await page.waitForTimeout(3500);

  // Back to List exists hidden in templates — wait for a visible detail chrome
  await page.waitForFunction(
    () => {
      const nodes = [...document.querySelectorAll('span[data-lang="back_to_list"], *')];
      const visibleBack = nodes.some((el) => {
        if (!/Back to List/i.test(el.textContent || "")) return false;
        if (el.children.length > 3) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const t = document.body?.innerText || "";
      return visibleBack || (/Transaction details/i.test(t) && /TID\s*\d+/i.test(t));
    },
    undefined,
    { timeout: 25000 },
  ).catch(async () => {
    await page.screenshot({ path: path.join(OUT, "no-detail.png") });
    throw new Error("Transaction detail did not open — see .zipform/no-detail.png");
  });
  console.log("Detail open");

  console.log("Opening ALL FORMS / Documents…");
  await page.getByText("ALL FORMS", { exact: false }).first().click({ force: true });
  await page.waitForTimeout(2000);

  // Expand the filled lease folder if present
  const folder = page.getByText(/Residential Lease - \d+ - .*Calendula/i).first();
  if (await folder.count()) {
    console.log("Expanding lease folder…");
    await folder.click({ force: true });
    await page.waitForTimeout(1500);
  }

  // The actual form/PDF row (TXR-2001), not the folder
  const formRow = page
    .locator("tr, .media, li, div")
    .filter({ hasText: /Residential Lease - 1\/26\s*-\s*\[TXR-2001\]/i })
    .first();

  if (!(await formRow.count())) {
    // Fallback: any TXR-2001 Residential Lease
    const alt = page.getByText(/Residential Lease.*TXR-2001/i).first();
    if (!(await alt.count())) {
      await page.screenshot({ path: path.join(OUT, "no-txr2001.png") });
      throw new Error("Could not find Residential Lease TXR-2001 document");
    }
    console.log("Opening TXR-2001 via text…");
    await alt.click({ force: true });
  } else {
    console.log("Found TXR-2001 row — opening document…");
    const downloadPromise = page.waitForEvent("download", { timeout: 12000 }).catch(() => null);

    // Click the document title (not toolbar "View RPR")
    const title = formRow.getByText(/Residential Lease - 1\/26\s*-\s*\[TXR-2001\]/i).first();
    await title.scrollIntoViewIfNeeded().catch(() => {});
    await title.dblclick({ force: true }).catch(async () => {
      await title.click({ force: true });
    });
    await page.waitForTimeout(2000);

    // Row actions menu (avoid global "View RPR")
    const more = formRow.locator("[class*='dropdown'], .icon-more, .btn-actions, button").filter({
      hasNotText: /RPR|MLS|CMA/i,
    }).last();
    if (await more.count()) {
      await more.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      const item = page
        .locator(".dropdown-menu a, .dropdown-menu button, .dropdown-menu li, [role='menuitem']")
        .filter({ hasText: /^(View document|View|Open|Download|Preview|Edit form)$/i })
        .first();
      if (await item.count()) {
        console.log("Menu:", ((await item.innerText()) || "").trim());
        await item.click({ force: true });
      }
    }

    const download = await downloadPromise;
    if (download) {
      const dest = path.join(OUT, "lease-TXR-2001.pdf");
      await download.saveAs(dest);
      console.log("✓ Downloaded →", dest);
    }
  }

  await page.waitForTimeout(3000);

  let formPage = page;
  if (context.pages().length > 1) {
    formPage = context.pages()[context.pages().length - 1];
    await formPage.bringToFront();
    await formPage.waitForTimeout(1500);
  }

  // Dismiss workspace chooser if present
  for (const label of [
    "OPEN MY PREVIOUS WORKSPACE",
    "Open My Previous Workspace",
    "START A NEW WORKSPACE",
    "Start a New Workspace",
  ]) {
    const btn = formPage.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await btn.count()) {
      console.log("Workspace modal →", label);
      // Prefer previous workspace (has the filled lease packet)
      if (/PREVIOUS/i.test(label) || !(await formPage.getByRole("button", { name: /PREVIOUS/i }).count())) {
        await btn.click({ force: true });
        await formPage.waitForTimeout(3000);
        break;
      }
    }
  }
  // Explicit prefer previous
  const prev = formPage.getByRole("button", { name: /OPEN MY PREVIOUS WORKSPACE/i }).first();
  if (await prev.count()) {
    await prev.click({ force: true });
    await formPage.waitForTimeout(3500);
  }

  // Click Residential Lease form in workspace / sidebar (the TXR form, not addenda)
  const leaseInWs = formPage
    .getByText(/Residential Lease - 1\/26/i)
    .filter({ hasNotText: /Addendum|Animal|Flood|Bed Bug|Listing|Rules/i })
    .first();
  if (await leaseInWs.count()) {
    console.log("Opening Residential Lease - 1/26 in workspace…");
    await leaseInWs.click({ force: true });
    await formPage.waitForTimeout(4000);
  }

  // Also try Grab From Transaction PDF for the lease packet
  const leasePdf = formPage.getByText(/Residential Lease - 126 - 1220 Calendula/i).first();
  if (await leasePdf.count()) {
    console.log("Clicking lease PDF in Grab From Transaction…");
    await leasePdf.click({ force: true });
    await formPage.waitForTimeout(2000);
  }

  // Try toolbar Download to save PDF
  const downloadPromise = formPage.waitForEvent("download", { timeout: 8000 }).catch(() => null);
  const dl = formPage.getByRole("button", { name: /Download/i }).or(formPage.locator('[title*="Download" i]')).first();
  if (await dl.count()) {
    console.log("Trying Download…");
    await dl.click({ force: true }).catch(() => {});
  }
  const download = await downloadPromise;
  if (download) {
    const dest = path.join(OUT, "lease-TXR-2001.pdf");
    await download.saveAs(dest);
    console.log("✓ Downloaded →", dest);
  }

  await formPage.waitForTimeout(2000);

  const { data, frameTexts } = await dump(formPage, "lease-pdf-probe");
  const allText = [data.text, ...frameTexts.map((f) => f.text)].join("\n");
  const allInputs = [...data.inputs, ...frameTexts.flatMap((f) => f.inputs || [])];
  const dateInputs = allInputs.filter((i) => /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(i.val || ""));
  const hits =
    allText.match(
      /(.{0,70}(?:lease\s*)?(?:start|end|commencement|expiration|beginning|ending|term|occup).{0,70})/gi,
    ) || [];

  console.log("URL:", data.url);
  console.log("Title:", data.title);
  console.log("Pages open:", context.pages().length);
  console.log("Frames:", frameTexts.length);
  console.log("Date-like inputs:", dateInputs.slice(0, 40));
  console.log("Text hits:\n" + hits.slice(0, 40).join("\n"));
  console.log("✓ Wrote .zipform/lease-pdf-probe.json + .png");

  // Keep browser open a moment if PDF viewer appeared
  if (/\.pdf|pdfjs|viewer/i.test(data.url + data.title + JSON.stringify(data.embeds))) {
    console.log("(PDF viewer detected)");
  }
} finally {
  await context.close().catch(() => {});
}
