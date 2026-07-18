"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types/database";
import { formatContactBy, isContactDueToday, isContactOverdue } from "@/lib/dates";

export function ContactDueBanner({
  leads,
  onFocusLead,
  onOpenNotes,
}: {
  leads: Lead[];
  onFocusLead: (lead: Lead) => void;
  onOpenNotes: (lead: Lead) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasDue = leads.length > 0;
  const overdue = leads.filter((l) => isContactOverdue(l.contact_by));
  const today = leads.filter((l) => isContactDueToday(l.contact_by));

  function handleNameClick(lead: Lead) {
    setExpandedId((id) => (id === lead.id ? null : lead.id));
    onFocusLead(lead);
  }

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
            <ContactDueRow
              key={l.id}
              lead={l}
              expanded={expandedId === l.id}
              onNameClick={() => handleNameClick(l)}
              onOpenNotes={() => onOpenNotes(l)}
            />
          ))}
          {today.length > 0 && overdue.length > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.7, fontWeight: 600 }}>
              Due today
            </p>
          )}
          {today.map((l) => (
            <ContactDueRow
              key={l.id}
              lead={l}
              expanded={expandedId === l.id}
              onNameClick={() => handleNameClick(l)}
              onOpenNotes={() => onOpenNotes(l)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactDueRow({
  lead,
  expanded,
  onNameClick,
  onOpenNotes,
}: {
  lead: Lead;
  expanded: boolean;
  onNameClick: () => void;
  onOpenNotes: () => void;
}) {
  const overdue = isContactOverdue(lead.contact_by);
  return (
    <div style={{ fontSize: "0.83rem" }}>
      <p style={{ margin: 0 }}>
        <button
          type="button"
          onClick={onNameClick}
          style={{
            fontSize: "inherit",
            padding: 0,
            background: "none",
            border: "none",
            color: "inherit",
            textDecoration: "underline",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {lead.name}
        </button>
        {" — "}
        {overdue ? "was due " : "contact by "}
        {formatContactBy(lead.contact_by)}
      </p>
      {expanded && (
        <div
          style={{
            marginTop: "0.45rem",
            padding: "0.55rem 0.65rem",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          {lead.phone && (
            <p style={{ margin: 0 }}>
              📞{" "}
              <a href={`tel:${lead.phone.replace(/\s/g, "")}`} style={{ color: "var(--color-primary)" }}>
                {lead.phone}
              </a>
            </p>
          )}
          {lead.email && (
            <p style={{ margin: 0 }}>
              ✉{" "}
              <a href={`mailto:${lead.email}`} style={{ color: "var(--color-primary)" }}>
                {lead.email}
              </a>
            </p>
          )}
          {!lead.phone && !lead.email && (
            <p style={{ margin: 0, opacity: 0.7 }}>No phone or email on file — use Edit to add contact info.</p>
          )}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: "0.78rem" }} onClick={onOpenNotes}>
              Notes & activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
