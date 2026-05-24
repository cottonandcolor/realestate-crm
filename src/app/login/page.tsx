"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-page">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function DemoLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function loginDemo() {
    setLoading(true);
    const res = await fetch("/api/dev/login", { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Demo login failed");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      style={{ width: "100%", background: "var(--color-primary-light)" }}
      onClick={loginDemo}
      disabled={loading}
    >
      {loading ? "Loading demo…" : "Continue as Demo Agent"}
    </button>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") ? "Authentication failed" : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-page">
      <form className="auth-card glass" onSubmit={handleSubmit}>
        <h1>Log in</h1>
        {error && <p className="auth-error">{error}</p>}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </button>
        {process.env.NEXT_PUBLIC_DEV_DEMO_MODE === "true" && (
          <>
            <p style={{ margin: "1rem 0", textAlign: "center", fontSize: "0.85rem", opacity: 0.7 }}>
              or
            </p>
            <DemoLoginButton />
          </>
        )}
        <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          No account? <Link href="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

