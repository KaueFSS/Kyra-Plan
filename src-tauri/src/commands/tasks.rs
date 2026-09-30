use crate::db::repo::{task_sessions_repo, tasks_repo};
use crate::db::Db;
use crate::error::AppResult;
use crate::models::task::{
    CreateTaskInput, Task, TaskCompletion, TaskSession, TaskSessionStatus, TaskWithProgress, UpdateTaskInput,
};
use crate::services::{notification_service, task_service};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn create_task(db: State<Db>, input: CreateTaskInput) -> AppResult<Task> {
    let conn = db.lock()?;
    task_service::create_task(&conn, input)
}

#[tauri::command]
pub fn update_task(db: State<Db>, input: UpdateTaskInput) -> AppResult<Task> {
    let conn = db.lock()?;
    task_service::update_task(&conn, input)
}

#[tauri::command]
pub fn delete_task(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    task_service::delete_task(&conn, &id)
}

#[tauri::command]
pub fn reorder_tasks(db: State<Db>, ordered_ids: Vec<String>) -> AppResult<()> {
    let conn = db.lock()?;
    task_service::reorder_tasks(&conn, &ordered_ids)
}

#[tauri::command]
pub fn list_daily_tasks(db: State<Db>) -> AppResult<Vec<TaskWithProgress>> {
    let conn = db.lock()?;
    task_service::list_daily_tasks(&conn)
}

#[tauri::command]
pub fn list_weekly_tasks(db: State<Db>) -> AppResult<Vec<TaskWithProgress>> {
    let conn = db.lock()?;
    task_service::list_weekly_tasks(&conn)
}

#[tauri::command]
pub fn list_single_tasks(db: State<Db>) -> AppResult<Vec<TaskWithProgress>> {
    let conn = db.lock()?;
    task_service::list_single_tasks(&conn)
}

#[tauri::command]
pub fn list_timed_tasks(db: State<Db>) -> AppResult<Vec<TaskWithProgress>> {
    let conn = db.lock()?;
    task_service::list_timed_tasks(&conn)
}

#[tauri::command]
pub fn toggle_task_completion(db: State<Db>, task_id: String) -> AppResult<TaskCompletion> {
    let conn = db.lock()?;
    task_service::toggle_completion(&conn, &task_id)
}

#[tauri::command]
pub fn start_timed_task(db: State<Db>, task_id: String) -> AppResult<TaskSession> {
    let conn = db.lock()?;
    task_service::start_timed_task(&conn, &task_id)
}

#[tauri::command]
pub fn pause_timed_task(db: State<Db>, session_id: String) -> AppResult<TaskSession> {
    let conn = db.lock()?;
    task_service::pause_timed_task(&conn, &session_id)
}

#[tauri::command]
pub fn resume_timed_task(db: State<Db>, session_id: String) -> AppResult<TaskSession> {
    let conn = db.lock()?;
    task_service::resume_timed_task(&conn, &session_id)
}

#[tauri::command]
pub fn restart_timed_task(db: State<Db>, session_id: String) -> AppResult<TaskSession> {
    let conn = db.lock()?;
    task_service::restart_timed_task(&conn, &session_id)
}

#[tauri::command]
pub fn cancel_timed_task(db: State<Db>, session_id: String) -> AppResult<()> {
    let conn = db.lock()?;
    task_service::cancel_timed_task(&conn, &session_id)
}

#[tauri::command]
pub fn check_timed_task(app: AppHandle, db: State<Db>, session_id: String) -> AppResult<TaskSession> {
    let conn = db.lock()?;
    let was_running = task_sessions_repo::find_by_id(&conn, &session_id)?.status == TaskSessionStatus::Running;
    let session = task_service::check_and_complete_timed_task(&conn, &session_id)?;
    if was_running && session.status == TaskSessionStatus::Completed {
        let title = tasks_repo::find_by_id(&conn, &session.task_id).map(|t| t.title).unwrap_or_default();
        notification_service::task_finished(&app, &title);
    }
    Ok(session)
}
