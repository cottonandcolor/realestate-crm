import type { Lead, Listing, Task } from "@/lib/types/database";

const CARDS = (leads: Lead[], listings: Listing[], tasks: Task[]) => [
  {
    icon: "👤",
    label: "New Leads",
    value: leads.filter((l) => l.stage === "new").length,
    sub: `${leads.length} total`,
    accent: "#818cf8",
  },
  {
    icon: "🏠",
    label: "Active Listings",
    value: listings.filter((l) => l.status === "active").length,
    sub: `${listings.length} total`,
    accent: "#22d3ee",
  },
  {
    icon: "📅",
    label: "Upcoming Tasks",
    value: tasks.filter((t) => t.status !== "done" && t.due_at && new Date(t.due_at) > new Date()).length,
    sub: `${tasks.filter((t) => t.status !== "done").length} open`,
    accent: "#a78bfa",
  },
  {
    icon: "🤝",
    label: "Qualified Leads",
    value: leads.filter((l) => l.stage === "qualified").length,
    sub: `${leads.filter((l) => l.stage === "closed").length} closed`,
    accent: "#34d399",
  },
];

export function DashboardCards({
  leads,
  listings,
  tasks,
}: {
  leads: Lead[];
  listings: Listing[];
  tasks: Task[];
}) {
  const cards = CARDS(leads, listings, tasks);

  return (
    <section className="dashboard" id="dashboard">
      <div className="cards">
        {cards.map((c) => (
          <div
            key={c.label}
            className="card glass"
            style={{ borderTop: `3px solid ${c.accent}` }}
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
