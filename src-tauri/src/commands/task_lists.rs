use crate::db::Db;
use crate::error::AppResult;
use crate::models::streak::Streak;
use crate::models::task::Task;
use crate::models::task_list::TaskList;
use crate::services::{streak_service, task_list_service};
use tauri::State;

#[tauri::command]
pub fn list_task_lists(db: State<Db>) -> AppResult<Vec<TaskList>> {
    let conn = db.lock()?;
    task_list_service::list(&conn)
}

#[tauri::command]
pub fn create_task_list(db: State<Db>, name: String, color: String) -> AppResult<TaskList> {
    let conn = db.lock()?;
    task_list_service::create(&conn, &name, &color)
}

#[tauri::command]
pub fn update_task_list(db: State<Db>, id: String, name: String, color: String) -> AppResult<TaskList> {
    let conn = db.lock()?;
    task_list_service::update(&conn, &id, &name, &color)
}

#[tauri::command]
pub fn delete_task_list(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    task_list_service::delete(&conn, &id)
}

#[tauri::command]
pub fn move_task_to_list(db: State<Db>, task_id: String, list_id: String) -> AppResult<Task> {
    let conn = db.lock()?;
    task_list_service::move_task(&conn, &task_id, &list_id)
}

#[tauri::command]
pub fn get_streak(db: State<Db>) -> AppResult<Streak> {
    let conn = db.lock()?;
    streak_service::get_streak(&conn)
}
