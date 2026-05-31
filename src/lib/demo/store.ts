import type { Activity, ActivityType, Contact, Lead, Listing, Task, TaskStatus } from "@/lib/types/database";
import { createSeedLeads, createSeedListings, createSeedTasks, createSeedContacts, createSeedActivities } from "./data";
import { DEMO_USER } from "./constants";

const orgId = "00000000-0000-4000-8000-000000000010";

let leads = createSeedLeads();
let listings = createSeedListings();
let tasks = createSeedTasks();
let contacts = createSeedContacts();
let activities = createSeedActivities();

export function getDemoStore() {
  return { leads, listings, tasks, contacts, activities };
}

export function resetDemoStore() {
  leads = createSeedLeads();
  listings = createSeedListings();
  tasks = createSeedTasks();
  contacts = createSeedContacts();
  activities = createSeedActivities();
}

export function getDemoActivities(opts: { leadId?: string; contactId?: string }): Activity[] {
  return activities
    .filter((a) => {
      if (opts.leadId && a.lead_id !== opts.leadId) return false;
      if (opts.contactId && a.contact_id !== opts.contactId) return false;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addDemoActivity(
  createdBy: string,
  data: { type: ActivityType; description: string; lead_id?: string; contact_id?: string; listing_id?: string }
): Activity {
  const activity: Activity = {
    id: crypto.randomUUID(),
    org_id: orgId,
    type: data.type,
    description: data.description,
    lead_id: data.lead_id ?? null,
    contact_id: data.contact_id ?? null,
    listing_id: data.listing_id ?? null,
    task_id: null,
    created_by: createdBy ?? DEMO_USER.id,
    created_at: new Date().toISOString(),
  };
  activities = [activity, ...activities];
  return activity;
}

export function deleteDemoActivity(id: string) {
  activities = activities.filter((a) => a.id !== id);
}

export function updateDemoTaskStatus(taskId: string, status: TaskStatus): boolean {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return false;
  task.status = status;
  task.updated_at = new Date().toISOString();
  return true;
}

export function appendDemoListings(imported: Listing[]) {
  listings = [...listings, ...imported];
}

export function addDemoContact(
  createdBy: string,
  data: Partial<Contact>
): Contact {
  const now = new Date().toISOString();
  const contact: Contact = {
    id: crypto.randomUUID(),
    org_id: orgId,
    first_name: data.first_name ?? "Unknown",
    last_name: data.last_name ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    company: data.company ?? null,
    job_title: data.job_title ?? null,
    notes: data.notes ?? null,
    tags: data.tags ?? [],
    birthday: data.birthday ?? null,
    relationship: data.relationship ?? null,
    address_street: data.address_street ?? null,
    address_city: data.address_city ?? null,
    address_region: data.address_region ?? null,
    address_postal_code: data.address_postal_code ?? null,
    address_country: data.address_country ?? null,
    website: data.website ?? null,
    reminder_at: data.reminder_at ?? null,
    reminder_note: data.reminder_note ?? null,
    reminder_notified: false,
    created_by: createdBy ?? DEMO_USER.id,
    created_at: now,
    updated_at: now,
  };
  contacts = [contact, ...contacts];
  return contact;
}

export function updateDemoContact(
  contactId: string,
  data: Partial<Contact>
): Contact | null {
  const idx = contacts.findIndex((c) => c.id === contactId);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...data, updated_at: new Date().toISOString() };
  return contacts[idx];
}

export function deleteDemoContact(contactId: string) {
  contacts = contacts.filter((c) => c.id !== contactId);
  leads = leads.map((l) =>
    l.contact_id === contactId ? { ...l, contact_id: null } : l
  );
}

export function addDemoTask(
  data: { title: string; status?: TaskStatus; due_at?: string | null }
): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    org_id: orgId,
    title: data.title,
    status: data.status ?? "todo",
    due_at: data.due_at ?? null,
    lead_id: null,
    listing_id: null,
    assigned_agent_id: null,
    google_event_id: null,
    created_at: now,
    updated_at: now,
  };
  tasks = [task, ...tasks];
  return task;
}

export function linkDemoLeadToContact(leadId: string, contactId: string): boolean {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return false;
  lead.contact_id = contactId;
  lead.updated_at = new Date().toISOString();
  return true;
}
