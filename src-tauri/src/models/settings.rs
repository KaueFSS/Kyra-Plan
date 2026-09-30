use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub accent_color: String,
    pub ui_density: String,
    pub time_format: String,
    pub week_start: String,
    pub timezone: String,
    pub daily_reset_time: String,
    pub daily_reset_timezone: String,
    pub task_notifications_enabled: bool,
    pub timer_sound_enabled: bool,
    pub timer_default_preset_seconds: i64,
    pub launch_on_startup: bool,
    pub minimize_to_tray: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsInput {
    pub theme: String,
    pub accent_color: String,
    pub ui_density: String,
    pub time_format: String,
    pub week_start: String,
    pub timezone: String,
    pub daily_reset_time: String,
    pub daily_reset_timezone: String,
    pub task_notifications_enabled: bool,
    pub timer_sound_enabled: bool,
    pub timer_default_preset_seconds: i64,
    pub launch_on_startup: bool,
    pub minimize_to_tray: bool,
}
