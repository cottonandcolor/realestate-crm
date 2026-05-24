import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getCalendarAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getAuthedCalendarClient(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return null;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token ?? undefined,
    expiry_date: tokenRow.expiry ? new Date(tokenRow.expiry).getTime() : undefined,
  });

  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await supabase.from("google_tokens").upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? tokenRow.refresh_token,
        expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      });
    }
  });

  return google.calendar({ version: "v3", auth: client });
}

export async function createCalendarEvent(
  supabase: SupabaseClient,
  userId: string,
  params: {
    summary: string;
    description?: string;
    start: string;
    end: string;
  }
): Promise<string | null> {
  const calendar = await getAuthedCalendarClient(supabase, userId);
  if (!calendar) return null;

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.start },
      end: { dateTime: params.end },
    },
  });

  return event.data.id ?? null;
}
