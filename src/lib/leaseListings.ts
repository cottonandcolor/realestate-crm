export type LeaseListingType = "landlord" | "tenant-rep";

export const LEASE_TYPE_OPTIONS: { value: LeaseListingType; label: string }[] = [
  { value: "landlord", label: "Landlord" },
  { value: "tenant-rep", label: "Tenant Rep" },
];

export const LEASE_TYPE_LABELS: Record<LeaseListingType, string> = {
  landlord: "Landlord",
  "tenant-rep": "Tenant Rep",
};

const TYPE_STORAGE_KEY = "crm_lease_listing_types";

export function loadLeaseListingTypes(): Record<string, LeaseListingType> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TYPE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LeaseListingType>) : {};
  } catch {
    return {};
  }
}

export function saveLeaseListingType(id: string, type: LeaseListingType) {
  const saved = loadLeaseListingTypes();
  saved[id] = type;
  localStorage.setItem(TYPE_STORAGE_KEY, JSON.stringify(saved));
}

export interface LeaseListing {
  id: string;
  address: string;
  city: string;
  leaseStart: string;
  leaseEnd: string;
  contacts: string[];
  type: LeaseListingType;
}

/** Handwritten lease roster (Jun 2026) */
export const LEASE_LISTINGS: LeaseListing[] = [
  {
    id: "lease-001",
    address: "1401 Little Elm Trl #114",
    city: "Cedar Park",
    leaseStart: "2026-06-15",
    leaseEnd: "2028-05-31",
    contacts: ["Anitha Mareedu"],
    type: "tenant-rep",
  },
  {
    id: "lease-002",
    address: "1401 Little Elm Trl #114",
    city: "Cedar Park",
    leaseStart: "2026-06-15",
    leaseEnd: "2028-05-31",
    contacts: ["Muriel Wang"],
    type: "tenant-rep",
  },
  {
    id: "lease-003",
    address: "107 Helen Cv",
    city: "Hutto",
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    contacts: ["Vinayak Shanbhogue"],
    type: "tenant-rep",
  },
  {
    id: "lease-004",
    address: "107 Helen Cv",
    city: "Hutto",
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    contacts: ["Manuel"],
    type: "tenant-rep",
  },
  {
    id: "lease-005",
    address: "14815 Avery Ranch",
    city: "Cedar Park",
    leaseStart: "2026-02-15",
    leaseEnd: "2027-02-14",
    contacts: ["Sundarraman Kalyanaraman"],
    type: "tenant-rep",
  },
  {
    id: "lease-006",
    address: "14815 Avery Ranch",
    city: "Cedar Park",
    leaseStart: "2026-02-15",
    leaseEnd: "2027-02-14",
    contacts: ["Zoe Kim"],
    type: "tenant-rep",
  },
  {
    id: "lease-007",
    address: "914 Washburn Dr",
    city: "Leander",
    leaseStart: "2026-07-01",
    leaseEnd: "2027-06-30",
    contacts: ["Katelyn Rodriguez", "Paul Youmans"],
    type: "tenant-rep",
  },
  {
    id: "lease-008",
    address: "914 Washburn Dr",
    city: "Leander",
    leaseStart: "2026-07-01",
    leaseEnd: "2027-06-30",
    contacts: ["Vinayak Shanbhogue"],
    type: "tenant-rep",
  },
  {
    id: "lease-009",
    address: "1977 Alasio Dr",
    city: "Leander",
    leaseStart: "2026-03-16",
    leaseEnd: "2027-03-31",
    contacts: ["Juhi Kumar", "Varun"],
    type: "tenant-rep",
  },
  {
    id: "lease-010",
    address: "18024 Stefano Dr",
    city: "Pflugerville",
    leaseStart: "2026-05-01",
    leaseEnd: "2027-05-31",
    contacts: ["Brandon Taylor", "Tavia Taylor"],
    type: "tenant-rep",
  },
];

export function formatProperty(listing: Pick<LeaseListing, "address" | "city">): string {
  return `${listing.address}, ${listing.city}`;
}

export function formatLeaseDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}
