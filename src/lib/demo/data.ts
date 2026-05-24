import type { Contact, Lead, Listing, Task } from "@/lib/types/database";
import { DEMO_USER } from "./constants";

const orgId = "00000000-0000-4000-8000-000000000010";

function ts(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

export const SEED_CONTACT_IDS = {
  alice: "c0000000-0000-4000-8000-000000000001",
  bob:   "c0000000-0000-4000-8000-000000000002",
  carol: "c0000000-0000-4000-8000-000000000003",
};

export function createSeedContacts(): Contact[] {
  return [
    {
      id: SEED_CONTACT_IDS.alice,
      org_id: orgId,
      first_name: "Alice",
      last_name: "Johnson",
      email: "alice@example.com",
      phone: "555-1234",
      company: null,
      notes: "Interested in downtown condos.",
      created_by: DEMO_USER.id,
      created_at: ts(-10),
      updated_at: ts(-2),
    },
    {
      id: SEED_CONTACT_IDS.bob,
      org_id: orgId,
      first_name: "Bob",
      last_name: "Smith",
      email: "bob@example.com",
      phone: "555-5678",
      company: "Smith & Co.",
      notes: "Referred by Alice.",
      created_by: DEMO_USER.id,
      created_at: ts(-10),
      updated_at: ts(-1),
    },
    {
      id: SEED_CONTACT_IDS.carol,
      org_id: orgId,
      first_name: "Carol",
      last_name: "Lee",
      email: "carol@example.com",
      phone: "555-9012",
      company: "Lee Investments LLC",
      notes: "Multi-property investor.",
      created_by: DEMO_USER.id,
      created_at: ts(-15),
      updated_at: ts(-3),
    },
  ];
}

export function createSeedLeads(): Lead[] {
  return [
    {
      id: "10000000-0000-4000-8000-000000000001",
      org_id: orgId,
      name: "Alice Johnson",
      email: "alice@example.com",
      phone: "555-1234",
      stage: "new",
      source: "website",
      tags: ["Buyer"],
      contact_id: SEED_CONTACT_IDS.alice,
      assigned_agent_id: DEMO_USER.id,
      created_at: ts(-2),
      updated_at: ts(-2),
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      org_id: orgId,
      name: "Bob Smith",
      email: "bob@example.com",
      phone: "555-5678",
      stage: "contacted",
      source: "referral",
      tags: ["Seller"],
      contact_id: SEED_CONTACT_IDS.bob,
      assigned_agent_id: DEMO_USER.id,
      created_at: ts(-5),
      updated_at: ts(-1),
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      org_id: orgId,
      name: "Carol Lee",
      email: "carol@example.com",
      phone: "555-9012",
      stage: "qualified",
      source: "open house",
      tags: ["Investor"],
      contact_id: SEED_CONTACT_IDS.carol,
      assigned_agent_id: null,
      created_at: ts(-10),
      updated_at: ts(-3),
    },
  ];
}

export function createSeedListings(): Listing[] {
  return [
    {
      id: "20000000-0000-4000-8000-000000000001",
      org_id: orgId,
      title: "Modern Condo",
      address: "123 Main St, Austin TX",
      price_display: "$2,400 / month",
      price_cents: 240000,
      status: "active",
      property_type: "condo",
      image_url: null,
      external_source: "demo",
      external_id: "demo-condo-1",
      metadata: {},
      created_at: ts(-7),
      updated_at: ts(-7),
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      org_id: orgId,
      title: "Spacious Townhouse",
      address: "456 Oak Ave, Dallas TX",
      price_display: "$3,200 / month",
      price_cents: 320000,
      status: "active",
      property_type: "townhome",
      image_url: null,
      external_source: "demo",
      external_id: "demo-town-2",
      metadata: {},
      created_at: ts(-4),
      updated_at: ts(-4),
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      org_id: orgId,
      title: "Green Acres Plot",
      address: "789 Country Rd",
      price_display: "$150,000",
      price_cents: 15000000,
      status: "active",
      property_type: "land",
      image_url: null,
      external_source: "demo",
      external_id: "demo-land-3",
      metadata: {},
      created_at: ts(-3),
      updated_at: ts(-3),
    },
    {
      id: "20000000-0000-4000-8000-000000000004",
      org_id: orgId,
      title: "Oak Street Rental",
      address: "321 Oak St",
      price_display: "$1,800 / month",
      price_cents: 180000,
      status: "active",
      property_type: "rental",
      image_url: null,
      external_source: "demo",
      external_id: "demo-rental-4",
      metadata: {},
      created_at: ts(-1),
      updated_at: ts(-1),
    },
  ];
}

export function createSeedTasks(): Task[] {
  return [
    {
      id: "30000000-0000-4000-8000-000000000001",
      org_id: orgId,
      title: "Call new leads",
      status: "todo",
      due_at: null,
      lead_id: null,
      listing_id: null,
      assigned_agent_id: DEMO_USER.id,
      google_event_id: null,
      created_at: ts(-1),
      updated_at: ts(-1),
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      org_id: orgId,
      title: "Schedule open house",
      status: "todo",
      due_at: ts(2),
      lead_id: null,
      listing_id: null,
      assigned_agent_id: null,
      google_event_id: null,
      created_at: ts(-1),
      updated_at: ts(-1),
    },
    {
      id: "30000000-0000-4000-8000-000000000003",
      org_id: orgId,
      title: "Prepare contract for 1401 Elm",
      status: "inprogress",
      due_at: ts(3),
      lead_id: null,
      listing_id: null,
      assigned_agent_id: DEMO_USER.id,
      google_event_id: null,
      created_at: ts(-2),
      updated_at: ts(0),
    },
    {
      id: "30000000-0000-4000-8000-000000000004",
      org_id: orgId,
      title: "Update MLS listings",
      status: "done",
      due_at: null,
      lead_id: null,
      listing_id: null,
      assigned_agent_id: null,
      google_event_id: null,
      created_at: ts(-8),
      updated_at: ts(-1),
    },
  ];
}
