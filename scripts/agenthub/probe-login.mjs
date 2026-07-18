/**
 * Probe Agent Hub login page selectors (no credentials).
 * Run: node scripts/agenthub/probe-login.mjs
 */
import { chromium } from "playwright";

const URL = "https://www.fullcircle-agenthub.com/backoffice/transactions";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

console.log("Final URL:", page.url());
console.log("Title:", await page.title());

const inputs = await page.locator("input").evaluateAll((els) =>
  els.map((el) => ({
    type: el.getAttribute("type"),
    name: el.getAttribute("name"),
    id: el.getAttribute("id"),
    placeholder: el.getAttribute("placeholder"),
    autocomplete: el.getAttribute("autocomplete"),
  }))
);
console.log("Inputs:", JSON.stringify(inputs, null, 2));

const buttons = await page.locator("button").evaluateAll((els) =>
  els.map((el) => ({
    type: el.getAttribute("type"),
    text: el.textContent?.trim().slice(0, 80),
  }))
);
console.log("Buttons:", JSON.stringify(buttons, null, 2));

await browser.close();
