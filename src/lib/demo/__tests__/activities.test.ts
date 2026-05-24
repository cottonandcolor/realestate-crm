import { describe, it, expect, beforeEach } from "vitest";
import {
  getDemoStore,
  resetDemoStore,
  getDemoActivities,
  addDemoActivity,
  deleteDemoActivity,
} from "../store";
import { SEED_CONTACT_IDS } from "../data";

beforeEach(() => {
  resetDemoStore();
});

describe("seed activities", () => {
  it("seeds 6 activities", () => {
    const { activities } = getDemoStore();
    expect(activities).toHaveLength(6);
  });

  it("all seed activities have a type and description", () => {
    const { activities } = getDemoStore();
    for (const a of activities) {
      expect(a.type).toBeTruthy();
      expect(a.description).toBeTruthy();
    }
  });

  it("activities include all four types", () => {
    const { activities } = getDemoStore();
    const types = new Set(activities.map((a) => a.type));
    expect(types.has("call")).toBe(true);
    expect(types.has("email")).toBe(true);
    expect(types.has("showing")).toBe(true);
    expect(types.has("note")).toBe(true);
  });
});

describe("getDemoActivities", () => {
  it("filters by lead_id", () => {
    const { leads } = getDemoStore();
    const alice = leads[0];
    const results = getDemoActivities({ leadId: alice.id });
    expect(results.length).toBeGreaterThan(0);
    for (const a of results) {
      expect(a.lead_id).toBe(alice.id);
    }
  });

  it("filters by contact_id", () => {
    const results = getDemoActivities({ contactId: SEED_CONTACT_IDS.carol });
    expect(results.length).toBeGreaterThan(0);
    for (const a of results) {
      expect(a.contact_id).toBe(SEED_CONTACT_IDS.carol);
    }
  });

  it("returns all activities when no filter given", () => {
    const results = getDemoActivities({});
    expect(results).toHaveLength(getDemoStore().activities.length);
  });

  it("returns results sorted newest first", () => {
    const results = getDemoActivities({});
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].created_at >= results[i].created_at).toBe(true);
    }
  });
});

describe("addDemoActivity", () => {
  it("prepends new activity to the store", () => {
    const before = getDemoStore().activities.length;
    addDemoActivity("user-1", {
      type: "note",
      description: "Test note",
      contact_id: SEED_CONTACT_IDS.alice,
    });
    expect(getDemoStore().activities).toHaveLength(before + 1);
    expect(getDemoStore().activities[0].description).toBe("Test note");
  });

  it("sets provided lead_id and contact_id", () => {
    const { leads } = getDemoStore();
    addDemoActivity("user-1", {
      type: "call",
      description: "Follow-up call",
      lead_id: leads[0].id,
      contact_id: SEED_CONTACT_IDS.bob,
    });
    const added = getDemoStore().activities[0];
    expect(added.lead_id).toBe(leads[0].id);
    expect(added.contact_id).toBe(SEED_CONTACT_IDS.bob);
  });

  it("defaults missing link fields to null", () => {
    addDemoActivity("user-1", { type: "email", description: "Sent brochure" });
    const added = getDemoStore().activities[0];
    expect(added.lead_id).toBeNull();
    expect(added.contact_id).toBeNull();
    expect(added.listing_id).toBeNull();
  });
});

describe("deleteDemoActivity", () => {
  it("removes the activity", () => {
    const { activities } = getDemoStore();
    const id = activities[0].id;
    deleteDemoActivity(id);
    expect(getDemoStore().activities.find((a) => a.id === id)).toBeUndefined();
  });

  it("is a no-op for unknown id", () => {
    const before = getDemoStore().activities.length;
    deleteDemoActivity("non-existent");
    expect(getDemoStore().activities).toHaveLength(before);
  });
});
