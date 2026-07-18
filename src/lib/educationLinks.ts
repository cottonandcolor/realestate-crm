export interface EducationMonthSchedule {
  id: string;
  /** e.g. "June 2026" */
  label: string;
  image: string;
  created_at: string;
}

export interface EducationLink {
  id: string;
  label: string;
  url: string;
  schedules: EducationMonthSchedule[];
  created_at: string;
}

const STORAGE_KEY = "crm_education_links";

export const DEFAULT_EDUCATION_LINKS: EducationLink[] = [
  {
    id: "edu-link-independence-title",
    label: "Independence Title — Online Education",
    url: "https://www.independencetitle.com/classes/category/online-education/list/",
    schedules: [],
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

export function createEducationLinkId(): string {
  return `edu-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEducationScheduleId(): string {
  return `edu-sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeLink(raw: EducationLink): EducationLink {
  return { ...raw, schedules: raw.schedules ?? [] };
}

export function normalizeEducationUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function loadEducationLinks(): EducationLink[] {
  if (typeof window === "undefined") return DEFAULT_EDUCATION_LINKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as EducationLink[]).map(normalizeLink);
    saveEducationLinks(DEFAULT_EDUCATION_LINKS);
    return DEFAULT_EDUCATION_LINKS;
  } catch {
    return DEFAULT_EDUCATION_LINKS;
  }
}

export function saveEducationLinks(links: EducationLink[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links.map(normalizeLink)));
  } catch {
    throw new Error("Could not save — monthly schedule images may be too large.");
  }
}

/** Default label like "June 2026" for new uploads. */
export function defaultScheduleLabel(date = new Date()): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
