export interface NormalizedListing {
  title: string;
  address?: string;
  price_display?: string;
  price_cents?: number;
  status?: "active" | "pending" | "sold" | "off_market";
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
