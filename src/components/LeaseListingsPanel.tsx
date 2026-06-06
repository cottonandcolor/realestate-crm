"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LEASE_LISTINGS,
  LEASE_ENDING_ALERT_DAYS,
  LEASE_TYPE_LABELS,
  LEASE_TYPE_OPTIONS,
  daysUntilLeaseEnd,
  formatLeaseDate,
  formatProperty,
  isLeaseEndingWithinDays,
  loadLeaseListings,
  parseContactsInput,
  saveLeaseListings,
  type LeaseListing,
  type LeaseListingType,
} from "@/lib/leaseListings";

type SortKey = "property" | "leaseStart" | "leaseEnd" | "contacts" | "type";

function leaseStatus(end: string): "active" | "ending-soon" | "ended" {
  const now = new Date();
  const endDate = new Date(end + "T23:59:59");
  const daysLeft = (endDate.getTime() - now.getTime()) / 86400000;
  if (daysLeft < 0) return "ended";
  if (daysLeft <= LEASE_ENDING_ALERT_DAYS) return "ending-soon";
  return "active";
}

const STATUS_STYLE = {
  active: { bg: "rgba(52,211,153,0.2)", color: "#34d399", label: "Active" },
  "ending-soon": { bg: "rgba(251,191,36,0.2)", color: "#fbbf24", label: "Ending soon" },
  ended: { bg: "rgba(229,62,62,0.2)", color: "#fc8181", label: "Ended" },
};

const inputStyle = { margin: 0, fontSize: "0.82rem", width: "100%", minWidth: 0 } as const;

export function LeaseListingsPanel() {
  const [listings, setListings] = useState<LeaseListing[]>(LEASE_LISTINGS);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("leaseEnd");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setListings(loadLeaseListings());
  }, []);

  function persist(next: LeaseListing[]) {
    setListings(next);
    saveLeaseListings(next);
  }

  function updateListing(id: string, patch: Partial<LeaseListing>) {
    persist(listings.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  const endingSoon = useMemo(
    () =>
      listings
        .filter((l) => isLeaseEndingWithinDays(l.leaseEnd, LEASE_ENDING_ALERT_DAYS))
        .sort((a, b) => daysUntilLeaseEnd(a.leaseEnd) - daysUntilLeaseEnd(b.leaseEnd)),
    [listings]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = listings;
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
      if (sortKey === "property") {
        av = formatProperty(a);
        bv = formatProperty(b);
      } else if (sortKey === "contacts") {
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
  }, [listings, search, sortKey, sortAsc]);

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

      <LeaseEndingAlert listings={endingSoon} />

      <input
        type="text"
        className="search"
        style={{ marginBottom: "1rem" }}
        placeholder="Search property, contact, or type…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", opacity: 0.55 }}>
        Click <strong>Edit</strong> on any row to change property, dates, contacts, or type.
      </p>

      <table className="glass">
        <thead>
          <tr>
            <th onClick={() => handleSort("property")}>Property</th>
            <th onClick={() => handleSort("leaseStart")}>Lease start</th>
            <th onClick={() => handleSort("leaseEnd")}>Lease end</th>
            <th onClick={() => handleSort("contacts")}>Contacts</th>
            <th onClick={() => handleSort("type")}>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <LeaseRow
              key={l.id}
              listing={l}
              isEditing={editingId === l.id}
              onEdit={() => setEditingId(l.id)}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => {
                updateListing(l.id, patch);
                setEditingId(null);
              }}
              onTypeChange={(type) => updateListing(l.id, { type })}
            />
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

function LeaseEndingAlert({ listings }: { listings: LeaseListing[] }) {
  const hasAlerts = listings.length > 0;

  return (
    <div
      className="glass"
      style={{
        marginBottom: "1.25rem",
        padding: "0.85rem 1rem",
        background: hasAlerts ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hasAlerts ? "#fbbf24" : "var(--color-border)"}`,
        borderRadius: "0.75rem",
      }}
    >
      <p
        style={{
          margin: "0 0 0.6rem",
          fontWeight: 700,
          color: hasAlerts ? "#fbbf24" : "var(--color-text-muted)",
          fontSize: "0.9rem",
        }}
      >
        {hasAlerts
          ? `${listings.length} lease${listings.length > 1 ? "s" : ""} ending within ${LEASE_ENDING_ALERT_DAYS} days`
          : `No leases ending within ${LEASE_ENDING_ALERT_DAYS} days`}
      </p>
      {hasAlerts && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {listings.map((l) => {
            const daysLeft = daysUntilLeaseEnd(l.leaseEnd);
            return (
              <p key={l.id} style={{ margin: 0, fontSize: "0.83rem" }}>
                <strong>{formatProperty(l)}</strong>
                {" — "}
                ends {formatLeaseDate(l.leaseEnd)}
                <span style={{ opacity: 0.75 }}>
                  {" "}· {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                  {l.contacts.length > 0 && ` · ${l.contacts.join(", ")}`}
                </span>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeaseRow({
  listing,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onTypeChange,
}: {
  listing: LeaseListing;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<LeaseListing>) => void;
  onTypeChange: (type: LeaseListingType) => void;
}) {
  const [address, setAddress] = useState(listing.address);
  const [city, setCity] = useState(listing.city);
  const [leaseStart, setLeaseStart] = useState(listing.leaseStart);
  const [leaseEnd, setLeaseEnd] = useState(listing.leaseEnd);
  const [contactsDraft, setContactsDraft] = useState(listing.contacts.join(", "));
  const [type, setType] = useState(listing.type);

  useEffect(() => {
    if (!isEditing) {
      setAddress(listing.address);
      setCity(listing.city);
      setLeaseStart(listing.leaseStart);
      setLeaseEnd(listing.leaseEnd);
      setContactsDraft(listing.contacts.join(", "));
      setType(listing.type);
    }
  }, [listing, isEditing]);

  const status = leaseStatus(isEditing ? leaseEnd : listing.leaseEnd);
  const style = STATUS_STYLE[status];

  function handleSave() {
    const addressTrim = address.trim();
    const cityTrim = city.trim();
    if (!addressTrim || !cityTrim || !leaseStart || !leaseEnd) return;
    onSave({
      address: addressTrim,
      city: cityTrim,
      leaseStart,
      leaseEnd,
      contacts: parseContactsInput(contactsDraft),
      type,
    });
  }

  if (isEditing) {
    return (
      <tr style={{ background: "rgba(99,102,241,0.08)" }}>
        <td>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" style={inputStyle} />
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" style={inputStyle} />
          </div>
        </td>
        <td>
          <input type="date" className="input" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} style={inputStyle} />
        </td>
        <td>
          <input type="date" className="input" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} style={inputStyle} />
        </td>
        <td>
          <input
            className="input"
            value={contactsDraft}
            onChange={(e) => setContactsDraft(e.target.value)}
            placeholder="Names, comma-separated"
            style={inputStyle}
          />
        </td>
        <td>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as LeaseListingType)}
            style={{ ...inputStyle, minWidth: "8.5rem" }}
          >
            {LEASE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
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
        <td>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }} onClick={handleSave}>
              Save
            </button>
            <button type="button" className="btn" style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{formatProperty(listing)}</td>
      <td style={{ whiteSpace: "nowrap" }}>{formatLeaseDate(listing.leaseStart)}</td>
      <td style={{ whiteSpace: "nowrap" }}>{formatLeaseDate(listing.leaseEnd)}</td>
      <td>{listing.contacts.join(", ")}</td>
      <td>
        <select
          className="input"
          value={listing.type}
          onChange={(e) => onTypeChange(e.target.value as LeaseListingType)}
          style={{ margin: 0, fontSize: "0.82rem", padding: "0.3rem 0.45rem", minWidth: "8.5rem" }}
        >
          {LEASE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
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
      <td>
        <button type="button" className="btn" style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }} onClick={onEdit}>
          Edit
        </button>
      </td>
    </tr>
  );
}
