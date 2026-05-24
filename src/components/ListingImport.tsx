"use client";

import { useState } from "react";

const SAMPLE_CSV = `title,address,price,status,property_type,external_id
Modern Condo,123 Main St Austin TX,$2400 / month,active,condo,condo-001
Spacious Townhouse,456 Oak Ave,$3200 / month,active,townhome,town-002
Green Acres Plot,789 Country Rd,$150000,active,land,land-003
Oak Street Rental,321 Oak St,$1800 / month,active,rental,rental-004`;

export function ListingImport({ demoMode = false, compact = false }: { demoMode?: boolean; compact?: boolean }) {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  async function handleImport() {
    setLoading(true);
    setStatus(null);
    try {
      const url = demoMode ? "/api/dev/listings/import" : "/api/listings/import";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "csv", data: csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Import failed");
      } else {
        setStatus(
          `Imported ${data.imported} listings` +
            (data.errors?.length ? ` (${data.errors.length} errors)` : "")
        );
        window.location.reload();
      }
    } catch {
      setStatus("Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsv(text);
  }

  if (compact) {
    return (
      <div>
        {!expanded ? (
          <button type="button" className="btn btn-primary" onClick={() => setExpanded(true)}>
            ⬆ Upload CSV
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} />
            <textarea
              rows={4}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              style={{ fontSize: "0.78rem", fontFamily: "monospace", resize: "vertical", background: "var(--color-card-bg)", color: "var(--color-text)", border: "1px solid rgba(128,128,128,0.3)", borderRadius: "6px", padding: "0.5rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-primary" onClick={handleImport} disabled={loading}>
                {loading ? "Importing…" : "Import"}
              </button>
              <button type="button" className="btn" onClick={() => setExpanded(false)}>Cancel</button>
            </div>
            {status && <p className="status-msg">{status}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="import-panel glass">
      <h2>Import Listings (CSV)</h2>
      <p className="status-msg">
        Columns: title, address, price, status, external_id, image_url. MLS webhook uses{" "}
        <code>/api/webhooks/mls</code> when credentials are ready.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={handleFile} />
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} />
      <button type="button" className="btn btn-primary" onClick={handleImport} disabled={loading}>
        {loading ? "Importing…" : "Import CSV"}
      </button>
      {status && <p className="status-msg">{status}</p>}
    </section>
  );
}
