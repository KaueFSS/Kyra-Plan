use crate::db::repo::alarms_repo;
use crate::error::{AppError, AppResult};
use crate::models::alarm::{Alarm, CreateAlarmInput, UpdateAlarmInput};
use crate::services::time_util;
use chrono::Local;
use rusqlite::Connection;

fn validate_days(days: &[u8]) -> AppResult<()> {
    if days.iter().any(|d| *d > 6) {
        return Err(AppError::Validation("Dia da semana inválido.".into()));
    }
    Ok(())
}

pub fn create_alarm(conn: &Connection, input: CreateAlarmInput) -> AppResult<Alarm> {
    time_util::parse_hhmm(&input.time)?;
    validate_days(&input.days)?;
    alarms_repo::create(conn, &input)
}

pub fn update_alarm(conn: &Connection, input: UpdateAlarmInput) -> AppResult<Alarm> {
    time_util::parse_hhmm(&input.time)?;
    validate_days(&input.days)?;
    alarms_repo::update(conn, &input)
}

pub fn set_enabled(conn: &Connection, id: &str, enabled: bool) -> AppResult<Alarm> {
    alarms_repo::set_enabled(conn, id, enabled)
}

pub fn delete_alarm(conn: &Connection, id: &str) -> AppResult<()> {
    alarms_repo::delete(conn, id)
}

pub fn list_alarms(conn: &Connection) -> AppResult<Vec<Alarm>> {
    alarms_repo::list_all(conn)
}

/// Alarms whose configured time/day matches the current local minute and
/// haven't already fired today. Called from the background scheduler tick;
/// marking `last_triggered_at` happens separately once the notification is
/// actually sent, so a notification-send failure doesn't silently mark the
/// alarm as handled.
pub fn due_alarms(conn: &Connection) -> AppResult<Vec<Alarm>> {
    let now_local = Local::now().naive_local();
    let enabled = alarms_repo::list_enabled(conn)?;

    let mut due = Vec::new();
    for alarm in enabled {
        let alarm_time = time_util::parse_hhmm(&alarm.time)?;
        let last_triggered_date = alarm
            .last_triggered_at
            .as_deref()
            .and_then(|s| time_util::parse_date(s).ok());

        if time_util::alarm_is_due(alarm_time, &alarm.days, last_triggered_date, now_local) {
            due.push(alarm);
        }
    }
    Ok(due)
}

pub fn mark_triggered_today(conn: &Connection, id: &str) -> AppResult<()> {
    let today = Local::now().naive_local().date().format(time_util::DATE_FMT).to_string();
    alarms_repo::mark_triggered(conn, id, &today)
}
