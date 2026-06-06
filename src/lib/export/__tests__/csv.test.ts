import { describe, it, expect } from "vitest";
import { leadsToCSV, listingsToCSV, tasksToCSV } from "../csv";
import type { Lead, Listing, Task } from "@/lib/types/database";

const lead: Lead = {
  id: "lead-1",
  org_id: "org-1",
  name: "Alice Johnson",
  email: "alice@example.com",
  phone: "555-1234",
  stage: "new",
  source: "website",
  tags: ["Buyer", "First-Time"],
  contact_id: null,
  assigned_agent_id: "agent-1",
  contact_by: "2026-06-10",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

const listing: Listing = {
  id: "listing-1",
  org_id: "org-1",
  title: "Modern Condo",
  address: "123 Main St",
  price_display: "$2,400 / month",
  price_cents: 240000,
  status: "active",
  property_type: "condo",
  image_url: null,
  external_source: "csv",
  external_id: "condo-1",
  metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const task: Task = {
  id: "task-1",
  org_id: "org-1",
  title: "Call new leads",
  status: "todo",
  due_at: "2026-06-01T12:00:00Z",
  lead_id: "lead-1",
  listing_id: null,
  assigned_agent_id: "agent-1",
  google_event_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("leadsToCSV", () => {
  it("produces a header row", () => {
    const csv = leadsToCSV([lead]);
    const firstLine = csv.split("\r\n")[0];
    expect(firstLine).toBe("Name,Email,Phone,Stage,Source,Tags,Contact By,Assigned Agent ID,Created At,Updated At");
  });

  it("includes lead data in data row", () => {
    const csv = leadsToCSV([lead]);
    expect(csv).toContain("Alice Johnson");
    expect(csv).toContain("alice@example.com");
    expect(csv).toContain("555-1234");
    expect(csv).toContain("new");
    expect(csv).toContain("website");
    expect(csv).toContain("2026-06-10");
  });

  it("joins multiple tags with semicolon", () => {
    const csv = leadsToCSV([lead]);
    expect(csv).toContain("Buyer; First-Time");
  });

  it("handles empty tags array", () => {
    const csv = leadsToCSV([{ ...lead, tags: [] }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain(",,");
  });

  it("handles null email and phone", () => {
    const csv = leadsToCSV([{ ...lead, email: null, phone: null }]);
    expect(csv).toContain("Alice Johnson");
    expect(csv).not.toContain("undefined");
  });

  it("returns only header for empty array", () => {
    const csv = leadsToCSV([]);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it("escapes commas in values", () => {
    const csv = leadsToCSV([{ ...lead, name: "Smith, John" }]);
    expect(csv).toContain('"Smith, John"');
  });

  it("escapes double quotes in values", () => {
    const csv = leadsToCSV([{ ...lead, name: 'Alice "Al" Johnson' }]);
    expect(csv).toContain('"Alice ""Al"" Johnson"');
  });

  it("produces correct row count for multiple leads", () => {
    const csv = leadsToCSV([lead, { ...lead, id: "lead-2", name: "Bob Smith" }]);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(3); // header + 2 rows
  });
});

describe("listingsToCSV", () => {
  it("produces a header row", () => {
    const csv = listingsToCSV([listing]);
    const firstLine = csv.split("\r\n")[0];
    expect(firstLine).toBe("Title,Address,Price,Status,Property Type,External Source,External ID,Image URL,Created At");
  });

  it("includes listing data including property_type", () => {
    const csv = listingsToCSV([listing]);
    expect(csv).toContain("Modern Condo");
    expect(csv).toContain("123 Main St");
    expect(csv).toContain("$2,400 / month");
    expect(csv).toContain("active");
    expect(csv).toContain("condo");
    expect(csv).toContain("csv");
    expect(csv).toContain("condo-1");
  });

  it("handles null property_type", () => {
    const csv = listingsToCSV([{ ...listing, property_type: null }]);
    expect(csv).not.toContain("undefined");
  });

  it("escapes price with comma inside quotes", () => {
    const csv = listingsToCSV([listing]);
    expect(csv).toContain('"$2,400 / month"');
  });

  it("handles null address", () => {
    const csv = listingsToCSV([{ ...listing, address: null }]);
    expect(csv).not.toContain("undefined");
  });

  it("returns only header for empty array", () => {
    const lines = listingsToCSV([]).split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});

describe("tasksToCSV", () => {
  it("produces a header row", () => {
    const csv = tasksToCSV([task]);
    const firstLine = csv.split("\r\n")[0];
    expect(firstLine).toBe("Title,Status,Due Date,Lead ID,Listing ID,Assigned Agent ID,Google Event ID,Created At");
  });

  it("includes task data", () => {
    const csv = tasksToCSV([task]);
    expect(csv).toContain("Call new leads");
    expect(csv).toContain("todo");
    expect(csv).toContain("2026-06-01T12:00:00Z");
    expect(csv).toContain("lead-1");
    expect(csv).toContain("agent-1");
  });

  it("handles null due_at", () => {
    const csv = tasksToCSV([{ ...task, due_at: null }]);
    expect(csv).not.toContain("undefined");
  });

  it("handles all statuses", () => {
    const statuses = ["todo", "inprogress", "done"] as const;
    for (const status of statuses) {
      const csv = tasksToCSV([{ ...task, status }]);
      expect(csv).toContain(status);
    }
  });

  it("returns only header for empty array", () => {
    const lines = tasksToCSV([]).split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});
