use crate::error::{AppError, AppResult};
use crate::models::timer_session::TimerStatus;
use chrono::{DateTime, Datelike, NaiveDate, NaiveTime, TimeZone, Timelike, Utc};
use chrono_tz::Tz;
use std::str::FromStr;

pub const DATE_FMT: &str = "%Y-%m-%d";

pub fn parse_tz(tz_name: &str) -> AppResult<Tz> {
    Tz::from_str(tz_name).map_err(|_| AppError::InvalidTimezone(tz_name.to_string()))
}

pub fn parse_hhmm(value: &str) -> AppResult<NaiveTime> {
    NaiveTime::parse_from_str(value, "%H:%M")
        .map_err(|_| AppError::InvalidDateTime(format!("horário inválido: {value}")))
}

pub fn parse_date(value: &str) -> AppResult<NaiveDate> {
    NaiveDate::parse_from_str(value, DATE_FMT)
        .map_err(|_| AppError::InvalidDateTime(format!("data inválida: {value}")))
}

/// Monday = 0 .. Sunday = 6, matching the convention used throughout the
/// domain models (`recurrence_days`, `day_of_week`).
pub fn weekday_index(date: NaiveDate) -> u8 {
    date.weekday().num_days_from_monday() as u8
}

/// The "logical day" a daily/weekly task cycle belongs to right now, given
/// a configurable reset time and IANA timezone. Before the reset time, the
/// cycle is still considered to be the previous calendar day in that zone —
/// this is the only correct way to support a reset time other than
/// midnight without silently rolling over at the wrong instant across DST
/// or when the reset time itself sits in a UTC offset different from the
/// device's local time.
pub fn cycle_date(now_utc: DateTime<Utc>, reset_time: &str, tz_name: &str) -> AppResult<NaiveDate> {
    let tz = parse_tz(tz_name)?;
    let reset = parse_hhmm(reset_time)?;
    let local = now_utc.with_timezone(&tz);

    if local.time() >= reset {
        Ok(local.date_naive())
    } else {
        Ok(local.date_naive() - chrono::Duration::days(1))
    }
}

pub fn cycle_date_string(now_utc: DateTime<Utc>, reset_time: &str, tz_name: &str) -> AppResult<String> {
    Ok(cycle_date(now_utc, reset_time, tz_name)?.format(DATE_FMT).to_string())
}

/// A weekly task is due on `cycle_date` when its day list is empty (every
/// day is treated as "not restricted") or contains that date's weekday.
pub fn is_weekly_due(recurrence_days: &[u8], cycle_date: NaiveDate) -> bool {
    recurrence_days.is_empty() || recurrence_days.contains(&weekday_index(cycle_date))
}

/// Elapsed time for a timestamp-based timer/task session. Only the time
/// while `status == running` and `started_at` is set counts towards the
/// live segment; a paused/idle/completed session simply reports the
/// already-accumulated `base_elapsed_seconds`. This must be recomputed from
/// timestamps on every read rather than relying on a ticking interval, so
/// that a minimized window, a slow event loop, or the app being restarted
/// mid-run cannot desynchronize the reported time from real elapsed time.
pub fn elapsed_seconds_now(
    status: TimerStatus,
    started_at: Option<DateTime<Utc>>,
    base_elapsed_seconds: i64,
    now_utc: DateTime<Utc>,
) -> i64 {
    match (status, started_at) {
        (TimerStatus::Running, Some(started)) => {
            let live = (now_utc - started).num_seconds().max(0);
            base_elapsed_seconds + live
        }
        _ => base_elapsed_seconds,
    }
}

pub fn parse_rfc3339(value: &str) -> AppResult<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|_| AppError::InvalidDateTime(format!("timestamp inválido: {value}")))
}

/// SQLite's `datetime('now')` produces `"YYYY-MM-DD HH:MM:SS"` in UTC (no
/// offset). This parses that shape, falling back to RFC3339 in case the
/// value came from elsewhere (e.g. an event's `start_at`).
pub fn parse_sqlite_datetime(value: &str) -> AppResult<DateTime<Utc>> {
    if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S") {
        return Ok(Utc.from_utc_datetime(&naive));
    }
    parse_rfc3339(value)
}

/// Whether an alarm configured for `alarm_time` with `days` (empty = every
/// day) should fire "now" (truncated to the minute) given the caller's own
/// local wall-clock time `now_local`, and that it last fired on
/// `last_triggered_date` (if any). `now_local` is a plain `NaiveDateTime`
/// rather than a zoned `DateTime<Tz>` because an alarm is meant in whatever
/// timezone the device itself is currently in (like a phone alarm clock),
/// which `chrono::Local` already resolves correctly across DST. Guarding on
/// the last-triggered date — rather than only matching the minute —
/// prevents the same alarm from firing more than once inside its trigger
/// minute when the scheduler tick interval doesn't divide evenly into 60
/// seconds.
pub fn alarm_is_due(
    alarm_time: NaiveTime,
    days: &[u8],
    last_triggered_date: Option<NaiveDate>,
    now_local: chrono::NaiveDateTime,
) -> bool {
    let today = now_local.date();
    if last_triggered_date == Some(today) {
        return false;
    }

    let matches_day = days.is_empty() || days.contains(&weekday_index(today));
    if !matches_day {
        return false;
    }

    now_local.time().hour() == alarm_time.hour() && now_local.time().minute() == alarm_time.minute()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn utc(y: i32, m: u32, d: u32, h: u32, mi: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, h, mi, 0).unwrap()
    }

    #[test]
    fn cycle_date_before_reset_rolls_back_a_day() {
        // 03:00 in America/Sao_Paulo (UTC-3), reset at 04:00 local.
        let now = utc(2026, 1, 15, 6, 0); // 03:00 local
        let date = cycle_date(now, "04:00", "America/Sao_Paulo").unwrap();
        assert_eq!(date, NaiveDate::from_ymd_opt(2026, 1, 14).unwrap());
    }

    #[test]
    fn cycle_date_after_reset_uses_current_day() {
        let now = utc(2026, 1, 15, 8, 0); // 05:00 local, after 04:00 reset
        let date = cycle_date(now, "04:00", "America/Sao_Paulo").unwrap();
        assert_eq!(date, NaiveDate::from_ymd_opt(2026, 1, 15).unwrap());
    }

    #[test]
    fn cycle_date_midnight_reset_matches_calendar_day() {
        let now = utc(2026, 1, 15, 23, 30); // 20:30 local (UTC-3)
        let date = cycle_date(now, "00:00", "America/Sao_Paulo").unwrap();
        assert_eq!(date, NaiveDate::from_ymd_opt(2026, 1, 15).unwrap());
    }

    #[test]
    fn invalid_timezone_is_rejected() {
        let now = Utc::now();
        assert!(cycle_date(now, "00:00", "Not/AZone").is_err());
    }

    #[test]
    fn weekly_task_due_on_matching_weekday() {
        // 2026-01-15 is a Thursday -> index 3
        let date = NaiveDate::from_ymd_opt(2026, 1, 15).unwrap();
        assert_eq!(weekday_index(date), 3);
        assert!(is_weekly_due(&[3], date));
        assert!(!is_weekly_due(&[0, 1], date));
        assert!(is_weekly_due(&[], date));
    }

    #[test]
    fn elapsed_seconds_running_adds_live_segment() {
        let started = utc(2026, 1, 15, 10, 0, );
        let now = utc(2026, 1, 15, 10, 5);
        let elapsed = elapsed_seconds_now(TimerStatus::Running, Some(started), 120, now);
        assert_eq!(elapsed, 120 + 300);
    }

    #[test]
    fn elapsed_seconds_paused_ignores_clock() {
        let started = utc(2026, 1, 15, 10, 0);
        let now = utc(2026, 1, 15, 12, 0);
        let elapsed = elapsed_seconds_now(TimerStatus::Paused, Some(started), 90, now);
        assert_eq!(elapsed, 90);
    }

    #[test]
    fn alarm_fires_exactly_on_matching_minute_and_day() {
        // Thursday 2026-01-15, 06:30.
        let now = NaiveDate::from_ymd_opt(2026, 1, 15)
            .unwrap()
            .and_hms_opt(6, 30, 0)
            .unwrap();
        let alarm_time = parse_hhmm("06:30").unwrap();
        assert!(alarm_is_due(alarm_time, &[3], None, now));
        assert!(!alarm_is_due(alarm_time, &[0, 1], None, now));
    }

    #[test]
    fn alarm_does_not_refire_same_day() {
        let now = NaiveDate::from_ymd_opt(2026, 1, 15)
            .unwrap()
            .and_hms_opt(6, 30, 0)
            .unwrap();
        let alarm_time = parse_hhmm("06:30").unwrap();
        assert!(!alarm_is_due(alarm_time, &[], Some(now.date()), now));
    }
}
