import { describe, expect, it } from "vitest";
import { parseEducationPaste } from "../parsePaste";

describe("parseEducationPaste", () => {
  it("parses AI CE flyer-style text", () => {
    const text = `
WORK SMARTER, NOT HARDER. Using Artificial Intelligence in Real Estate.
CE Class Number: 06028-RECE
Sponsor: D.R. Horton - America's Builder
Instructor: Amber Brown from White Label Realty
Provider: Texas REALTORS® #1
RSVP by 06/09/2026
onlinesalessmtx@drhorton.com
830.498.0812
Tuesday, June 16, 2026
1pm - 3pm
Paramount Model Home
430 Denali Dr. Kyle, TX, 78640
Free - Compliments of D.R. Horton San Marcos
`;
    const parsed = parseEducationPaste(text);
    expect(parsed.ce_number).toBe("06028-RECE");
    expect(parsed.instructor).toMatch(/Amber Brown/i);
    expect(parsed.class_date).toBe("2026-06-16");
    expect(parsed.time_start).toMatch(/1pm/i);
    expect(parsed.rsvp_email).toBe("onlinesalessmtx@drhorton.com");
    expect(parsed.cost).toBe("Free");
  });

  it("parses Lunch and Learn style text", () => {
    const text = `
TREC CE CLASS:
Marketing by Referral
with Austen Smith
Wednesday, June 17, 2026 · 11:30 AM - 2:00 PM
Goosehead Insurance Corporate Office, 9606 N Mopac Expy, 9th Floor, Austin, TX 78759
This class is complementary and lunch will be provided.
`;
    const parsed = parseEducationPaste(text);
    expect(parsed.title).toMatch(/Marketing by Referral/i);
    expect(parsed.instructor).toMatch(/Austen Smith/i);
    expect(parsed.class_date).toBe("2026-06-17");
    expect(parsed.address).toMatch(/Mopac/i);
  });
});
