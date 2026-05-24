/**
 * Parse a spoken sentence into a Task title + optional due date.
 *
 * Examples:
 *   "Call Alice tomorrow"          → { title: "Call Alice", due: <tomorrow ISO> }
 *   "Schedule open house on Friday" → { title: "Schedule open house", due: <next Friday ISO> }
 *   "Follow up with Bob next week"  → { title: "Follow up with Bob", due: <next Monday ISO> }
 *   "Update MLS listings"           → { title: "Update MLS listings", due: null }
 */
export interface ParsedTask {
  title: string;
  due_at: string | null;
}

function nextWeekday(day: number): Date {
  const d = new Date();
  const diff = (day + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d;
}

function parseDate(text: string): { date: Date | null; matched: string | null } {
  const t = text.toLowerCase();

  if (/\btoday\b/.test(t)) {
    const d = new Date(); d.setHours(9, 0, 0, 0);
    return { date: d, matched: "today" };
  }
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return { date: d, matched: "tomorrow" };
  }
  if (/\bnext\s+week\b/.test(t)) {
    return { date: nextWeekday(1), matched: "next week" };
  }

  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  for (let i = 0; i < days.length; i++) {
    const re = new RegExp(`\\b(?:on\\s+)?(?:next\\s+)?${days[i]}\\b`);
    if (re.test(t)) {
      return { date: nextWeekday(i), matched: days[i] };
    }
  }

  // "in X days"
  const inDays = t.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) {
    const d = new Date(); d.setDate(d.getDate() + parseInt(inDays[1])); d.setHours(9, 0, 0, 0);
    return { date: d, matched: inDays[0] };
  }

  return { date: null, matched: null };
}

export function parseTaskFromSpeech(text: string): ParsedTask {
  const raw = text.trim();
  const { date, matched } = parseDate(raw);

  let title = raw
    .replace(/^(?:add|create|new|schedule|set up|remind me to)\s+(?:a\s+|an\s+|task\s+(?:to\s+)?)?/i, "")
    .trim();

  if (matched) {
    title = title
      .replace(new RegExp(`\\s*(?:on\\s+)?(?:next\\s+)?${matched}\\s*`, "i"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Capitalise first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (!title) title = raw;

  return { title, due_at: date?.toISOString() ?? null };
}
