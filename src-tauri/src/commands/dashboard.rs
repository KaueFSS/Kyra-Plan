use crate::db::Db;
use crate::error::AppResult;
use crate::models::dashboard_tab::DashboardTab;
use crate::services::dashboard_service;
use tauri::State;

#[tauri::command]
pub fn list_dashboard_tabs(db: State<Db>) -> AppResult<Vec<DashboardTab>> {
    let conn = db.lock()?;
    dashboard_service::list_tabs(&conn)
}

#[tauri::command]
pub fn create_dashboard_tab(db: State<Db>, name: String, layout: String) -> AppResult<DashboardTab> {
    let conn = db.lock()?;
    dashboard_service::create_tab(&conn, &name, &layout)
}

#[tauri::command]
pub fn update_dashboard_tab(db: State<Db>, id: String, name: String, layout: String) -> AppResult<DashboardTab> {
    let conn = db.lock()?;
    dashboard_service::update_tab(&conn, &id, &name, &layout)
}

#[tauri::command]
pub fn delete_dashboard_tab(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    dashboard_service::delete_tab(&conn, &id)
}

#[tauri::command]
pub fn reorder_dashboard_tabs(db: State<Db>, ordered_ids: Vec<String>) -> AppResult<()> {
    let conn = db.lock()?;
    dashboard_service::reorder_tabs(&conn, &ordered_ids)
}

#[tauri::command]
pub fn restore_home_tab(db: State<Db>) -> AppResult<DashboardTab> {
    let conn = db.lock()?;
    dashboard_service::restore_home_tab(&conn)
}
