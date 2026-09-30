use crate::db::repo::timer_sessions_repo;
use crate::error::{AppError, AppResult};
use crate::models::timer_session::{TimerKind, TimerSession, TimerSnapshot, TimerStatus};
use crate::services::time_util;
use chrono::Utc;
use rusqlite::Connection;

fn to_snapshot(session: TimerSession) -> AppResult<TimerSnapshot> {
    let started_at = session
        .started_at
        .as_deref()
        .map(time_util::parse_sqlite_datetime)
        .transpose()?;
    let elapsed_seconds_now = time_util::elapsed_seconds_now(
        session.status,
        started_at,
        session.elapsed_seconds,
        Utc::now(),
    );
    Ok(TimerSnapshot {
        session,
        elapsed_seconds_now,
    })
}

pub fn get_active(conn: &Connection, kind: TimerKind) -> AppResult<Option<TimerSnapshot>> {
    match timer_sessions_repo::find_active(conn, kind)? {
        Some(session) => Ok(Some(to_snapshot(session)?)),
        None => Ok(None),
    }
}

pub fn start(conn: &Connection, kind: TimerKind, label: String, duration_seconds: Option<i64>) -> AppResult<TimerSnapshot> {
    if kind == TimerKind::Timer && duration_seconds.map(|d| d <= 0).unwrap_or(true) {
        return Err(AppError::Validation("Defina uma duração maior que zero para o timer.".into()));
    }

    // Only one active session per kind: replace any leftover running/paused
    // one instead of accumulating orphaned "active" rows.
    if let Some(existing) = timer_sessions_repo::find_active(conn, kind)? {
        timer_sessions_repo::cancel(conn, &existing.id)?;
    }

    let session = timer_sessions_repo::create(conn, kind, &label, duration_seconds)?;
    to_snapshot(session)
}

pub fn pause(conn: &Connection, id: &str) -> AppResult<TimerSnapshot> {
    let session = timer_sessions_repo::find_by_id(conn, id)?;
    let snapshot = to_snapshot(session)?;
    let updated = timer_sessions_repo::pause(conn, id, snapshot.elapsed_seconds_now)?;
    to_snapshot(updated)
}

pub fn resume(conn: &Connection, id: &str) -> AppResult<TimerSnapshot> {
    let updated = timer_sessions_repo::resume(conn, id)?;
    to_snapshot(updated)
}

pub fn restart(conn: &Connection, id: &str) -> AppResult<TimerSnapshot> {
    let updated = timer_sessions_repo::restart(conn, id)?;
    to_snapshot(updated)
}

pub fn cancel(conn: &Connection, id: &str) -> AppResult<()> {
    timer_sessions_repo::cancel(conn, id)
}

/// A countdown Timer is only completed once its live elapsed time
/// (recomputed from timestamps) has actually reached the configured
/// duration; a Stopwatch has no duration and is never auto-completed this
/// way — it's only ever paused/reset/cancelled by the user.
pub fn check_and_complete(conn: &Connection, id: &str) -> AppResult<TimerSnapshot> {
    let session = timer_sessions_repo::find_by_id(conn, id)?;
    let snapshot = to_snapshot(session)?;

    if snapshot.session.kind == TimerKind::Timer {
        if let Some(duration) = snapshot.session.duration_seconds {
            if snapshot.elapsed_seconds_now >= duration && snapshot.session.status == TimerStatus::Running {
                let completed = timer_sessions_repo::complete(conn, id, duration)?;
                return to_snapshot(completed);
            }
        }
    }

    Ok(snapshot)
}

pub fn add_lap(conn: &Connection, id: &str) -> AppResult<TimerSnapshot> {
    let session = timer_sessions_repo::find_by_id(conn, id)?;
    if session.kind != TimerKind::Stopwatch {
        return Err(AppError::Validation("Voltas só estão disponíveis no cronômetro.".into()));
    }
    let snapshot = to_snapshot(session.clone())?;
    let mut laps = session.laps.clone();
    laps.push(snapshot.elapsed_seconds_now * 1000);
    let updated = timer_sessions_repo::add_lap(conn, id, &laps)?;
    to_snapshot(updated)
}
