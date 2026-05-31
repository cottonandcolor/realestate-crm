/**
 * One-time seed: handwritten property task lists → projects + tasks
 * Run: node scripts/seed-handwritten-tasks.mjs
 */

const ORG = "d4031dd4-0e8f-4505-8d04-86717956448d";
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

const PROJECTS = [
  { id: "a1000001-0000-4000-8000-000000000001", name: "1220 Calendula Trl", sort_order: 0, tasks: [
    "Mon - Remind Saurabh Utilities",
    "Ask for Showcase payment",
    "Lease Comps 3rd week of June",
    "Follow up with open house showings",
    "Clear the garage",
    "My Hus - fix floor and deck",
  ]},
  { id: "a1000001-0000-4000-8000-000000000002", name: "806 Clearwell St", sort_order: 1, tasks: [
    "Lock box auth form",
    "Place signboard",
    "Create a flyer",
    "Priscilla - Key",
    "Mon - Visit Jongkyu",
  ]},
  { id: "a1000001-0000-4000-8000-000000000003", name: "1401 Little Elm", sort_order: 2, tasks: [
    "Upload back agent",
    "Send invoice to Anitha",
    "Collect rent on June 12th",
    "Get renters insurance",
    "Inventory form 6/25",
  ]},
  { id: "a1000001-0000-4000-8000-000000000004", name: "107 Helen Cv", sort_order: 3, tasks: [
    "Mon - Hand keys to Manuel",
    "Remove signboard",
    "Give snug sign to Rafael",
    "Vinaya pay brokerage",
    "Han - set up tenant agent pay",
    "Han - Take pictures",
  ]},
  { id: "a1000001-0000-4000-8000-000000000005", name: "7206 Flagship dr", sort_order: 4, tasks: [
    "Figure out buildable space",
    "Ask Kumar for contact",
    "Ask owner for gate access",
    "Visit the land",
  ]},
  { id: "a1000001-0000-4000-8000-000000000006", name: "Jarrell Land", sort_order: 5, tasks: [
    "Send pre develop mtg with county",
    "Contact Sonterra Mud",
    "Get easements",
  ]},
  { id: "a1000001-0000-4000-8000-000000000007", name: "821 W. New Hope dr", sort_order: 6, tasks: [
    "Advertise in FB groups",
    "Set a mtg with Arsh",
  ]},
  { id: "a1000001-0000-4000-8000-000000000008", name: "Cedric – church space", sort_order: 7, tasks: [
    "Contact agent to check availability",
    "Current lease ends end of August",
  ]},
  { id: "a1000001-0000-4000-8000-000000000009", name: "Johnson Rd land", sort_order: 8, tasks: [
    "Contact Blanca",
    "Figure out the right sale price",
  ]},
];

const existing = await get(`/projects?org_id=eq.${ORG}&name=eq.1220%20Calendula%20Trl&select=id`);
if (existing.length > 0) {
  console.log("Already seeded — skipping");
  process.exit(0);
}

const projectRows = PROJECTS.map(({ id, name, sort_order }) => ({
  id, org_id: ORG, name, sort_order,
}));

await post("/projects", projectRows);
console.log(`Inserted ${projectRows.length} projects`);

const taskRows = PROJECTS.flatMap((p) =>
  p.tasks.map((title) => ({
    org_id: ORG,
    project_id: p.id,
    title,
    status: "todo",
  }))
);

// Post in batches of 20
for (let i = 0; i < taskRows.length; i += 20) {
  await post("/tasks", taskRows.slice(i, i + 20));
}
console.log(`Inserted ${taskRows.length} tasks`);
console.log("Done.");
