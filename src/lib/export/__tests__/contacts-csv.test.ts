import { describe, it, expect } from "vitest";
import { contactsToCSV } from "../csv";
import type { Contact } from "@/lib/types/database";

const sample: Contact[] = [
  {
    id: "c1",
    org_id: "o1",
    first_name: "Alice",
    last_name: "Johnson",
    email: "alice@example.com",
    phone: "555-1234",
    company: "ACME",
    notes: "Good client",
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c2",
    org_id: "o1",
    first_name: "Bob",
    last_name: null,
    email: null,
    phone: null,
    company: null,
    notes: null,
    created_by: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
];

describe("contactsToCSV", () => {
  it("produces a header row", () => {
    const csv = contactsToCSV(sample);
    expect(csv).toContain("First Name");
    expect(csv).toContain("Last Name");
    expect(csv).toContain("Email");
    expect(csv).toContain("Company");
  });

  it("includes all contacts", () => {
    const csv = contactsToCSV(sample);
    expect(csv).toContain("Alice");
    expect(csv).toContain("Bob");
  });

  it("handles null fields gracefully", () => {
    const csv = contactsToCSV(sample);
    expect(csv).not.toContain("null");
  });

  it("returns just header for empty array", () => {
    const csv = contactsToCSV([]);
    expect(csv.trim().split("\n")).toHaveLength(1);
  });
});
