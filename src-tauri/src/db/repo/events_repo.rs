use crate::error::{AppError, AppResult};
use crate::models::event::{CreateEventInput, Event, RecurrenceRule, UpdateEventInput};
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_event(row: &Row) -> rusqlite::Result<Event> {
    Ok(Event {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        start_at: row.get("start_at")?,
        end_at: row.get("end_at")?,
        color: row.get("color")?,
        recurrence_rule: RecurrenceRule::from_str(&row.get::<_, String>("recurrence_rule")?)
            .unwrap_or(RecurrenceRule::None),
        recurrence_until: row.get("recurrence_until")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn create(conn: &Connection, input: &CreateEventInput) -> AppResult<Event> {
    let id = Uuid::new_v4().to_string();
    let rule = input.recurrence_rule.unwrap_or(RecurrenceRule::None);
    conn.execute(
        "INSERT INTO events (id, title, description, start_at, end_at, color, recurrence_rule, recurrence_until)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            input.title,
            input.description.clone().unwrap_or_default(),
            input.start_at,
            input.end_at,
            input.color.clone().unwrap_or_else(|| "#2b8af7".to_string()),
            rule.as_str(),
            input.recurrence_until,
        ],
    )?;
    find_by_id(conn, &id)
}

pub fn update(conn: &Connection, input: &UpdateEventInput) -> AppResult<Event> {
    let affected = conn.execute(
        "UPDATE events SET title = ?1, description = ?2, start_at = ?3, end_at = ?4, color = ?5,
            recurrence_rule = ?6, recurrence_until = ?7, updated_at = datetime('now') WHERE id = ?8",
        params![
            input.title,
            input.description.clone().unwrap_or_default(),
            input.start_at,
            input.end_at,
            input.color,
            input.recurrence_rule.as_str(),
            input.recurrence_until,
            input.id,
        ],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    find_by_id(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM events WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Event> {
    conn.query_row("SELECT * FROM events WHERE id = ?1", params![id], row_to_event)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

/// Base events that could possibly produce an occurrence inside
/// `[range_start, range_end]`: non-recurring events starting in range, plus
/// every recurring event whose own start is before `range_end` and whose
/// `recurrence_until` (if set) is after `range_start`. Expanding the actual
/// occurrences from this candidate set is the recurrence service's job.
pub fn find_candidates_in_range(conn: &Connection, range_start: &str, range_end: &str) -> AppResult<Vec<Event>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM events WHERE
            (recurrence_rule = 'none' AND start_at <= ?2 AND end_at >= ?1)
            OR (recurrence_rule != 'none' AND start_at <= ?2 AND (recurrence_until IS NULL OR recurrence_until >= ?1))
         ORDER BY start_at",
    )?;
    let events = stmt
        .query_map(params![range_start, range_end], row_to_event)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(events)
}

pub fn search(conn: &Connection, query: &str) -> AppResult<Vec<Event>> {
    let like = format!("%{query}%");
    let mut stmt = conn.prepare("SELECT * FROM events WHERE title LIKE ?1 OR description LIKE ?1 LIMIT 10")?;
    let events = stmt.query_map(params![like], row_to_event)?.collect::<Result<Vec<_>, _>>()?;
    Ok(events)
}
