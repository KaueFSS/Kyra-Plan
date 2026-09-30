CREATE TABLE world_clocks (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    timezone TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_world_clocks_position ON world_clocks (position);
