import { describe, it, expect, beforeEach } from "vitest";
import {
  getDemoStore,
  resetDemoStore,
  addDemoContact,
  updateDemoContact,
  deleteDemoContact,
  linkDemoLeadToContact,
} from "../store";
import { SEED_CONTACT_IDS } from "../data";

beforeEach(() => {
  resetDemoStore();
});

describe("getDemoStore contacts", () => {
  it("returns 3 seed contacts", () => {
    const { contacts } = getDemoStore();
    expect(contacts).toHaveLength(3);
  });

  it("seed leads have contact_id set", () => {
    const { leads } = getDemoStore();
    const linked = leads.filter((l) => l.contact_id !== null);
    expect(linked.length).toBeGreaterThan(0);
  });

  it("each seed contact_id matches a contact", () => {
    const { leads, contacts } = getDemoStore();
    const contactIds = new Set(contacts.map((c) => c.id));
    for (const lead of leads) {
      if (lead.contact_id) {
        expect(contactIds.has(lead.contact_id)).toBe(true);
      }
    }
  });
});

describe("addDemoContact", () => {
  it("creates a new contact and prepends it", () => {
    const before = getDemoStore().contacts.length;
    addDemoContact("user-1", { first_name: "Diana", last_name: "Prince" });
    const { contacts } = getDemoStore();
    expect(contacts).toHaveLength(before + 1);
    expect(contacts[0].first_name).toBe("Diana");
  });

  it("defaults missing fields to null", () => {
    addDemoContact("user-1", { first_name: "Anon" });
    const { contacts } = getDemoStore();
    expect(contacts[0].email).toBeNull();
    expect(contacts[0].company).toBeNull();
  });
});

describe("updateDemoContact", () => {
  it("updates an existing contact", () => {
    const id = SEED_CONTACT_IDS.alice;
    updateDemoContact(id, { company: "Alice Corp" });
    const { contacts } = getDemoStore();
    const alice = contacts.find((c) => c.id === id);
    expect(alice?.company).toBe("Alice Corp");
  });

  it("returns null for unknown id", () => {
    const result = updateDemoContact("non-existent", { company: "X" });
    expect(result).toBeNull();
  });
});

describe("deleteDemoContact", () => {
  it("removes the contact", () => {
    const id = SEED_CONTACT_IDS.bob;
    deleteDemoContact(id);
    const { contacts } = getDemoStore();
    expect(contacts.find((c) => c.id === id)).toBeUndefined();
  });

  it("unlinks associated leads", () => {
    const id = SEED_CONTACT_IDS.bob;
    deleteDemoContact(id);
    const { leads } = getDemoStore();
    const stillLinked = leads.filter((l) => l.contact_id === id);
    expect(stillLinked).toHaveLength(0);
  });
});

describe("linkDemoLeadToContact", () => {
  it("links a lead to a contact", () => {
    const { leads, contacts } = getDemoStore();
    const lead = leads[0];
    const newContact = contacts[contacts.length - 1];
    const ok = linkDemoLeadToContact(lead.id, newContact.id);
    expect(ok).toBe(true);
    const updated = getDemoStore().leads.find((l) => l.id === lead.id);
    expect(updated?.contact_id).toBe(newContact.id);
  });

  it("returns false for unknown lead id", () => {
    const ok = linkDemoLeadToContact("no-such-lead", SEED_CONTACT_IDS.carol);
    expect(ok).toBe(false);
  });
});
