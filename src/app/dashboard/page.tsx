import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { DashboardTabs } from "@/components/DashboardTabs";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg, getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { getDemoStore } from "@/lib/demo/store";

export default async function DashboardPage() {
  const demoUser = await getDemoUserFromCookies();

  if (demoUser) {
    const { leads, listings, tasks, contacts } = getDemoStore();
    const contactsWithLeads = contacts.map((c) => ({
      ...c,
      leads: leads
        .filter((l) => l.contact_id === c.id)
        .map(({ id, name, stage }) => ({ id, name, stage })),
    }));

    return (
      <>
        <Header email={demoUser.email} demoMode />
        <DashboardTabs
          leads={leads}
          listings={listings}
          tasks={tasks}
          contacts={contactsWithLeads}
          calendarConnected={false}
          demoMode
          demoBanner={
            <>
              <strong>Demo mode</strong> — data is in-memory only and resets on server restart.
            </>
          }
        />
        <footer className="footer">
          <p>© 2026 Real‑Estate CRM — Demo</p>
        </footer>
      </>
    );
  }

  // ── Supabase path ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let orgId = await getUserOrgId(supabase);
  if (!orgId) orgId = await ensureUserOrg(supabase, "My Real Estate Team");

  const [
    { data: leads },
    { data: listings },
    { data: tasks },
    { data: googleToken },
  ] = await Promise.all([
    supabase.from("leads").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("listings").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("google_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const hasData = (leads?.length ?? 0) > 0 || (listings?.length ?? 0) > 0;
  if (!hasData) await seedDemoData(supabase, orgId, user.id);

  const [leadsFresh, listingsFresh, tasksFresh, { data: contactsFresh }] = await Promise.all([
    supabase.from("leads").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("listings").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(2000),
  ]);

  // Attach leads to contacts manually (avoids relational FK schema cache issues)
  const rawContacts = contactsFresh ?? [];
  const allLeads = leadsFresh.data ?? [];
  const contactsWithLeads = rawContacts.map((c) => ({
    ...c,
    leads: allLeads
      .filter((l) => l.contact_id === c.id)
      .map(({ id, name, stage }: { id: string; name: string; stage: string }) => ({ id, name, stage })),
  }));

  return (
    <>
      <Header email={user.email} />
      <DashboardTabs
        leads={leadsFresh.data ?? []}
        listings={listingsFresh.data ?? []}
        tasks={tasksFresh.data ?? []}
        contacts={contactsWithLeads}
        calendarConnected={!!googleToken}
      />
      <footer className="footer">
        <p>© 2026 Real‑Estate CRM</p>
      </footer>
    </>
  );
}

async function seedDemoData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string
) {
  await supabase.from("leads").insert([
    { org_id: orgId, name: "Alice Johnson", email: "alice@example.com", phone: "555-1234", tags: ["Buyer"],    stage: "new",       assigned_agent_id: userId },
    { org_id: orgId, name: "Bob Smith",     email: "bob@example.com",   phone: "555-5678", tags: ["Seller"],   stage: "contacted", assigned_agent_id: userId },
    { org_id: orgId, name: "Carol Lee",     email: "carol@example.com", phone: "555-9012", tags: ["Investor"], stage: "qualified" },
  ]);
  await supabase.from("listings").insert([
    { org_id: orgId, title: "Modern Condo",     address: "123 Main St", price_display: "$2,400 / month", status: "active", external_source: "seed", external_id: "demo-condo-1" },
    { org_id: orgId, title: "Spacious Townhouse", address: "456 Oak Ave", price_display: "$3,200 / month", status: "active", external_source: "seed", external_id: "demo-town-2" },
  ]);
  await supabase.from("tasks").insert([
    { org_id: orgId, title: "Call new leads",             status: "todo",       assigned_agent_id: userId },
    { org_id: orgId, title: "Schedule open house",        status: "todo" },
    { org_id: orgId, title: "Prepare contract for 1401 Elm", status: "inprogress", due_at: new Date(Date.now() + 86400000 * 3).toISOString() },
    { org_id: orgId, title: "Update MLS listings",        status: "done" },
  ]);
}
