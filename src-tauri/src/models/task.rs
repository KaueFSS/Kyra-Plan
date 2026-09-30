use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskType {
    Single,
    Daily,
    Weekly,
    Timed,
}

impl TaskType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskType::Single => "single",
            TaskType::Daily => "daily",
            TaskType::Weekly => "weekly",
            TaskType::Timed => "timed",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "single" => Some(TaskType::Single),
            "daily" => Some(TaskType::Daily),
            "weekly" => Some(TaskType::Weekly),
            "timed" => Some(TaskType::Timed),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
    Low,
    Medium,
    High,
}

impl Priority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Priority::Low => "low",
            Priority::Medium => "medium",
            Priority::High => "high",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "low" => Some(Priority::Low),
            "medium" => Some(Priority::Medium),
            "high" => Some(Priority::High),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    InProgress,
    Paused,
    Completed,
    Cancelled,
}

impl TaskStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskStatus::Pending => "pending",
            TaskStatus::InProgress => "in_progress",
            TaskStatus::Paused => "paused",
            TaskStatus::Completed => "completed",
            TaskStatus::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(TaskStatus::Pending),
            "in_progress" => Some(TaskStatus::InProgress),
            "paused" => Some(TaskStatus::Paused),
            "completed" => Some(TaskStatus::Completed),
            "cancelled" => Some(TaskStatus::Cancelled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub task_type: TaskType,
    pub priority: Priority,
    pub status: TaskStatus,
    pub duration_seconds: Option<i64>,
    pub scheduled_time: Option<String>,
    /// Weekday numbers 0 (Monday) .. 6 (Sunday), only meaningful for `weekly` tasks.
    pub recurrence_days: Option<Vec<u8>>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub task_type: TaskType,
    pub priority: Priority,
    pub duration_seconds: Option<i64>,
    pub scheduled_time: Option<String>,
    pub recurrence_days: Option<Vec<u8>>,
    pub start_date: String,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: Priority,
    pub duration_seconds: Option<i64>,
    pub scheduled_time: Option<String>,
    pub recurrence_days: Option<Vec<u8>>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub status: TaskStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCompletion {
    pub id: String,
    pub task_id: String,
    pub cycle_date: String,
    pub completed: bool,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskSessionStatus {
    Running,
    Paused,
    Completed,
    Cancelled,
}

impl TaskSessionStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "running" => Some(TaskSessionStatus::Running),
            "paused" => Some(TaskSessionStatus::Paused),
            "completed" => Some(TaskSessionStatus::Completed),
            "cancelled" => Some(TaskSessionStatus::Cancelled),
            _ => None,
        }
    }
}

/// Timestamp-based execution state for a timed task. `elapsed_seconds` is
/// the amount accumulated across previous run segments; the time elapsed
/// during the *current* running segment must be computed by the caller as
/// `now - started_at`, never assumed from a client-side ticking interval.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskSession {
    pub id: String,
    pub task_id: String,
    pub cycle_date: String,
    pub status: TaskSessionStatus,
    pub duration_seconds: i64,
    pub elapsed_seconds: i64,
    pub started_at: Option<String>,
    pub paused_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// A task combined with its completion state / running session for a
/// specific cycle date — the shape the frontend actually renders.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskWithProgress {
    #[serde(flatten)]
    pub task: Task,
    pub completion: Option<TaskCompletion>,
    pub active_session: Option<TaskSession>,
    pub history: Vec<TaskCompletion>,
}
