import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { upsertListings } from "@/lib/listings/import";

/**
 * MLS / RESO webhook endpoint — secured with MLS_WEBHOOK_SECRET header.
 * Configure your MLS vendor to POST property updates here.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-mls-webhook-secret");
  if (!secret || secret !== process.env.MLS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Missing x-org-id header" }, { status: 400 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: job } = await supabase
    .from("import_jobs")
    .insert({
      org_id: orgId,
      source: "mls",
      status: "processing",
    })
    .select("id")
    .single();

  const result = await upsertListings(supabase, orgId, "mls", payload);

  if (job?.id) {
    await supabase
      .from("import_jobs")
      .update({
        status: result.errors.length && !result.imported ? "failed" : "completed",
        total_rows: result.imported + result.skipped,
        processed_rows: result.imported,
        error_message: result.errors.slice(0, 5).join("; ") || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }

  return NextResponse.json(result);
}
