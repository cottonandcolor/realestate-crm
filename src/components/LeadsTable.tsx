"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contact, Lead, LeadStage } from "@/lib/types/database";
import { formatDateAdded } from "@/lib/dates";
import { LeadDetailDrawer } from "./LeadDetailDrawer";

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

const inputStyle = { margin: 0, fontSize: "0.82rem", width: "100%", minWidth: 0 } as const;

function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  async function saveLead(
    id: string,
    patch: {
      name: string;
      email: string | null;
      phone: string | null;
      tags: string[];
      stage: LeadStage;
    }
  ) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      onLeadUpdated(updated);
      setEditingId(null);
    }
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
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", opacity: 0.55 }}>
          Click <strong>Edit</strong> to change name, email, phone, tags, or stage. Click a row for notes and contact linking.
        </p>
        <table className="glass">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>Name</th>
              <th onClick={() => handleSort("created_at")}>Date added</th>
              <th onClick={() => handleSort("email")}>Email</th>
              <th onClick={() => handleSort("phone")}>Phone</th>
              <th onClick={() => handleSort("stage")}>Stage</th>
              <th>Tags</th>
              <th>Contact</th>
              <th>Actions</th>
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
                <LeadRow
                  key={l.id}
                  lead={l}
                  linkedName={linkedName}
                  isEditing={editingId === l.id}
                  onEdit={() => setEditingId(l.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => saveLead(l.id, patch)}
                  onOpen={() => setActiveLead(l)}
                  onNotify={() => notifyAssign(l)}
                />
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

function LeadRow({
  lead,
  linkedName,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onOpen,
  onNotify,
}: {
  lead: Lead;
  linkedName: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: {
    name: string;
    email: string | null;
    phone: string | null;
    tags: string[];
    stage: LeadStage;
  }) => void;
  onOpen: () => void;
  onNotify: () => void;
}) {
  const [name, setName] = useState(lead.name);
  const [email, setEmail] = useState(lead.email ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [tagsDraft, setTagsDraft] = useState(lead.tags.join(", "));
  const [stage, setStage] = useState<LeadStage>(lead.stage);

  useEffect(() => {
    if (!isEditing) {
      setName(lead.name);
      setEmail(lead.email ?? "");
      setPhone(lead.phone ?? "");
      setTagsDraft(lead.tags.join(", "));
      setStage(lead.stage);
    }
  }, [lead, isEditing]);

  function handleSave() {
    const nameTrim = name.trim();
    if (!nameTrim) return;
    onSave({
      name: nameTrim,
      email: email.trim() || null,
      phone: phone.trim() || null,
      tags: parseTagsInput(tagsDraft),
      stage,
    });
  }

  if (isEditing) {
    return (
      <tr style={{ background: "rgba(99,102,241,0.08)" }}>
        <td>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </td>
        <td style={{ whiteSpace: "nowrap", opacity: 0.7 }}>{formatDateAdded(lead.created_at)}</td>
        <td>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </td>
        <td>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
        </td>
        <td>
          <select className="input" value={stage} onChange={(e) => setStage(e.target.value as LeadStage)} style={inputStyle}>
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
        <td>
          <input
            className="input"
            value={tagsDraft}
            onChange={(e) => setTagsDraft(e.target.value)}
            placeholder="Tags, comma-separated"
            style={inputStyle}
          />
        </td>
        <td>
          {linkedName ? (
            <span style={{ color: "var(--indigo-400)", fontSize: "0.85rem" }}>{linkedName}</span>
          ) : (
            <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>—</span>
          )}
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
      <td style={{ cursor: "pointer" }} onClick={onOpen}>{lead.name}</td>
      <td style={{ whiteSpace: "nowrap", cursor: "pointer" }} onClick={onOpen}>
        {formatDateAdded(lead.created_at)}
      </td>
      <td style={{ cursor: "pointer" }} onClick={onOpen}>{lead.email ?? "—"}</td>
      <td style={{ cursor: "pointer" }} onClick={onOpen}>{lead.phone ?? "—"}</td>
      <td style={{ cursor: "pointer" }} onClick={onOpen}>
        <span style={{ textTransform: "capitalize" }}>{lead.stage}</span>
      </td>
      <td style={{ cursor: "pointer" }} onClick={onOpen}>{lead.tags.join(", ") || "—"}</td>
      <td style={{ cursor: "pointer" }} onClick={onOpen}>
        {linkedName ? (
          <span style={{ color: "var(--indigo-400)" }}>{linkedName}</span>
        ) : (
          <button
            type="button"
            className="btn"
            style={{ fontSize: "0.78rem", padding: "0.15rem 0.5rem" }}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            Link contact
          </button>
        )}
      </td>
      <td>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          <button type="button" className="btn" style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }} onClick={onEdit}>
            Edit
          </button>
          <button
            type="button"
            className="btn"
            title="View activity & notes"
            onClick={onOpen}
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}
          >
            Notes
          </button>
          <button
            type="button"
            className="btn"
            title="Send assignment email"
            onClick={onNotify}
            disabled={!lead.assigned_agent_id}
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}
          >
            ✉️
          </button>
        </div>
      </td>
    </tr>
  );
}
