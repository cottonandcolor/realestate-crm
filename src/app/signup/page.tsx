"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureUserOrg } from "@/lib/org";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      try {
        await ensureUserOrg(supabase, orgName || `${fullName}'s Team`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create team");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("Check your email to confirm your account, then log in.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card glass" onSubmit={handleSubmit}>
        <h1>Sign up</h1>
        {error && <p className="auth-error">{error}</p>}
        <label htmlFor="fullName">Your name</label>
        <input
          id="fullName"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <label htmlFor="orgName">Team / brokerage name</label>
        <input
          id="orgName"
          className="input"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="e.g. Downtown Realty Group"
        />
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
          minLength={6}
          required
        />
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
