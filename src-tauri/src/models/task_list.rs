use serde::{Deserialize, Serialize};

/// A named list of one-off tasks ("Tarefas", "Trabalho", "Mercado"…).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskList {
    pub id: String,
    pub name: String,
    pub color: String,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}
