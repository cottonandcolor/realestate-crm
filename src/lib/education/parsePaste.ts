import type { EducationClass } from "../educationClasses";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDateFromText(text: string): string | null {
  const weekdayMonth = text.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
  );
  if (weekdayMonth) {
    const m = MONTHS[weekdayMonth[1].toLowerCase()];
    if (m) return padDate(Number(weekdayMonth[3]), m, Number(weekdayMonth[2]));
  }

  const monthDay = text.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (monthDay) {
    const m = MONTHS[monthDay[1].toLowerCase()];
    if (m) return padDate(Number(monthDay[3]), m, Number(monthDay[2]));
  }

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slash) return padDate(Number(slash[3]), Number(slash[1]), Number(slash[2]));

  return null;
}

function parseRsvpDeadline(text: string): string | null {
  const rsvp = text.match(/RSVP\s*(?:by|before|deadline)?[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (rsvp) return parseDateFromText(rsvp[1]);
  return null;
}

function parseTitle(lines: string[], full: string): string {
  const ceLine = lines.find((l) => /TREC\s*CE\s*CLASS|CE\s*CLASS/i.test(l));
  if (ceLine) {
    const after = ceLine.replace(/^.*CE\s*CLASS\s*:?\s*/i, "").trim();
    if (after.length > 3) return after;
  }

  const caps = lines.find(
    (l) => l.length >= 18 && l === l.toUpperCase() && /[A-Z]{4,}/.test(l) && !/RSVP|REGISTER/i.test(l)
  );
  if (caps) return caps;

  const marketing = lines.find((l) => /^Marketing\b/i.test(l));
  if (marketing) return marketing;

  const using = lines.find((l) => /Using\s+.+\s+in\s+Real\s+Estate/i.test(l));
  if (using) {
    const idx = lines.indexOf(using);
    if (idx > 0 && lines[idx - 1].length > 8) {
      return `${lines[idx - 1]} ${using}`;
    }
    return using;
  }

  const skip = (l: string) =>
    /@/.test(l) ||
    /^\d{3}/.test(l) ||
    /register\s*here/i.test(l) ||
    /lunch\s+and\s+learn/i.test(l) ||
    l.length < 8;

  return lines.find((l) => !skip(l)) ?? "";
}

function parseInstructor(text: string): string | null {
  const withMatch = text.match(/\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)/);
  if (withMatch) return withMatch[1].trim();

  const instructor = text.match(/instructor[:\s]+([^\n.]+)/i);
  if (instructor) return instructor[1].trim();

  const fromMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+from\s+/);
  if (fromMatch) return fromMatch[1].trim();

  return null;
}

function parseLocation(text: string): { location_name: string | null; address: string | null } {
  const line = text.split(/\r?\n/).find((l) => /\b\d{5}\b/.test(l) && /,/.test(l));
  if (line) {
    const venue = line.match(
      /^([^,]+(?:Office|Home|Center|Building|Model\s+Home)[^,]*),\s*(.+)$/i
    );
    if (venue) {
      return { location_name: venue[1].trim(), address: venue[2].trim() };
    }
    const comma = line.indexOf(",");
    if (comma > 0) {
      return {
        location_name: line.slice(0, comma).trim(),
        address: line.slice(comma + 1).trim(),
      };
    }
  }

  const addressOnly = text.match(/(\d+\s+[^\n]+(?:,\s*[A-Za-z.\s]+,\s*TX\s*\d{5}))/i);
  if (addressOnly) {
    return { location_name: null, address: addressOnly[1].trim() };
  }

  return { location_name: null, address: null };
}

/** Best-effort extraction from pasted flyer or email text. */
export function parseEducationPaste(text: string): Partial<EducationClass> {
  const trimmed = text.trim();
  if (!trimmed) return { raw_notes: "" };

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const timeMatch = trimmed.match(
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  );
  const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  const phoneMatch = trimmed.match(/\b(\d{3})[.\s-]?(\d{3})[.\s-]?(\d{4})\b/);
  const ceMatch = trimmed.match(/\b(\d{5}-RECE)\b/i);
  const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/i);
  const { location_name, address } = parseLocation(trimmed);

  let cost: string | null = null;
  if (/\bfree\b|complimentary|complementary/i.test(trimmed)) cost = "Free";

  let provider: string | null = null;
  const providerMatch = trimmed.match(/(Texas\s*REALTORS[^\n.]*)/i);
  if (providerMatch) provider = providerMatch[1].trim();

  let sponsor: string | null = null;
  const sponsorMatch =
    trimmed.match(/compliments of\s+([^\n.]+)/i) ??
    trimmed.match(/(D\.?R\.?\s*Horton[^\n.]*)/i);
  if (sponsorMatch) sponsor = sponsorMatch[1].trim();

  const classDate = parseDateFromText(trimmed);
  const rsvpDeadline = parseRsvpDeadline(trimmed);

  const description = lines
    .filter(
      (l) =>
        l.length > 40 &&
        !/@/.test(l) &&
        !/register/i.test(l) &&
        !/^\d{5}-RECE/.test(l)
    )
    .slice(0, 2)
    .join(" ");

  return {
    title: parseTitle(lines, trimmed) || "Untitled class",
    ce_number: ceMatch?.[1] ?? null,
    instructor: parseInstructor(trimmed),
    provider,
    sponsor,
    class_date: classDate,
    time_start: timeMatch?.[1]?.trim() ?? null,
    time_end: timeMatch?.[2]?.trim() ?? null,
    location_name,
    address,
    cost,
    rsvp_deadline: rsvpDeadline,
    rsvp_email: emailMatch?.[0] ?? null,
    rsvp_phone: phoneMatch ? phoneMatch[0] : null,
    register_url: urlMatch?.[0] ?? null,
    description: description || null,
    raw_notes: trimmed,
  };
}
