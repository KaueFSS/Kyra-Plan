use serde::Serialize;

/// How one day went for the "complete everything" streak.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DayResult {
    /// Every task due that day was done.
    Perfect,
    /// Something due that day was left undone — this breaks the streak.
    Missed,
    /// Nothing was due: neither counts nor breaks the streak.
    Empty,
    /// Today, still in progress.
    Today,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreakDay {
    pub date: String,
    pub result: DayResult,
    pub done: usize,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Streak {
    /// Consecutive perfect days up to today (today counts once it's complete).
    pub current: u32,
    pub best: u32,
    pub today_done: usize,
    pub today_total: usize,
    /// The last 14 days, oldest first, ending with today.
    pub recent: Vec<StreakDay>,
}
