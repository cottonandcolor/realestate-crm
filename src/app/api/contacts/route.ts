import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgId } from "@/lib/org";
import { getDemoUserFromCookies } from "@/lib/demo/session";
import { getDemoStore } from "@/lib/demo/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const demoUser = await getDemoUserFromCookies();
  if (demoUser) {
    const { contacts } = getDemoStore();
    if (!q) return NextResponse.json(contacts);
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const fields = (c: typeof contacts[0]) => [
      c.first_name, c.last_name, c.email, c.company, c.job_title, c.notes,
      c.phone, c.address_city, c.address_region, c.address_street, ...(c.tags ?? [])
    ].map((v) => (v ?? "").toLowerCase());
    return NextResponse.json(contacts.filter((c) =>
      words.some((word) => fields(c).some((f) => f.includes(word)))
    ));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (q) {
    // Split into words — any word that matches any field is returned
    const words = q.trim().split(/\s+/).filter(Boolean);
    const conditions = words.flatMap((word) => [
      `first_name.ilike.%${word}%`,
      `last_name.ilike.%${word}%`,
      `email.ilike.%${word}%`,
      `phone.ilike.%${word}%`,
      `company.ilike.%${word}%`,
      `job_title.ilike.%${word}%`,
      `notes.ilike.%${word}%`,
      `address_city.ilike.%${word}%`,
      `address_region.ilike.%${word}%`,
      `address_street.ilike.%${word}%`,
    ]);
    query = query.or(conditions.join(","));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const demoUser = await getDemoUserFromCookies();
  const body = await request.json();

  if (demoUser) {
    const { addDemoContact } = await import("@/lib/demo/store");
    const contact = addDemoContact(demoUser.id, body);
    return NextResponse.json(contact, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      org_id: orgId,
      first_name: body.first_name,
      last_name: body.last_name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      company: body.company ?? null,
      job_title: body.job_title ?? null,
      notes: body.notes ?? null,
      tags: body.tags ?? [],
      birthday: body.birthday ?? null,
      relationship: body.relationship ?? null,
      address_street: body.address_street ?? null,
      address_city: body.address_city ?? null,
      address_region: body.address_region ?? null,
      address_postal_code: body.address_postal_code ?? null,
      address_country: body.address_country ?? null,
      website: body.website ?? null,
      reminder_at: body.reminder_at ?? null,
      reminder_note: body.reminder_note ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
