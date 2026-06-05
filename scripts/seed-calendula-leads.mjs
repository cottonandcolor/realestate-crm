/**
 * Seed open-house leads for 1220 Calendula Trl
 * Run: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-calendula-leads.mjs
 */

const ORG = "d4031dd4-0e8f-4505-8d04-86717956448d";
const SOURCE = "1220 Calendula Trl Open house";
const URL = "https://werptponkghouphenese.supabase.co/rest/v1";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const LEADS = [
  {
    name: "Angie and Frank",
    email: "ac101098@gmail.com",
    phone: "214-632-7773",
    note:
      "Their lease is till the end of Nov. They will start looking seriously from August onwards. Early termination is $12000.",
  },
  {
    name: "Brennan McGuigan and Gracie",
    email: "brennan.mcguigan@gmail.com",
    phone: null,
    note:
      "Gracie has a home business and makes dog treats. Current lease has ended.",
  },
  {
    name: "James and Tina Wood",
    email: "tinagwood@gmail.com",
    phone: "325-233-7026",
    note:
      "They are looking for a single story home. Currently live in Mayfield Ranch. They have 4 toddler grand kids.",
  },
];

async function get(path) {
  const r = await fetch(`${URL}${path}`, { headers });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

const existing = await get(
  `/leads?org_id=eq.${ORG}&source=eq.${encodeURIComponent(SOURCE)}&select=name`
);
if (existing.length > 0) {
  console.log("Calendula open house leads already seeded — skipping");
  process.exit(0);
}

const inserted = await post(
  "/leads",
  LEADS.map((l) => ({
    org_id: ORG,
    name: l.name,
    email: l.email,
    phone: l.phone,
    stage: "new",
    source: SOURCE,
    tags: ["Calendula Open House"],
  }))
);

for (let i = 0; i < inserted.length; i++) {
  await post("/activities", {
    org_id: ORG,
    type: "note",
    description: LEADS[i].note,
    lead_id: inserted[i].id,
  });
}

console.log(`Inserted ${inserted.length} leads with notes`);
inserted.forEach((l) => console.log(`  - ${l.name}`));
