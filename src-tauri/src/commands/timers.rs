use crate::db::repo::timer_sessions_repo;
use crate::db::Db;
use crate::error::AppResult;
use crate::models::timer_session::{TimerKind, TimerSnapshot, TimerStatus};
use crate::services::{notification_service, timer_service};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn start_timer(db: State<Db>, kind: TimerKind, label: Option<String>, duration_seconds: Option<i64>) -> AppResult<TimerSnapshot> {
    let conn = db.lock()?;
    timer_service::start(&conn, kind, label.unwrap_or_default(), duration_seconds)
}

#[tauri::command]
pub fn pause_timer(db: State<Db>, id: String) -> AppResult<TimerSnapshot> {
    let conn = db.lock()?;
    timer_service::pause(&conn, &id)
}

#[tauri::command]
pub fn resume_timer(db: State<Db>, id: String) -> AppResult<TimerSnapshot> {
    let conn = db.lock()?;
    timer_service::resume(&conn, &id)
}

#[tauri::command]
pub fn restart_timer(db: State<Db>, id: String) -> AppResult<TimerSnapshot> {
    let conn = db.lock()?;
    timer_service::restart(&conn, &id)
}

#[tauri::command]
pub fn cancel_timer(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    timer_service::cancel(&conn, &id)
}

#[tauri::command]
pub fn check_timer(app: AppHandle, db: State<Db>, id: String) -> AppResult<TimerSnapshot> {
    let conn = db.lock()?;
    let was_running = timer_sessions_repo::find_by_id(&conn, &id)?.status == TimerStatus::Running;
    let snapshot = timer_service::check_and_complete(&conn, &id)?;
    if was_running && snapshot.session.status == TimerStatus::Completed {
        notification_service::timer_finished(&app, &snapshot.session.label);
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn add_timer_lap(db: State<Db>, id: String) -> AppResult<TimerSnapshot> {
    let conn = db.lock()?;
    timer_service::add_lap(&conn, &id)
}

#[tauri::command]
pub fn get_active_timer(db: State<Db>, kind: TimerKind) -> AppResult<Option<TimerSnapshot>> {
    let conn = db.lock()?;
    timer_service::get_active(&conn, kind)
}
