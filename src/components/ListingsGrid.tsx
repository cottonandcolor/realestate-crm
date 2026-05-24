"use client";

import { useState } from "react";
import type { Listing, PropertyType } from "@/lib/types/database";

const TYPE_LABELS: Record<PropertyType, string> = {
  sfh: "SFH",
  condo: "Condo",
  townhome: "Townhome",
  land: "Land",
  lease: "Lease",
  rental: "Rental",
};

const TYPE_COLORS: Record<PropertyType, string> = {
  sfh: "#2d6a4f",
  condo: "#1a6496",
  townhome: "#7b2d8b",
  land: "#8b5e2d",
  lease: "#1a4c6e",
  rental: "#b5451b",
};

const ALL_TYPES: (PropertyType | "all")[] = [
  "all", "sfh", "condo", "townhome", "land", "lease", "rental",
];

function TypeBadge({ type }: { type: PropertyType }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        padding: "0.2rem 0.5rem",
        borderRadius: "4px",
        background: TYPE_COLORS[type],
        color: "#fff",
        marginBottom: "0.35rem",
      }}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export function ListingsGrid({ listings }: { listings: Listing[] }) {
  const [activeType, setActiveType] = useState<PropertyType | "all">("all");

  const availableTypes = ALL_TYPES.filter(
    (t) => t === "all" || listings.some((l) => l.property_type === t)
  );

  const filtered =
    activeType === "all"
      ? listings
      : listings.filter((l) => l.property_type === activeType);

  return (
    <section className="listings" id="listings">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Listings</h2>
        <a href="/api/export?type=listings&format=csv" className="btn">
          ⬇ Export CSV
        </a>
      </div>

      {availableTypes.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}
        >
          {availableTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveType(t)}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: activeType === t ? 700 : 400,
                fontSize: "0.85rem",
                background:
                  activeType === t
                    ? t === "all"
                      ? "var(--color-primary-light)"
                      : TYPE_COLORS[t as PropertyType]
                    : "var(--color-card-bg)",
                color: activeType === t ? "#fff" : "var(--color-text)",
                boxShadow:
                  activeType === t ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                transition: "var(--transition)",
              }}
            >
              {t === "all" ? "All" : TYPE_LABELS[t as PropertyType]}
            </button>
          ))}
        </div>
      )}

      <div className="grid">
        {filtered.map((l) => (
          <div key={l.id} className="listing-card glass">
            {l.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image_url} alt={l.title} />
            ) : (
              <div className="listing-placeholder">No photo</div>
            )}
            <div className="info">
              {l.property_type && <TypeBadge type={l.property_type} />}
              <h3>{l.title}</h3>
              <p>{l.price_display ?? "Price TBD"}</p>
              {l.address && (
                <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>{l.address}</p>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p
            className="glass"
            style={{ gridColumn: "1 / -1" }}
          >
            {activeType === "all"
              ? "No listings yet. Import a CSV or add listings in Supabase."
              : `No ${TYPE_LABELS[activeType as PropertyType]} listings found.`}
          </p>
        )}
      </div>
    </section>
  );
}
