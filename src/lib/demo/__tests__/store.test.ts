import { describe, it, expect, beforeEach } from "vitest";
import {
  getDemoStore,
  resetDemoStore,
  updateDemoTaskStatus,
  appendDemoListings,
} from "../store";
import type { Listing } from "@/lib/types/database";

beforeEach(() => {
  resetDemoStore();
});

describe("getDemoStore", () => {
  it("returns leads, listings and tasks", () => {
    const store = getDemoStore();
    expect(Array.isArray(store.leads)).toBe(true);
    expect(Array.isArray(store.listings)).toBe(true);
    expect(Array.isArray(store.tasks)).toBe(true);
  });

  it("returns non-empty seed data", () => {
    const { leads, listings, tasks } = getDemoStore();
    expect(leads.length).toBeGreaterThan(0);
    expect(listings.length).toBeGreaterThan(0);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("includes expected demo leads", () => {
    const { leads } = getDemoStore();
    const names = leads.map((l) => l.name);
    expect(names).toContain("Alice Johnson");
    expect(names).toContain("Bob Smith");
    expect(names).toContain("Carol Lee");
  });

  it("includes expected demo listings", () => {
    const { listings } = getDemoStore();
    const titles = listings.map((l) => l.title);
    expect(titles).toContain("Modern Condo");
    expect(titles).toContain("Spacious Townhouse");
  });

  it("tasks span all three kanban statuses", () => {
    const { tasks } = getDemoStore();
    const statuses = new Set(tasks.map((t) => t.status));
    expect(statuses.has("todo")).toBe(true);
    expect(statuses.has("inprogress")).toBe(true);
    expect(statuses.has("done")).toBe(true);
  });
});

describe("resetDemoStore", () => {
  it("restores original task count after modification", () => {
    const original = getDemoStore().tasks.length;
    updateDemoTaskStatus(getDemoStore().tasks[0].id, "done");
    resetDemoStore();
    expect(getDemoStore().tasks.length).toBe(original);
  });

  it("restores original listings count after append", () => {
    const original = getDemoStore().listings.length;
    const newListing: Listing = {
      id: "new-1",
      org_id: "org-1",
      title: "Extra",
      address: null,
      price_display: null,
      price_cents: null,
      status: "active",
      image_url: null,
      external_source: "test",
      external_id: "extra-1",
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    appendDemoListings([newListing]);
    resetDemoStore();
    expect(getDemoStore().listings.length).toBe(original);
  });
});

describe("updateDemoTaskStatus", () => {
  it("returns true for a valid task id", () => {
    const { tasks } = getDemoStore();
    const ok = updateDemoTaskStatus(tasks[0].id, "done");
    expect(ok).toBe(true);
  });

  it("actually changes the task status", () => {
    const { tasks } = getDemoStore();
    const task = tasks.find((t) => t.status === "todo")!;
    updateDemoTaskStatus(task.id, "inprogress");
    const updated = getDemoStore().tasks.find((t) => t.id === task.id)!;
    expect(updated.status).toBe("inprogress");
  });

  it("updates the updated_at timestamp", () => {
    const { tasks } = getDemoStore();
    const task = tasks[0];
    const before = task.updated_at;
    updateDemoTaskStatus(task.id, "done");
    const after = getDemoStore().tasks.find((t) => t.id === task.id)!.updated_at;
    expect(after).not.toBe(before);
  });

  it("returns false for unknown task id", () => {
    const ok = updateDemoTaskStatus("nonexistent-id", "done");
    expect(ok).toBe(false);
  });

  it("does not change other tasks", () => {
    const { tasks } = getDemoStore();
    const target = tasks[0];
    const others = tasks.filter((t) => t.id !== target.id).map((t) => t.status);
    updateDemoTaskStatus(target.id, "done");
    const othersAfter = getDemoStore().tasks.filter((t) => t.id !== target.id).map((t) => t.status);
    expect(othersAfter).toEqual(others);
  });
});

describe("appendDemoListings", () => {
  it("adds listings to the store", () => {
    const before = getDemoStore().listings.length;
    const newListing: Listing = {
      id: "append-1",
      org_id: "org-1",
      title: "New Property",
      address: "789 Test St",
      price_display: "$1,000",
      price_cents: 100000,
      status: "active",
      image_url: null,
      external_source: "csv",
      external_id: "append-1",
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    appendDemoListings([newListing]);
    expect(getDemoStore().listings.length).toBe(before + 1);
  });

  it("new listing appears in store with correct title", () => {
    const listing: Listing = {
      id: "check-1",
      org_id: "org-1",
      title: "Villa del Sol",
      address: null,
      price_display: null,
      price_cents: null,
      status: "active",
      image_url: null,
      external_source: "csv",
      external_id: "check-1",
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    appendDemoListings([listing]);
    const titles = getDemoStore().listings.map((l) => l.title);
    expect(titles).toContain("Villa del Sol");
  });
});
