use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SearchResultKind {
    Task,
    Event,
    Alarm,
    ScheduleBlock,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub kind: SearchResultKind,
    pub id: String,
    pub title: String,
    pub subtitle: String,
}
