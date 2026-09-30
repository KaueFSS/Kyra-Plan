-- Manual ordering for drag-and-drop reordering of task lists.
ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_tasks_sort_order ON tasks (task_type, sort_order);
