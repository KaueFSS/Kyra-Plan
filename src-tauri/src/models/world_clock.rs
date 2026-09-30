use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldClock {
    pub id: String,
    pub city: String,
    /// IANA timezone identifier, e.g. "America/Sao_Paulo".
    pub timezone: String,
    pub position: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorldClockInput {
    pub city: String,
    pub timezone: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderWorldClocksInput {
    pub ordered_ids: Vec<String>,
}
