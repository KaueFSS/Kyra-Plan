use crate::error::{AppError, AppResult};
use crate::models::task::{CreateTaskInput, Priority, Task, TaskStatus, TaskType, UpdateTaskInput};
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_task(row: &Row) -> rusqlite::Result<Task> {
    let recurrence_days_json: Option<String> = row.get("recurrence_days")?;
    let recurrence_days = recurrence_days_json
        .and_then(|s| serde_json::from_str::<Vec<u8>>(&s).ok());

    Ok(Task {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        task_type: TaskType::from_str(&row.get::<_, String>("task_type")?).unwrap_or(TaskType::Single),
        priority: Priority::from_str(&row.get::<_, String>("priority")?).unwrap_or(Priority::Medium),
        status: TaskStatus::from_str(&row.get::<_, String>("status")?).unwrap_or(TaskStatus::Pending),
        duration_seconds: row.get("duration_seconds")?,
        scheduled_time: row.get("scheduled_time")?,
        recurrence_days,
        start_date: row.get("start_date")?,
        end_date: row.get("end_date")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn create(conn: &Connection, input: &CreateTaskInput) -> AppResult<Task> {
    let id = Uuid::new_v4().to_string();
    let recurrence_json = input
        .recurrence_days
        .as_ref()
        .map(|d| serde_json::to_string(d).unwrap_or_else(|_| "[]".to_string()));

    conn.execute(
        "INSERT INTO tasks (id, title, description, task_type, priority, status, duration_seconds,
            scheduled_time, recurrence_days, start_date, end_date, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6, ?7, ?8, ?9, ?10,
            (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tasks WHERE task_type = ?4))",
        params![
            id,
            input.title,
            input.description.clone().unwrap_or_default(),
            input.task_type.as_str(),
            input.priority.as_str(),
            input.duration_seconds,
            input.scheduled_time,
            recurrence_json,
            input.start_date,
            input.end_date,
        ],
    )?;

    find_by_id(conn, &id)
}

pub fn update(conn: &Connection, input: &UpdateTaskInput) -> AppResult<Task> {
    let recurrence_json = input
        .recurrence_days
        .as_ref()
        .map(|d| serde_json::to_string(d).unwrap_or_else(|_| "[]".to_string()));

    let affected = conn.execute(
        "UPDATE tasks SET title = ?1, description = ?2, priority = ?3, duration_seconds = ?4,
            scheduled_time = ?5, recurrence_days = ?6, start_date = ?7, end_date = ?8,
            status = ?9, updated_at = datetime('now')
         WHERE id = ?10",
        params![
            input.title,
            input.description.clone().unwrap_or_default(),
            input.priority.as_str(),
            input.duration_seconds,
            input.scheduled_time,
            recurrence_json,
            input.start_date,
            input.end_date,
            input.status.as_str(),
            input.id,
        ],
    )?;

    if affected == 0 {
        return Err(AppError::NotFound);
    }

    find_by_id(conn, &input.id)
}

pub fn set_status(conn: &Connection, id: &str, status: TaskStatus) -> AppResult<()> {
    let affected = conn.execute(
        "UPDATE tasks SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![status.as_str(), id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Task> {
    conn.query_row("SELECT * FROM tasks WHERE id = ?1", params![id], row_to_task)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

pub fn list_by_type(conn: &Connection, task_type: TaskType) -> AppResult<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM tasks WHERE task_type = ?1 AND status != 'cancelled' ORDER BY sort_order, created_at",
    )?;
    let tasks = stmt
        .query_map(params![task_type.as_str()], row_to_task)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(tasks)
}

/// Persists a user-defined order (from drag-and-drop) as consecutive
/// `sort_order` values, in one transaction so a partial reorder is never saved.
pub fn reorder(conn: &Connection, ordered_ids: &[String]) -> AppResult<()> {
    let tx = conn.unchecked_transaction()?;
    for (position, id) in ordered_ids.iter().enumerate() {
        tx.execute(
            "UPDATE tasks SET sort_order = ?1 WHERE id = ?2",
            params![position as i64, id],
        )?;
    }
    tx.commit()?;
    Ok(())
}

pub fn search(conn: &Connection, query: &str) -> AppResult<Vec<Task>> {
    let like = format!("%{query}%");
    let mut stmt = conn.prepare(
        "SELECT * FROM tasks WHERE status != 'cancelled' AND (title LIKE ?1 OR description LIKE ?1) LIMIT 10",
    )?;
    let tasks = stmt.query_map(params![like], row_to_task)?.collect::<Result<Vec<_>, _>>()?;
    Ok(tasks)
}
