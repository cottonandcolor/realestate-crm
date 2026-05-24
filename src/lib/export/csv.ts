import type { Contact, Lead, Listing, Task } from "@/lib/types/database";

export function contactsToCSV(contacts: Contact[]): string {
  const headers = [
    "First Name", "Last Name", "Email", "Phone", "Company", "Notes", "Created At",
  ];
  const rows = contacts.map((c) => [
    c.first_name, c.last_name ?? "", c.email ?? "",
    c.phone ?? "", c.company ?? "", c.notes ?? "", c.created_at,
  ]);
  return toCsvString(headers, rows);
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = Array.isArray(val) ? val.join("; ") : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvString(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\r\n");
}

export function leadsToCSV(leads: Lead[]): string {
  const headers = [
    "Name", "Email", "Phone", "Stage", "Source", "Tags",
    "Assigned Agent ID", "Created At", "Updated At",
  ];
  const rows = leads.map((l) => [
    l.name, l.email ?? "", l.phone ?? "", l.stage,
    l.source ?? "", l.tags.join("; "),
    l.assigned_agent_id ?? "", l.created_at, l.updated_at,
  ]);
  return toCsvString(headers, rows);
}

export function listingsToCSV(listings: Listing[]): string {
  const headers = [
    "Title", "Address", "Price", "Status", "Property Type",
    "External Source", "External ID", "Image URL", "Created At",
  ];
  const rows = listings.map((l) => [
    l.title, l.address ?? "", l.price_display ?? "",
    l.status, l.property_type ?? "",
    l.external_source ?? "", l.external_id ?? "",
    l.image_url ?? "", l.created_at,
  ]);
  return toCsvString(headers, rows);
}

export function tasksToCSV(tasks: Task[]): string {
  const headers = [
    "Title", "Status", "Due Date", "Lead ID",
    "Listing ID", "Assigned Agent ID", "Google Event ID", "Created At",
  ];
  const rows = tasks.map((t) => [
    t.title, t.status, t.due_at ?? "", t.lead_id ?? "",
    t.listing_id ?? "", t.assigned_agent_id ?? "",
    t.google_event_id ?? "", t.created_at,
  ]);
  return toCsvString(headers, rows);
}
