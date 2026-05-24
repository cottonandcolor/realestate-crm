import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarAuthUrl } from "@/lib/google/calendar";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google Calendar not configured" },
      { status: 503 }
    );
  }

  const url = getCalendarAuthUrl(user.id);
  return NextResponse.redirect(url);
}
