use crate::error::{AppError, AppResult};
use crate::models::world_clock::{CreateWorldClockInput, WorldClock};
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_clock(row: &Row) -> rusqlite::Result<WorldClock> {
    Ok(WorldClock {
        id: row.get("id")?,
        city: row.get("city")?,
        timezone: row.get("timezone")?,
        position: row.get("position")?,
        created_at: row.get("created_at")?,
    })
}

pub fn create(conn: &Connection, input: &CreateWorldClockInput) -> AppResult<WorldClock> {
    let id = Uuid::new_v4().to_string();
    let next_position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM world_clocks",
        [],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT INTO world_clocks (id, city, timezone, position) VALUES (?1, ?2, ?3, ?4)",
        params![id, input.city, input.timezone, next_position],
    )?;
    find_by_id(conn, &id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM world_clocks WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<WorldClock> {
    conn.query_row("SELECT * FROM world_clocks WHERE id = ?1", params![id], row_to_clock)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

pub fn list_all(conn: &Connection) -> AppResult<Vec<WorldClock>> {
    let mut stmt = conn.prepare("SELECT * FROM world_clocks ORDER BY position")?;
    let clocks = stmt.query_map([], row_to_clock)?.collect::<Result<Vec<_>, _>>()?;
    Ok(clocks)
}

pub fn reorder(conn: &Connection, ordered_ids: &[String]) -> AppResult<()> {
    for (position, id) in ordered_ids.iter().enumerate() {
        conn.execute(
            "UPDATE world_clocks SET position = ?1 WHERE id = ?2",
            params![position as i64, id],
        )?;
    }
    Ok(())
}
