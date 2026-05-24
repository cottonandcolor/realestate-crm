import { describe, it, expect } from "vitest";
import { csvListingAdapter } from "../csv";

const SAMPLE_CSV = `title,address,price,status,external_id,image_url
Modern Condo,123 Main St,$2400 / month,active,condo-001,https://example.com/img.jpg
Spacious Townhouse,456 Oak Ave,$3200 / month,pending,town-002,`;

describe("csvListingAdapter", () => {
  it("has source = csv", () => {
    expect(csvListingAdapter.source).toBe("csv");
  });

  it("parses header and returns correct row count", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result).toHaveLength(2);
  });

  it("parses title correctly", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[0].title).toBe("Modern Condo");
    expect(result[1].title).toBe("Spacious Townhouse");
  });

  it("parses address", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[0].address).toBe("123 Main St");
  });

  it("parses price_display", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[0].price_display).toBe("$2400 / month");
  });

  it("parses external_id", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[0].external_id).toBe("condo-001");
    expect(result[1].external_id).toBe("town-002");
  });

  it("sets external_source to csv", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    result.forEach((r) => expect(r.external_source).toBe("csv"));
  });

  it("parses status: active", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[0].status).toBe("active");
  });

  it("parses status: pending", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[1].status).toBe("pending");
  });

  it("defaults unknown status to active", () => {
    const csv = "title,status,external_id\nTest,unknown_status,test-1";
    const result = csvListingAdapter.parse(csv);
    expect(result[0].status).toBe("active");
  });

  it("parses image_url when present", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[0].image_url).toBe("https://example.com/img.jpg");
  });

  it("leaves image_url undefined when empty", () => {
    const result = csvListingAdapter.parse(SAMPLE_CSV);
    expect(result[1].image_url).toBeUndefined();
  });

  it("returns empty array for header-only input", () => {
    const result = csvListingAdapter.parse("title,address,price,external_id");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    const result = csvListingAdapter.parse("");
    expect(result).toHaveLength(0);
  });

  it("handles quoted fields with commas", () => {
    const csv = `title,address,external_id\n"Condo, Modern","123 Main, Suite 4",condo-1`;
    const result = csvListingAdapter.parse(csv);
    expect(result[0].title).toBe("Condo, Modern");
    expect(result[0].address).toBe("123 Main, Suite 4");
  });

  it("generates fallback external_id when missing", () => {
    const csv = "title,address\nMy House,123 Street";
    const result = csvListingAdapter.parse(csv);
    expect(result[0].external_id).toBeTruthy();
    expect(typeof result[0].external_id).toBe("string");
  });

  it("parses price_cents from price_amount column", () => {
    const csv = "title,external_id,price_amount\nTest,test-1,250000";
    const result = csvListingAdapter.parse(csv);
    expect(result[0].price_cents).toBe(25000000);
  });

  it("parses property_type: condo", () => {
    const csv = "title,external_id,property_type\nTest,t-1,condo";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBe("condo");
  });

  it("parses property_type alias: townhouse -> townhome", () => {
    const csv = "title,external_id,property_type\nTest,t-1,townhouse";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBe("townhome");
  });

  it("parses property_type alias: single family -> sfh", () => {
    const csv = "title,external_id,property_type\nTest,t-1,single family";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBe("sfh");
  });

  it("parses property_type: land", () => {
    const csv = "title,external_id,property_type\nTest,t-1,land";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBe("land");
  });

  it("parses property_type: rental", () => {
    const csv = "title,external_id,property_type\nTest,t-1,rental";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBe("rental");
  });

  it("parses property_type: lease", () => {
    const csv = "title,external_id,property_type\nTest,t-1,lease";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBe("lease");
  });

  it("returns undefined property_type for unknown value", () => {
    const csv = "title,external_id,property_type\nTest,t-1,unknown";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBeUndefined();
  });

  it("returns undefined property_type when column missing", () => {
    const csv = "title,external_id\nTest,t-1";
    expect(csvListingAdapter.parse(csv)[0].property_type).toBeUndefined();
  });
});
