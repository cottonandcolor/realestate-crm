import type { Contact, Lead, Listing, Task, TaskStatus } from "@/lib/types/database";
import { createSeedLeads, createSeedListings, createSeedTasks, createSeedContacts } from "./data";
import { DEMO_USER } from "./constants";

const orgId = "00000000-0000-4000-8000-000000000010";

let leads = createSeedLeads();
let listings = createSeedListings();
let tasks = createSeedTasks();
let contacts = createSeedContacts();

export function getDemoStore() {
  return { leads, listings, tasks, contacts };
}

export function resetDemoStore() {
  leads = createSeedLeads();
  listings = createSeedListings();
  tasks = createSeedTasks();
  contacts = createSeedContacts();
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
    notes: data.notes ?? null,
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

export function linkDemoLeadToContact(leadId: string, contactId: string): boolean {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return false;
  lead.contact_id = contactId;
  lead.updated_at = new Date().toISOString();
  return true;
}
