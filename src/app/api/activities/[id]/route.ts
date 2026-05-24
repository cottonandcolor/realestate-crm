import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { deleteDemoActivity } from "@/lib/demo/store";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    deleteDemoActivity(id);
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
