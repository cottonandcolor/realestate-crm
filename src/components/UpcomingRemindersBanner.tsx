"use client";

import { useState } from "react";
import type { Contact } from "@/lib/types/database";
import { getReminderAck, setReminderAck } from "@/lib/reminderAck";

export function UpcomingRemindersBanner({
  contacts,
  onReminderCleared,
}: {
  contacts: Contact[];
  onReminderCleared?: (contactId: string) => void;
}) {
  const [, setAckVersion] = useState(0);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const upcoming = contacts
    .filter((c) => c.reminder_at && getReminderAck(c.id, c.reminder_at) !== "dismissed")
    .sort((a, b) => new Date(a.reminder_at!).getTime() - new Date(b.reminder_at!).getTime())
    .slice(0, 5);

  if (!upcoming.length) return null;

  const now = new Date();

  async function markDone(contact: Contact) {
    if (!contact.reminder_at) return;
    setClearingId(contact.id);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_at: null, reminder_note: null }),
      });
      if (res.ok) {
        setReminderAck(contact.id, contact.reminder_at, "dismissed");
        setAckVersion((v) => v + 1);
        onReminderCleared?.(contact.id);
      }
    } finally {
      setClearingId(null);
    }
  }

  function dismissOnly(contact: Contact) {
    if (!contact.reminder_at) return;
    setReminderAck(contact.id, contact.reminder_at, "dismissed");
    setAckVersion((v) => v + 1);
  }

  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.75rem 1rem",
        background: "rgba(99,102,241,0.1)",
        border: "1px solid var(--color-primary)",
        borderRadius: "0.75rem",
      }}
    >
      <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.85rem" }}>🔔 Upcoming Reminders</p>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", opacity: 0.6 }}>
        Contact reminders — click <strong>Done</strong> when finished, or set new ones on the Contacts tab.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {upcoming.map((c) => {
          const dt = new Date(c.reminder_at!);
          const overdue = dt < now;
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.6rem",
                fontSize: "0.82rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", flex: "1 1 200px" }}>
                <span
                  style={{
                    padding: "0.1rem 0.5rem",
                    borderRadius: "999px",
                    background: overdue ? "rgba(229,62,62,0.2)" : "rgba(255,193,7,0.15)",
                    color: overdue ? "#fc8181" : "#f6c90e",
                    whiteSpace: "nowrap",
                  }}
                >
                  {overdue ? "Overdue" : dt.toLocaleDateString()}{" "}
                  {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <strong>{name}</strong>
                {c.reminder_note && <span style={{ opacity: 0.7 }}>— {c.reminder_note}</span>}
              </div>
              <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}
                  onClick={() => markDone(c)}
                  disabled={clearingId === c.id}
                >
                  {clearingId === c.id ? "…" : "Done"}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", opacity: 0.85 }}
                  onClick={() => dismissOnly(c)}
                  title="Hide without clearing the reminder on the contact"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
