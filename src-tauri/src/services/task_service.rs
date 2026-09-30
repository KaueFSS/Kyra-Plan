use crate::db::repo::{settings_repo, task_completions_repo, task_sessions_repo, tasks_repo};
use crate::error::{AppError, AppResult};
use crate::models::task::{
    CreateTaskInput, Task, TaskCompletion, TaskSession, TaskStatus, TaskType, TaskWithProgress,
    UpdateTaskInput,
};
use crate::services::time_util;
use chrono::Utc;
use rusqlite::Connection;

/// The cycle date ("today", for daily-reset purposes) according to the
/// user's configured reset time and timezone — never the raw device date.
pub fn current_cycle_date(conn: &Connection) -> AppResult<String> {
    let settings = settings_repo::get(conn)?;
    time_util::cycle_date_string(Utc::now(), &settings.daily_reset_time, &settings.daily_reset_timezone)
}

fn validate_create(input: &CreateTaskInput) -> AppResult<()> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation("O título da tarefa é obrigatório.".into()));
    }
    time_util::parse_date(&input.start_date)?;
    if let Some(end) = &input.end_date {
        time_util::parse_date(end)?;
    }
    if let Some(t) = &input.scheduled_time {
        time_util::parse_hhmm(t)?;
    }
    match input.task_type {
        TaskType::Timed => {
            let duration = input.duration_seconds.unwrap_or(0);
            if duration <= 0 {
                return Err(AppError::Validation(
                    "Tarefas com duração precisam de uma duração maior que zero.".into(),
                ));
            }
        }
        TaskType::Weekly => {
            let days = input.recurrence_days.as_deref().unwrap_or(&[]);
            if days.is_empty() {
                return Err(AppError::Validation(
                    "Selecione pelo menos um dia da semana.".into(),
                ));
            }
            if days.iter().any(|d| *d > 6) {
                return Err(AppError::Validation("Dia da semana inválido.".into()));
            }
        }
        _ => {}
    }
    Ok(())
}

pub fn create_task(conn: &Connection, input: CreateTaskInput) -> AppResult<Task> {
    validate_create(&input)?;
    tasks_repo::create(conn, &input)
}

pub fn update_task(conn: &Connection, input: UpdateTaskInput) -> AppResult<Task> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation("O título da tarefa é obrigatório.".into()));
    }
    time_util::parse_date(&input.start_date)?;
    if let Some(end) = &input.end_date {
        time_util::parse_date(end)?;
    }
    tasks_repo::update(conn, &input)
}

pub fn delete_task(conn: &Connection, id: &str) -> AppResult<()> {
    tasks_repo::delete(conn, id)
}

pub fn reorder_tasks(conn: &Connection, ordered_ids: &[String]) -> AppResult<()> {
    if ordered_ids.is_empty() {
        return Ok(());
    }
    tasks_repo::reorder(conn, ordered_ids)
}

fn with_progress(conn: &Connection, task: Task, cycle_date: &str) -> AppResult<TaskWithProgress> {
    let completion = task_completions_repo::find_for_date(conn, &task.id, cycle_date)?;
    let active_session = task_sessions_repo::find_active(conn, &task.id, cycle_date)?;
    let history = task_completions_repo::history_for_task(conn, &task.id, 14)?;
    Ok(TaskWithProgress {
        task,
        completion,
        active_session,
        history,
    })
}

/// Daily tasks whose active window (`start_date`..`end_date`) includes
/// today's cycle date, each paired with today's completion state and a
/// short history trail.
pub fn list_daily_tasks(conn: &Connection) -> AppResult<Vec<TaskWithProgress>> {
    let cycle_date = current_cycle_date(conn)?;
    let tasks = tasks_repo::list_by_type(conn, TaskType::Daily)?;
    tasks
        .into_iter()
        .filter(|t| is_within_window(t, &cycle_date))
        .map(|t| with_progress(conn, t, &cycle_date))
        .collect()
}

/// Weekly tasks, each paired with completion state for today (only
/// meaningful on the days it's actually scheduled) and a longer history
/// trail so the weekly grid can render every day's checkmark.
pub fn list_weekly_tasks(conn: &Connection) -> AppResult<Vec<TaskWithProgress>> {
    let cycle_date = current_cycle_date(conn)?;
    let tasks = tasks_repo::list_by_type(conn, TaskType::Weekly)?;
    tasks
        .into_iter()
        .filter(|t| is_within_window(t, &cycle_date))
        .map(|t| with_progress(conn, t, &cycle_date))
        .collect()
}

pub fn list_single_tasks(conn: &Connection) -> AppResult<Vec<TaskWithProgress>> {
    let cycle_date = current_cycle_date(conn)?;
    let tasks = tasks_repo::list_by_type(conn, TaskType::Single)?;
    tasks
        .into_iter()
        .map(|t| with_progress(conn, t, &cycle_date))
        .collect()
}

pub fn list_timed_tasks(conn: &Connection) -> AppResult<Vec<TaskWithProgress>> {
    let cycle_date = current_cycle_date(conn)?;
    let tasks = tasks_repo::list_by_type(conn, TaskType::Timed)?;
    tasks
        .into_iter()
        .map(|t| with_progress(conn, t, &cycle_date))
        .collect()
}

fn is_within_window(task: &Task, cycle_date: &str) -> bool {
    if task.start_date.as_str() > cycle_date {
        return false;
    }
    if let Some(end) = &task.end_date {
        if end.as_str() < cycle_date {
            return false;
        }
    }
    true
}

/// Toggles today's completion for a daily/weekly task. Writes a row keyed
/// by (task_id, cycle_date) rather than mutating a single boolean on the
/// task, so every previous day's result stays intact.
pub fn toggle_completion(conn: &Connection, task_id: &str) -> AppResult<TaskCompletion> {
    let task = tasks_repo::find_by_id(conn, task_id)?;
    let cycle_date = current_cycle_date(conn)?;

    if task.task_type == TaskType::Weekly {
        let cycle_naive = time_util::parse_date(&cycle_date)?;
        let days = task.recurrence_days.as_deref().unwrap_or(&[]);
        if !time_util::is_weekly_due(days, cycle_naive) {
            return Err(AppError::Validation(
                "Esta tarefa não está programada para hoje.".into(),
            ));
        }
    }

    let existing = task_completions_repo::find_for_date(conn, task_id, &cycle_date)?;
    let next_state = !existing.map(|c| c.completed).unwrap_or(false);

    // A task with a duration is only done when its countdown actually ends;
    // ticking it by hand would defeat the point. Unticking is still allowed.
    if next_state && task.duration_seconds.is_some_and(|d| d > 0) {
        return Err(AppError::Validation(
            "Essa tarefa é concluída automaticamente quando o cronômetro terminar.".into(),
        ));
    }

    task_completions_repo::set_completed(conn, task_id, &cycle_date, next_state)
}

// --- Timed tasks -----------------------------------------------------------

/// Any task with a duration (daily, weekly, single or timed) can run a
/// countdown session. Recurring tasks keep their `status` untouched — their
/// "done today" state lives in `task_completions`, per cycle date — while
/// one-off tasks also mirror the session state in `status`.
fn set_one_off_status(conn: &Connection, task_id: &str, status: TaskStatus) -> AppResult<()> {
    let task = tasks_repo::find_by_id(conn, task_id)?;
    if matches!(task.task_type, TaskType::Single | TaskType::Timed) {
        tasks_repo::set_status(conn, task_id, status)?;
    }
    Ok(())
}

pub fn start_timed_task(conn: &Connection, task_id: &str) -> AppResult<TaskSession> {
    let task = tasks_repo::find_by_id(conn, task_id)?;
    let duration = task
        .duration_seconds
        .filter(|d| *d > 0)
        .ok_or_else(|| AppError::Validation("Esta tarefa não possui uma duração configurada.".into()))?;
    let cycle_date = current_cycle_date(conn)?;

    if let Some(existing) = task_sessions_repo::find_active(conn, task_id, &cycle_date)? {
        return Ok(existing);
    }
    if task_completions_repo::find_for_date(conn, task_id, &cycle_date)?.is_some_and(|c| c.completed) {
        return Err(AppError::Validation("Esta tarefa já foi concluída hoje.".into()));
    }

    set_one_off_status(conn, task_id, TaskStatus::InProgress)?;
    task_sessions_repo::start(conn, task_id, &cycle_date, duration)
}

fn session_elapsed_now(session: &TaskSession) -> AppResult<i64> {
    use crate::models::task::TaskSessionStatus;
    let status = match session.status {
        TaskSessionStatus::Running => crate::models::timer_session::TimerStatus::Running,
        _ => crate::models::timer_session::TimerStatus::Paused,
    };
    let started_at = session
        .started_at
        .as_deref()
        .map(time_util::parse_sqlite_datetime)
        .transpose()?;
    Ok(time_util::elapsed_seconds_now(
        status,
        started_at,
        session.elapsed_seconds,
        Utc::now(),
    ))
}

pub fn pause_timed_task(conn: &Connection, session_id: &str) -> AppResult<TaskSession> {
    let session = task_sessions_repo::find_by_id(conn, session_id)?;
    let elapsed = session_elapsed_now(&session)?.min(session.duration_seconds);
    let updated = task_sessions_repo::pause(conn, session_id, elapsed)?;
    set_one_off_status(conn, &updated.task_id, TaskStatus::Paused)?;
    Ok(updated)
}

pub fn resume_timed_task(conn: &Connection, session_id: &str) -> AppResult<TaskSession> {
    let updated = task_sessions_repo::resume(conn, session_id)?;
    set_one_off_status(conn, &updated.task_id, TaskStatus::InProgress)?;
    Ok(updated)
}

pub fn restart_timed_task(conn: &Connection, session_id: &str) -> AppResult<TaskSession> {
    let updated = task_sessions_repo::restart(conn, session_id)?;
    set_one_off_status(conn, &updated.task_id, TaskStatus::InProgress)?;
    Ok(updated)
}

pub fn cancel_timed_task(conn: &Connection, session_id: &str) -> AppResult<()> {
    let session = task_sessions_repo::find_by_id(conn, session_id)?;
    task_sessions_repo::cancel(conn, session_id)?;
    set_one_off_status(conn, &session.task_id, TaskStatus::Pending)?;
    Ok(())
}

/// A timed task is only ever marked completed once its elapsed time,
/// recomputed from timestamps, has actually reached the configured
/// duration — never optimistically when the frontend's own countdown hits
/// zero, since that countdown can drift from the timestamp-derived truth.
pub fn check_and_complete_timed_task(conn: &Connection, session_id: &str) -> AppResult<TaskSession> {
    let session = task_sessions_repo::find_by_id(conn, session_id)?;
    let elapsed = session_elapsed_now(&session)?;

    if elapsed >= session.duration_seconds {
        let completed = task_sessions_repo::complete(conn, session_id)?;
        set_one_off_status(conn, &completed.task_id, TaskStatus::Completed)?;
        // Credit the day the session was started on, even if the daily
        // reset happened while it was still running.
        task_completions_repo::set_completed(conn, &completed.task_id, &completed.cycle_date, true)?;
        Ok(completed)
    } else {
        Ok(session)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;
    use crate::models::task::{Priority, TaskType};
    use std::thread::sleep;
    use std::time::Duration;

    fn daily_task_input(title: &str) -> CreateTaskInput {
        CreateTaskInput {
            title: title.into(),
            description: None,
            task_type: TaskType::Daily,
            priority: Priority::Medium,
            duration_seconds: None,
            scheduled_time: None,
            recurrence_days: None,
            start_date: "2020-01-01".into(),
            end_date: None,
        }
    }

    #[test]
    fn toggle_completion_writes_history_without_overwriting_other_dates() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();

        let task = create_task(&conn, daily_task_input("Ler 20 páginas")).unwrap();

        let first_toggle = toggle_completion(&conn, &task.id).unwrap();
        assert!(first_toggle.completed);

        let second_toggle = toggle_completion(&conn, &task.id).unwrap();
        assert!(!second_toggle.completed, "toggling twice should undo completion for the same day");

        let history = task_completions_repo::history_for_task(&conn, &task.id, 10).unwrap();
        assert_eq!(history.len(), 1, "same-day toggles update one row, not append new ones");
    }

    #[test]
    fn daily_task_with_duration_runs_a_timer_and_cannot_be_ticked_by_hand() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();

        let mut input = daily_task_input("Estudar");
        input.duration_seconds = Some(1);
        let task = create_task(&conn, input).unwrap();

        assert!(toggle_completion(&conn, &task.id).is_err(), "manual completion must be refused");

        let session = start_timed_task(&conn, &task.id).unwrap();
        sleep(Duration::from_millis(1100));
        check_and_complete_timed_task(&conn, &session.id).unwrap();

        let cycle_date = current_cycle_date(&conn).unwrap();
        let completion = task_completions_repo::find_for_date(&conn, &task.id, &cycle_date).unwrap().unwrap();
        assert!(completion.completed);
        // Recurring tasks keep their own status; "done" lives in the completion row.
        assert_eq!(tasks_repo::find_by_id(&conn, &task.id).unwrap().status, TaskStatus::Pending);
        assert!(start_timed_task(&conn, &task.id).is_err(), "can't restart once done today");
    }

    #[test]
    fn weekly_task_without_days_is_rejected() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();

        let mut input = daily_task_input("Estudar Python");
        input.task_type = TaskType::Weekly;
        input.recurrence_days = Some(vec![]);

        let result = create_task(&conn, input);
        assert!(result.is_err(), "a weekly task with no selected days must be rejected");
    }

    #[test]
    fn timed_task_zero_duration_is_rejected() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();

        let mut input = daily_task_input("Sessão de foco");
        input.task_type = TaskType::Timed;
        input.duration_seconds = Some(0);

        let result = create_task(&conn, input);
        assert!(result.is_err(), "a timed task must have a positive duration");
    }

    #[test]
    fn timed_task_does_not_complete_before_duration_elapses() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();

        let mut input = daily_task_input("Sessão de foco");
        input.task_type = TaskType::Timed;
        input.duration_seconds = Some(60);
        let task = create_task(&conn, input).unwrap();

        let session = start_timed_task(&conn, &task.id).unwrap();
        let checked = check_and_complete_timed_task(&conn, &session.id).unwrap();

        assert_eq!(checked.status, crate::models::task::TaskSessionStatus::Running);
    }

    #[test]
    fn timed_task_completes_only_once_real_elapsed_time_reaches_duration() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();

        let mut input = daily_task_input("Sessão curta");
        input.task_type = TaskType::Timed;
        input.duration_seconds = Some(1);
        let task = create_task(&conn, input).unwrap();

        let session = start_timed_task(&conn, &task.id).unwrap();
        sleep(Duration::from_millis(1100));

        let checked = check_and_complete_timed_task(&conn, &session.id).unwrap();
        assert_eq!(checked.status, crate::models::task::TaskSessionStatus::Completed);

        let cycle_date = current_cycle_date(&conn).unwrap();
        let completion = task_completions_repo::find_for_date(&conn, &task.id, &cycle_date)
            .unwrap()
            .expect("completing the timed session should also mark today's completion");
        assert!(completion.completed);
    }

    #[test]
    fn pausing_a_timed_task_freezes_elapsed_time() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();

        let mut input = daily_task_input("Sessão pausável");
        input.task_type = TaskType::Timed;
        input.duration_seconds = Some(120);
        let task = create_task(&conn, input).unwrap();

        let session = start_timed_task(&conn, &task.id).unwrap();
        sleep(Duration::from_millis(200));
        let paused = pause_timed_task(&conn, &session.id).unwrap();
        let elapsed_at_pause = paused.elapsed_seconds;

        sleep(Duration::from_millis(300));
        let still_paused = task_sessions_repo::find_by_id(&conn, &session.id).unwrap();
        assert_eq!(
            still_paused.elapsed_seconds, elapsed_at_pause,
            "elapsed time must not advance while paused"
        );
    }
}
