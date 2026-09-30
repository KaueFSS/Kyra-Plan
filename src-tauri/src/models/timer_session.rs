use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimerKind {
    Timer,
    Stopwatch,
}

impl TimerKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            TimerKind::Timer => "timer",
            TimerKind::Stopwatch => "stopwatch",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "timer" => Some(TimerKind::Timer),
            "stopwatch" => Some(TimerKind::Stopwatch),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimerStatus {
    Idle,
    Running,
    Paused,
    Completed,
    Cancelled,
}

impl TimerStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "idle" => Some(TimerStatus::Idle),
            "running" => Some(TimerStatus::Running),
            "paused" => Some(TimerStatus::Paused),
            "completed" => Some(TimerStatus::Completed),
            "cancelled" => Some(TimerStatus::Cancelled),
            _ => None,
        }
    }
}

/// Timestamp-based Timer/Stopwatch state. `elapsed_seconds` accumulates
/// completed run segments; the frontend adds `now - started_at` on top of
/// it while `status == running` rather than trusting a local interval.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSession {
    pub id: String,
    pub kind: TimerKind,
    pub label: String,
    pub duration_seconds: Option<i64>,
    pub elapsed_seconds: i64,
    pub status: TimerStatus,
    pub started_at: Option<String>,
    pub paused_at: Option<String>,
    /// Lap split lengths in milliseconds, stopwatch only.
    pub laps: Vec<i64>,
    pub created_at: String,
    pub updated_at: String,
}

/// A `TimerSession` plus the elapsed time recomputed from timestamps *right
/// now* — the only field the frontend should render as "current time",
/// since `elapsedSeconds` alone is only accurate while paused/stopped.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    #[serde(flatten)]
    pub session: TimerSession,
    pub elapsed_seconds_now: i64,
}
