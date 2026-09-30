use crate::error::AppResult;
use crate::models::settings::{Settings, UpdateSettingsInput};
use rusqlite::{params, Connection, Row};

fn row_to_settings(row: &Row) -> rusqlite::Result<Settings> {
    Ok(Settings {
        theme: row.get("theme")?,
        accent_color: row.get("accent_color")?,
        ui_density: row.get("ui_density")?,
        time_format: row.get("time_format")?,
        week_start: row.get("week_start")?,
        timezone: row.get("timezone")?,
        daily_reset_time: row.get("daily_reset_time")?,
        daily_reset_timezone: row.get("daily_reset_timezone")?,
        task_notifications_enabled: row.get::<_, i64>("task_notifications_enabled")? != 0,
        timer_sound_enabled: row.get::<_, i64>("timer_sound_enabled")? != 0,
        timer_default_preset_seconds: row.get("timer_default_preset_seconds")?,
        launch_on_startup: row.get::<_, i64>("launch_on_startup")? != 0,
        minimize_to_tray: row.get::<_, i64>("minimize_to_tray")? != 0,
        updated_at: row.get("updated_at")?,
    })
}

pub fn get(conn: &Connection) -> AppResult<Settings> {
    Ok(conn.query_row("SELECT * FROM settings WHERE id = 1", [], row_to_settings)?)
}

pub fn update(conn: &Connection, input: &UpdateSettingsInput) -> AppResult<Settings> {
    conn.execute(
        "UPDATE settings SET theme = ?1, accent_color = ?2, ui_density = ?3, time_format = ?4,
            week_start = ?5, timezone = ?6, daily_reset_time = ?7, daily_reset_timezone = ?8,
            task_notifications_enabled = ?9, timer_sound_enabled = ?10, timer_default_preset_seconds = ?11,
            launch_on_startup = ?12, minimize_to_tray = ?13, updated_at = datetime('now') WHERE id = 1",
        params![
            input.theme,
            input.accent_color,
            input.ui_density,
            input.time_format,
            input.week_start,
            input.timezone,
            input.daily_reset_time,
            input.daily_reset_timezone,
            input.task_notifications_enabled as i64,
            input.timer_sound_enabled as i64,
            input.timer_default_preset_seconds,
            input.launch_on_startup as i64,
            input.minimize_to_tray as i64,
        ],
    )?;
    get(conn)
}
