export type EducationClassStatus = "upcoming" | "completed";

export interface EducationClass {
  id: string;
  title: string;
  ce_number: string | null;
  instructor: string | null;
  provider: string | null;
  sponsor: string | null;
  class_date: string | null;
  time_start: string | null;
  time_end: string | null;
  location_name: string | null;
  address: string | null;
  cost: string | null;
  rsvp_deadline: string | null;
  rsvp_email: string | null;
  rsvp_phone: string | null;
  register_url: string | null;
  description: string | null;
  raw_notes: string | null;
  /** Compressed JPEG data URL of the original flyer image */
  flyer_image: string | null;
  status: EducationClassStatus;
  created_at: string;
}

const STORAGE_KEY = "crm_education_classes";

export function createEducationClassId(): string {
  return `edu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyEducationClass(): EducationClass {
  const now = new Date().toISOString();
  return {
    id: createEducationClassId(),
    title: "",
    ce_number: null,
    instructor: null,
    provider: null,
    sponsor: null,
    class_date: null,
    time_start: null,
    time_end: null,
    location_name: null,
    address: null,
    cost: null,
    rsvp_deadline: null,
    rsvp_email: null,
    rsvp_phone: null,
    register_url: null,
    description: null,
    raw_notes: null,
    flyer_image: null,
    status: "upcoming",
    created_at: now,
  };
}

export function effectiveStatus(cls: EducationClass): EducationClassStatus {
  if (cls.status === "completed") return "completed";
  if (!cls.class_date) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const classDay = new Date(cls.class_date + "T23:59:59");
  return classDay < today ? "completed" : "upcoming";
}

export function loadEducationClasses(): EducationClass[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EducationClass[]) : [];
  } catch {
    return [];
  }
}

export function saveEducationClasses(classes: EducationClass[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  } catch {
    throw new Error("Could not save — flyer images may be too large for browser storage.");
  }
}

export function formatClassDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "Date TBD";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatClassTime(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} – ${end}`;
  return start ?? end;
}
