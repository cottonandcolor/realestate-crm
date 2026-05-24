"use client";

import { useEffect, useState, useRef } from "react";
import type { Activity, ActivityType } from "@/lib/types/database";

const TYPE_META: Record<ActivityType, { icon: string; label: string; color: string }> = {
  note:    { icon: "📝", label: "Note",    color: "#7c6af7" },
  call:    { icon: "📞", label: "Call",    color: "#20b2aa" },
  email:   { icon: "✉️",  label: "Email",   color: "#1a6496" },
  showing: { icon: "🏠", label: "Showing", color: "#2d6a4f" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function AddActivityForm({
  onAdd,
}: {
  onAdd: (type: ActivityType, description: string) => Promise<void>;
}) {
  const [type, setType] = useState<ActivityType>("note");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setSaving(true);
    await onAdd(type, t);
    setText("");
    setSaving(false);
    textRef.current?.focus();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
      {/* Type selector */}
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {(Object.keys(TYPE_META) as ActivityType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              padding: "0.3rem 0.75rem",
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

      <textarea
        ref={textRef}
        className="input"
        rows={2}
        placeholder={`Add a ${TYPE_META[type].label.toLowerCase()}…`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
        style={{ maxWidth: "none", width: "100%", resize: "vertical" }}
      />

      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        disabled={saving || !text.trim()}
        style={{ alignSelf: "flex-start" }}
      >
        {saving ? "Saving…" : `Log ${TYPE_META[type].label}`}
      </button>
    </div>
  );
}

function ActivityItem({
  activity,
  onDelete,
}: {
  activity: Activity;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[activity.type];
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        padding: "0.65rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Icon + line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: meta.color + "22",
            border: `1.5px solid ${meta.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
          }}
        >
          {meta.icon}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: meta.color,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {meta.label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>{timeAgo(activity.created_at)}</span>
            <button
              type="button"
              title="Delete"
              onClick={() => onDelete(activity.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.35,
                fontSize: "0.8rem",
                padding: "0 0.1rem",
                color: "inherit",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "0.35")}
            >
              ✕
            </button>
          </div>
        </div>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", lineHeight: 1.5, wordBreak: "break-word" }}>
          {activity.description}
        </p>
      </div>
    </div>
  );
}

export function ActivityFeed({
  leadId,
  contactId,
}: {
  leadId?: string;
  contactId?: string;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    const params = new URLSearchParams();
    if (leadId)    params.set("lead_id",    leadId);
    if (contactId) params.set("contact_id", contactId);
    const res = await fetch(`/api/activities?${params}`);
    if (res.ok) setActivities(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchActivities(); }, [leadId, contactId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(type: ActivityType, description: string) {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description, lead_id: leadId, contact_id: contactId }),
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

  return (
    <div>
      <AddActivityForm onAdd={handleAdd} />

      {loading && <p style={{ opacity: 0.5, fontSize: "0.88rem" }}>Loading…</p>}

      {!loading && activities.length === 0 && (
        <p style={{ opacity: 0.5, fontSize: "0.88rem" }}>No activity yet — log a call, note, or showing above.</p>
      )}

      <div>
        {activities.map((a) => (
          <ActivityItem key={a.id} activity={a} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
