# Real Estate CRM

Team CRM for real estate agents: leads, listings, Kanban tasks, Google Calendar sync, Resend emails, and CSV/MLS listing imports.

**Stack:** Next.js 15 · Supabase · Vercel · Google Calendar · Resend

## Quick start

### 1. Install dependencies

Requires [Node.js](https://nodejs.org/) 20+ (or use the setup script).

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Or manually:

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
3. Copy **Project URL**, **anon key**, and **service role key** into `.env.local`.
4. Under **Authentication → URL configuration**, add:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Google Calendar (optional)

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com).
2. Add redirect URI: `http://localhost:3000/api/calendar/callback`
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env.local`.

### 4. Resend (optional)

1. Sign up at [resend.com](https://resend.com).
2. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and use the dashboard.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in [vercel.com](https://vercel.com).
3. Add all variables from `.env.example` in **Project Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL.
5. Update Supabase redirect URLs and Google OAuth redirect to match production.

## Listing import

- **CSV:** Use the import panel on the dashboard, or `POST /api/listings/import` with `{ "source": "csv", "data": "..." }`.
- **MLS webhook:** `POST /api/webhooks/mls` with headers `x-mls-webhook-secret` and `x-org-id` (requires `MLS_WEBHOOK_SECRET` and service role key).

## Legacy prototype

The original static demo lives in [`legacy/`](legacy/) for reference.
