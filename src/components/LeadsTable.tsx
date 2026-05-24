"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types/database";
import { LeadDetailDrawer } from "./LeadDetailDrawer";

export function LeadsTable({ leads, demoMode = false }: { leads: Lead[]; demoMode?: boolean }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Lead>("name");
  const [sortAsc, setSortAsc] = useState(true);
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
        <LeadDetailDrawer lead={activeLead} onClose={() => setActiveLead(null)} />
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
              <th onClick={() => handleSort("email")}>Email</th>
              <th onClick={() => handleSort("phone")}>Phone</th>
              <th>Tags</th>
              <th>Activity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} style={{ cursor: "pointer" }}>
                <td onClick={() => setActiveLead(l)}>{l.name}</td>
                <td onClick={() => setActiveLead(l)}>{l.email ?? "—"}</td>
                <td onClick={() => setActiveLead(l)}>{l.phone ?? "—"}</td>
                <td onClick={() => setActiveLead(l)}>{l.tags.join(", ") || "—"}</td>
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
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>No leads yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
