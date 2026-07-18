import { describe, expect, it } from "vitest";
import type { Listing } from "@/lib/types/database";
import {
  WEBSITE_LISTINGS,
  ZIPFORM_TRANSACTION_LISTINGS,
  mergeWebsiteListings,
} from "@/lib/websiteListings";

function listing(overrides: Partial<Listing>): Listing {
  return {
    id: "stored-listing",
    org_id: "org-1",
    title: "Stored Listing",
    address: "1 Real St, Austin, TX",
    price_display: "$500,000",
    price_cents: 50_000_000,
    status: "active",
    property_type: "sfh",
    image_url: null,
    external_source: "manual",
    external_id: "manual-1",
    metadata: {},
    created_at: "2026-07-18T00:00:00.000Z",
    updated_at: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("website listings", () => {
  it("contains the five active properties from the website", () => {
    expect(WEBSITE_LISTINGS).toHaveLength(5);
    expect(WEBSITE_LISTINGS.map((item) => item.title)).toEqual([
      "806 Clearwell St",
      "County Road 315",
      "7206 Flagship Park Dr",
      "900 CR 406",
      "821 W New Hope Unit 108",
    ]);
  });

  it("contains all Active and Closed ZipForm transactions", () => {
    expect(ZIPFORM_TRANSACTION_LISTINGS).toHaveLength(134);
    expect(
      ZIPFORM_TRANSACTION_LISTINGS.filter(
        (item) => item.metadata.zipform_status === "Active",
      ),
    ).toHaveLength(93);
    expect(
      ZIPFORM_TRANSACTION_LISTINGS.filter(
        (item) => item.metadata.zipform_status === "Closed",
      ),
    ).toHaveLength(41);
  });

  it("removes fake and manual lease records while retaining real manual listings", () => {
    const merged = mergeWebsiteListings([
      listing({ external_source: "seed", external_id: "demo-condo-1" }),
      listing({ id: "lease", property_type: "lease", external_id: "real-lease" }),
      listing({ id: "manual", external_id: "real-manual" }),
    ]);

    expect(merged).toHaveLength(
      WEBSITE_LISTINGS.length + ZIPFORM_TRANSACTION_LISTINGS.length + 1,
    );
    expect(merged.some((item) => item.external_id === "demo-condo-1")).toBe(false);
    expect(merged.some((item) => item.external_id === "real-lease")).toBe(false);
    expect(merged.some((item) => item.external_id === "real-manual")).toBe(true);
  });
});
