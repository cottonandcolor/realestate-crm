import type { SupabaseClient } from "@supabase/supabase-js";
import { csvListingAdapter } from "./adapters/csv";
import { mlsListingAdapter } from "./adapters/mls";
import type { ListingImportAdapter, ImportResult } from "./adapters/types";

const adapters: Record<string, ListingImportAdapter> = {
  csv: csvListingAdapter,
  mls: mlsListingAdapter,
};

export function getListingAdapter(source: string): ListingImportAdapter | null {
  return adapters[source] ?? null;
}

export async function upsertListings(
  supabase: SupabaseClient,
  orgId: string,
  source: string,
  input: string | unknown
): Promise<ImportResult> {
  const adapter = getListingAdapter(source);
  if (!adapter) {
    return { imported: 0, skipped: 0, errors: [`Unknown source: ${source}`] };
  }

  let normalized;
  try {
    normalized = adapter.parse(input);
  } catch (e) {
    return {
      imported: 0,
      skipped: 0,
      errors: [e instanceof Error ? e.message : "Parse failed"],
    };
  }

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (const listing of normalized) {
    const { error } = await supabase.from("listings").upsert(
      {
        org_id: orgId,
        title: listing.title,
        address: listing.address ?? null,
        price_display: listing.price_display ?? null,
        price_cents: listing.price_cents ?? null,
        status: listing.status ?? "active",
        image_url: listing.image_url ?? null,
        external_source: listing.external_source,
        external_id: listing.external_id,
        metadata: listing.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,external_source,external_id" }
    );

    if (error) {
      errors.push(`${listing.external_id}: ${error.message}`);
      skipped++;
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}
