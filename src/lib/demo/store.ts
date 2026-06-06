import type { Activity, ActivityType, Contact, Lead, Listing, Project, Task, TaskStatus } from "@/lib/types/database";
import { createSeedLeads, createSeedListings, createSeedTasks, createSeedContacts, createSeedActivities, createSeedProjects } from "./data";
import { DEMO_USER } from "./constants";

const orgId = "00000000-0000-4000-8000-000000000010";

let leads = createSeedLeads();
let listings = createSeedListings();
let projects = createSeedProjects();
let tasks = createSeedTasks();
let contacts = createSeedContacts();
let activities = createSeedActivities();

export function getDemoStore() {
  return { leads, listings, projects, tasks, contacts, activities };
}

export function resetDemoStore() {
  leads = createSeedLeads();
  listings = createSeedListings();
  projects = createSeedProjects();
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

export function reorderDemoTasks(orderedIds: string[]) {
  orderedIds.forEach((id, index) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.sort_order = index;
      task.updated_at = new Date().toISOString();
    }
  });
}

export function addDemoTask(
  data: { title: string; status?: TaskStatus; due_at?: string | null; project_id?: string | null }
): Task {
  const now = new Date().toISOString();
  const siblings = tasks.filter((t) => t.project_id === (data.project_id ?? null));
  const maxOrder = siblings.reduce((m, t) => Math.max(m, t.sort_order ?? 0), -1);
  const task: Task = {
    id: crypto.randomUUID(),
    org_id: orgId,
    title: data.title,
    status: data.status ?? "todo",
    sort_order: maxOrder + 1,
    due_at: data.due_at ?? null,
    project_id: data.project_id ?? null,
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

export function updateDemoTask(
  taskId: string,
  data: Partial<Pick<Task, "title" | "status" | "due_at" | "project_id" | "sort_order">>
): Task | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;
  if (data.title !== undefined) task.title = data.title;
  if (data.status !== undefined) task.status = data.status;
  if (data.due_at !== undefined) task.due_at = data.due_at;
  if (data.project_id !== undefined) task.project_id = data.project_id;
  if (data.sort_order !== undefined) task.sort_order = data.sort_order;
  task.updated_at = new Date().toISOString();
  return task;
}

export function deleteDemoTask(taskId: string) {
  tasks = tasks.filter((t) => t.id !== taskId);
}

export function addDemoProject(data: { name: string; notes?: string | null }): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    org_id: orgId,
    name: data.name,
    notes: data.notes ?? null,
    sort_order: projects.length,
    created_at: now,
    updated_at: now,
  };
  projects = [...projects, project];
  return project;
}

export function updateDemoProject(
  projectId: string,
  data: Partial<Pick<Project, "name" | "notes" | "sort_order">>
): Project | null {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;
  if (data.name !== undefined) project.name = data.name;
  if (data.notes !== undefined) project.notes = data.notes;
  if (data.sort_order !== undefined) project.sort_order = data.sort_order;
  project.updated_at = new Date().toISOString();
  return project;
}

export function deleteDemoProject(projectId: string) {
  projects = projects.filter((p) => p.id !== projectId);
  tasks = tasks.map((t) =>
    t.project_id === projectId ? { ...t, project_id: null } : t
  );
}

export function reorderDemoProjects(orderedIds: string[]) {
  orderedIds.forEach((id, index) => {
    const project = projects.find((p) => p.id === id);
    if (project) {
      project.sort_order = index;
      project.updated_at = new Date().toISOString();
    }
  });
}

export function linkDemoLeadToContact(leadId: string, contactId: string): boolean {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return false;
  lead.contact_id = contactId;
  lead.updated_at = new Date().toISOString();
  return true;
}

export function updateDemoLead(
  leadId: string,
  data: Partial<Pick<Lead, "name" | "email" | "phone" | "stage" | "source" | "tags" | "contact_id" | "contact_by">>
): Lead | null {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return null;
  Object.assign(lead, data, { updated_at: new Date().toISOString() });
  return lead;
}

export function deleteDemoLead(leadId: string): boolean {
  const before = leads.length;
  leads = leads.filter((l) => l.id !== leadId);
  if (leads.length === before) return false;
  for (const a of activities) {
    if (a.lead_id === leadId) a.lead_id = null;
  }
  return true;
}
