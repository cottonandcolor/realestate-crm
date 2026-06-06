"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contact, Lead, LeadStage } from "@/lib/types/database";
import {
  formatContactBy,
  formatDateAdded,
  isContactDue,
  isContactDueToday,
  isContactOverdue,
} from "@/lib/dates";
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

function ContactByInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (contactBy: string | null) => void;
}) {
  const overdue = isContactOverdue(value);
  const dueToday = isContactDueToday(value);

  return (
    <input
      type="date"
      className="input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
      style={{
        margin: 0,
        fontSize: "0.82rem",
        width: "auto",
        minWidth: "8.5rem",
        color: overdue ? "#fc8181" : dueToday ? "#fbbf24" : undefined,
        borderColor: overdue ? "#fc8181" : dueToday ? "#fbbf24" : undefined,
      }}
    />
  );
}

function StageSelect({
  value,
  onChange,
  compact = false,
}: {
  value: LeadStage;
  onChange: (stage: LeadStage) => void;
  compact?: boolean;
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value as LeadStage)}
      onClick={(e) => e.stopPropagation()}
      style={{
        margin: 0,
        fontSize: "0.82rem",
        padding: compact ? "0.3rem 0.45rem" : undefined,
        minWidth: compact ? "7.5rem" : undefined,
        width: compact ? "auto" : "100%",
      }}
    >
      {STAGE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function LeadsTable({
  leads,
  contacts,
  onLeadUpdated,
  onLeadAdded,
  onLeadDeleted,
  demoMode = false,
}: {
  leads: Lead[];
  contacts: Contact[];
  onLeadUpdated: (lead: Lead) => void;
  onLeadAdded: (lead: Lead) => void;
  onLeadDeleted: (id: string) => void;
  demoMode?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Lead>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

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

  async function patchLead(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      onLeadUpdated(updated);
      return updated;
    }
    return null;
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
    const updated = await patchLead(id, patch);
    if (updated) setEditingId(null);
  }

  async function updateStage(id: string, stage: LeadStage) {
    await patchLead(id, { stage });
  }

  async function updateContactBy(id: string, contactBy: string | null) {
    await patchLead(id, { contact_by: contactBy });
  }

  const dueLeads = useMemo(
    () =>
      leads
        .filter((l) => isContactDue(l.contact_by))
        .sort((a, b) => (a.contact_by ?? "").localeCompare(b.contact_by ?? "")),
    [leads]
  );

  async function addLead(data: {
    name: string;
    email: string | null;
    phone: string | null;
    stage: LeadStage;
    tags: string[];
    contact_by: string | null;
  }): Promise<string | null> {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      onLeadAdded(created);
      setShowAddForm(false);
      return null;
    }
    const err = await res.json().catch(() => ({}));
    return (err as { error?: string }).error ?? "Could not add lead. Please try again.";
  }

  async function deleteLead(lead: Lead) {
    if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      onLeadDeleted(lead.id);
      if (activeLead?.id === lead.id) setActiveLead(null);
      if (editingId === lead.id) setEditingId(null);
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
          <h2 style={{ margin: 0 }}>Leads</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: "0.82rem" }}
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? "Cancel" : "+ Add lead"}
            </button>
            <button type="button" className="btn" onClick={exportLeads} title="Export leads as CSV">
              ⬇ Export CSV
            </button>
          </div>
        </div>
        <input
          type="text"
          className="search"
          style={{ marginBottom: "1rem" }}
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {showAddForm && (
          <AddLeadForm
            onAdd={addLead}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        <ContactDueBanner leads={dueLeads} onOpenLead={setActiveLead} />
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", opacity: 0.55 }}>
          Click <strong>+ Add lead</strong> to create a new entry. Set a <strong>Contact by</strong> date for follow-ups — due leads appear in the banner above.
        </p>
        <table className="glass">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>Name</th>
              <th onClick={() => handleSort("created_at")}>Date added</th>
              <th onClick={() => handleSort("contact_by")}>Contact by</th>
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
                  onStageChange={(stage) => updateStage(l.id, stage)}
                  onContactByChange={(contactBy) => updateContactBy(l.id, contactBy)}
                  onDelete={() => deleteLead(l)}
                  onOpen={() => setActiveLead(l)}
                  onNotify={() => notifyAssign(l)}
                />
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9}>No leads yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function AddLeadForm({
  onAdd,
  onCancel,
}: {
  onAdd: (data: {
    name: string;
    email: string | null;
    phone: string | null;
    stage: LeadStage;
    tags: string[];
    contact_by: string | null;
  }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<LeadStage>("new");
  const [tagsDraft, setTagsDraft] = useState("");
  const [contactBy, setContactBy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const nameTrim = name.trim();
    if (!nameTrim || saving) return;
    setError(null);
    setSaving(true);
    const err = await onAdd({
      name: nameTrim,
      email: email.trim() || null,
      phone: phone.trim() || null,
      stage,
      tags: parseTagsInput(tagsDraft),
      contact_by: contactBy || null,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    setStage("new");
    setTagsDraft("");
    setContactBy("");
  }

  return (
    <div className="glass" style={{ padding: "1rem", marginBottom: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>New lead</h3>
      {error && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "#fc8181" }}>
          {error}
        </p>
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleAdd();
        }}
      >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.6rem",
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
          Name *
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" style={inputStyle} required />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
          Email <span style={{ opacity: 0.55 }}>(optional)</span>
          <input className="input" type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
          Phone <span style={{ opacity: 0.55 }}>(optional)</span>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-1234" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
          Stage
          <StageSelect value={stage} onChange={setStage} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
          Contact by
          <input type="date" className="input" value={contactBy} onChange={(e) => setContactBy(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
          Tags
          <input className="input" value={tagsDraft} onChange={(e) => setTagsDraft(e.target.value)} placeholder="Buyer, referral" style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: "0.82rem" }}
            disabled={!name.trim() || saving}
          >
            {saving ? "Adding…" : "Add lead"}
          </button>
          <button type="button" className="btn" style={{ fontSize: "0.82rem" }} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
      </form>
    </div>
  );
}

function ContactDueBanner({
  leads,
  onOpenLead,
}: {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
}) {
  const hasDue = leads.length > 0;
  const overdue = leads.filter((l) => isContactOverdue(l.contact_by));
  const today = leads.filter((l) => isContactDueToday(l.contact_by));

  return (
    <div
      className="glass"
      style={{
        marginBottom: "1.25rem",
        padding: "0.85rem 1rem",
        background: hasDue ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hasDue ? "#fbbf24" : "var(--color-border)"}`,
        borderRadius: "0.75rem",
      }}
    >
      <p
        style={{
          margin: "0 0 0.6rem",
          fontWeight: 700,
          color: hasDue ? "#fbbf24" : "var(--color-text-muted)",
          fontSize: "0.9rem",
        }}
      >
        {hasDue
          ? `${leads.length} lead${leads.length > 1 ? "s" : ""} to contact today`
          : "No leads due for contact today"}
      </p>
      {hasDue && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {overdue.length > 0 && (
            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7, fontWeight: 600, color: "#fc8181" }}>
              Overdue
            </p>
          )}
          {overdue.map((l) => (
            <ContactDueRow key={l.id} lead={l} onOpen={() => onOpenLead(l)} />
          ))}
          {today.length > 0 && overdue.length > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.7, fontWeight: 600 }}>
              Due today
            </p>
          )}
          {today.map((l) => (
            <ContactDueRow key={l.id} lead={l} onOpen={() => onOpenLead(l)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactDueRow({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const overdue = isContactOverdue(lead.contact_by);
  return (
    <p style={{ margin: 0, fontSize: "0.83rem" }}>
      <button
        type="button"
        className="btn"
        onClick={onOpen}
        style={{
          fontSize: "inherit",
          padding: 0,
          background: "none",
          border: "none",
          color: "inherit",
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        <strong>{lead.name}</strong>
      </button>
      {" — "}
      {overdue ? "was due " : "contact by "}
      {formatContactBy(lead.contact_by)}
      {lead.phone && <span style={{ opacity: 0.75 }}> · {lead.phone}</span>}
      {lead.email && <span style={{ opacity: 0.75 }}> · {lead.email}</span>}
    </p>
  );
}

function LeadRow({
  lead,
  linkedName,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onStageChange,
  onContactByChange,
  onDelete,
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
  onStageChange: (stage: LeadStage) => void;
  onContactByChange: (contactBy: string | null) => void;
  onDelete: () => void;
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
          <ContactByInput value={lead.contact_by} onChange={onContactByChange} />
        </td>
        <td>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </td>
        <td>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
        </td>
        <td>
          <StageSelect value={stage} onChange={setStage} />
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
      <td>
        <ContactByInput value={lead.contact_by} onChange={onContactByChange} />
      </td>
      <td style={{ cursor: "pointer" }} onClick={onOpen}>{lead.email ?? "—"}</td>
      <td style={{ cursor: "pointer" }} onClick={onOpen}>{lead.phone ?? "—"}</td>
      <td>
        <StageSelect value={lead.stage} onChange={onStageChange} compact />
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
          <button
            type="button"
            className="btn"
            onClick={onDelete}
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", color: "#e53e3e" }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
