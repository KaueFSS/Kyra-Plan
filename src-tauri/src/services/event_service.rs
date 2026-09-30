use crate::db::repo::events_repo;
use crate::error::AppResult;
use crate::models::event::{CreateEventInput, Event, EventOccurrence, RecurrenceRule, UpdateEventInput};
use crate::services::time_util;
use chrono::{DateTime, Duration, Months, Utc};
use rusqlite::Connection;

/// Hard cap on generated occurrences per event per query, so an unbounded
/// monthly/weekly recurrence with no `recurrence_until` can never turn a
/// wide calendar range into an unbounded loop.
const MAX_OCCURRENCES: usize = 400;

pub fn create_event(conn: &Connection, input: CreateEventInput) -> AppResult<Event> {
    time_util::parse_rfc3339(&input.start_at)?;
    time_util::parse_rfc3339(&input.end_at)?;
    events_repo::create(conn, &input)
}

pub fn update_event(conn: &Connection, input: UpdateEventInput) -> AppResult<Event> {
    time_util::parse_rfc3339(&input.start_at)?;
    time_util::parse_rfc3339(&input.end_at)?;
    events_repo::update(conn, &input)
}

pub fn delete_event(conn: &Connection, id: &str) -> AppResult<()> {
    events_repo::delete(conn, id)
}

/// Expands every event that could intersect `[range_start, range_end]` into
/// its concrete occurrences inside that window. Non-recurring events yield
/// at most one occurrence (their own start/end); recurring ones are walked
/// forward from their original start, stepping by day/week/month, until
/// they pass the range end, `recurrence_until`, or the safety cap.
pub fn list_occurrences(conn: &Connection, range_start: &str, range_end: &str) -> AppResult<Vec<EventOccurrence>> {
    let start_bound = time_util::parse_rfc3339(range_start)?;
    let end_bound = time_util::parse_rfc3339(range_end)?;

    let candidates = events_repo::find_candidates_in_range(conn, range_start, range_end)?;
    let mut occurrences = Vec::new();

    for event in candidates {
        occurrences.extend(expand_event(&event, start_bound, end_bound)?);
    }

    occurrences.sort_by(|a, b| a.occurrence_start.cmp(&b.occurrence_start));
    Ok(occurrences)
}

fn expand_event(
    event: &Event,
    range_start: DateTime<Utc>,
    range_end: DateTime<Utc>,
) -> AppResult<Vec<EventOccurrence>> {
    let original_start = time_util::parse_rfc3339(&event.start_at)?;
    let original_end = time_util::parse_rfc3339(&event.end_at)?;
    let duration = original_end - original_start;

    let until = event
        .recurrence_until
        .as_deref()
        .map(time_util::parse_rfc3339)
        .transpose()?;

    if event.recurrence_rule == RecurrenceRule::None {
        return Ok(overlaps(original_start, original_start + duration, range_start, range_end)
            .then(|| single_occurrence(event, original_start, original_start + duration))
            .into_iter()
            .collect());
    }

    let mut occurrences = Vec::new();
    let mut occurrence_start = original_start;

    for _ in 0..MAX_OCCURRENCES {
        if occurrence_start > range_end {
            break;
        }
        if let Some(until) = until {
            if occurrence_start > until {
                break;
            }
        }

        let occurrence_end = occurrence_start + duration;
        if overlaps(occurrence_start, occurrence_end, range_start, range_end) {
            occurrences.push(single_occurrence(event, occurrence_start, occurrence_end));
        }

        occurrence_start = match event.recurrence_rule {
            RecurrenceRule::Daily => occurrence_start + Duration::days(1),
            RecurrenceRule::Weekly => occurrence_start + Duration::weeks(1),
            RecurrenceRule::Monthly => occurrence_start
                .checked_add_months(Months::new(1))
                .unwrap_or(occurrence_start + Duration::days(30)),
            RecurrenceRule::None => break,
        };
    }

    Ok(occurrences)
}

fn overlaps(a_start: DateTime<Utc>, a_end: DateTime<Utc>, b_start: DateTime<Utc>, b_end: DateTime<Utc>) -> bool {
    a_start <= b_end && a_end >= b_start
}

fn single_occurrence(event: &Event, start: DateTime<Utc>, end: DateTime<Utc>) -> EventOccurrence {
    EventOccurrence {
        event: event.clone(),
        occurrence_start: start.to_rfc3339(),
        occurrence_end: end.to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn event_with(rule: RecurrenceRule, start: &str, end: &str, until: Option<&str>) -> Event {
        Event {
            id: "e1".into(),
            title: "Test".into(),
            description: "".into(),
            start_at: start.into(),
            end_at: end.into(),
            color: "#2b8af7".into(),
            recurrence_rule: rule,
            recurrence_until: until.map(|s| s.to_string()),
            created_at: "".into(),
            updated_at: "".into(),
        }
    }

    #[test]
    fn weekly_recurrence_expands_within_range() {
        let event = event_with(
            RecurrenceRule::Weekly,
            "2026-01-05T08:00:00Z",
            "2026-01-05T09:00:00Z",
            None,
        );
        let range_start = Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap();
        let range_end = Utc.with_ymd_and_hms(2026, 1, 31, 23, 59, 59).unwrap();
        let occurrences = expand_event(&event, range_start, range_end).unwrap();
        // Mondays in Jan 2026 starting 2026-01-05: 05, 12, 19, 26
        assert_eq!(occurrences.len(), 4);
    }

    #[test]
    fn recurrence_until_stops_generation() {
        let event = event_with(
            RecurrenceRule::Daily,
            "2026-01-01T08:00:00Z",
            "2026-01-01T09:00:00Z",
            Some("2026-01-03T10:00:00Z"),
        );
        let range_start = Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap();
        let range_end = Utc.with_ymd_and_hms(2026, 1, 10, 0, 0, 0).unwrap();
        let occurrences = expand_event(&event, range_start, range_end).unwrap();
        assert_eq!(occurrences.len(), 3);
    }

    #[test]
    fn non_recurring_outside_range_yields_nothing() {
        let event = event_with(
            RecurrenceRule::None,
            "2026-02-01T08:00:00Z",
            "2026-02-01T09:00:00Z",
            None,
        );
        let range_start = Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap();
        let range_end = Utc.with_ymd_and_hms(2026, 1, 31, 23, 59, 59).unwrap();
        let occurrences = expand_event(&event, range_start, range_end).unwrap();
        assert!(occurrences.is_empty());
    }
}
