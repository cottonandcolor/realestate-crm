import type { Project } from "@/lib/types/database";

export function sortProjectsByOrder<T extends Pick<Project, "sort_order" | "created_at">>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const d = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (d !== 0) return d;
    return a.created_at.localeCompare(b.created_at);
  });
}
