"use client";

import { useMemo, useState } from "react";
import type { Contact, Lead } from "@/lib/types/database";
import { formatDateAdded } from "@/lib/dates";
import { LeadDetailDrawer } from "./LeadDetailDrawer";

export function LeadsTable({
  leads,
  contacts,
  onLeadUpdated,
  demoMode = false,
}: {
  leads: Lead[];
  contacts: Contact[];
  onLeadUpdated: (lead: Lead) => void;
  demoMode?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Lead>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    let rows = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        (l.email ?? "").toLowerCase().includes(term) ||
        (l.phone ?? "").includes(term) ||
        l.tags.join(" ").toLowerCase().includes(term)
    );
    rows = [...rows].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return rows;
  }, [leads, search, sortKey, sortAsc]);

  function handleSort(key: keyof Lead) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function notifyAssign(lead: Lead) {
    if (!lead.assigned_agent_id) return;
    if (demoMode) {
      alert(`Demo: would email agent about lead "${lead.name}"`);
      return;
    }
    await fetch("/api/email/lead-assigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, agentUserId: lead.assigned_agent_id }),
    });
  }

  function exportLeads() {
    window.location.href = `/api/export?type=leads&format=csv`;
  }

  return (
    <>
      {activeLead && (
        <LeadDetailDrawer
          lead={activeLead}
          contacts={contacts}
          onClose={() => setActiveLead(null)}
          onLeadUpdated={(updated) => {
            onLeadUpdated(updated);
            setActiveLead(updated);
          }}
        />
      )}

      <section className="leads" id="leads">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Leads</h2>
          <button type="button" className="btn" onClick={exportLeads} title="Export leads as CSV">
            ⬇ Export CSV
          </button>
        </div>
        <input
          type="text"
          className="search"
          style={{ marginBottom: "1rem" }}
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <table className="glass">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>Name</th>
              <th onClick={() => handleSort("created_at")}>Date added</th>
              <th onClick={() => handleSort("email")}>Email</th>
              <th onClick={() => handleSort("phone")}>Phone</th>
              <th>Tags</th>
              <th>Contact</th>
              <th>Activity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const linked = l.contact_id
                ? contacts.find((c) => c.id === l.contact_id)
                : undefined;
              const linkedName = linked
                ? [linked.first_name, linked.last_name].filter(Boolean).join(" ")
                : null;
              return (
              <tr key={l.id} style={{ cursor: "pointer" }}>
                <td onClick={() => setActiveLead(l)}>{l.name}</td>
                <td onClick={() => setActiveLead(l)} style={{ whiteSpace: "nowrap" }}>
                  {formatDateAdded(l.created_at)}
                </td>
                <td onClick={() => setActiveLead(l)}>{l.email ?? "—"}</td>
                <td onClick={() => setActiveLead(l)}>{l.phone ?? "—"}</td>
                <td onClick={() => setActiveLead(l)}>{l.tags.join(", ") || "—"}</td>
                <td onClick={() => setActiveLead(l)}>
                  {linkedName ? (
                    <span style={{ color: "var(--indigo-400)" }}>{linkedName}</span>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: "0.78rem", padding: "0.15rem 0.5rem" }}
                      onClick={(e) => { e.stopPropagation(); setActiveLead(l); }}
                    >
                      Link contact
                    </button>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn"
                    title="View activity & notes"
                    onClick={() => setActiveLead(l)}
                    style={{ fontSize: "0.82rem" }}
                  >
                    📋 Notes
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn"
                    title="Send assignment email"
                    onClick={() => notifyAssign(l)}
                    disabled={!l.assigned_agent_id}
                  >
                    ✉️
                  </button>
                </td>
              </tr>
            );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>No leads yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
