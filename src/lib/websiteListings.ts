import type { Listing } from "@/lib/types/database";
import zipFormListings from "../../public/data/zipform-listings.json";

const SOURCE = "yourspacewithhannah";
const SOURCE_URL = "https://yourspacewithhannah.com/#listings";
const SYNCED_AT = "2026-07-18T00:00:00.000Z";

export const WEBSITE_LISTINGS: Listing[] = [
  {
    id: "website-mls-8687449",
    org_id: "",
    title: "806 Clearwell St",
    address: "806 Clearwell St, Cedar Park, TX",
    price_display: "$675,000",
    price_cents: 67_500_000,
    status: "active",
    property_type: "sfh",
    image_url: "https://yourspacewithhannah.com/assets/806-clearwell/01.jpg",
    external_source: SOURCE,
    external_id: "8687449",
    metadata: {
      area: "Cedar Park · Three Points",
      beds: 3,
      baths: 3,
      square_feet: 2224,
      year_built: 2020,
      listing_url: "https://www.propertypanorama.com/instaview/aus/8687449",
      source_url: SOURCE_URL,
    },
    created_at: SYNCED_AT,
    updated_at: SYNCED_AT,
  },
  {
    id: "website-mls-6001766",
    org_id: "",
    title: "County Road 315",
    address: "County Road 315, Jarrell, TX",
    price_display: "$3,200,000",
    price_cents: 320_000_000,
    status: "active",
    property_type: "land",
    image_url: "https://yourspacewithhannah.com/assets/000-cr315/01.jpg",
    external_source: SOURCE,
    external_id: "6001766",
    metadata: {
      area: "Jarrell · Williamson County",
      acres: 53.971,
      agricultural_exemption: true,
      listing_url:
        "https://matrix.abor.com/matrix/shared/p84b5TRy3wHd/000CountyRoad315Rd",
      source_url: SOURCE_URL,
    },
    created_at: SYNCED_AT,
    updated_at: SYNCED_AT,
  },
  {
    id: "website-mls-3812379",
    org_id: "",
    title: "7206 Flagship Park Dr",
    address: "7206 Flagship Park Dr, Jonestown, TX",
    price_display: "$425,000",
    price_cents: 42_500_000,
    status: "active",
    property_type: "land",
    image_url: "https://yourspacewithhannah.com/assets/7206-flagship/01.jpg",
    external_source: SOURCE,
    external_id: "3812379",
    metadata: {
      area: "Jonestown · The Hollows",
      acres: 2.05,
      features: ["Lake views", "Gated community"],
      listing_url:
        "https://matrix.abor.com/matrix/shared/nXZ4dwWz3wHd/7206FlagshipParkDr",
      source_url: SOURCE_URL,
    },
    created_at: SYNCED_AT,
    updated_at: SYNCED_AT,
  },
  {
    id: "website-parcel-r019244",
    org_id: "",
    title: "900 CR 406",
    address: "900 CR 406, Taylor, TX",
    price_display: "$1,338,000",
    price_cents: 133_800_000,
    status: "active",
    property_type: "land",
    image_url: "https://yourspacewithhannah.com/assets/900-cr406/02.jpg",
    external_source: SOURCE,
    external_id: "R019244",
    metadata: {
      area: "Taylor · Full Circle Commercial",
      acres: 13.23,
      features: ["Ranch / land", "Road frontage"],
      listing_url:
        "https://fullcirclecommercialgroup.com/property-details/900-Cr-406---Taylor-TX-76574/rx1000037",
      source_url: SOURCE_URL,
    },
    created_at: SYNCED_AT,
    updated_at: SYNCED_AT,
  },
  {
    id: "website-parcel-r648688",
    org_id: "",
    title: "821 W New Hope Unit 108",
    address: "821 W New Hope Dr Unit 108, Cedar Park, TX",
    price_display: "Call for Price",
    price_cents: null,
    status: "active",
    property_type: "commercial",
    image_url: "https://yourspacewithhannah.com/assets/821-new-hope/01.jpg",
    external_source: SOURCE,
    external_id: "R648688",
    metadata: {
      area: "Cedar Park · Shops at New Hope",
      square_feet: 1874,
      year_built: 2023,
      listing_url:
        "https://fullcirclecommercialgroup.com/property-details/821-W-New-Hope-Unit-108--Cedar-Park-TX-78613/rx1000095",
      source_url: SOURCE_URL,
    },
    created_at: SYNCED_AT,
    updated_at: SYNCED_AT,
  },
];

export const ZIPFORM_TRANSACTION_LISTINGS =
  zipFormListings.rows as unknown as Listing[];

function normalizedAddress(listing: Listing): string {
  return (listing.address ?? listing.title).toLowerCase().replace(/\W/g, "");
}

export function isLegacyFakeListing(listing: Listing): boolean {
  return (
    listing.external_source === "seed" ||
    listing.external_source === "demo" ||
    listing.external_id?.startsWith("demo-") === true
  );
}

/** Static website/ZipForm listings are canonical; retain genuine manual imports. */
export function mergeWebsiteListings(existing: Listing[]): Listing[] {
  const staticListings = [...WEBSITE_LISTINGS, ...ZIPFORM_TRANSACTION_LISTINGS];
  const staticAddresses = new Set(staticListings.map(normalizedAddress));
  const manual = existing.filter(
    (listing) =>
      !isLegacyFakeListing(listing) &&
      listing.property_type !== "lease" &&
      listing.property_type !== "rental" &&
      listing.external_source !== SOURCE &&
      listing.external_source !== "zipform-transactions" &&
      !staticAddresses.has(normalizedAddress(listing)),
  );
  return [...staticListings, ...manual];
}
