"use client";

import { useEffect } from "react";
import type { Lead } from "@/lib/types/database";
import { ActivityFeed } from "./ActivityFeed";

const STAGE_COLOR: Record<string, string> = {
  new: "#20b2aa",
  contacted: "#1a6496",
  qualified: "#2d6a4f",
  closed: "#555",
  lost: "#c0392b",
};

export function LeadDetailDrawer({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
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

      {/* Drawer */}
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
        {/* Header */}
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

        {/* Lead meta */}
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

        {/* Activity feed */}
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", opacity: 0.85 }}>Activity</h3>
        <ActivityFeed leadId={lead.id} contactId={lead.contact_id ?? undefined} />
      </div>
    </>
  );
}
