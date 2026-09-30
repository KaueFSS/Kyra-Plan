use crate::error::{AppError, AppResult};
use crate::models::weekly_schedule::{
    CreateWeeklyScheduleBlockInput, UpdateWeeklyScheduleBlockInput, WeeklyScheduleBlock,
};
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_block(row: &Row) -> rusqlite::Result<WeeklyScheduleBlock> {
    Ok(WeeklyScheduleBlock {
        id: row.get("id")?,
        day_of_week: row.get("day_of_week")?,
        start_time: row.get("start_time")?,
        end_time: row.get("end_time")?,
        title: row.get("title")?,
        description: row.get("description")?,
        color: row.get("color")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn create(conn: &Connection, input: &CreateWeeklyScheduleBlockInput) -> AppResult<WeeklyScheduleBlock> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO weekly_schedule_blocks (id, day_of_week, start_time, end_time, title, description, color)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.day_of_week,
            input.start_time,
            input.end_time,
            input.title,
            input.description.clone().unwrap_or_default(),
            input.color.clone().unwrap_or_else(|| "#2b8af7".to_string()),
        ],
    )?;
    find_by_id(conn, &id)
}

pub fn update(conn: &Connection, input: &UpdateWeeklyScheduleBlockInput) -> AppResult<WeeklyScheduleBlock> {
    let affected = conn.execute(
        "UPDATE weekly_schedule_blocks SET day_of_week = ?1, start_time = ?2, end_time = ?3, title = ?4,
            description = ?5, color = ?6, updated_at = datetime('now') WHERE id = ?7",
        params![
            input.day_of_week,
            input.start_time,
            input.end_time,
            input.title,
            input.description,
            input.color,
            input.id,
        ],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    find_by_id(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM weekly_schedule_blocks WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<WeeklyScheduleBlock> {
    conn.query_row(
        "SELECT * FROM weekly_schedule_blocks WHERE id = ?1",
        params![id],
        row_to_block,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
        other => AppError::Database(other),
    })
}

pub fn list_all(conn: &Connection) -> AppResult<Vec<WeeklyScheduleBlock>> {
    let mut stmt = conn.prepare("SELECT * FROM weekly_schedule_blocks ORDER BY day_of_week, start_time")?;
    let blocks = stmt.query_map([], row_to_block)?.collect::<Result<Vec<_>, _>>()?;
    Ok(blocks)
}

pub fn search(conn: &Connection, query: &str) -> AppResult<Vec<WeeklyScheduleBlock>> {
    let like = format!("%{query}%");
    let mut stmt = conn.prepare("SELECT * FROM weekly_schedule_blocks WHERE title LIKE ?1 LIMIT 10")?;
    let blocks = stmt.query_map(params![like], row_to_block)?.collect::<Result<Vec<_>, _>>()?;
    Ok(blocks)
}
