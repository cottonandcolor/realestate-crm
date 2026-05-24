"use client";

import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const theme =
      saved ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;
  return <>{children}</>;
}

export function ThemeToggle() {
  function toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      🌙
    </button>
  );
}
