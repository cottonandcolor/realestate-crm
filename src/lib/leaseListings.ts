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

export function createLeaseListingId(): string {
  return `lease-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyLeaseListing(): LeaseListing {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setFullYear(endDate.getFullYear() + 1);
  return {
    id: createLeaseListingId(),
    address: "",
    city: "",
    leaseStart: today.toISOString().slice(0, 10),
    leaseEnd: endDate.toISOString().slice(0, 10),
    contacts: [],
    type: "tenant-rep",
  };
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

/** Fallback before Agent Hub sync runs in the browser */
export const LEASE_LISTINGS: LeaseListing[] = [];

export const LEASE_ENDING_ALERT_DAYS = 75;

export function daysUntilLeaseEnd(leaseEnd: string): number {
  if (!leaseEnd) return Number.POSITIVE_INFINITY;
  const end = new Date(leaseEnd + "T23:59:59");
  if (Number.isNaN(end.getTime())) return Number.POSITIVE_INFINITY;
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function isLeaseEndingWithinDays(leaseEnd: string, days: number): boolean {
  if (!leaseEnd) return false;
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
