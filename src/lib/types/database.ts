export type OrgRole = "admin" | "agent";
export type LeadStage = "new" | "contacted" | "qualified" | "closed" | "lost";
export type ListingStatus = "active" | "pending" | "sold" | "off_market";
export type PropertyType = "sfh" | "condo" | "townhome" | "land" | "lease" | "rental";
export type TaskStatus = "todo" | "inprogress" | "done";
export type ActivityType = "call" | "email" | "showing" | "note";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Contact {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactWithLeads extends Contact {
  leads?: Lead[];
}

export interface Lead {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  source: string | null;
  tags: string[];
  contact_id: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadWithContact extends Lead {
  contact?: Contact | null;
}

export interface Listing {
  id: string;
  org_id: string;
  title: string;
  address: string | null;
  price_display: string | null;
  price_cents: number | null;
  status: ListingStatus;
  property_type: PropertyType | null;
  image_url: string | null;
  external_source: string | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  lead_id: string | null;
  listing_id: string | null;
  assigned_agent_id: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportJob {
  id: string;
  org_id: string;
  source: string;
  status: ImportStatus;
  total_rows: number;
  processed_rows: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}
