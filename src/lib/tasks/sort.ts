import type { Task } from "@/lib/types/database";

/** Order tasks by manual priority (sort_order), then creation date. */
export function sortTasksByOrder<T extends Pick<Task, "sort_order" | "created_at">>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const d = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (d !== 0) return d;
    return a.created_at.localeCompare(b.created_at);
  });
}
