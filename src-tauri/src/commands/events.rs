use crate::db::Db;
use crate::error::AppResult;
use crate::models::event::{CreateEventInput, Event, EventOccurrence, UpdateEventInput};
use crate::services::event_service;
use tauri::State;

#[tauri::command]
pub fn create_event(db: State<Db>, input: CreateEventInput) -> AppResult<Event> {
    let conn = db.lock()?;
    event_service::create_event(&conn, input)
}

#[tauri::command]
pub fn update_event(db: State<Db>, input: UpdateEventInput) -> AppResult<Event> {
    let conn = db.lock()?;
    event_service::update_event(&conn, input)
}

#[tauri::command]
pub fn delete_event(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    event_service::delete_event(&conn, &id)
}

#[tauri::command]
pub fn list_event_occurrences(db: State<Db>, range_start: String, range_end: String) -> AppResult<Vec<EventOccurrence>> {
    let conn = db.lock()?;
    event_service::list_occurrences(&conn, &range_start, &range_end)
}
