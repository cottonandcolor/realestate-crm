import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { reorderDemoTasks } from "@/lib/demo/store";

/** PATCH /api/tasks/reorder — body: { orderedIds: string[] } */
export async function PATCH(request: Request) {
  const body = await request.json();
  const orderedIds = body.orderedIds as string[] | undefined;

  if (!orderedIds?.length) {
    return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
  }

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    reorderDemoTasks(orderedIds);
    return NextResponse.json({ updated: orderedIds.length });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("tasks")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("org_id", orgId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: orderedIds.length });
}
