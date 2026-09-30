use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyScheduleBlock {
    pub id: String,
    /// 0 (Monday) .. 6 (Sunday)
    pub day_of_week: u8,
    pub start_time: String,
    pub end_time: String,
    pub title: String,
    pub description: String,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWeeklyScheduleBlockInput {
    pub day_of_week: u8,
    pub start_time: String,
    pub end_time: String,
    pub title: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWeeklyScheduleBlockInput {
    pub id: String,
    pub day_of_week: u8,
    pub start_time: String,
    pub end_time: String,
    pub title: String,
    pub description: String,
    pub color: String,
}
