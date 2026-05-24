import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { addDemoTask } from "@/lib/demo/store";

export async function POST(request: Request) {
  const body = await request.json() as {
    title: string;
    status?: string;
    due_at?: string | null;
    lead_id?: string;
    listing_id?: string;
  };

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    const task = addDemoTask({ title: body.title, due_at: body.due_at });
    return NextResponse.json(task, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: orgId,
      title: body.title,
      status: body.status ?? "todo",
      due_at: body.due_at ?? null,
      lead_id: body.lead_id ?? null,
      listing_id: body.listing_id ?? null,
      assigned_agent_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
