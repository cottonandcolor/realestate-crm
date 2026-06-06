import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { addDemoLead } from "@/lib/demo/store";
import type { LeadStage } from "@/lib/types/database";

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = (body.name as string)?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const payload = {
    name,
    email: (body.email as string | null)?.trim() || null,
    phone: (body.phone as string | null)?.trim() || null,
    stage: (body.stage as LeadStage) ?? "new",
    source: (body.source as string | null)?.trim() || null,
    tags: parseTags(body.tags),
    contact_by: (body.contact_by as string | null) || null,
  };

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    const lead = addDemoLead({ ...payload, assigned_agent_id: demoUser.id });
    return NextResponse.json(lead, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabase
    .from("leads")
    .insert({
      org_id: orgId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      stage: payload.stage,
      source: payload.source,
      tags: payload.tags,
      contact_by: payload.contact_by,
      assigned_agent_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
