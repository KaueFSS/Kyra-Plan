-- Standalone Timer/Stopwatch state, independent of task_sessions.
-- Timestamp-based for the same reason as task_sessions: elapsed time is
-- derived from started_at/paused_at, never from a client-side interval.
CREATE TABLE timer_sessions (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('timer', 'stopwatch')),
    label TEXT NOT NULL DEFAULT '',
    duration_seconds INTEGER,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'completed', 'cancelled')),
    started_at TEXT,
    paused_at TEXT,
    laps TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_timer_sessions_kind_status ON timer_sessions (kind, status);
