import { describe, it, expect } from "vitest";
import { contactNameKey, contactsHaveSameName, findDuplicateByName } from "../nameMatch";

describe("contactNameKey", () => {
  it("normalizes case and whitespace", () => {
    expect(contactNameKey("  John ", " Smith ")).toBe("john|smith");
    expect(contactNameKey("John", null)).toBe("john|");
  });
});

describe("findDuplicateByName", () => {
  const contacts = [
    { id: "1", first_name: "Jane", last_name: "Doe", org_id: "o", email: null, phone: null, company: null, job_title: null, notes: null, tags: [], birthday: null, relationship: null, address_street: null, address_city: null, address_region: null, address_postal_code: null, address_country: null, website: null, reminder_at: null, reminder_note: null, reminder_notified: false, created_by: null, created_at: "", updated_at: "" },
    { id: "2", first_name: "John", last_name: "Smith", org_id: "o", email: null, phone: null, company: null, job_title: null, notes: null, tags: [], birthday: null, relationship: null, address_street: null, address_city: null, address_region: null, address_postal_code: null, address_country: null, website: null, reminder_at: null, reminder_note: null, reminder_notified: false, created_by: null, created_at: "", updated_at: "" },
  ];

  it("finds match on first and last name", () => {
    expect(findDuplicateByName(contacts, "jane", "doe")?.id).toBe("1");
    expect(findDuplicateByName(contacts, "John", "Smith")?.id).toBe("2");
  });

  it("does not match different last names", () => {
    expect(findDuplicateByName(contacts, "John", "Doe")).toBeUndefined();
  });

  it("excludes contact by id when editing", () => {
    expect(findDuplicateByName(contacts, "Jane", "Doe", "1")).toBeUndefined();
  });
});

describe("contactsHaveSameName", () => {
  it("matches empty last names", () => {
    expect(
      contactsHaveSameName(
        { first_name: "Bob", last_name: null },
        { first_name: "bob", last_name: "" }
      )
    ).toBe(true);
  });
});
