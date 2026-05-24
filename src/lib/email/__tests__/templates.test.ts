import { describe, it, expect } from "vitest";
import { leadAssignedEmail, showingReminderEmail } from "../templates";

describe("leadAssignedEmail", () => {
  it("includes the lead name in subject", () => {
    const { subject } = leadAssignedEmail({
      agentName: "Jane",
      leadName: "Alice Johnson",
    });
    expect(subject).toContain("Alice Johnson");
  });

  it("includes agent name in html body", () => {
    const { html } = leadAssignedEmail({
      agentName: "Jane",
      leadName: "Alice",
    });
    expect(html).toContain("Jane");
  });

  it("includes lead email when provided", () => {
    const { html } = leadAssignedEmail({
      agentName: "Jane",
      leadName: "Alice",
      leadEmail: "alice@example.com",
    });
    expect(html).toContain("alice@example.com");
  });

  it("includes lead phone when provided", () => {
    const { html } = leadAssignedEmail({
      agentName: "Jane",
      leadName: "Alice",
      leadPhone: "555-1234",
    });
    expect(html).toContain("555-1234");
  });

  it("omits email line when not provided", () => {
    const { html } = leadAssignedEmail({
      agentName: "Jane",
      leadName: "Alice",
    });
    expect(html).not.toContain("@example.com");
  });

  it("returns both subject and html", () => {
    const result = leadAssignedEmail({ agentName: "A", leadName: "B" });
    expect(typeof result.subject).toBe("string");
    expect(typeof result.html).toBe("string");
  });
});

describe("showingReminderEmail", () => {
  it("includes title in subject", () => {
    const { subject } = showingReminderEmail({
      agentName: "Jane",
      title: "Modern Condo Showing",
      when: "June 1, 2026 at 2:00 PM",
    });
    expect(subject).toContain("Modern Condo Showing");
  });

  it("includes agent name in body", () => {
    const { html } = showingReminderEmail({
      agentName: "Jane",
      title: "Condo",
      when: "June 1",
    });
    expect(html).toContain("Jane");
  });

  it("includes when in body", () => {
    const { html } = showingReminderEmail({
      agentName: "Jane",
      title: "Condo",
      when: "June 1, 2026 at 2:00 PM",
    });
    expect(html).toContain("June 1, 2026 at 2:00 PM");
  });

  it("includes location when provided", () => {
    const { html } = showingReminderEmail({
      agentName: "Jane",
      title: "Condo",
      when: "June 1",
      location: "123 Main St",
    });
    expect(html).toContain("123 Main St");
  });

  it("omits location when not provided", () => {
    const { html } = showingReminderEmail({
      agentName: "Jane",
      title: "Condo",
      when: "June 1",
    });
    expect(html).not.toContain("Location:");
  });
});
