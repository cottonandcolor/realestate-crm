import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { getDemoStore, linkDemoLeadToContact } from "@/lib/demo/store";

/** GET /api/contacts/:id/leads — list all leads for a contact */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    const { leads } = getDemoStore();
    return NextResponse.json(leads.filter((l) => l.contact_id === id));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("contact_id", id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** POST /api/contacts/:id/leads — link an existing lead to this contact */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const { lead_id } = await _req.json();

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    const ok = linkDemoLeadToContact(lead_id, contactId);
    if (!ok) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { error } = await supabase
    .from("leads")
    .update({ contact_id: contactId, updated_at: new Date().toISOString() })
    .eq("id", lead_id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
