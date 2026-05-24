"use client";

import { useEffect, useState } from "react";
import type { Contact, Lead, Listing, Task } from "@/lib/types/database";
import { DashboardCards } from "./DashboardCards";
import { LeadsTable } from "./LeadsTable";
import { ListingsGrid } from "./ListingsGrid";
import { KanbanBoard } from "./KanbanBoard";
import { ContactsPanel } from "./ContactsPanel";
import { CalendarConnect } from "./CalendarConnect";
import { ListingImport } from "./ListingImport";
import { ExportPanel } from "./ExportPanel";
import { ActivitiesTab } from "./ActivitiesTab";

type ContactWithLeads = Contact & { leads?: Pick<Lead, "id" | "name" | "stage">[] };

type TabId = "overview" | "leads" | "contacts" | "listings" | "tasks" | "activity";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview",  label: "Overview",  icon: "📊" },
  { id: "leads",     label: "Leads",     icon: "👤" },
  { id: "contacts",  label: "Contacts",  icon: "📇" },
  { id: "listings",  label: "Listings",  icon: "🏠" },
  { id: "tasks",     label: "Tasks",     icon: "✓"  },
  { id: "activity",  label: "Activity",  icon: "📋" },
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
  contacts,
  calendarConnected,
  demoMode = false,
  demoBanner,
}: {
  leads: Lead[];
  listings: Listing[];
  tasks: Task[];
  contacts: ContactWithLeads[];
  calendarConnected: boolean;
  demoMode?: boolean;
  demoBanner?: React.ReactNode;
}) {
  // Sync active tab with URL hash so the back button + deep links work
  const [active, setActive] = useState<TabId>("overview");

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
    leads:    leads.length,
    contacts: contacts.length,
    listings: listings.length,
    tasks:    tasks.filter((t) => t.status !== "done").length,
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

        {/* ── Overview ─────────────────────────────── */}
        {active === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <DashboardCards leads={leads} listings={listings} tasks={tasks} />

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
              {(["leads","contacts","listings","tasks","activity"] as TabId[]).map((id) => {
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
          <LeadsTable leads={leads} demoMode={demoMode} />
        )}

        {/* ── Contacts ─────────────────────────────── */}
        {active === "contacts" && (
          <ContactsPanel initialContacts={contacts} />
        )}

        {/* ── Listings ─────────────────────────────── */}
        {active === "listings" && (
          <ListingsGrid listings={listings} />
        )}

        {/* ── Tasks ────────────────────────────────── */}
        {active === "tasks" && (
          <KanbanBoard tasks={tasks} demoMode={demoMode} />
        )}

        {/* ── Activity ─────────────────────────────── */}
        {active === "activity" && (
          <ActivitiesTab leads={leads} contacts={contacts} />
        )}
      </main>
    </>
  );
}
