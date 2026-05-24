"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header({
  email,
  demoMode = false,
}: {
  email?: string | null;
  demoMode?: boolean;
}) {
  const router = useRouter();

  async function signOut() {
    if (demoMode) {
      await fetch("/api/dev/logout", { method: "POST" });
    } else {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="header">
      <div className="hero">
        <h1>Real‑Estate CRM</h1>
        <div className="header-actions">
          {email && <span style={{ color: "#fff", fontSize: "0.85rem" }}>{email}</span>}
          <ThemeToggle />
          <button type="button" className="btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export function MarketingHeader() {
  return (
    <header className="header">
      <div className="hero">
        <h1>Real‑Estate CRM</h1>
        <div className="header-actions">
          <ThemeToggle />
          <Link href="/login" className="btn">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
