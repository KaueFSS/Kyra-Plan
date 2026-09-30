use crate::error::{AppError, AppResult};
use crate::models::timer_session::{TimerKind, TimerSession, TimerStatus};
use rusqlite::{params, Connection, OptionalExtension, Row};
use uuid::Uuid;

fn row_to_session(row: &Row) -> rusqlite::Result<TimerSession> {
    let laps_json: String = row.get("laps")?;
    Ok(TimerSession {
        id: row.get("id")?,
        kind: TimerKind::from_str(&row.get::<_, String>("kind")?).unwrap_or(TimerKind::Timer),
        label: row.get("label")?,
        duration_seconds: row.get("duration_seconds")?,
        elapsed_seconds: row.get("elapsed_seconds")?,
        status: TimerStatus::from_str(&row.get::<_, String>("status")?).unwrap_or(TimerStatus::Idle),
        started_at: row.get("started_at")?,
        paused_at: row.get("paused_at")?,
        laps: serde_json::from_str(&laps_json).unwrap_or_default(),
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<TimerSession> {
    conn.query_row("SELECT * FROM timer_sessions WHERE id = ?1", params![id], row_to_session)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

/// The single in-progress (running or paused) session of a given kind, if
/// any — this is what a restarted app reads on launch to resume state.
pub fn find_active(conn: &Connection, kind: TimerKind) -> AppResult<Option<TimerSession>> {
    let session = conn
        .query_row(
            "SELECT * FROM timer_sessions WHERE kind = ?1 AND status IN ('running', 'paused')
             ORDER BY created_at DESC LIMIT 1",
            params![kind.as_str()],
            row_to_session,
        )
        .optional()?;
    Ok(session)
}

/// Every currently-running countdown Timer (never Stopwatch, which has no
/// duration to complete against) — used by the background scheduler to
/// auto-complete and notify even while the window is minimized.
pub fn list_running_timers(conn: &Connection) -> AppResult<Vec<TimerSession>> {
    let mut stmt = conn.prepare("SELECT * FROM timer_sessions WHERE kind = 'timer' AND status = 'running'")?;
    let rows = stmt.query_map([], row_to_session)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn create(conn: &Connection, kind: TimerKind, label: &str, duration_seconds: Option<i64>) -> AppResult<TimerSession> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO timer_sessions (id, kind, label, duration_seconds, elapsed_seconds, status, started_at)
         VALUES (?1, ?2, ?3, ?4, 0, 'running', datetime('now'))",
        params![id, kind.as_str(), label, duration_seconds],
    )?;
    find_by_id(conn, &id)
}

pub fn pause(conn: &Connection, id: &str, elapsed_seconds: i64) -> AppResult<TimerSession> {
    conn.execute(
        "UPDATE timer_sessions SET status = 'paused', elapsed_seconds = ?1, paused_at = datetime('now'),
            started_at = NULL, updated_at = datetime('now') WHERE id = ?2",
        params![elapsed_seconds, id],
    )?;
    find_by_id(conn, id)
}

pub fn resume(conn: &Connection, id: &str) -> AppResult<TimerSession> {
    conn.execute(
        "UPDATE timer_sessions SET status = 'running', started_at = datetime('now'), paused_at = NULL,
            updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    find_by_id(conn, id)
}

pub fn complete(conn: &Connection, id: &str, final_elapsed_seconds: i64) -> AppResult<TimerSession> {
    conn.execute(
        "UPDATE timer_sessions SET status = 'completed', elapsed_seconds = ?1, started_at = NULL,
            updated_at = datetime('now') WHERE id = ?2",
        params![final_elapsed_seconds, id],
    )?;
    find_by_id(conn, id)
}

pub fn cancel(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE timer_sessions SET status = 'cancelled', started_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn restart(conn: &Connection, id: &str) -> AppResult<TimerSession> {
    conn.execute(
        "UPDATE timer_sessions SET elapsed_seconds = 0, status = 'running', started_at = datetime('now'),
            paused_at = NULL, laps = '[]', updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    find_by_id(conn, id)
}

pub fn add_lap(conn: &Connection, id: &str, laps: &[i64]) -> AppResult<TimerSession> {
    let laps_json = serde_json::to_string(laps).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "UPDATE timer_sessions SET laps = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![laps_json, id],
    )?;
    find_by_id(conn, id)
}
