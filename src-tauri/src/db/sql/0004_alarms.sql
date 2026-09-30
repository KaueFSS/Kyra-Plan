CREATE TABLE alarms (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL DEFAULT '',
    time TEXT NOT NULL,
    days TEXT NOT NULL DEFAULT '[]',
    sound TEXT NOT NULL DEFAULT 'default',
    enabled INTEGER NOT NULL DEFAULT 1,
    notify INTEGER NOT NULL DEFAULT 1,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_alarms_enabled ON alarms (enabled);
