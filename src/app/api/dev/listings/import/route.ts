import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/demo/constants";
import { isDemoModeEnabled } from "@/lib/demo/constants";
import { isValidDemoToken } from "@/lib/demo/session";
import { csvListingAdapter } from "@/lib/listings/adapters/csv";
import { appendDemoListings } from "@/lib/demo/store";
import type { Listing } from "@/lib/types/database";

const orgId = "00000000-0000-4000-8000-000000000010";

export async function POST(request: Request) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 });
  }

  const cookieStore = await cookies();
  if (!isValidDemoToken(cookieStore.get(DEMO_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = (await request.json()) as { data?: string };
  if (!data) {
    return NextResponse.json({ error: "Missing CSV data" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = csvListingAdapter.parse(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parse failed" },
      { status: 400 }
    );
  }

  const imported: Listing[] = parsed.map((row, i) => ({
    id: `20000000-0000-4000-8000-${String(100 + i).padStart(12, "0")}`,
    org_id: orgId,
    title: row.title,
    address: row.address ?? null,
    price_display: row.price_display ?? null,
    price_cents: row.price_cents ?? null,
    status: row.status ?? "active",
    property_type: row.property_type ?? null,
    image_url: row.image_url ?? null,
    external_source: row.external_source,
    external_id: row.external_id,
    metadata: row.metadata ?? {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  appendDemoListings(imported);

  return NextResponse.json({
    imported: imported.length,
    skipped: 0,
    errors: [],
  });
}
