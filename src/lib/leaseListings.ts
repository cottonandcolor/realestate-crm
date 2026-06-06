export type LeaseListingType = "landlord" | "tenant-rep" | "tenant";

export const LEASE_TYPE_OPTIONS: { value: LeaseListingType; label: string }[] = [
  { value: "landlord", label: "Landlord" },
  { value: "tenant-rep", label: "Tenant Rep" },
  { value: "tenant", label: "Tenant" },
];

export const LEASE_TYPE_LABELS: Record<LeaseListingType, string> = {
  landlord: "Landlord",
  "tenant-rep": "Tenant Rep",
  tenant: "Tenant",
};

const LISTINGS_STORAGE_KEY = "crm_lease_listings";
const TYPE_STORAGE_KEY = "crm_lease_listing_types";

function loadLegacyTypes(): Record<string, LeaseListingType> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TYPE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LeaseListingType>) : {};
  } catch {
    return {};
  }
}

export function loadLeaseListings(): LeaseListing[] {
  if (typeof window === "undefined") return LEASE_LISTINGS;
  try {
    const raw = localStorage.getItem(LISTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LeaseListing[];
    const legacyTypes = loadLegacyTypes();
    if (Object.keys(legacyTypes).length > 0) {
      return LEASE_LISTINGS.map((l) => ({ ...l, type: legacyTypes[l.id] ?? l.type }));
    }
    return LEASE_LISTINGS;
  } catch {
    return LEASE_LISTINGS;
  }
}

export function saveLeaseListings(listings: LeaseListing[]) {
  localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
}

export function parseContactsInput(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

export const LEASE_ENDING_ALERT_DAYS = 75;

export function daysUntilLeaseEnd(leaseEnd: string): number {
  const end = new Date(leaseEnd + "T23:59:59");
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function isLeaseEndingWithinDays(leaseEnd: string, days: number): boolean {
  const left = daysUntilLeaseEnd(leaseEnd);
  return left >= 0 && left <= days;
}

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
