/** Short local date for CRM lists (e.g. lead added date). */
export function formatDateAdded(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Local calendar date as YYYY-MM-DD (for date-only fields). */
export function localDateISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format a YYYY-MM-DD contact-by date for display. */
export function formatContactBy(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isContactDueToday(iso: string | null): boolean {
  if (!iso) return false;
  return iso === localDateISO();
}

export function isContactOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return iso < localDateISO();
}

export function isContactDue(iso: string | null): boolean {
  return isContactDueToday(iso) || isContactOverdue(iso);
}

/** End of the current local calendar day (for task due comparisons). */
export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
