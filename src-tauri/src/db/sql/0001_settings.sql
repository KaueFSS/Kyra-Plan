-- Single-row settings table. A local, single-user desktop app has no need
-- for a `users` table; if multi-profile support is ever added, this table
-- becomes the default profile's settings.
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL DEFAULT 'dark',
    accent_color TEXT NOT NULL DEFAULT 'indigo',
    ui_density TEXT NOT NULL DEFAULT 'comfortable',
    time_format TEXT NOT NULL DEFAULT '24h',
    week_start TEXT NOT NULL DEFAULT 'monday',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    daily_reset_time TEXT NOT NULL DEFAULT '00:00',
    daily_reset_timezone TEXT NOT NULL DEFAULT 'UTC',
    task_notifications_enabled INTEGER NOT NULL DEFAULT 1,
    timer_sound_enabled INTEGER NOT NULL DEFAULT 1,
    timer_default_preset_seconds INTEGER NOT NULL DEFAULT 1500,
    launch_on_startup INTEGER NOT NULL DEFAULT 0,
    minimize_to_tray INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO settings (id) VALUES (1);
