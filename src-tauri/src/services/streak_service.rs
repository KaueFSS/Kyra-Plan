use crate::db::repo::{settings_repo, task_completions_repo, tasks_repo};
use crate::error::AppResult;
use crate::models::streak::{DayResult, Streak, StreakDay};
use crate::models::task::{Task, TaskStatus, TaskType};
use crate::services::time_util;
use chrono::{Duration, NaiveDate, Utc};
use rusqlite::Connection;
use std::collections::HashSet;

const RECENT_DAYS: i64 = 14;
/// Safety cap so a very old start date never turns this into a long loop.
const MAX_LOOKBACK_DAYS: i64 = 3 * 365;

/// The "complete everything" streak: consecutive days on which every daily
/// task and every weekly task scheduled for that day was done. Days with
/// nothing due are neutral; today counts only once it's complete, and an
/// unfinished today never breaks the streak (the day isn't over yet).
pub fn get_streak(conn: &Connection) -> AppResult<Streak> {
    let settings = settings_repo::get(conn)?;
    let today = time_util::cycle_date(Utc::now(), &settings.daily_reset_time, &settings.daily_reset_timezone)?;
    let tasks = tasks_repo::list_recurring(conn)?;
    let done = task_completions_repo::completed_pairs(conn)?;
    Ok(compute(&tasks, &done, today))
}

fn is_due(task: &Task, date: NaiveDate, iso: &str) -> bool {
    if task.status == TaskStatus::Cancelled || task.start_date.as_str() > iso {
        return false;
    }
    if task.end_date.as_deref().is_some_and(|end| end < iso) {
        return false;
    }
    match task.task_type {
        TaskType::Daily => true,
        TaskType::Weekly => time_util::is_weekly_due(task.recurrence_days.as_deref().unwrap_or(&[]), date),
        _ => false,
    }
}

fn evaluate(tasks: &[Task], done: &HashSet<(String, String)>, date: NaiveDate, today: NaiveDate) -> StreakDay {
    let iso = date.format("%Y-%m-%d").to_string();
    let due: Vec<&Task> = tasks.iter().filter(|t| is_due(t, date, &iso)).collect();
    let finished = due.iter().filter(|t| done.contains(&(t.id.clone(), iso.clone()))).count();
    let result = if due.is_empty() {
        DayResult::Empty
    } else if finished == due.len() {
        DayResult::Perfect
    } else if date == today {
        DayResult::Today
    } else {
        DayResult::Missed
    };
    StreakDay { date: iso, result, done: finished, total: due.len() }
}

pub fn compute(tasks: &[Task], done: &HashSet<(String, String)>, today: NaiveDate) -> Streak {
    let earliest = tasks
        .iter()
        .filter_map(|t| time_util::parse_date(&t.start_date).ok())
        .min()
        .unwrap_or(today)
        .max(today - Duration::days(MAX_LOOKBACK_DAYS));

    let today_eval = evaluate(tasks, done, today, today);

    // Current streak: walk back from today until the first missed day.
    let mut current = u32::from(today_eval.result == DayResult::Perfect);
    let mut day = today - Duration::days(1);
    while day >= earliest {
        match evaluate(tasks, done, day, today).result {
            DayResult::Perfect => current += 1,
            DayResult::Missed => break,
            DayResult::Empty | DayResult::Today => {}
        }
        day -= Duration::days(1);
    }

    // Best streak: longest run of perfect days (empty days don't interrupt).
    let mut best = 0;
    let mut run = 0;
    let mut day = earliest;
    while day <= today {
        match evaluate(tasks, done, day, today).result {
            DayResult::Perfect => {
                run += 1;
                best = best.max(run);
            }
            DayResult::Missed => run = 0,
            DayResult::Empty | DayResult::Today => {}
        }
        day += Duration::days(1);
    }

    let recent = (0..RECENT_DAYS)
        .rev()
        .map(|back| evaluate(tasks, done, today - Duration::days(back), today))
        .collect();

    Streak {
        current,
        best: best.max(current),
        today_done: today_eval.done,
        today_total: today_eval.total,
        recent,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::task::Priority;

    fn task(id: &str, kind: TaskType, days: Option<Vec<u8>>, start: &str) -> Task {
        Task {
            id: id.into(),
            title: id.into(),
            description: String::new(),
            task_type: kind,
            priority: Priority::Medium,
            status: TaskStatus::Pending,
            duration_seconds: None,
            scheduled_time: None,
            recurrence_days: days,
            start_date: start.into(),
            end_date: None,
            sort_order: 0,
            list_id: None,
            completed_at: None,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    fn date(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    fn done(pairs: &[(&str, &str)]) -> HashSet<(String, String)> {
        pairs.iter().map(|(t, d)| (t.to_string(), d.to_string())).collect()
    }

    #[test]
    fn counts_consecutive_perfect_days_and_keeps_an_unfinished_today_neutral() {
        // Tuesday 13/10/2026. Water every day since Friday.
        let tasks = vec![task("agua", TaskType::Daily, None, "2026-10-09")];
        let history = done(&[("agua", "2026-10-09"), ("agua", "2026-10-10"), ("agua", "2026-10-11"), ("agua", "2026-10-12")]);

        let streak = compute(&tasks, &history, date("2026-10-13"));
        assert_eq!(streak.current, 4, "today still open doesn't break it");
        assert_eq!((streak.today_done, streak.today_total), (0, 1));

        let mut finished = history.clone();
        finished.insert(("agua".into(), "2026-10-13".into()));
        assert_eq!(compute(&tasks, &finished, date("2026-10-13")).current, 5);
    }

    #[test]
    fn a_forgotten_task_breaks_the_streak_but_days_without_tasks_do_not() {
        // Gym only on Mondays (0); reading every day from 08/10.
        let tasks = vec![
            task("leitura", TaskType::Daily, None, "2026-10-08"),
            task("academia", TaskType::Weekly, Some(vec![0]), "2026-10-01"),
        ];
        // 08/10 reading forgotten; 09–12 reading done; Monday 12/10 gym done.
        let history = done(&[
            ("leitura", "2026-10-09"),
            ("leitura", "2026-10-10"),
            ("leitura", "2026-10-11"),
            ("leitura", "2026-10-12"),
            ("academia", "2026-10-12"),
            ("academia", "2026-10-05"),
        ]);
        let streak = compute(&tasks, &history, date("2026-10-13"));
        // 09, 10, 11, 12 perfect; 08 missed stops it. 06/07 had nothing due (neutral).
        assert_eq!(streak.current, 4);
        assert_eq!(streak.best, 4);
        assert_eq!(streak.recent.len(), 14);
        let day = |iso: &str| streak.recent.iter().find(|d| d.date == iso).unwrap().result;
        assert_eq!(day("2026-10-08"), DayResult::Missed);
        assert_eq!(day("2026-10-07"), DayResult::Empty);
        assert_eq!(day("2026-10-05"), DayResult::Perfect);
        assert_eq!(day("2026-10-13"), DayResult::Today);
    }
}
