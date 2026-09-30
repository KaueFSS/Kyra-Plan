use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

/// Single entry point for everything that "goes off": OS notifications and
/// the in-app ring (sound + full-screen prompt, emitted to the frontend as a
/// `ring` event). Both the scheduler and commands call these, so a finished
/// timer rings exactly the same way no matter which side noticed it first.
/// Failures are logged and swallowed: a missed notification must never crash
/// a background tick or a command.
pub fn notify(app: &AppHandle, title: &str, body: &str) {
    let result = app.notification().builder().title(title).body(body).show();

    if let Err(err) = result {
        log::error!("Falha ao exibir notificação ({title}): {err}");
    }
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RingKind {
    Alarm,
    Timer,
    Task,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RingPayload {
    pub kind: RingKind,
    pub title: String,
    pub subtitle: String,
}

/// Like a phone clock: bring the window forward (even from the tray) and
/// tell the UI to play the sound and show the stop/snooze prompt.
fn ring(app: &AppHandle, payload: RingPayload) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    if let Err(err) = app.emit("ring", payload) {
        log::error!("Falha ao avisar a interface sobre o alarme: {err}");
    }
}

pub fn alarm_fired(app: &AppHandle, label: &str, time: &str, notify_os: bool) {
    let title = if label.is_empty() { "Alarme".to_string() } else { label.to_string() };
    if notify_os {
        notify(app, "SentUtility — Alarme", &format!("{title} · {time}"));
    }
    ring(app, RingPayload { kind: RingKind::Alarm, title, subtitle: time.to_string() });
}

pub fn timer_finished(app: &AppHandle, label: &str) {
    let title = if label.is_empty() { "Timer concluído".to_string() } else { label.to_string() };
    notify(app, "SentUtility", "Seu timer terminou.");
    ring(app, RingPayload { kind: RingKind::Timer, title, subtitle: "O tempo acabou".into() });
}

pub fn task_finished(app: &AppHandle, task_title: &str) {
    notify(app, "SentUtility", &format!("\"{task_title}\" concluída!"));
    ring(
        app,
        RingPayload { kind: RingKind::Task, title: task_title.to_string(), subtitle: "Tarefa concluída — tempo cumprido".into() },
    );
}

pub fn notify_event_upcoming(app: &AppHandle, event_title: &str, minutes_until: i64) {
    notify(
        app,
        "SentUtility",
        &format!("\"{event_title}\" começa em {minutes_until} minuto(s)."),
    );
}
