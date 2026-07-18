import type { Lead, Listing, Task } from "@/lib/types/database";
import { endOfToday, isContactDue, isContactOverdue } from "@/lib/dates";

type TabId = "leads" | "listings" | "tasks";

const CARDS = (
  leads: Lead[],
  listings: Listing[],
  tasks: Task[],
  onNavigate?: (tab: TabId) => void
) => {
  const contactDue = leads.filter((l) => isContactDue(l.contact_by));
  const overdueContacts = contactDue.filter((l) => isContactOverdue(l.contact_by));
  const openTasks = tasks.filter((t) => t.status !== "done");
  const endToday = endOfToday();
  const tasksDue = openTasks.filter((t) => t.due_at && new Date(t.due_at) <= endToday);
  const tasksUpcoming = openTasks.filter((t) => t.due_at && new Date(t.due_at) > endToday);

  return [
    {
      icon: "📞",
      label: "Contact Today",
      value: contactDue.length,
      sub: overdueContacts.length > 0
        ? `${overdueContacts.length} overdue`
        : contactDue.length > 0
          ? "due today"
          : "all caught up",
      accent: "#fbbf24",
      tab: "leads" as const,
    },
    {
      icon: "👤",
      label: "New Leads",
      value: leads.filter((l) => l.stage === "new").length,
      sub: `${leads.length} total`,
      accent: "#818cf8",
      tab: "leads" as const,
    },
    {
      icon: "🏠",
      label: "Active Listings",
      value: listings.filter((l) => l.status === "active").length,
      sub: `${listings.length} total`,
      accent: "#22d3ee",
      tab: "listings" as const,
    },
    {
      icon: "📅",
      label: "Tasks Due",
      value: tasksDue.length,
      sub: tasksUpcoming.length > 0
        ? `${openTasks.length} open · ${tasksUpcoming.length} upcoming`
        : `${openTasks.length} open`,
      accent: "#a78bfa",
      tab: "tasks" as const,
    },
    {
      icon: "🤝",
      label: "Qualified Leads",
      value: leads.filter((l) => l.stage === "qualified").length,
      sub: `${leads.filter((l) => l.stage === "closed").length} closed`,
      accent: "#34d399",
      tab: "leads" as const,
    },
  ].map((c) => ({ ...c, onClick: onNavigate ? () => onNavigate(c.tab) : undefined }));
};

export function DashboardCards({
  leads,
  listings,
  tasks,
  onNavigate,
}: {
  leads: Lead[];
  listings: Listing[];
  tasks: Task[];
  onNavigate?: (tab: TabId) => void;
}) {
  const cards = CARDS(leads, listings, tasks, onNavigate);

  return (
    <section className="dashboard" id="dashboard">
      <div className="cards">
        {cards.map((c) => (
          <div
            key={c.label}
            className="card glass"
            role={c.onClick ? "button" : undefined}
            tabIndex={c.onClick ? 0 : undefined}
            onClick={c.onClick}
            onKeyDown={c.onClick ? (e) => e.key === "Enter" && c.onClick?.() : undefined}
            style={{
              borderTop: `3px solid ${c.accent}`,
              cursor: c.onClick ? "pointer" : undefined,
              transition: c.onClick ? "transform 0.12s, box-shadow 0.12s" : undefined,
            }}
            onMouseOver={c.onClick ? (e) => { e.currentTarget.style.transform = "translateY(-2px)"; } : undefined}
            onMouseOut={c.onClick ? (e) => { e.currentTarget.style.transform = ""; } : undefined}
          >
            <div className="card-icon">{c.icon}</div>
            <h3>{c.label}</h3>
            <div className="card-value" style={{ color: c.accent }}>
              {c.value}
            </div>
            <div className="card-label">{c.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
