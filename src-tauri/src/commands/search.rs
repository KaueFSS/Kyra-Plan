use crate::db::Db;
use crate::error::AppResult;
use crate::models::search::SearchResult;
use crate::services::search_service;
use tauri::State;

#[tauri::command]
pub fn search(db: State<Db>, query: String) -> AppResult<Vec<SearchResult>> {
    let conn = db.lock()?;
    search_service::search_all(&conn, &query)
}
