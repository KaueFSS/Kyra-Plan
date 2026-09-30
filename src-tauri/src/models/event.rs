use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecurrenceRule {
    None,
    Daily,
    Weekly,
    Monthly,
}

impl RecurrenceRule {
    pub fn as_str(&self) -> &'static str {
        match self {
            RecurrenceRule::None => "none",
            RecurrenceRule::Daily => "daily",
            RecurrenceRule::Weekly => "weekly",
            RecurrenceRule::Monthly => "monthly",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "none" => Some(RecurrenceRule::None),
            "daily" => Some(RecurrenceRule::Daily),
            "weekly" => Some(RecurrenceRule::Weekly),
            "monthly" => Some(RecurrenceRule::Monthly),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: String,
    /// RFC3339 timestamps, always stored with an explicit UTC offset.
    pub start_at: String,
    pub end_at: String,
    pub color: String,
    pub recurrence_rule: RecurrenceRule,
    pub recurrence_until: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEventInput {
    pub title: String,
    pub description: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub color: Option<String>,
    pub recurrence_rule: Option<RecurrenceRule>,
    pub recurrence_until: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEventInput {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub color: String,
    pub recurrence_rule: RecurrenceRule,
    pub recurrence_until: Option<String>,
}

/// A single occurrence of an event within a queried date range: for a
/// recurring event this is a *virtual* instance (occurrence_start/end),
/// while `event` still points at the base row for edit/delete purposes.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventOccurrence {
    #[serde(flatten)]
    pub event: Event,
    pub occurrence_start: String,
    pub occurrence_end: String,
}
