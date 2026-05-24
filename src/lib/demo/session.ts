import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { DEMO_COOKIE, DEMO_USER, isDemoModeEnabled } from "./constants";

const VALID_TOKEN = "demo-agent-session-v1";

export function getDemoSessionToken(): string {
  return VALID_TOKEN;
}

export function isValidDemoToken(value: string | undefined): boolean {
  return value === VALID_TOKEN;
}

export function isDemoSession(request: NextRequest): boolean {
  if (!isDemoModeEnabled()) return false;
  return isValidDemoToken(request.cookies.get(DEMO_COOKIE)?.value);
}

export async function getDemoUserFromCookies(): Promise<typeof DEMO_USER | null> {
  if (!isDemoModeEnabled()) return null;
  const cookieStore = await cookies();
  if (!isValidDemoToken(cookieStore.get(DEMO_COOKIE)?.value)) return null;
  return DEMO_USER;
}
