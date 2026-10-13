-- The daily reset used to default to UTC while the app shows days in the
-- user's own timezone, so "today" disagreed between the screen and the
-- backend late at night (e.g. after 21:00 in São Paulo). Follow the user's
-- timezone whenever the reset was left at that old default.
UPDATE settings
SET daily_reset_timezone = timezone
WHERE daily_reset_timezone = 'UTC' AND timezone != 'UTC';

-- How long a finished one-off task stays visible before leaving its list.
ALTER TABLE settings ADD COLUMN done_tasks_visible_hours INTEGER NOT NULL DEFAULT 3;

-- Named lists for one-off tasks ("Trabalho", "Mercado"…). Each "Tarefas"
-- widget shows one list, so a tab can hold several.
CREATE TABLE task_lists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#2b8af7',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO task_lists (id, name, position) VALUES ('inbox', 'Tarefas', 0);

ALTER TABLE tasks ADD COLUMN list_id TEXT REFERENCES task_lists (id) ON DELETE CASCADE;
-- When a one-off task was ticked, so it can leave the list after a while.
ALTER TABLE tasks ADD COLUMN completed_at TEXT;

UPDATE tasks SET list_id = 'inbox' WHERE task_type = 'single';
UPDATE tasks SET completed_at = updated_at WHERE task_type = 'single' AND status = 'completed';

CREATE INDEX idx_tasks_list ON tasks (list_id);
