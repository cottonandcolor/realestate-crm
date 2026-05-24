import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google/calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=denied`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await supabase.from("google_tokens").upsert({
      user_id: user.id,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? null,
      expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=connected`);
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=error`);
  }
}
