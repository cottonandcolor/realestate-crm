import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// Called by Vercel Cron every hour.
// Finds contacts whose reminder is due and not yet notified,
// sends email via Gmail SMTP, then marks them as notified.

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const toEmail   = process.env.REMINDER_TO_EMAIL;

  if (!gmailUser || !gmailPass || !toEmail) {
    return NextResponse.json(
      { error: "GMAIL_USER, GMAIL_APP_PASSWORD and REMINDER_TO_EMAIL env vars are required" },
      { status: 500 }
    );
  }

  const toList = toEmail.split(",").map((e) => e.trim()).filter(Boolean);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: due, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, reminder_at, reminder_note")
    .lte("reminder_at", new Date().toISOString())
    .eq("reminder_notified", false)
    .not("reminder_at", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due || due.length === 0) return NextResponse.json({ sent: 0, message: "No due reminders." });

  const rows = due.map((c) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    const dt = new Date(c.reminder_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">${dt}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${c.reminder_note ?? "—"}</td>
    </tr>`;
  }).join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto">
      <div style="background:#4f46e5;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">🔔 Contact Reminders Due</h1>
        <p style="color:#c7d2fe;margin:6px 0 0;font-size:14px">${due.length} reminder${due.length > 1 ? "s" : ""} need your attention</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f9fafb">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Contact</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Due</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Note</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">
        Real Estate CRM · <a href="https://realestatecrm-ochre.vercel.app/dashboard#contacts" style="color:#4f46e5">Open Contacts</a>
      </p>
    </div>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transporter.sendMail({
    from: `"Real Estate CRM" <${gmailUser}>`,
    to: toList.join(", "),
    subject: `🔔 ${due.length} Contact Reminder${due.length > 1 ? "s" : ""} Due`,
    html,
  });

  await supabase
    .from("contacts")
    .update({ reminder_notified: true })
    .in("id", due.map((c) => c.id));

  return NextResponse.json({ sent: due.length });
}
