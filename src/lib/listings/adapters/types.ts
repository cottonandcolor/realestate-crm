export type PropertyType = "sfh" | "condo" | "townhome" | "land" | "lease" | "rental";

export const PROPERTY_TYPES: PropertyType[] = ["sfh", "condo", "townhome", "land", "lease", "rental"];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  sfh: "Single Family Home",
  condo: "Condo",
  townhome: "Townhome",
  land: "Land",
  lease: "Lease",
  rental: "Rental",
};

export interface NormalizedListing {
  title: string;
  address?: string;
  price_display?: string;
  price_cents?: number;
  status?: "active" | "pending" | "sold" | "off_market";
  property_type?: PropertyType;
  image_url?: string;
  external_source: string;
  external_id: string;
  metadata?: Record<string, unknown>;
}

export interface ListingImportAdapter {
  readonly source: string;
  parse(input: string | unknown): NormalizedListing[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}
