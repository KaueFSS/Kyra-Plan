use crate::db::Db;
use crate::error::AppResult;
use crate::models::alarm::{Alarm, CreateAlarmInput, UpdateAlarmInput};
use crate::services::alarm_service;
use tauri::State;

#[tauri::command]
pub fn create_alarm(db: State<Db>, input: CreateAlarmInput) -> AppResult<Alarm> {
    let conn = db.lock()?;
    alarm_service::create_alarm(&conn, input)
}

#[tauri::command]
pub fn update_alarm(db: State<Db>, input: UpdateAlarmInput) -> AppResult<Alarm> {
    let conn = db.lock()?;
    alarm_service::update_alarm(&conn, input)
}

#[tauri::command]
pub fn set_alarm_enabled(db: State<Db>, id: String, enabled: bool) -> AppResult<Alarm> {
    let conn = db.lock()?;
    alarm_service::set_enabled(&conn, &id, enabled)
}

#[tauri::command]
pub fn delete_alarm(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    alarm_service::delete_alarm(&conn, &id)
}

#[tauri::command]
pub fn list_alarms(db: State<Db>) -> AppResult<Vec<Alarm>> {
    let conn = db.lock()?;
    alarm_service::list_alarms(&conn)
}
