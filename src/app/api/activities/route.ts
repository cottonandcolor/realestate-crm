import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { getDemoActivities, addDemoActivity } from "@/lib/demo/store";
import type { ActivityType } from "@/lib/types/database";

/** GET /api/activities?lead_id=X  or  ?contact_id=X */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId    = searchParams.get("lead_id")    ?? undefined;
  const contactId = searchParams.get("contact_id") ?? undefined;

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    return NextResponse.json(getDemoActivities({ leadId, contactId }));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  let query = supabase
    .from("activities")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (leadId)    query = query.eq("lead_id",    leadId);
  if (contactId) query = query.eq("contact_id", contactId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** POST /api/activities */
export async function POST(request: Request) {
  const body = await request.json() as {
    type: ActivityType;
    description: string;
    lead_id?: string;
    contact_id?: string;
    listing_id?: string;
  };

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    const activity = addDemoActivity(demoUser.id, body);
    return NextResponse.json(activity, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabase
    .from("activities")
    .insert({
      org_id: orgId,
      type: body.type,
      description: body.description,
      lead_id: body.lead_id ?? null,
      contact_id: body.contact_id ?? null,
      listing_id: body.listing_id ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
