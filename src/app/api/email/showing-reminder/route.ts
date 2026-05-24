import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend, getFromEmail } from "@/lib/resend/client";
import { showingReminderEmail } from "@/lib/email/templates";

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

  const { toEmail, agentName, title, when, location } = (await request.json()) as {
    toEmail: string;
    agentName: string;
    title: string;
    when: string;
    location?: string;
  };

  const template = showingReminderEmail({ agentName, title, when, location });

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: toEmail,
    subject: template.subject,
    html: template.html,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
