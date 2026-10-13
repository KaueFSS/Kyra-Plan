use crate::error::{AppError, AppResult};
use crate::models::task_list::TaskList;
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_list(row: &Row) -> rusqlite::Result<TaskList> {
    Ok(TaskList {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        position: row.get("position")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<TaskList>> {
    let mut stmt = conn.prepare("SELECT * FROM task_lists ORDER BY position, created_at")?;
    let lists = stmt.query_map([], row_to_list)?.collect::<Result<Vec<_>, _>>()?;
    Ok(lists)
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<TaskList> {
    conn.query_row("SELECT * FROM task_lists WHERE id = ?1", params![id], row_to_list)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

pub fn create(conn: &Connection, name: &str, color: &str) -> AppResult<TaskList> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO task_lists (id, name, color, position)
         VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(position), -1) + 1 FROM task_lists))",
        params![id, name, color],
    )?;
    find_by_id(conn, &id)
}

pub fn update(conn: &Connection, id: &str, name: &str, color: &str) -> AppResult<TaskList> {
    let affected = conn.execute(
        "UPDATE task_lists SET name = ?1, color = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![name, color, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    find_by_id(conn, id)
}

/// Deletes the list and, through the foreign key, every task in it.
pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM task_lists WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn count(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row("SELECT COUNT(*) FROM task_lists", [], |r| r.get(0))?)
}
