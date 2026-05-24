import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { getDemoStore } from "@/lib/demo/store";
import { contactsToCSV, leadsToCSV, listingsToCSV, tasksToCSV } from "@/lib/export/csv";

type ExportType = "leads" | "listings" | "tasks" | "contacts" | "all";
type ExportFormat = "csv" | "json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "all") as ExportType;
  const format = (searchParams.get("format") ?? "csv") as ExportFormat;

  let leads, listings, tasks, contacts;

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    ({ leads, listings, tasks, contacts } = getDemoStore());
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    [{ data: leads }, { data: listings }, { data: tasks }, { data: contacts }] = await Promise.all([
      supabase.from("leads").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("listings").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    ]);
  }

  const now = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    let payload: unknown;
    if (type === "leads") payload = leads;
    else if (type === "listings") payload = listings;
    else if (type === "tasks") payload = tasks;
    else if (type === "contacts") payload = contacts;
    else payload = { leads, listings, tasks, contacts, exported_at: new Date().toISOString() };

    const filename = `crm-${type}-${now}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV
  let csv = "";
  let filename = "";

  if (type === "leads") {
    csv = leadsToCSV(leads ?? []);
    filename = `leads-${now}.csv`;
  } else if (type === "listings") {
    csv = listingsToCSV(listings ?? []);
    filename = `listings-${now}.csv`;
  } else if (type === "tasks") {
    csv = tasksToCSV(tasks ?? []);
    filename = `tasks-${now}.csv`;
  } else if (type === "contacts") {
    csv = contactsToCSV(contacts ?? []);
    filename = `contacts-${now}.csv`;
  } else {
    csv =
      "=== LEADS ===\r\n" + leadsToCSV(leads ?? []) +
      "\r\n\r\n=== CONTACTS ===\r\n" + contactsToCSV(contacts ?? []) +
      "\r\n\r\n=== LISTINGS ===\r\n" + listingsToCSV(listings ?? []) +
      "\r\n\r\n=== TASKS ===\r\n" + tasksToCSV(tasks ?? []);
    filename = `crm-export-${now}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
