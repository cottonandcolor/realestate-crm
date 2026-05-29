import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserOrgId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return member?.org_id ?? null;
}

export async function ensureUserOrg(
  supabase: SupabaseClient,
  orgName: string
): Promise<string> {
  // Use a SECURITY DEFINER function to create org + add member atomically,
  // bypassing the RLS chicken-and-egg problem (can't SELECT org until member exists).
  const { data, error } = await supabase.rpc("create_org_and_join", {
    org_name: orgName,
  });

  if (error) throw error;
  if (!data) throw new Error("Failed to create organization");

  return data as string;
}
