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
  const existing = await getUserOrgId(supabase);
  if (existing) return existing;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgError || !org) throw orgError ?? new Error("Failed to create organization");

  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) throw memberError;

  return org.id;
}
