"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity, ActivityType, Contact, Lead } from "@/lib/types/database";
import { MicButton } from "./MicButton";

const TYPE_META: Record<ActivityType, { icon: string; label: string; color: string }> = {
  note:    { icon: "📝", label: "Note",    color: "#7c6af7" },
  call:    { icon: "📞", label: "Call",    color: "#20b2aa" },
  email:   { icon: "✉️",  label: "Email",   color: "#1a6496" },
  showing: { icon: "🏠", label: "Showing", color: "#2d6a4f" },
};

const ALL_TYPES = Object.keys(TYPE_META) as ActivityType[];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function SourceChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.55rem",
        borderRadius: "999px",
        background: color + "18",
        border: `1px solid ${color}44`,
        color,
        fontSize: "0.73rem",
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function ActivityRow({
  activity,
  leadName,
  contactName,
  onDelete,
}: {
  activity: Activity;
  leadName?: string;
  contactName?: string;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[activity.type];
  return (
    <div
      style={{
        display: "flex",
        gap: "0.85rem",
        padding: "0.85rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        alignItems: "flex-start",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: meta.color + "1a",
          border: `1.5px solid ${meta.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        {meta.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: meta.color,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {meta.label}
          </span>

          {leadName && <SourceChip label={`👤 ${leadName}`} color="#20b2aa" />}
          {contactName && !leadName && <SourceChip label={`📇 ${contactName}`} color="#7c6af7" />}

          <span style={{ fontSize: "0.75rem", opacity: 0.45, marginLeft: "auto" }}>
            {timeAgo(activity.created_at)}
          </span>

          <button
            type="button"
            title="Delete"
            onClick={() => onDelete(activity.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.3,
              fontSize: "0.8rem",
              padding: "0 0.1rem",
              color: "inherit",
              flexShrink: 0,
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "0.3")}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, wordBreak: "break-word" }}>
          {activity.description}
        </p>
      </div>
    </div>
  );
}

function QuickAddForm({
  leads,
  contacts,
  onAdd,
}: {
  leads: Pick<Lead, "id" | "name">[];
  contacts: Pick<Contact, "id" | "first_name" | "last_name">[];
  onAdd: (data: {
    type: ActivityType;
    description: string;
    lead_id?: string;
    contact_id?: string;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<ActivityType>("note");
  const [text, setText] = useState("");
  const [leadId, setLeadId] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setSaving(true);
    await onAdd({ type, description: t, lead_id: leadId || undefined, contact_id: contactId || undefined });
    setText("");
    setLeadId("");
    setContactId("");
    setSaving(false);
    textRef.current?.focus();
  }

  return (
    <div
      className="glass"
      style={{ padding: "1.1rem 1.25rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}
    >
      {/* Type pills */}
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              padding: "0.25rem 0.7rem",
              borderRadius: "999px",
              border: `1.5px solid ${type === t ? TYPE_META[t].color : "rgba(255,255,255,0.2)"}`,
              background: type === t ? TYPE_META[t].color + "22" : "transparent",
              color: type === t ? TYPE_META[t].color : "inherit",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: type === t ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {TYPE_META[t].icon} {TYPE_META[t].label}
          </button>
        ))}
      </div>

      {/* Text + mic */}
      <div style={{ position: "relative" }}>
        <textarea
          ref={textRef}
          className="input"
          rows={2}
          placeholder={`Log a ${TYPE_META[type].label.toLowerCase()}… (Cmd+Enter or tap 🎤)`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          style={{ maxWidth: "none", width: "100%", resize: "vertical", margin: 0, paddingRight: "2.75rem" }}
        />
        <div style={{ position: "absolute", right: "0.5rem", bottom: "0.5rem" }}>
          <MicButton size="sm" onTranscript={(t) => setText((prev) => (prev ? prev + " " + t : t).trim())} />
        </div>
      </div>

      {/* Link row */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <select
          className="input"
          style={{ flex: "1 1 160px", margin: 0, fontSize: "0.85rem" }}
          value={leadId}
          onChange={(e) => { setLeadId(e.target.value); if (e.target.value) setContactId(""); }}
          aria-label="Link to lead"
        >
          <option value="">— Link to lead (optional)</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ flex: "1 1 160px", margin: 0, fontSize: "0.85rem" }}
          value={contactId}
          onChange={(e) => { setContactId(e.target.value); if (e.target.value) setLeadId(""); }}
          aria-label="Link to contact"
        >
          <option value="">— Link to contact (optional)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {[c.first_name, c.last_name].filter(Boolean).join(" ")}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={saving || !text.trim()}
          style={{ flexShrink: 0, fontSize: "0.88rem" }}
        >
          {saving ? "Saving…" : `Log ${TYPE_META[type].label}`}
        </button>
      </div>
    </div>
  );
}

export function ActivitiesTab({
  leads,
  contacts,
}: {
  leads: Pick<Lead, "id" | "name">[];
  contacts: Pick<Contact, "id" | "first_name" | "last_name">[];
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");

  const leadMap = Object.fromEntries(leads.map((l) => [l.id, l.name]));
  const contactMap = Object.fromEntries(
    contacts.map((c) => [c.id, [c.first_name, c.last_name].filter(Boolean).join(" ")])
  );

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then((data) => { setActivities(data); setLoading(false); });
  }, []);

  async function handleAdd(data: {
    type: ActivityType;
    description: string;
    lead_id?: string;
    contact_id?: string;
  }) {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      setActivities((prev) => [created, ...prev]);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (res.ok) setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = typeFilter === "all"
    ? activities
    : activities.filter((a) => a.type === typeFilter);

  // Group by date
  type Group = { label: string; items: Activity[] };
  const groups: Group[] = [];
  for (const a of filtered) {
    const day = new Date(a.created_at).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
    const last = groups[groups.length - 1];
    if (!last || last.label !== day) groups.push({ label: day, items: [a] });
    else last.items.push(a);
  }

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0 }}>Activity</h2>
        <span style={{ fontSize: "0.82rem", opacity: 0.5 }}>{activities.length} total</span>
      </div>

      <QuickAddForm leads={leads} contacts={contacts} onAdd={handleAdd} />

      {/* Type filter */}
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1.1rem" }}>
        <button
          type="button"
          onClick={() => setTypeFilter("all")}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            border: `1.5px solid ${typeFilter === "all" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)"}`,
            background: typeFilter === "all" ? "rgba(255,255,255,0.1)" : "transparent",
            color: "inherit",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontWeight: typeFilter === "all" ? 600 : 400,
          }}
        >
          All ({activities.length})
        </button>
        {ALL_TYPES.map((t) => {
          const count = activities.filter((a) => a.type === t).length;
          const isActive = typeFilter === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                border: `1.5px solid ${isActive ? TYPE_META[t].color : "rgba(255,255,255,0.2)"}`,
                background: isActive ? TYPE_META[t].color + "22" : "transparent",
                color: isActive ? TYPE_META[t].color : "inherit",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.15s",
                opacity: count === 0 ? 0.4 : 1,
              }}
            >
              {TYPE_META[t].icon} {TYPE_META[t].label} ({count})
            </button>
          );
        })}
      </div>

      {loading && (
        <p style={{ opacity: 0.5 }}>Loading…</p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass" style={{ textAlign: "center", padding: "2.5rem", opacity: 0.6 }}>
          No {typeFilter === "all" ? "" : TYPE_META[typeFilter].label.toLowerCase() + " "}activity yet.
        </div>
      )}

      {/* Grouped timeline */}
      {groups.map((group) => (
        <div key={group.label}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              margin: "1.1rem 0 0.25rem",
            }}
          >
            <span style={{ fontSize: "0.78rem", fontWeight: 600, opacity: 0.5, whiteSpace: "nowrap" }}>
              {group.label}
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          </div>
          {group.items.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              leadName={a.lead_id ? leadMap[a.lead_id] : undefined}
              contactName={a.contact_id ? contactMap[a.contact_id] : undefined}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
