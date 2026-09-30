CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    recurrence_rule TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_rule IN ('none', 'daily', 'weekly', 'monthly')),
    recurrence_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_start_at ON events (start_at);
