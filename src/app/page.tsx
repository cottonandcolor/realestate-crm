import Link from "next/link";
import { MarketingHeader } from "@/components/Header";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main className="main">
        <section className="glass">
          <h2>Team CRM for real estate</h2>
          <p style={{ marginTop: "1rem", lineHeight: 1.6 }}>
            Manage leads, listings, and tasks with Supabase auth, Google Calendar sync,
            email notifications, and CSV/MLS listing imports.
          </p>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/signup" className="btn btn-primary">
              Get started free
            </Link>
          </p>
        </section>
      </main>
      <footer className="footer">
        <p>© 2026 Real‑Estate CRM</p>
      </footer>
    </>
  );
}
