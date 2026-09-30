use crate::error::{AppError, AppResult};
use crate::models::alarm::{Alarm, CreateAlarmInput, UpdateAlarmInput};
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_alarm(row: &Row) -> rusqlite::Result<Alarm> {
    let days_json: String = row.get("days")?;
    Ok(Alarm {
        id: row.get("id")?,
        label: row.get("label")?,
        time: row.get("time")?,
        days: serde_json::from_str(&days_json).unwrap_or_default(),
        sound: row.get("sound")?,
        enabled: row.get::<_, i64>("enabled")? != 0,
        notify: row.get::<_, i64>("notify")? != 0,
        last_triggered_at: row.get("last_triggered_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn create(conn: &Connection, input: &CreateAlarmInput) -> AppResult<Alarm> {
    let id = Uuid::new_v4().to_string();
    let days_json = serde_json::to_string(&input.days).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "INSERT INTO alarms (id, label, time, days, sound, enabled, notify)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.label.clone().unwrap_or_default(),
            input.time,
            days_json,
            input.sound.clone().unwrap_or_else(|| "default".to_string()),
            input.enabled.unwrap_or(true) as i64,
            input.notify.unwrap_or(true) as i64,
        ],
    )?;
    find_by_id(conn, &id)
}

pub fn update(conn: &Connection, input: &UpdateAlarmInput) -> AppResult<Alarm> {
    let days_json = serde_json::to_string(&input.days).unwrap_or_else(|_| "[]".to_string());
    let affected = conn.execute(
        "UPDATE alarms SET label = ?1, time = ?2, days = ?3, sound = ?4, enabled = ?5, notify = ?6,
            updated_at = datetime('now') WHERE id = ?7",
        params![
            input.label,
            input.time,
            days_json,
            input.sound,
            input.enabled as i64,
            input.notify as i64,
            input.id,
        ],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    find_by_id(conn, &input.id)
}

pub fn set_enabled(conn: &Connection, id: &str, enabled: bool) -> AppResult<Alarm> {
    let affected = conn.execute(
        "UPDATE alarms SET enabled = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![enabled as i64, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    find_by_id(conn, id)
}

pub fn mark_triggered(conn: &Connection, id: &str, date: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE alarms SET last_triggered_at = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![date, id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM alarms WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Alarm> {
    conn.query_row("SELECT * FROM alarms WHERE id = ?1", params![id], row_to_alarm)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

pub fn list_all(conn: &Connection) -> AppResult<Vec<Alarm>> {
    let mut stmt = conn.prepare("SELECT * FROM alarms ORDER BY time")?;
    let alarms = stmt.query_map([], row_to_alarm)?.collect::<Result<Vec<_>, _>>()?;
    Ok(alarms)
}

pub fn list_enabled(conn: &Connection) -> AppResult<Vec<Alarm>> {
    let mut stmt = conn.prepare("SELECT * FROM alarms WHERE enabled = 1")?;
    let alarms = stmt.query_map([], row_to_alarm)?.collect::<Result<Vec<_>, _>>()?;
    Ok(alarms)
}

pub fn search(conn: &Connection, query: &str) -> AppResult<Vec<Alarm>> {
    let like = format!("%{query}%");
    let mut stmt = conn.prepare("SELECT * FROM alarms WHERE label LIKE ?1 LIMIT 10")?;
    let alarms = stmt.query_map(params![like], row_to_alarm)?.collect::<Result<Vec<_>, _>>()?;
    Ok(alarms)
}
