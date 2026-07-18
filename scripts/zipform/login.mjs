/**
 * Save a ZipForm Plus login session for later scraping.
 *
 * Uses a persistent Chromium profile (.zipform/browser-profile) so cookies
 * survive the way a normal browser does (storageState alone is flaky on ZipForm).
 *
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/login.mjs
 *   npm run zipform:login
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import readline from "readline";

const LOGIN_URL = "https://www.zipformplus.com/default.aspx";
const SESSION_DIR = path.join(process.cwd(), ".zipform");
const PROFILE_DIR = path.join(SESSION_DIR, "browser-profile");
const SESSION_FILE = path.join(SESSION_DIR, "session.json");
const WAIT_MS = 600_000;

function ensureSessionDir() {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

function waitForEnter(prompt) {
  if (!process.stdin.isTTY) return new Promise(() => {});
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => {
      rl.close();
      resolve("enter");
    });
  });
}

ensureSessionDir();

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  slowMo: 50,
  viewport: { width: 1400, height: 900 },
  args: ["--start-maximized"],
});
const page = context.pages()[0] || (await context.newPage());

// Bring Chromium to the front on macOS (often opens behind Cursor)
try {
  const { execSync } = await import("child_process");
  execSync(
    `osascript -e 'tell application "Google Chrome for Testing" to activate' -e 'tell application "System Events" to set frontmost of process "Google Chrome for Testing" to true'`,
    { stdio: "ignore" },
  );
} catch {
  /* ignore */
}

try {
  console.log("Opening ZipForm Plus in a browser window…");
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  console.log("\n1. Sign in with your ZipForm credentials");
  console.log("2. Complete any 2FA if prompted");
  console.log("3. Open the Transactions list (Active transactions visible)");
  console.log("\nWaiting up to 10 minutes for the Transactions list…");
  if (process.stdin.isTTY) {
    console.log("(Or press Enter here anytime after you are logged in.)\n");
  } else {
    console.log("(Leave this Chromium window open — session saves automatically.)\n");
  }

  const detected = page
    .waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return /Active\s*\(\s*\d+\s*\)/i.test(t) || /TRANSACTION NAME/i.test(t);
      },
      undefined,
      { timeout: WAIT_MS },
    )
    .then(() => "detected");

  const how = await Promise.race([detected, waitForEnter("Press Enter after you are logged in… ")]);

  console.log(how === "detected" ? "✓ Transactions list detected" : "✓ Continuing after Enter");
  await page.waitForTimeout(2000);

  // SSO redirects briefly leave zipformplus.com — wait / navigate back
  for (let i = 0; i < 8; i++) {
    const url = page.url();
    if (/zipformplus\.com/i.test(url)) break;
    await page.waitForTimeout(1500);
  }
  if (!/zipformplus\.com/i.test(page.url())) {
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return /Active\s*\(\s*\d+\s*\)/i.test(t) || /TRANSACTION NAME/i.test(t);
      },
      undefined,
      { timeout: 60000 },
    );
  }
  if (!/zipformplus\.com/i.test(page.url())) {
    throw new Error(`Unexpected URL (${page.url()}). Stay on ZipForm and try again.`);
  }

  await context.storageState({ path: SESSION_FILE });
  console.log(`\n✓ Profile saved under ${PROFILE_DIR}`);
  console.log(`✓ Also wrote ${SESSION_FILE}`);
  console.log("Next: npm run zipform:scrape");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Target closed|closed|Timeout/i.test(msg)) {
    console.error("\nLogin did not finish — keep the Chromium window open until Transactions loads.");
    console.error("Then run again: npm run zipform:login");
  }
  throw err;
} finally {
  await context.close().catch(() => {});
}
