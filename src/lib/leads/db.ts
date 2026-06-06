import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/lib/types/database";

export function isContactByColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("contact_by") && (lower.includes("schema cache") || lower.includes("does not exist"));
}

export function withContactByDefault<T extends { contact_by?: string | null }>(row: T) {
  return { ...row, contact_by: row.contact_by ?? null };
}

/** Ensure API rows always have safe defaults for optional lead fields. */
export function normalizeLead<T extends Partial<Lead>>(row: T): Lead {
  const { warnings: _w, ...rest } = row as T & { warnings?: string[] };
  return {
    ...(rest as Lead),
    tags: Array.isArray(rest.tags) ? rest.tags : [],
    contact_by: rest.contact_by ?? null,
    email: rest.email ?? null,
    phone: rest.phone ?? null,
    source: rest.source ?? null,
    contact_id: rest.contact_id ?? null,
    assigned_agent_id: rest.assigned_agent_id ?? null,
  };
}

type LeadInsertRow = Record<string, unknown>;

export async function insertLeadRow(
  supabase: SupabaseClient,
  row: LeadInsertRow
): Promise<{ data: Record<string, unknown> | null; error: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  const contactBy = row.contact_by as string | null | undefined;

  let { data, error } = await supabase.from("leads").insert(row).select().single();

  if (error && isContactByColumnError(error.message) && contactBy) {
    const { contact_by: _dropped, ...withoutContactBy } = row;
    ({ data, error } = await supabase.from("leads").insert(withoutContactBy).select().single());
    if (!error) {
      warnings.push(
        "Lead was saved, but the contact-by date could not be stored yet. Your database needs a quick update — contact-by dates will work after that."
      );
    }
  }

  if (error) return { data: null, error: error.message, warnings };
  return {
    data: withContactByDefault({ ...(data as Record<string, unknown>), contact_by: contactBy ?? null }),
    error: null,
    warnings,
  };
}

export async function updateLeadRow(
  supabase: SupabaseClient,
  id: string,
  orgId: string,
  patch: LeadInsertRow
): Promise<{ data: Record<string, unknown> | null; error: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  const contactBy = patch.contact_by as string | null | undefined;
  const hasContactBy = "contact_by" in patch;

  let { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error && isContactByColumnError(error.message) && hasContactBy) {
    const { contact_by: _dropped, ...withoutContactBy } = patch;
    ({ data, error } = await supabase
      .from("leads")
      .update(withoutContactBy)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single());
    if (!error) {
      warnings.push(
        "Lead was updated, but the contact-by date could not be saved yet. Your database needs a quick update."
      );
    }
  }

  if (error) return { data: null, error: error.message, warnings };
  return {
    data: withContactByDefault({
      ...(data as Record<string, unknown>),
      contact_by: hasContactBy ? (contactBy ?? null) : (data as { contact_by?: string | null })?.contact_by ?? null,
    }),
    error: null,
    warnings,
  };
}
