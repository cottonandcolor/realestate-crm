"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types/database";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Lead>("name");
  const [sortAsc, setSortAsc] = useState(true);

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
    await fetch("/api/email/lead-assigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, agentUserId: lead.assigned_agent_id }),
    });
  }

  return (
    <section className="leads" id="leads">
      <h2>Leads</h2>
      <input
        type="text"
        className="search"
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
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id}>
              <td>{l.name}</td>
              <td>{l.email ?? "—"}</td>
              <td>{l.phone ?? "—"}</td>
              <td>{l.tags.join(", ") || "—"}</td>
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
              <td colSpan={5}>No leads yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
