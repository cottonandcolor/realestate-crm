import {
  parseContactsInput,
  type LeaseListing,
  type LeaseListingType,
} from "@/lib/leaseListings";

export const AGENTHUB_SYNC_KEY = "crm_agenthub_leases_synced_at";
export const ZIPFORM_SYNC_KEY = "crm_zipform_leases_synced_at";

export interface AgentHubTransaction {
  ref_number: string;
  property_address: string;
  lease_start_date: string;
  lease_end_date: string;
  landlord_name: string;
  transaction_type: string;
}

/** Split "1401 Little Elm Trail 114, Cedar Park TX" → address + city */
export function parseAgentHubAddress(full: string): { address: string; city: string } {
  const trimmed = full.trim();
  const match = trimmed.match(/^(.+),\s*(.+?)\s+([A-Z]{2})$/);
  if (match) {
    return { address: match[1].trim(), city: match[2].trim() };
  }
  const comma = trimmed.lastIndexOf(",");
  if (comma > 0) {
    return {
      address: trimmed.slice(0, comma).trim(),
      city: trimmed.slice(comma + 1).trim(),
    };
  }
  return { address: trimmed, city: "" };
}

/** "Jun 15, 2026" → YYYY-MM-DD, or "" if missing/TBD */
export function parseAgentHubDate(value: string): string {
  const s = value.trim();
  if (!s || /^tbd$/i.test(s)) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isAgentHubLease(tx: AgentHubTransaction): boolean {
  return /lease/i.test(tx.transaction_type);
}

export function agentHubTransactionToLeaseListing(tx: AgentHubTransaction): LeaseListing {
  const { address, city } = parseAgentHubAddress(tx.property_address);
  return {
    id: `agenthub-${tx.ref_number}`,
    address,
    city,
    leaseStart: parseAgentHubDate(tx.lease_start_date),
    leaseEnd: parseAgentHubDate(tx.lease_end_date),
    contacts: parseContactsInput(tx.landlord_name),
    type: "landlord",
  };
}

export function agentHubTransactionsToLeaseListings(
  rows: AgentHubTransaction[],
): LeaseListing[] {
  return rows.filter(isAgentHubLease).map(agentHubTransactionToLeaseListing);
}

export interface AgentHubLeaseRow extends LeaseListing {
  ref_number?: string;
  status?: string;
  monthly_rent?: string;
  detail_url?: string;
}

export function agentHubLeaseRowsToListings(rows: AgentHubLeaseRow[]): LeaseListing[] {
  return rows.map(({ id, address, city, leaseStart, leaseEnd, contacts, type }) => ({
    id,
    address,
    city,
    leaseStart,
    leaseEnd,
    contacts,
    type: type as LeaseListingType,
  }));
}

export function stripLegacySeedListings(listings: LeaseListing[]): LeaseListing[] {
  return listings.filter(
    (l) =>
      !l.id.startsWith("agenthub-") &&
      !l.id.startsWith("zipform-") &&
      !/^lease-00\d$/.test(l.id),
  );
}

/** Merge Agent Hub imports by stable id; newer import wins on collision */
export function mergeAgentHubLeaseListings(
  existing: LeaseListing[],
  imported: LeaseListing[],
): LeaseListing[] {
  const byId = new Map(existing.map((l) => [l.id, l]));
  for (const row of imported) {
    byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => {
    const aStart = a.leaseStart || "9999-12-31";
    const bStart = b.leaseStart || "9999-12-31";
    return bStart.localeCompare(aStart);
  });
}
