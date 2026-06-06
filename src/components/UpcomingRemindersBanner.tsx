"use client";

import type { Contact } from "@/lib/types/database";

export function UpcomingRemindersBanner({ contacts }: { contacts: Contact[] }) {
  const upcoming = contacts
    .filter((c) => c.reminder_at)
    .sort((a, b) => new Date(a.reminder_at!).getTime() - new Date(b.reminder_at!).getTime())
    .slice(0, 5);

  if (!upcoming.length) return null;

  const now = new Date();

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
        Contact reminders — set or edit these on the Contacts tab.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {upcoming.map((c) => {
          const dt = new Date(c.reminder_at!);
          const overdue = dt < now;
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem", flexWrap: "wrap" }}>
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
          );
        })}
      </div>
    </div>
  );
}
