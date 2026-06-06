export interface LeaseListing {
  id: string;
  address: string;
  city: string;
  leaseStart: string;
  leaseEnd: string;
  tenants: string[];
}

/** Handwritten lease roster (Jun 2026) */
export const LEASE_LISTINGS: LeaseListing[] = [
  {
    id: "lease-001",
    address: "1401 Little Elm Trl #114",
    city: "Cedar Park",
    leaseStart: "2026-06-15",
    leaseEnd: "2028-05-31",
    tenants: ["Anitha Mareedu"],
  },
  {
    id: "lease-002",
    address: "1401 Little Elm Trl #114",
    city: "Cedar Park",
    leaseStart: "2026-06-15",
    leaseEnd: "2028-05-31",
    tenants: ["Muriel Wang"],
  },
  {
    id: "lease-003",
    address: "107 Helen Cv",
    city: "Hutto",
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    tenants: ["Vinayak Shanbhogue"],
  },
  {
    id: "lease-004",
    address: "107 Helen Cv",
    city: "Hutto",
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    tenants: ["Manuel"],
  },
  {
    id: "lease-005",
    address: "14815 Avery Ranch",
    city: "Cedar Park",
    leaseStart: "2026-02-15",
    leaseEnd: "2027-02-14",
    tenants: ["Sundarraman Kalyanaraman"],
  },
  {
    id: "lease-006",
    address: "14815 Avery Ranch",
    city: "Cedar Park",
    leaseStart: "2026-02-15",
    leaseEnd: "2027-02-14",
    tenants: ["Zoe Kim"],
  },
  {
    id: "lease-007",
    address: "914 Washburn Dr",
    city: "Leander",
    leaseStart: "2026-07-01",
    leaseEnd: "2027-06-30",
    tenants: ["Katelyn Rodriguez", "Paul Youmans"],
  },
  {
    id: "lease-008",
    address: "914 Washburn Dr",
    city: "Leander",
    leaseStart: "2026-07-01",
    leaseEnd: "2027-06-30",
    tenants: ["Vinayak Shanbhogue"],
  },
  {
    id: "lease-009",
    address: "1977 Alasio Dr",
    city: "Leander",
    leaseStart: "2026-03-16",
    leaseEnd: "2027-03-31",
    tenants: ["Juhi Kumar", "Varun"],
  },
  {
    id: "lease-010",
    address: "18024 Stefano Dr",
    city: "Pflugerville",
    leaseStart: "2026-05-01",
    leaseEnd: "2027-05-31",
    tenants: ["Brandon Taylor", "Tavia Taylor"],
  },
];

export function formatLeaseDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}
