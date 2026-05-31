import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// This endpoint is called by Vercel Cron every hour.
// It finds all contacts whose reminder is due and not yet notified,
// emails the org owner, then marks them as notified.

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (has the secret header)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDER_FROM_EMAIL ?? "reminders@realestatecrm.app";
  const toEmail = process.env.REMINDER_TO_EMAIL;

  if (!resendKey || !toEmail) {
    return NextResponse.json(
      { error: "RESEND_API_KEY and REMINDER_TO_EMAIL env vars are required" },
      { status: 500 }
    );
  }

  // Support comma-separated list of recipients, e.g. "a@x.com, b@x.com"
  const toList = toEmail.split(",").map((e) => e.trim()).filter(Boolean);

  // Use service-role key so we can query across all orgs
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find all contacts with a due (past) reminder that haven't been notified yet
  const { data: due, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, reminder_at, reminder_note, org_id")
    .lte("reminder_at", new Date().toISOString())
    .eq("reminder_notified", false)
    .not("reminder_at", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, message: "No due reminders." });
  }

  // Build the email body
  const rows = due
    .map((c) => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
      const dt = new Date(c.reminder_at).toLocaleString("en-US", {
        dateStyle: "medium", timeStyle: "short",
      });
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">${dt}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${c.reminder_note ?? "—"}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto">
      <div style="background:#4f46e5;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">🔔 Contact Reminders Due</h1>
        <p style="color:#c7d2fe;margin:6px 0 0;font-size:14px">
          ${due.length} reminder${due.length > 1 ? "s" : ""} need your attention
        </p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:0">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Contact</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Due</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Note</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">
        Real Estate CRM · <a href="https://realestatecrm-ochre.vercel.app/dashboard#contacts" style="color:#4f46e5">Open Contacts</a>
      </p>
    </div>`;

  const resend = new Resend(resendKey);
  const { error: emailError } = await resend.emails.send({
    from: fromEmail,
    to: toList,
    subject: `🔔 ${due.length} Contact Reminder${due.length > 1 ? "s" : ""} Due`,
    html,
  });

  if (emailError) {
    return NextResponse.json({ error: String(emailError) }, { status: 500 });
  }

  // Mark all as notified
  const ids = due.map((c) => c.id);
  await supabase
    .from("contacts")
    .update({ reminder_notified: true })
    .in("id", ids);

  return NextResponse.json({ sent: due.length });
}
