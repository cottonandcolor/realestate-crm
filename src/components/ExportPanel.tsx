"use client";

import { useState } from "react";

type ExportType = "all" | "leads" | "listings" | "tasks";
type ExportFormat = "csv" | "json";

const TYPES: { value: ExportType; label: string }[] = [
  { value: "all", label: "All data" },
  { value: "leads", label: "Leads only" },
  { value: "listings", label: "Listings only" },
  { value: "tasks", label: "Tasks only" },
];

export function ExportPanel() {
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

  return (
    <section className="glass export-panel" style={{ marginBottom: "2rem" }}>
      <h2>Export Data</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem", alignItems: "center" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            What to export
          </label>
          <select
            className="input"
            style={{ maxWidth: "180px", margin: 0 }}
            value={type}
            onChange={(e) => setType(e.target.value as ExportType)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Format
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className={`btn${format === "csv" ? " btn-primary" : ""}`}
              onClick={() => setFormat("csv")}
            >
              CSV
            </button>
            <button
              type="button"
              className={`btn${format === "json" ? " btn-primary" : ""}`}
              onClick={() => setFormat("json")}
            >
              JSON
            </button>
          </div>
        </div>

        <div style={{ alignSelf: "flex-end" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? "Exporting…" : `⬇ Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
      <p className="status-msg" style={{ marginTop: "0.75rem" }}>
        CSV opens in Excel / Google Sheets. JSON is useful for backups or importing elsewhere.
      </p>
    </section>
  );
}
