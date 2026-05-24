import { describe, it, expect } from "vitest";
import { mlsListingAdapter } from "../mls";

const sampleItem = {
  ListingId: "MLS-001",
  ListPrice: 450000,
  StreetNumber: "123",
  StreetName: "Oak Ave",
  City: "Austin",
  StateOrProvince: "TX",
  PostalCode: "78701",
  StandardStatus: "Active",
  Media: [{ MediaURL: "https://cdn.example.com/photo.jpg" }],
};

describe("mlsListingAdapter", () => {
  it("has source = mls", () => {
    expect(mlsListingAdapter.source).toBe("mls");
  });

  it("parses a single listing object", () => {
    const result = mlsListingAdapter.parse(sampleItem);
    expect(result).toHaveLength(1);
  });

  it("parses an array of listings", () => {
    const result = mlsListingAdapter.parse([sampleItem, { ...sampleItem, ListingId: "MLS-002" }]);
    expect(result).toHaveLength(2);
  });

  it("extracts external_id from ListingId", () => {
    const result = mlsListingAdapter.parse(sampleItem);
    expect(result[0].external_id).toBe("MLS-001");
  });

  it("sets external_source to mls", () => {
    const result = mlsListingAdapter.parse(sampleItem);
    expect(result[0].external_source).toBe("mls");
  });

  it("converts ListPrice number to price_cents", () => {
    const result = mlsListingAdapter.parse(sampleItem);
    expect(result[0].price_cents).toBe(45000000);
  });

  it("formats price_display from numeric price", () => {
    const result = mlsListingAdapter.parse(sampleItem);
    expect(result[0].price_display).toContain("450,000");
  });

  it("handles string price", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, ListPrice: "$350,000" });
    expect(result[0].price_cents).toBe(35000000);
    expect(result[0].price_display).toBe("$350,000");
  });

  it("builds address from parts", () => {
    const result = mlsListingAdapter.parse(sampleItem);
    expect(result[0].address).toContain("123");
    expect(result[0].address).toContain("Oak Ave");
    expect(result[0].address).toContain("Austin");
  });

  it("maps Active status to active", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, StandardStatus: "Active" });
    expect(result[0].status).toBe("active");
  });

  it("maps Pending status to pending", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, StandardStatus: "Pending" });
    expect(result[0].status).toBe("pending");
  });

  it("maps Sold status to sold", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, StandardStatus: "Sold" });
    expect(result[0].status).toBe("sold");
  });

  it("maps Withdrawn status to off_market", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, StandardStatus: "Withdrawn" });
    expect(result[0].status).toBe("off_market");
  });

  it("extracts photo from Media array", () => {
    const result = mlsListingAdapter.parse(sampleItem);
    expect(result[0].image_url).toBe("https://cdn.example.com/photo.jpg");
  });

  it("handles missing Media gracefully", () => {
    const { Media: _, ...noMedia } = sampleItem;
    const result = mlsListingAdapter.parse(noMedia);
    expect(result[0].image_url).toBeUndefined();
  });

  it("parses JSON string input", () => {
    const result = mlsListingAdapter.parse(JSON.stringify([sampleItem]));
    expect(result).toHaveLength(1);
    expect(result[0].external_id).toBe("MLS-001");
  });

  it("maps PropertyType: Condominium -> condo", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, PropertyType: "Condominium" });
    expect(result[0].property_type).toBe("condo");
  });

  it("maps PropertyType: Single Family -> sfh", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, PropertyType: "Single Family" });
    expect(result[0].property_type).toBe("sfh");
  });

  it("maps PropertyType: Townhouse -> townhome", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, PropertyType: "Townhouse" });
    expect(result[0].property_type).toBe("townhome");
  });

  it("returns undefined property_type for unknown PropertyType", () => {
    const result = mlsListingAdapter.parse({ ...sampleItem, PropertyType: "UnknownType" });
    expect(result[0].property_type).toBeUndefined();
  });
});
