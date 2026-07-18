/**
 * Save an Agent Hub login session for later scraping.
 *
 * Automated (reads /tmp/env — line 1 email, line 2 password):
 *   npm run agenthub:login
 *
 * Manual browser login (no /tmp/env):
 *   PLAYWRIGHT_BROWSERS_PATH=0 node scripts/agenthub/login.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import readline from "readline";
import { loadAgentHubCredentials } from "./loadCredentials.mjs";

const LOGIN_URL = "https://www.fullcircle-agenthub.com/login";
const TRANSACTIONS_URL = "https://www.fullcircle-agenthub.com/backoffice/transactions";
const SESSION_DIR = path.join(process.cwd(), ".agenthub");
const SESSION_FILE = path.join(SESSION_DIR, "session.json");

const auto = process.argv.includes("--auto");

function ensureSessionDir() {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function waitForEnter(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => rl.question(prompt, () => { rl.close(); resolve(); }));
}

async function autoLogin(page) {
  const creds = loadAgentHubCredentials();
  if (!creds) {
    throw new Error(
      "No credentials: set AGENTHUB_EMAIL/AGENTHUB_PASSWORD or create /tmp/env (line 1: email, line 2: password)."
    );
  }
  const { email, password } = creds;
  await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/backoffice\//, { timeout: 60000 });
}

const browser = await chromium.launch({ headless: auto, slowMo: auto ? 0 : 50 });
const context = await browser.newContext();
const page = await context.newPage();

try {
  if (auto) {
    console.log("Signing in automatically…");
    await autoLogin(page);
  } else {
    console.log("Opening Agent Hub login in a browser window…");
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("\n1. Sign in with your email and password");
    console.log("2. Complete any 2FA if prompted");
    console.log("3. When you reach the dashboard, return here and press Enter\n");
    await waitForEnter("Press Enter after you are logged in… ");
    await page.goto(TRANSACTIONS_URL, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  }

  const url = page.url();
  if (!url.includes("fullcircle-agenthub.com") || url.includes("/login")) {
    throw new Error(`Still on login page (${url}). Sign-in may have failed.`);
  }

  ensureSessionDir();
  await context.storageState({ path: SESSION_FILE });
  console.log(`\n✓ Session saved to ${SESSION_FILE}`);
  console.log("Next: PLAYWRIGHT_BROWSERS_PATH=0 node scripts/agenthub/scrape-transactions.mjs");
} finally {
  await browser.close();
}
