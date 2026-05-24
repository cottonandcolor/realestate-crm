import type { Listing } from "@/lib/types/database";

export function ListingsGrid({ listings }: { listings: Listing[] }) {
  return (
    <section className="listings" id="listings">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Listings</h2>
        <a href="/api/export?type=listings&format=csv" className="btn">
          ⬇ Export CSV
        </a>
      </div>
      <div className="grid">
        {listings.map((l) => (
          <div key={l.id} className="listing-card glass">
            {l.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image_url} alt={l.title} />
            ) : (
              <div className="listing-placeholder">No photo</div>
            )}
            <div className="info">
              <h3>{l.title}</h3>
              <p>{l.price_display ?? "Price TBD"}</p>
              {l.address && <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>{l.address}</p>}
            </div>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="glass" style={{ gridColumn: "1 / -1" }}>
            No listings yet. Import a CSV or add listings in Supabase.
          </p>
        )}
      </div>
    </section>
  );
}
