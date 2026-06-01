ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tasks_project_sort ON tasks(project_id, sort_order);
