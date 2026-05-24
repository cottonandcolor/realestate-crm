import { NextResponse } from "next/server";
import {
  DEMO_COOKIE,
  DEMO_USER,
  isDemoModeEnabled,
} from "@/lib/demo/constants";
import { getDemoSessionToken } from "@/lib/demo/session";
import { resetDemoStore } from "@/lib/demo/store";

export async function POST() {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: "Demo mode is disabled. Set DEV_DEMO_MODE=true in .env.local" },
      { status: 403 }
    );
  }

  resetDemoStore();

  const response = NextResponse.json({
    ok: true,
    user: DEMO_USER,
    message: "Logged in as demo agent",
  });

  response.cookies.set(DEMO_COOKIE, getDemoSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function GET() {
  const res = await POST();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirect = NextResponse.redirect(`${appUrl}/dashboard?demo=1`);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) redirect.headers.set("set-cookie", setCookie);
  return redirect;
}
