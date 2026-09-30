use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alarm {
    pub id: String,
    pub label: String,
    /// "HH:MM", 24h, local to the alarm's own intent (evaluated against the
    /// system's local timezone, matching how a user thinks about "7am").
    pub time: String,
    /// Weekday numbers 0 (Monday) .. 6 (Sunday). Empty means "every day".
    pub days: Vec<u8>,
    pub sound: String,
    pub enabled: bool,
    pub notify: bool,
    pub last_triggered_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAlarmInput {
    pub label: Option<String>,
    pub time: String,
    pub days: Vec<u8>,
    pub sound: Option<String>,
    pub enabled: Option<bool>,
    pub notify: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAlarmInput {
    pub id: String,
    pub label: String,
    pub time: String,
    pub days: Vec<u8>,
    pub sound: String,
    pub enabled: bool,
    pub notify: bool,
}
