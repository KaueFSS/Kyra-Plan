use crate::error::{AppError, AppResult};
use crate::models::task::{TaskSession, TaskSessionStatus};
use rusqlite::{params, Connection, OptionalExtension, Row};
use uuid::Uuid;

fn row_to_session(row: &Row) -> rusqlite::Result<TaskSession> {
    Ok(TaskSession {
        id: row.get("id")?,
        task_id: row.get("task_id")?,
        cycle_date: row.get("cycle_date")?,
        status: TaskSessionStatus::from_str(&row.get::<_, String>("status")?)
            .unwrap_or(TaskSessionStatus::Cancelled),
        duration_seconds: row.get("duration_seconds")?,
        elapsed_seconds: row.get("elapsed_seconds")?,
        started_at: row.get("started_at")?,
        paused_at: row.get("paused_at")?,
        completed_at: row.get("completed_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn find_active(conn: &Connection, task_id: &str, cycle_date: &str) -> AppResult<Option<TaskSession>> {
    let session = conn
        .query_row(
            "SELECT * FROM task_sessions WHERE task_id = ?1 AND cycle_date = ?2
             AND status IN ('running', 'paused') ORDER BY created_at DESC LIMIT 1",
            params![task_id, cycle_date],
            row_to_session,
        )
        .optional()?;
    Ok(session)
}

/// Every currently-running session across all tasks — used by the
/// background scheduler to auto-complete timed tasks even while no
/// frontend view is actively polling them (e.g. the window is minimized).
pub fn list_running(conn: &Connection) -> AppResult<Vec<TaskSession>> {
    let mut stmt = conn.prepare("SELECT * FROM task_sessions WHERE status = 'running'")?;
    let rows = stmt.query_map([], row_to_session)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<TaskSession> {
    conn.query_row("SELECT * FROM task_sessions WHERE id = ?1", params![id], row_to_session)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

pub fn start(conn: &Connection, task_id: &str, cycle_date: &str, duration_seconds: i64) -> AppResult<TaskSession> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO task_sessions (id, task_id, cycle_date, status, duration_seconds, elapsed_seconds, started_at)
         VALUES (?1, ?2, ?3, 'running', ?4, 0, datetime('now'))",
        params![id, task_id, cycle_date, duration_seconds],
    )?;
    find_by_id(conn, &id)
}

pub fn pause(conn: &Connection, id: &str, elapsed_seconds: i64) -> AppResult<TaskSession> {
    conn.execute(
        "UPDATE task_sessions SET status = 'paused', elapsed_seconds = ?1, paused_at = datetime('now'),
            started_at = NULL, updated_at = datetime('now') WHERE id = ?2",
        params![elapsed_seconds, id],
    )?;
    find_by_id(conn, id)
}

pub fn resume(conn: &Connection, id: &str) -> AppResult<TaskSession> {
    conn.execute(
        "UPDATE task_sessions SET status = 'running', started_at = datetime('now'), paused_at = NULL,
            updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    find_by_id(conn, id)
}

pub fn complete(conn: &Connection, id: &str) -> AppResult<TaskSession> {
    conn.execute(
        "UPDATE task_sessions SET status = 'completed', completed_at = datetime('now'),
            elapsed_seconds = duration_seconds, started_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    find_by_id(conn, id)
}

pub fn cancel(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE task_sessions SET status = 'cancelled', started_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn restart(conn: &Connection, id: &str) -> AppResult<TaskSession> {
    conn.execute(
        "UPDATE task_sessions SET elapsed_seconds = 0, status = 'running', started_at = datetime('now'),
            paused_at = NULL, completed_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    find_by_id(conn, id)
}
