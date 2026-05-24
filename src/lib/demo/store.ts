import type { Lead, Listing, Task, TaskStatus } from "@/lib/types/database";
import { createSeedLeads, createSeedListings, createSeedTasks } from "./data";

let leads = createSeedLeads();
let listings = createSeedListings();
let tasks = createSeedTasks();

export function getDemoStore() {
  return { leads, listings, tasks };
}

export function resetDemoStore() {
  leads = createSeedLeads();
  listings = createSeedListings();
  tasks = createSeedTasks();
}

export function updateDemoTaskStatus(taskId: string, status: TaskStatus): boolean {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return false;
  task.status = status;
  task.updated_at = new Date().toISOString();
  return true;
}

export function appendDemoListings(imported: Listing[]) {
  listings = [...listings, ...imported];
}
