"use client";

import { useState } from "react";

type ExportType = "all" | "leads" | "contacts" | "listings" | "tasks";
type ExportFormat = "csv" | "json";

const TYPES: { value: ExportType; label: string }[] = [
  { value: "all",      label: "All data" },
  { value: "leads",    label: "Leads" },
  { value: "contacts", label: "Contacts" },
  { value: "listings", label: "Listings" },
  { value: "tasks",    label: "Tasks" },
];

export function ExportPanel({ compact = false }: { compact?: boolean }) {
  const [type, setType] = useState<ExportType>("all");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?type=${type}&format=${format}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `export.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  const controls = (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <select
        className="input"
        style={{ maxWidth: "160px", margin: 0, fontSize: "0.88rem" }}
        value={type}
        onChange={(e) => setType(e.target.value as ExportType)}
        aria-label="Export type"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <div style={{ display: "flex", gap: "0.35rem" }}>
        {(["csv", "json"] as ExportFormat[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`btn${format === f ? " btn-primary" : ""}`}
            onClick={() => setFormat(f)}
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleExport}
        disabled={loading}
        style={{ fontSize: "0.88rem" }}
      >
        {loading ? "…" : "⬇ Download"}
      </button>
    </div>
  );

  if (compact) return controls;

  return (
    <section className="glass export-panel" style={{ marginBottom: "2rem" }}>
      <h2>Export Data</h2>
      <div style={{ marginTop: "1rem" }}>{controls}</div>
      <p className="status-msg" style={{ marginTop: "0.75rem", fontSize: "0.82rem" }}>
        CSV opens in Excel / Google Sheets. JSON is useful for backups.
      </p>
    </section>
  );
}
