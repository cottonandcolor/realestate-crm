/**
 * Parse a spoken sentence into structured Contact fields.
 *
 * Examples the parser understands:
 *   "John Smith, phone 555-1234, email john@example.com, works at ACME"
 *   "Create contact for Sarah Lee from Realty Inc, her number is 415 555 9900"
 *   "Add Maria Garcia, she's at maria@test.com"
 */
export interface ParsedContact {
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
}

export function parseContactFromSpeech(text: string): ParsedContact {
  const raw = text.trim();

  // ── Email ──────────────────────────────────────────────────────────────────
  const emailMatch = raw.match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  const email = emailMatch?.[0] ?? null;

  // ── Phone ──────────────────────────────────────────────────────────────────
  // Matches: 555-1234, 415 555 9900, (415) 555-1234, +1 800 555 1234
  const phoneMatch = raw.match(
    /(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/
  );
  const phone = phoneMatch?.[0]?.trim() ?? null;

  // ── Company ────────────────────────────────────────────────────────────────
  const companyMatch = raw.match(
    /(?:works at|from|at|with|company(?: is)?|employer(?: is)?)\s+([A-Z][^\s,\.]{1,}(?:\s+[A-Z][^\s,\.]{1,}){0,3})/i
  );
  const company = companyMatch?.[1]?.trim() ?? null;

  // ── Name ───────────────────────────────────────────────────────────────────
  // Strip known keywords + email + phone + company from text to find name
  let stripped = raw
    .replace(/create contact(?: for)?/i, "")
    .replace(/add(?: contact)?(?:\s+for)?/i, "")
    .replace(/new contact(?:\s+for)?/i, "")
    .replace(emailMatch?.[0] ?? "xXx", "")
    .replace(phoneMatch?.[0] ?? "xXx", "")
    .replace(/(?:works at|from|at|with|company(?: is)?|employer(?: is)?)\s+[^,\n]+/gi, "")
    .replace(/(?:phone|cell|mobile|number|email|her|his|their)(?:\s+is)?/gi, "")
    .replace(/[,;]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Take first 1–3 words as name
  const words = stripped.split(/\s+/).filter(Boolean).slice(0, 3);
  const first_name = words[0] ?? "Unknown";
  const last_name = words.length > 1 ? words.slice(1).join(" ") : null;

  // ── Notes ──────────────────────────────────────────────────────────────────
  // Store the original transcript as notes for full context
  const notes = raw.length > 30 ? raw : null;

  return { first_name, last_name, email, phone, company, notes };
}
