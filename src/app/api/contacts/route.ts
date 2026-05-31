import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { getDemoStore } from "@/lib/demo/store";

export async function GET() {
  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    return NextResponse.json(getDemoStore().contacts);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const demoUser = await getDemoUserFromCookies();
  const body = await request.json();

  if (demoUser) {
    const { addDemoContact } = await import("@/lib/demo/store");
    const contact = addDemoContact(demoUser.id, body);
    return NextResponse.json(contact, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      org_id: orgId,
      first_name: body.first_name,
      last_name: body.last_name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      company: body.company ?? null,
      notes: body.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
