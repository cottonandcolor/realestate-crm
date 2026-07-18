# ZipForm Plus (Playwright)

Pull lease start/end dates from [ZipForm Plus](https://www.zipformplus.com/default.aspx) using a local browser session.

**Credentials stay on your machine** — session is saved in `.zipform/` (gitignored). Never paste cookies into chat.

## Setup (once)

```bash
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

## 1. Log in and save session

```bash
npm run zipform:login
```

1. A Chromium window opens at ZipForm  
2. Sign in (and 2FA if needed)  
3. Open **Transactions** so you see the Active list  
4. Return to the terminal and press **Enter**

## 2. Scrape lease transactions

```bash
npm run zipform:scrape
```

Opens each **Residential Lease** form (TXR-2001) for commencement / expiration dates.

Options:

```bash
# First 3 only (smoke test)
PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/scrape-leases.mjs --headed --limit=3

# Prefer ZipForm "Listings" filter
PLAYWRIGHT_BROWSERS_PATH=0 node scripts/zipform/scrape-leases.mjs --headed --listings-only
```

Output:

- `.zipform/leases.json`
- `.zipform/leases.csv`

## 3. Sync into CRM Lease Listings tab

```bash
npm run zipform:sync-leases
```

Writes `public/data/zipform-leases.json`. The CRM **Lease Listings** tab imports it on load (and via **Sync leases**).

The tab already shows a **75-day** “ending soon” alert banner for leases whose end date is within 75 days.

Full refresh:

```bash
npm run zipform:scrape && npm run zipform:sync-leases
```

## npm scripts

| Script | Command |
|--------|---------|
| `npm run zipform:login` | Manual browser login |
| `npm run zipform:scrape` | Scrape lease rows + form dates |
| `npm run zipform:sync-leases` | Update CRM lease listing data |
