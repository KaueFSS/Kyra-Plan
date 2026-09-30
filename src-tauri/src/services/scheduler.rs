use crate::db::repo::{task_sessions_repo, tasks_repo, timer_sessions_repo};
use crate::db::Db;
use crate::services::{alarm_service, event_service, notification_service, task_service, time_util, timer_service};
use chrono::Utc;
use std::collections::HashSet;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};

/// Every 5 seconds: an alarm rings within a few seconds of its minute and a
/// timer finished while the window is hidden rings almost on time. Each tick
/// is a handful of indexed queries on a tiny local database, so the cost is
/// negligible.
const TICK_INTERVAL: Duration = Duration::from_secs(5);

/// Dedupe set for "event starting soon" notifications, keyed by
/// `event_id@occurrence_start`, so the same occurrence isn't announced on
/// every tick while it sits inside the lookahead window.
struct NotifiedOccurrences(Mutex<HashSet<String>>);

pub fn spawn(app: AppHandle) {
    app.manage(NotifiedOccurrences(Mutex::new(HashSet::new())));

    tauri::async_runtime::spawn(async move {
        loop {
            tick(&app);
            tokio::time::sleep(TICK_INTERVAL).await;
        }
    });
}

fn tick(app: &AppHandle) {
    let db = app.state::<Db>();
    let conn = match db.0.lock() {
        Ok(conn) => conn,
        Err(err) => {
            log::error!("Não foi possível obter o lock do banco no scheduler: {err}");
            return;
        }
    };

    check_alarms(app, &conn);
    check_upcoming_events(app, &conn);
    check_running_timers(app, &conn);
    check_running_task_sessions(app, &conn);
}

fn check_alarms(app: &AppHandle, conn: &rusqlite::Connection) {
    let due = match alarm_service::due_alarms(conn) {
        Ok(alarms) => alarms,
        Err(err) => {
            log::error!("Falha ao verificar alarmes: {err}");
            return;
        }
    };

    for alarm in due {
        notification_service::alarm_fired(app, &alarm.label, &alarm.time, alarm.notify);
        if let Err(err) = alarm_service::mark_triggered_today(conn, &alarm.id) {
            log::error!("Falha ao marcar alarme {} como disparado: {err}", alarm.id);
        }
    }
}

fn check_upcoming_events(app: &AppHandle, conn: &rusqlite::Connection) {
    const LOOKAHEAD_MINUTES: i64 = 10;

    let now = Utc::now();
    let range_start = now.to_rfc3339();
    let range_end = (now + chrono::Duration::minutes(LOOKAHEAD_MINUTES)).to_rfc3339();

    let occurrences = match event_service::list_occurrences(conn, &range_start, &range_end) {
        Ok(occurrences) => occurrences,
        Err(err) => {
            log::error!("Falha ao verificar próximos eventos: {err}");
            return;
        }
    };

    let state = app.state::<NotifiedOccurrences>();
    let mut notified = match state.0.lock() {
        Ok(guard) => guard,
        Err(err) => {
            log::error!("Falha ao obter lock de eventos notificados: {err}");
            return;
        }
    };

    for occurrence in occurrences {
        let key = format!("{}@{}", occurrence.event.id, occurrence.occurrence_start);
        if notified.contains(&key) {
            continue;
        }

        if let Ok(start) = time_util::parse_rfc3339(&occurrence.occurrence_start) {
            let minutes_until = (start - now).num_minutes().max(0);
            notification_service::notify_event_upcoming(app, &occurrence.event.title, minutes_until);
            notified.insert(key);
        }
    }

    // Bound the dedupe set's memory footprint on a long-running session.
    if notified.len() > 500 {
        notified.clear();
    }
}

fn check_running_timers(app: &AppHandle, conn: &rusqlite::Connection) {
    let running = match timer_sessions_repo::list_running_timers(conn) {
        Ok(sessions) => sessions,
        Err(err) => {
            log::error!("Falha ao listar timers em execução: {err}");
            return;
        }
    };

    for session in running {
        match timer_service::check_and_complete(conn, &session.id) {
            Ok(snapshot) if snapshot.session.status == crate::models::timer_session::TimerStatus::Completed => {
                notification_service::timer_finished(app, &snapshot.session.label);
            }
            Ok(_) => {}
            Err(err) => log::error!("Falha ao verificar timer {}: {err}", session.id),
        }
    }
}

fn check_running_task_sessions(app: &AppHandle, conn: &rusqlite::Connection) {
    let running = match task_sessions_repo::list_running(conn) {
        Ok(sessions) => sessions,
        Err(err) => {
            log::error!("Falha ao listar sessões de tarefa em execução: {err}");
            return;
        }
    };

    for session in running {
        match task_service::check_and_complete_timed_task(conn, &session.id) {
            Ok(updated) if updated.status == crate::models::task::TaskSessionStatus::Completed => {
                if let Ok(task) = tasks_repo::find_by_id(conn, &session.task_id) {
                    notification_service::task_finished(app, &task.title);
                }
            }
            Ok(_) => {}
            Err(err) => log::error!("Falha ao verificar sessão de tarefa {}: {err}", session.id),
        }
    }
}
