use crate::error::AppResult;
use crate::models::task::TaskCompletion;
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_completion(row: &Row) -> rusqlite::Result<TaskCompletion> {
    Ok(TaskCompletion {
        id: row.get("id")?,
        task_id: row.get("task_id")?,
        cycle_date: row.get("cycle_date")?,
        completed: row.get::<_, i64>("completed")? != 0,
        completed_at: row.get("completed_at")?,
    })
}

pub fn find_for_date(conn: &Connection, task_id: &str, cycle_date: &str) -> AppResult<Option<TaskCompletion>> {
    let result = conn
        .query_row(
            "SELECT * FROM task_completions WHERE task_id = ?1 AND cycle_date = ?2",
            params![task_id, cycle_date],
            row_to_completion,
        )
        .ok();
    Ok(result)
}

pub fn history_for_task(conn: &Connection, task_id: &str, limit: i64) -> AppResult<Vec<TaskCompletion>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM task_completions WHERE task_id = ?1 ORDER BY cycle_date DESC LIMIT ?2",
    )?;
    let rows = stmt
        .query_map(params![task_id, limit], row_to_completion)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Upserts the completion flag for a given task/cycle-date pair, preserving
/// history for every other date — this is what makes it possible to show a
/// per-day checkmark trail instead of a single mutable boolean.
pub fn set_completed(conn: &Connection, task_id: &str, cycle_date: &str, completed: bool) -> AppResult<TaskCompletion> {
    let completed_at = if completed { Some(chrono::Utc::now().to_rfc3339()) } else { None };

    conn.execute(
        "INSERT INTO task_completions (id, task_id, cycle_date, completed, completed_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (task_id, cycle_date) DO UPDATE SET completed = ?4, completed_at = ?5",
        params![Uuid::new_v4().to_string(), task_id, cycle_date, completed as i64, completed_at],
    )?;

    Ok(find_for_date(conn, task_id, cycle_date)?.expect("row was just inserted or updated"))
}
