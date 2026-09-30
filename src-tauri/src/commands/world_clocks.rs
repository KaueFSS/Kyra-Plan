use crate::db::repo::world_clocks_repo;
use crate::db::Db;
use crate::error::AppResult;
use crate::models::world_clock::{CreateWorldClockInput, ReorderWorldClocksInput, WorldClock};
use tauri::State;

#[tauri::command]
pub fn create_world_clock(db: State<Db>, input: CreateWorldClockInput) -> AppResult<WorldClock> {
    let conn = db.lock()?;
    world_clocks_repo::create(&conn, &input)
}

#[tauri::command]
pub fn delete_world_clock(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    world_clocks_repo::delete(&conn, &id)
}

#[tauri::command]
pub fn list_world_clocks(db: State<Db>) -> AppResult<Vec<WorldClock>> {
    let conn = db.lock()?;
    world_clocks_repo::list_all(&conn)
}

#[tauri::command]
pub fn reorder_world_clocks(db: State<Db>, input: ReorderWorldClocksInput) -> AppResult<()> {
    let conn = db.lock()?;
    world_clocks_repo::reorder(&conn, &input.ordered_ids)
}

/// A curated list of common IANA timezone identifiers for the "add city"
/// picker. `chrono-tz` bundles the full IANA database (400+ zones), most of
/// which are not useful in a city picker — this keeps the UI usable
/// without depending on an external geocoding service.
#[tauri::command]
pub fn list_timezones() -> Vec<(&'static str, &'static str)> {
    vec![
        ("São Paulo", "America/Sao_Paulo"),
        ("Nova York", "America/New_York"),
        ("Los Angeles", "America/Los_Angeles"),
        ("Chicago", "America/Chicago"),
        ("Cidade do México", "America/Mexico_City"),
        ("Buenos Aires", "America/Argentina/Buenos_Aires"),
        ("Londres", "Europe/London"),
        ("Lisboa", "Europe/Lisbon"),
        ("Paris", "Europe/Paris"),
        ("Berlim", "Europe/Berlin"),
        ("Moscou", "Europe/Moscow"),
        ("Dubai", "Asia/Dubai"),
        ("Nova Deli", "Asia/Kolkata"),
        ("Pequim", "Asia/Shanghai"),
        ("Tóquio", "Asia/Tokyo"),
        ("Seul", "Asia/Seoul"),
        ("Singapura", "Asia/Singapore"),
        ("Sydney", "Australia/Sydney"),
        ("Auckland", "Pacific/Auckland"),
        ("UTC", "UTC"),
    ]
}
