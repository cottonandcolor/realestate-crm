import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { getDemoStore } from "@/lib/demo/store";

// PATCH /api/contacts/bulk
// Body: { ids: string[], action: "add_tag" | "remove_tag", tag: string }
export async function PATCH(request: Request) {
  const body = await request.json();
  const { ids, action, tag } = body as {
    ids: string[];
    action: "add_tag" | "remove_tag";
    tag: string;
  };

  if (!ids?.length || !action || !tag) {
    return NextResponse.json({ error: "ids, action, and tag are required" }, { status: 400 });
  }

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    const store = getDemoStore();
    store.contacts.forEach((c) => {
      if (!ids.includes(c.id)) return;
      if (action === "add_tag") {
        c.tags = [...new Set([...(c.tags ?? []), tag])];
      } else {
        c.tags = (c.tags ?? []).filter((t) => t !== tag);
      }
    });
    return NextResponse.json({ updated: ids.length });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Fetch current tags for each contact, then update
  const { data: contacts, error: fetchErr } = await supabase
    .from("contacts")
    .select("id, tags")
    .in("id", ids)
    .eq("org_id", orgId);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const updates = (contacts ?? []).map((c) => {
    const currentTags: string[] = c.tags ?? [];
    const newTags =
      action === "add_tag"
        ? [...new Set([...currentTags, tag])]
        : currentTags.filter((t: string) => t !== tag);
    return supabase
      .from("contacts")
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq("id", c.id)
      .eq("org_id", orgId);
  });

  await Promise.all(updates);
  return NextResponse.json({ updated: contacts?.length ?? 0 });
}
