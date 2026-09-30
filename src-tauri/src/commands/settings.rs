use crate::db::repo::settings_repo;
use crate::db::Db;
use crate::error::AppResult;
use crate::models::settings::{Settings, UpdateSettingsInput};
use crate::services::time_util;
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn get_settings(db: State<Db>) -> AppResult<Settings> {
    let conn = db.lock()?;
    settings_repo::get(&conn)
}

#[tauri::command]
pub fn update_settings(app: AppHandle, db: State<Db>, input: UpdateSettingsInput) -> AppResult<Settings> {
    time_util::parse_hhmm(&input.daily_reset_time)?;
    time_util::parse_tz(&input.daily_reset_timezone)?;
    time_util::parse_tz(&input.timezone)?;

    let updated = {
        let conn = db.lock()?;
        settings_repo::update(&conn, &input)?
    };

    // Best-effort: the OS-level autostart registration living outside the
    // database means it can drift (the user could remove it manually), but
    // we resync it here on every settings save.
    let autolaunch = app.autolaunch();
    let sync_result = if input.launch_on_startup {
        autolaunch.enable()
    } else {
        autolaunch.disable()
    };
    if let Err(err) = sync_result {
        log::warn!("Falha ao sincronizar inicialização automática: {err}");
    }

    Ok(updated)
}
