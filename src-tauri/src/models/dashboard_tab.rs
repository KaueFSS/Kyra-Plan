use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardTab {
    pub id: String,
    pub name: String,
    pub position: i64,
    /// JSON array of widget placements (see `WidgetPlacement`).
    pub layout: String,
    pub created_at: String,
    pub updated_at: String,
}

/// One widget on a tab's 12x12 grid. Only used to validate incoming layouts;
/// the widget `type` is a frontend concern and isn't interpreted here.
#[derive(Debug, Clone, Deserialize)]
pub struct WidgetPlacement {
    pub i: String,
    #[serde(rename = "type")]
    pub widget_type: String,
    pub x: i64,
    pub y: i64,
    pub w: i64,
    pub h: i64,
}
