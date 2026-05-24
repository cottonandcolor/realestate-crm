import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { upsertListings } from "@/lib/listings/import";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getUserOrgId(supabase);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let source = "csv";
  let payload: string | unknown;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    source = (form.get("source") as string) || "csv";
    const file = form.get("file");
    if (file instanceof File) {
      payload = await file.text();
    } else {
      payload = form.get("data") as string;
    }
  } else {
    const body = await request.json();
    source = body.source ?? "csv";
    payload = body.data ?? body.csv;
  }

  const { data: job } = await supabase
    .from("import_jobs")
    .insert({
      org_id: orgId,
      source,
      status: "processing",
      created_by: user.id,
    })
    .select("id")
    .single();

  const result = await upsertListings(supabase, orgId, source, payload);

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
