import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend, getFromEmail } from "@/lib/resend/client";
import { leadAssignedEmail } from "@/lib/email/templates";
import { getUserOrgId } from "@/lib/org";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  }

  const { leadId, agentUserId } = (await request.json()) as {
    leadId: string;
    agentUserId: string;
  };

  const orgId = await getUserOrgId(supabase);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const [{ data: lead }, { data: agent }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", leadId).eq("org_id", orgId).single(),
    supabase.from("profiles").select("*").eq("id", agentUserId).single(),
  ]);

  if (!lead || !agent?.email) {
    return NextResponse.json({ error: "Lead or agent not found" }, { status: 404 });
  }

  const template = leadAssignedEmail({
    agentName: agent.full_name ?? "Agent",
    leadName: lead.name,
    leadEmail: lead.email ?? undefined,
    leadPhone: lead.phone ?? undefined,
  });

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: agent.email,
    subject: template.subject,
    html: template.html,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activities").insert({
    org_id: orgId,
    type: "email",
    description: `Assignment email sent for ${lead.name}`,
    lead_id: leadId,
    created_by: user.id,
  });

  return NextResponse.json({ ok: true });
}
