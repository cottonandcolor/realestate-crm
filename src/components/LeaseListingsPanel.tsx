"use client";

import { useMemo, useState } from "react";
import { LEASE_LISTINGS, LEASE_TYPE_LABELS, formatLeaseDate, type LeaseListing } from "@/lib/leaseListings";

type SortKey = "address" | "city" | "leaseStart" | "leaseEnd" | "contacts" | "type";

function leaseStatus(end: string): "active" | "ending-soon" | "ended" {
  const now = new Date();
  const endDate = new Date(end + "T23:59:59");
  const daysLeft = (endDate.getTime() - now.getTime()) / 86400000;
  if (daysLeft < 0) return "ended";
  if (daysLeft <= 60) return "ending-soon";
  return "active";
}

const STATUS_STYLE = {
  active: { bg: "rgba(52,211,153,0.2)", color: "#34d399", label: "Active" },
  "ending-soon": { bg: "rgba(251,191,36,0.2)", color: "#fbbf24", label: "Ending soon" },
  ended: { bg: "rgba(229,62,62,0.2)", color: "#fc8181", label: "Ended" },
};

export function LeaseListingsPanel() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("leaseEnd");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = LEASE_LISTINGS;
    if (q) {
      rows = rows.filter(
        (l) =>
          l.address.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.contacts.some((t) => t.toLowerCase().includes(q)) ||
          LEASE_TYPE_LABELS[l.type].toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let av: string;
      let bv: string;
      if (sortKey === "contacts") {
        av = a.contacts.join(", ");
        bv = b.contacts.join(", ");
      } else if (sortKey === "type") {
        av = LEASE_TYPE_LABELS[a.type];
        bv = LEASE_TYPE_LABELS[b.type];
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      const cmp = av.localeCompare(bv);
      return sortAsc ? cmp : -cmp;
    });
  }, [search, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <section className="lease-listings" id="lease-listings">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Lease Listings</h2>
        <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
          {filtered.length} lease{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <input
        type="text"
        className="search"
        style={{ marginBottom: "1rem" }}
        placeholder="Search address, city, contact, or type…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="glass">
        <thead>
          <tr>
            <th onClick={() => handleSort("address")}>Address</th>
            <th onClick={() => handleSort("city")}>City</th>
            <th onClick={() => handleSort("leaseStart")}>Lease start</th>
            <th onClick={() => handleSort("leaseEnd")}>Lease end</th>
            <th onClick={() => handleSort("contacts")}>Contacts</th>
            <th onClick={() => handleSort("type")}>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <LeaseRow key={l.id} listing={l} />
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7}>No lease listings match your search.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function LeaseRow({ listing }: { listing: LeaseListing }) {
  const status = leaseStatus(listing.leaseEnd);
  const style = STATUS_STYLE[status];

  return (
    <tr>
      <td>{listing.address}</td>
      <td>{listing.city}</td>
      <td style={{ whiteSpace: "nowrap" }}>{formatLeaseDate(listing.leaseStart)}</td>
      <td style={{ whiteSpace: "nowrap" }}>{formatLeaseDate(listing.leaseEnd)}</td>
      <td>{listing.contacts.join(", ")}</td>
      <td>{LEASE_TYPE_LABELS[listing.type]}</td>
      <td>
        <span
          style={{
            display: "inline-block",
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: "0.15rem 0.5rem",
            borderRadius: "999px",
            background: style.bg,
            color: style.color,
          }}
        >
          {style.label}
        </span>
      </td>
    </tr>
  );
}
