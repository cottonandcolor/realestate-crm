/**
 * Seed handwritten lease roster → contacts with address + lease-end reminders
 * Run: node scripts/seed-lease-roster.mjs
 */

const ORG = "d4031dd4-0e8f-4505-8d04-86717956448d";
const TAG = "Lease Roster";
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

/** @type {{ address: string; city: string; start: string; end: string; tenants: string[] }[]} */
const LEASES = [
  {
    address: "1401 Little Elm Trl #114",
    city: "Cedar Park",
    start: "2026-06-15",
    end: "2028-05-31",
    tenants: ["Anitha Mareedu"],
  },
  {
    address: "1401 Little Elm Trl #114",
    city: "Cedar Park",
    start: "2026-06-15",
    end: "2028-05-31",
    tenants: ["Muriel Wang"],
  },
  {
    address: "107 Helen Cv",
    city: "Hutto",
    start: "2026-06-01",
    end: "2027-05-31",
    tenants: ["Vinayak Shanbhogue"],
  },
  {
    address: "107 Helen Cv",
    city: "Hutto",
    start: "2026-06-01",
    end: "2027-05-31",
    tenants: ["Manuel"],
  },
  {
    address: "14815 Avery Ranch",
    city: "Cedar Park",
    start: "2026-02-15",
    end: "2027-02-14",
    tenants: ["Sundarraman Kalyanaraman"],
  },
  {
    address: "14815 Avery Ranch",
    city: "Cedar Park",
    start: "2026-02-15",
    end: "2027-02-14",
    tenants: ["Zoe Kim"],
  },
  {
    address: "914 Washburn Dr",
    city: "Leander",
    start: "2026-07-01",
    end: "2027-06-30",
    tenants: ["Katelyn Rodriguez", "Paul Youmans"],
  },
  {
    address: "914 Washburn Dr",
    city: "Leander",
    start: "2026-07-01",
    end: "2027-06-30",
    tenants: ["Vinayak Shanbhogue"],
  },
  {
    address: "1977 Alasio Dr",
    city: "Leander",
    start: "2026-03-16",
    end: "2027-03-31",
    tenants: ["Juhi Kumar", "Varun"],
  },
  {
    address: "18024 Stefano Dr",
    city: "Pflugerville",
    start: "2026-05-01",
    end: "2027-05-31",
    tenants: ["Brandon Taylor", "Tavia Taylor"],
  },
];

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function formatRange(start, end) {
  const fmt = (iso) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

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
  `/contacts?org_id=eq.${ORG}&tags=cs.{${encodeURIComponent(TAG)}}&select=id&limit=1`
);
if (existing.length > 0) {
  console.log("Lease roster already seeded — skipping");
  process.exit(0);
}

const rows = LEASES.flatMap((lease) =>
  lease.tenants.map((tenant) => {
    const { first_name, last_name } = splitName(tenant);
    return {
      org_id: ORG,
      first_name,
      last_name,
      address_street: lease.address,
      address_city: lease.city,
      address_region: "TX",
      notes: `Lease: ${formatRange(lease.start, lease.end)}`,
      tags: ["Tenant", TAG],
      relationship: "Tenant",
      reminder_at: `${lease.end}T09:00:00.000Z`,
      reminder_note: `Lease ends — ${lease.address}`,
    };
  })
);

const inserted = await post("/contacts", rows);
console.log(`Inserted ${inserted.length} tenant contacts:`);
for (const c of inserted) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  console.log(`  - ${name} @ ${c.address_street}, ${c.address_city}`);
}
console.log("Done.");
