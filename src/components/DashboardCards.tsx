import type { Lead, Listing, Task } from "@/lib/types/database";

export function DashboardCards({
  leads,
  listings,
  tasks,
}: {
  leads: Lead[];
  listings: Listing[];
  tasks: Task[];
}) {
  const newLeads = leads.filter((l) => l.stage === "new").length;
  const activeListings = listings.filter((l) => l.status === "active").length;
  const upcomingShowings = tasks.filter(
    (t) => t.status !== "done" && t.due_at && new Date(t.due_at) > new Date()
  ).length;

  return (
    <section className="dashboard" id="dashboard">
      <h2>Dashboard</h2>
      <div className="cards">
        <div className="card glass">
          <h3>New Leads</h3>
          <p>{newLeads}</p>
        </div>
        <div className="card glass">
          <h3>Active Listings</h3>
          <p>{activeListings}</p>
        </div>
        <div className="card glass">
          <h3>Upcoming Showings</h3>
          <p>{upcomingShowings}</p>
        </div>
      </div>
    </section>
  );
}
