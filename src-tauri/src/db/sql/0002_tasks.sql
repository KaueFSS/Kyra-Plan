CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    task_type TEXT NOT NULL CHECK (task_type IN ('single', 'daily', 'weekly', 'timed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
    duration_seconds INTEGER,
    scheduled_time TEXT,
    recurrence_days TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tasks_type_status ON tasks (task_type, status);
CREATE INDEX idx_tasks_start_date ON tasks (start_date);

-- One row per (task, cycle date) so completion history is preserved
-- instead of a single mutable boolean on the task itself.
CREATE TABLE task_completions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    cycle_date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    UNIQUE (task_id, cycle_date)
);

CREATE INDEX idx_task_completions_task_date ON task_completions (task_id, cycle_date);

-- Timestamp-based execution state for timed tasks. Never trust a running
-- countdown alone: started_at/paused_at/elapsed_seconds let elapsed time be
-- recomputed from wall-clock timestamps after a pause, a slow event loop, or
-- the app being closed and reopened mid-task.
CREATE TABLE task_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    cycle_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
    duration_seconds INTEGER NOT NULL,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TEXT,
    paused_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_task_sessions_task ON task_sessions (task_id, cycle_date);
