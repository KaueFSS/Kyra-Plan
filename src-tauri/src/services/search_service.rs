use crate::db::repo::{alarms_repo, events_repo, tasks_repo, weekly_schedule_repo};
use crate::error::AppResult;
use crate::models::search::{SearchResult, SearchResultKind};
use rusqlite::Connection;

const WEEKDAY_LABELS: [&str; 7] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

pub fn search_all(conn: &Connection, query: &str) -> AppResult<Vec<SearchResult>> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }

    let mut results = Vec::new();

    for task in tasks_repo::search(conn, trimmed)? {
        results.push(SearchResult {
            kind: SearchResultKind::Task,
            id: task.id,
            title: task.title,
            subtitle: format!("Tarefa · {}", task.task_type.as_str()),
        });
    }

    for event in events_repo::search(conn, trimmed)? {
        results.push(SearchResult {
            kind: SearchResultKind::Event,
            id: event.id,
            title: event.title,
            subtitle: format!("Evento · {}", event.start_at),
        });
    }

    for alarm in alarms_repo::search(conn, trimmed)? {
        results.push(SearchResult {
            kind: SearchResultKind::Alarm,
            id: alarm.id,
            title: if alarm.label.is_empty() { alarm.time.clone() } else { alarm.label },
            subtitle: format!("Alarme · {}", alarm.time),
        });
    }

    for block in weekly_schedule_repo::search(conn, trimmed)? {
        let day_label = WEEKDAY_LABELS.get(block.day_of_week as usize).unwrap_or(&"");
        results.push(SearchResult {
            kind: SearchResultKind::ScheduleBlock,
            id: block.id,
            title: block.title,
            subtitle: format!("Programação · {day_label} {}", block.start_time),
        });
    }

    Ok(results)
}
