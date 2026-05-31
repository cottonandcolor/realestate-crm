import type { Contact } from "@/lib/types/database";

/** Normalized key for first + last name comparison (case-insensitive, trimmed). */
export function contactNameKey(
  first: string | null | undefined,
  last: string | null | undefined
): string {
  return `${(first ?? "").trim().toLowerCase()}|${(last ?? "").trim().toLowerCase()}`;
}

export function contactsHaveSameName(
  a: Pick<Contact, "first_name" | "last_name">,
  b: Pick<Contact, "first_name" | "last_name">
): boolean {
  const keyA = contactNameKey(a.first_name, a.last_name);
  const keyB = contactNameKey(b.first_name, b.last_name);
  return keyA.length > 1 && keyA === keyB;
}

export function findDuplicateByName<T extends Pick<Contact, "id" | "first_name" | "last_name">>(
  contacts: T[],
  first: string,
  last: string | null | undefined,
  excludeId?: string
): T | undefined {
  const target = { first_name: first, last_name: last ?? null };
  if (!first.trim()) return undefined;
  return contacts.find(
    (c) => c.id !== excludeId && contactsHaveSameName(c, target)
  );
}
