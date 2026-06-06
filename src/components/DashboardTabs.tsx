"use client";

import { useEffect, useState } from "react";
import type { Contact, Lead, Listing, Project, Task } from "@/lib/types/database";
import { DashboardCards } from "./DashboardCards";
import { LeadsTable } from "./LeadsTable";
import { ListingsGrid } from "./ListingsGrid";
import { ProjectTasksPanel } from "./ProjectTasksPanel";
import { ContactsPanel } from "./ContactsPanel";
import { CalendarConnect } from "./CalendarConnect";
import { ListingImport } from "./ListingImport";
import { ExportPanel } from "./ExportPanel";
import { ActivitiesTab } from "./ActivitiesTab";
import { LeaseListingsPanel } from "./LeaseListingsPanel";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import { getReminderAck, setReminderAck } from "@/lib/reminderAck";
import { LEASE_LISTINGS } from "@/lib/leaseListings";

type ContactWithLeads = Contact & { leads?: Pick<Lead, "id" | "name" | "stage">[] };

type TabId = "overview" | "leads" | "contacts" | "listings" | "lease-listings" | "tasks" | "activity";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview",       label: "Overview",       icon: "📊" },
  { id: "leads",          label: "Leads",          icon: "👤" },
  { id: "contacts",       label: "Contacts",       icon: "📇" },
  { id: "listings",       label: "Listings",       icon: "🏠" },
  { id: "lease-listings", label: "Lease Listings", icon: "🔑" },
  { id: "tasks",          label: "Tasks",          icon: "✓"  },
  { id: "activity",       label: "Activity",       icon: "📋" },
];

function TabBar({
  active,
  counts,
  onChange,
}: {
  active: TabId;
  counts: Partial<Record<TabId, number>>;
  onChange: (id: TabId) => void;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: "56px",
        zIndex: 100,
        background: "var(--color-bg)",
        borderBottom: "1px solid var(--color-border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          overflowX: "auto",
          padding: "0 1.75rem",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.9rem 1.1rem",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--indigo-400)"
                  : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--indigo-400)" : "var(--color-text-muted)",
                cursor: "pointer",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.88rem",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
                flexShrink: 0,
              }}
              onMouseOver={(e) => { if (!isActive) e.currentTarget.style.color = "var(--color-text)"; }}
              onMouseOut={(e) => { if (!isActive) e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              <span style={{ fontSize: "0.95rem" }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "19px",
                    height: "19px",
                    padding: "0 5px",
                    borderRadius: "999px",
                    background: isActive ? "var(--indigo-500)" : "var(--color-border)",
                    color: isActive ? "#fff" : "var(--color-text-muted)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardTabs({
  leads,
  listings,
  tasks,
  projects,
  contacts: initialContacts,
  calendarConnected,
  demoMode = false,
  demoBanner,
}: {
  leads: Lead[];
  listings: Listing[];
  tasks: Task[];
  projects: Project[];
  contacts: ContactWithLeads[];
  calendarConnected: boolean;
  demoMode?: boolean;
  demoBanner?: React.ReactNode;
}) {
  // Sync active tab with URL hash so the back button + deep links work
  const [active, setActive] = useState<TabId>("overview");
  const [leadsState, setLeadsState] = useState(leads);
  // Lift contacts state here so it survives tab switches
  const [contacts, setContacts] = useState<ContactWithLeads[]>(initialContacts);

  function handleLeadUpdated(updated: Lead) {
    setLeadsState((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    const leadSummary = { id: updated.id, name: updated.name, stage: updated.stage };
    setContacts((prev) =>
      prev.map((c) => {
        const without = (c.leads ?? []).filter((l) => l.id !== updated.id);
        if (updated.contact_id === c.id) {
          return { ...c, leads: [...without, leadSummary] };
        }
        return { ...c, leads: without };
      })
    );
  }

  function handleLeadDeleted(id: string) {
    setLeadsState((prev) => prev.filter((l) => l.id !== id));
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        leads: (c.leads ?? []).filter((l) => l.id !== id),
      }))
    );
  }

  function handleLeadAdded(lead: Lead) {
    setLeadsState((prev) => [lead, ...prev]);
  }
  // Re-render when reminder acknowledgments change (stored in localStorage)
  const [, setAckVersion] = useState(0);

  // Browser push notifications for due reminders
  useReminderNotifications(contacts);

  // Contacts with a due or overdue reminder (for the login banner)
  const dueReminders = contacts.filter((c) => {
    if (!c.reminder_at) return false;
    return new Date(c.reminder_at) <= new Date();
  }).sort((a, b) => new Date(a.reminder_at!).getTime() - new Date(b.reminder_at!).getTime());

  const visibleReminders = dueReminders.filter(
    (c) => getReminderAck(c.id, c.reminder_at) !== "dismissed"
  );
  const unacknowledgedCount = visibleReminders.filter(
    (c) => getReminderAck(c.id, c.reminder_at) === null
  ).length;

  function acknowledgeReminder(contactId: string, reminderAt: string, mode: "dismissed" | "acknowledged") {
    setReminderAck(contactId, reminderAt, mode);
    setAckVersion((v) => v + 1);
  }

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === hash)) setActive(hash);
  }, []);

  function switchTab(id: TabId) {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const counts: Partial<Record<TabId, number>> = {
    leads:          leadsState.length,
    contacts:       contacts.length,
    listings:       listings.length,
    "lease-listings": LEASE_LISTINGS.length,
    tasks:          tasks.filter((t) => t.status !== "done").length,
    // activity count is fetched client-side; omit from badge here
  };

  return (
    <>
      <TabBar active={active} counts={counts} onChange={switchTab} />

      <main style={{ padding: "2rem 2rem 4rem", minHeight: "70vh" }}>
        {demoBanner && (
          <div className="glass" style={{ marginBottom: "1.25rem", padding: "0.65rem 1rem", fontSize: "0.88rem" }}>
            {demoBanner}
          </div>
        )}

        {/* ── Due / overdue reminders alert banner ── */}
        {visibleReminders.length > 0 && (
          <div style={{
            marginBottom: "1.25rem", padding: "0.85rem 1rem",
            background: unacknowledgedCount > 0 ? "rgba(229,62,62,0.15)" : "rgba(99,102,241,0.12)",
            border: `1px solid ${unacknowledgedCount > 0 ? "#fc8181" : "var(--indigo-400)"}`,
            borderRadius: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>🔔</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: "0 0 0.5rem", fontWeight: 700,
                color: unacknowledgedCount > 0 ? "#fc8181" : "var(--indigo-400)",
                fontSize: "0.9rem",
              }}>
                {unacknowledgedCount > 0
                  ? `${unacknowledgedCount} contact reminder${unacknowledgedCount > 1 ? "s" : ""} due`
                  : `${visibleReminders.length} acknowledged reminder${visibleReminders.length > 1 ? "s" : ""} still due`}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {visibleReminders.slice(0, 5).map((c) => {
                  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
                  const dt = new Date(c.reminder_at!);
                  const ack = getReminderAck(c.id, c.reminder_at);
                  const isAcknowledged = ack === "acknowledged";
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                        gap: "0.75rem", flexWrap: "wrap",
                        padding: "0.45rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        background: isAcknowledged ? "rgba(255,255,255,0.04)" : "transparent",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "0.83rem", flex: "1 1 200px" }}>
                        {isAcknowledged && (
                          <span style={{ color: "var(--indigo-400)", marginRight: "0.35rem" }}>✓</span>
                        )}
                        <strong>{name}</strong>
                        {" — "}
                        {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {c.reminder_note && <span style={{ opacity: 0.75 }}> · {c.reminder_note}</span>}
                        {isAcknowledged && (
                          <span style={{ display: "block", fontSize: "0.75rem", opacity: 0.6, marginTop: "0.15rem" }}>
                            Acknowledged — still showing until dismissed
                          </span>
                        )}
                      </p>
                      <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0, flexWrap: "wrap" }}>
                        {!isAcknowledged ? (
                          <>
                            <button
                              type="button"
                              className="btn"
                              style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}
                              onClick={() => acknowledgeReminder(c.id, c.reminder_at!, "acknowledged")}
                            >
                              Acknowledge & keep
                            </button>
                            <button
                              type="button"
                              className="btn"
                              style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", color: "#e53e3e" }}
                              onClick={() => acknowledgeReminder(c.id, c.reminder_at!, "dismissed")}
                            >
                              Acknowledge & dismiss
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn"
                            style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}
                            onClick={() => acknowledgeReminder(c.id, c.reminder_at!, "dismissed")}
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {visibleReminders.length > 5 && (
                  <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>
                    +{visibleReminders.length - 5} more — go to Contacts tab
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Overview ─────────────────────────────── */}
        {active === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <DashboardCards leads={leadsState} listings={listings} tasks={tasks} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
              <div className="glass" style={{ padding: "1.25rem" }}>
                <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>📅 Google Calendar</h3>
                <CalendarConnect connected={calendarConnected} />
              </div>

              <div className="glass" style={{ padding: "1.25rem" }}>
                <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>⬆ Import Listings</h3>
                <ListingImport demoMode={demoMode} compact />
              </div>

              <div className="glass" style={{ padding: "1.25rem" }}>
                <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>⬇ Export Data</h3>
                <ExportPanel compact />
              </div>
            </div>

            {/* Quick-jump shortcuts */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {(["leads","contacts","listings","lease-listings","tasks","activity"] as TabId[]).map((id) => {
                const tab = TABS.find((t) => t.id === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    className="btn"
                    onClick={() => switchTab(id)}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    {tab.icon} Go to {tab.label}
                    {counts[id] !== undefined && (
                      <span style={{ opacity: 0.7, fontSize: "0.82rem" }}>({counts[id]})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Leads ────────────────────────────────── */}
        {active === "leads" && (
          <LeadsTable
            leads={leadsState}
            contacts={contacts}
            onLeadUpdated={handleLeadUpdated}
            onLeadAdded={handleLeadAdded}
            onLeadDeleted={handleLeadDeleted}
            demoMode={demoMode}
          />
        )}

        {/* ── Contacts ─────────────────────────────── */}
        {active === "contacts" && (
          <ContactsPanel contacts={contacts} onContactsChange={setContacts} />
        )}

        {/* ── Listings ─────────────────────────────── */}
        {active === "listings" && (
          <ListingsGrid listings={listings} />
        )}

        {/* ── Lease Listings ───────────────────────── */}
        {active === "lease-listings" && (
          <LeaseListingsPanel />
        )}

        {/* ── Tasks ────────────────────────────────── */}
        {active === "tasks" && (
          <ProjectTasksPanel projects={projects} tasks={tasks} contacts={contacts} demoMode={demoMode} />
        )}

        {/* ── Activity ─────────────────────────────── */}
        {active === "activity" && (
          <ActivitiesTab leads={leads} contacts={contacts} />
        )}
      </main>
    </>
  );
}
