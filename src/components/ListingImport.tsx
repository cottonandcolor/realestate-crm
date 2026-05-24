"use client";

import { useState } from "react";

const SAMPLE_CSV = `title,address,price,status,external_id
Modern Condo,123 Main St Austin TX,$2400 / month,active,condo-001
Spacious Townhouse,456 Oak Ave,$3200 / month,active,town-002`;

export function ListingImport() {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/listings/import", {
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
