# Agent Hub (Playwright)

Pull transaction data from [Full Circle Agent Hub](https://www.fullcircle-agenthub.com/backoffice/transactions) using a local browser session.

**Credentials stay on your machine** — session is saved in `.agenthub/` (gitignored).

## Setup (once)

```bash
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

## 1. Log in and save session

**Recommended — you sign in manually in a real browser window:**

```bash
PLAYWRIGHT_BROWSERS_PATH=0 node scripts/agenthub/login.mjs
```

Or via npm:

```bash
npm run agenthub:login
```

1. A Chromium window opens at the login page  
2. Enter your email and password  
3. Complete 2FA if required  
4. Return to the terminal and press **Enter**

**Automated login** reads credentials from `/tmp/env` (line 1: email, line 2: password):

```bash
npm run agenthub:login
```

Or set `AGENTHUB_EMAIL` / `AGENTHUB_PASSWORD` in the environment instead.

## 2. Scrape transactions

```bash
PLAYWRIGHT_BROWSERS_PATH=0 node scripts/agenthub/scrape-transactions.mjs
```

Or:

```bash
npm run agenthub:scrape
```

Output (per transaction):

- **property_address** — full address from the detail page
- **lease_start_date** / **lease_end_date** — lease term (leases only)
- **landlord_name** — landlord on lease transactions
- Plus ref #, type, status, close date, monthly rent, detail URL

Files:

- `.agenthub/transactions.json`
- `.agenthub/transactions.csv`

If scraping returns 0 rows, check `.agenthub/transactions-debug.png` and we can tune selectors for the table layout.

## Re-login

Sessions expire. If scrape says "Session expired", run `login.mjs` again.

## 3. Sync into CRM Lease Listings tab

After scraping, push lease rows into the app:

```bash
npm run agenthub:sync-leases
```

This writes `public/data/agenthub-leases.json`. The Lease Listings tab imports that file on load (and via **Sync Agent Hub**).

Full refresh pipeline:

```bash
npm run agenthub:scrape && npm run agenthub:sync-leases
```

## npm scripts

| Script | Command |
|--------|---------|
| `npm run agenthub:login` | Manual browser login |
| `npm run agenthub:scrape` | Scrape transactions |
| `npm run agenthub:sync-leases` | Update CRM lease listing data |
