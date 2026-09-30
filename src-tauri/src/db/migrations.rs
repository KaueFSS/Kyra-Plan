use rusqlite::{Connection, Result};

/// Ordered, append-only list of migrations. Each entry runs exactly once,
/// tracked in `schema_migrations`. Never edit a migration that has already
/// shipped — append a new one instead.
const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_settings", include_str!("sql/0001_settings.sql")),
    ("0002_tasks", include_str!("sql/0002_tasks.sql")),
    ("0003_events", include_str!("sql/0003_events.sql")),
    ("0004_alarms", include_str!("sql/0004_alarms.sql")),
    (
        "0005_weekly_schedule",
        include_str!("sql/0005_weekly_schedule.sql"),
    ),
    ("0006_world_clocks", include_str!("sql/0006_world_clocks.sql")),
    ("0007_timer_sessions", include_str!("sql/0007_timer_sessions.sql")),
    ("0008_task_sort_order", include_str!("sql/0008_task_sort_order.sql")),
    ("0009_recolor_palette", include_str!("sql/0009_recolor_palette.sql")),
    ("0010_dashboard_tabs", include_str!("sql/0010_dashboard_tabs.sql")),
];

pub fn run(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    for (name, sql) in MIGRATIONS {
        let already_applied: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = ?1)",
                [name],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if already_applied {
            continue;
        }

        // Each migration and its bookkeeping row commit together, so a crash
        // mid-migration can never leave the schema half-applied but unrecorded.
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)?;
        tx.execute("INSERT INTO schema_migrations (name) VALUES (?1)", [name])?;
        tx.commit()?;
    }

    Ok(())
}
