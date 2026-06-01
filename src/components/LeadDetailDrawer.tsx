"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contact, Lead } from "@/lib/types/database";
import { ActivityFeed } from "./ActivityFeed";

const STAGE_COLOR: Record<string, string> = {
  new: "#20b2aa",
  contacted: "#1a6496",
  qualified: "#2d6a4f",
  closed: "#555",
  lost: "#c0392b",
};

function contactLabel(c: Contact) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unnamed";
}

export function LeadDetailDrawer({
  lead,
  contacts,
  onClose,
  onLeadUpdated,
}: {
  lead: Lead;
  contacts: Contact[];
  onClose: () => void;
  onLeadUpdated: (lead: Lead) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [linking, setLinking] = useState(false);
  const [status, setStatus] = useState("");

  const linkedContact = useMemo(
    () => (lead.contact_id ? contacts.find((c) => c.id === lead.contact_id) : undefined),
    [contacts, lead.contact_id]
  );

  const contactOptions = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts.slice(0, 25);
    return contacts
      .filter((c) => {
        const name = contactLabel(c).toLowerCase();
        return (
          name.includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q)
        );
      })
      .slice(0, 25);
  }, [contacts, contactSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function setContactLink(contactId: string | null) {
    setLinking(true);
    setStatus("");
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contactId }),
    });
    setLinking(false);
    if (res.ok) {
      const updated = await res.json();
      onLeadUpdated(updated);
      setLinkOpen(false);
      setContactSearch("");
      setStatus(contactId ? "Linked to contact." : "Contact unlinked.");
    } else {
      setStatus("Failed to update link.");
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 200,
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          zIndex: 201,
          background: "var(--color-surface, #1a1f2e)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{lead.name}</h2>
            <span
              style={{
                display: "inline-block",
                marginTop: "0.3rem",
                padding: "0.2rem 0.65rem",
                borderRadius: "999px",
                background: (STAGE_COLOR[lead.stage] ?? "#555") + "22",
                border: `1px solid ${STAGE_COLOR[lead.stage] ?? "#555"}`,
                color: STAGE_COLOR[lead.stage] ?? "#555",
                fontSize: "0.78rem",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {lead.stage}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.4rem",
              cursor: "pointer",
              color: "inherit",
              opacity: 0.6,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Contact link */}
        <div className="glass" style={{ padding: "0.85rem 1rem", marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.5 }}>
            Contact
          </p>
          {linkedContact ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <div>
                <strong>{contactLabel(linkedContact)}</strong>
                {linkedContact.email && (
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", opacity: 0.75 }}>{linkedContact.email}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: "0.8rem" }}
                  disabled={linking}
                  onClick={() => setContactLink(null)}
                >
                  Unlink
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => { setLinkOpen(true); setContactSearch(""); }}
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", opacity: 0.7 }}>No contact linked yet.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setLinkOpen((o) => !o)}
              >
                Link to contact
              </button>
            </div>
          )}

          {linkOpen && (
            <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
              <input
                className="input"
                placeholder="Search contacts by name, email, phone…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                style={{ maxWidth: "none", width: "100%", margin: "0 0 0.5rem" }}
                autoFocus
              />
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {contactOptions.length === 0 && (
                  <p style={{ fontSize: "0.82rem", opacity: 0.6, margin: 0 }}>No contacts match.</p>
                )}
                {contactOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContactLink(c.id)}
                    disabled={linking || c.id === lead.contact_id}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 0.6rem",
                      marginBottom: "0.25rem",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: c.id === lead.contact_id ? "rgba(99,102,241,0.2)" : "transparent",
                      cursor: linking ? "wait" : "pointer",
                      color: "inherit",
                      fontSize: "0.85rem",
                    }}
                  >
                    <strong>{contactLabel(c)}</strong>
                    {c.email && <span style={{ opacity: 0.65, marginLeft: "0.35rem" }}>{c.email}</span>}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn"
                style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}
                onClick={() => { setLinkOpen(false); setContactSearch(""); }}
              >
                Cancel
              </button>
            </div>
          )}
          {status && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--color-primary)" }}>{status}</p>}
        </div>

        <div
          className="glass"
          style={{ padding: "0.85rem 1rem", marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}
        >
          {lead.email && <p style={{ margin: 0, fontSize: "0.88rem" }}>✉ {lead.email}</p>}
          {lead.phone && <p style={{ margin: 0, fontSize: "0.88rem" }}>📞 {lead.phone}</p>}
          {lead.source && (
            <p style={{ margin: 0, fontSize: "0.82rem", opacity: 0.7 }}>
              Source: <strong>{lead.source}</strong>
            </p>
          )}
          {lead.tags.length > 0 && (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "0.15rem 0.55rem",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.1)",
                    fontSize: "0.78rem",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", opacity: 0.85 }}>Activity</h3>
        <ActivityFeed leadId={lead.id} contactId={lead.contact_id ?? undefined} />
      </div>
    </>
  );
}
