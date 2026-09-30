mod commands;
mod db;
mod error;
mod models;
mod services;

use db::Db;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

const DB_FILE: &str = "sentutility.sqlite3";

/// Folder and file the app used while it was still called FocusFlow.
const LEGACY_IDENTIFIER: &str = "com.focusflow.app";
const LEGACY_DB_FILE: &str = "focusflow.sqlite3";

/// One-time move of the data from the pre-rename folder, so nobody loses
/// their tasks when updating. Copies (never deletes) and only when the new
/// database doesn't exist yet; SQLite's -wal/-shm sidecars go along with it.
fn migrate_legacy_data(app_dir: &std::path::Path, db_path: &std::path::Path) {
    if db_path.exists() {
        return;
    }
    let Some(legacy_db) = app_dir.parent().map(|p| p.join(LEGACY_IDENTIFIER).join(LEGACY_DB_FILE)) else {
        return;
    };
    if !legacy_db.exists() {
        return;
    }
    for suffix in ["", "-wal", "-shm"] {
        let from = legacy_db.with_file_name(format!("{LEGACY_DB_FILE}{suffix}"));
        let to = db_path.with_file_name(format!("{DB_FILE}{suffix}"));
        if from.exists() {
            match std::fs::copy(&from, &to) {
                Ok(_) => log::info!("Dados migrados de {} para {}", from.display(), to.display()),
                Err(err) => log::warn!("Não foi possível migrar {}: {err}", from.display()),
            }
        }
    }
}

fn init_database(app: &tauri::App) -> Db {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("não foi possível resolver o diretório de dados do aplicativo");

    std::fs::create_dir_all(&app_dir).expect("não foi possível criar o diretório de dados do aplicativo");

    let db_path = app_dir.join(DB_FILE);
    migrate_legacy_data(&app_dir, &db_path);
    log::info!("Abrindo banco de dados em {}", db_path.display());

    Db::open(&db_path).expect("falha ao inicializar o banco de dados")
}

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Mostrar SentUtility", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let db = init_database(app);
            app.manage(db);
            setup_tray(app.handle())?;
            services::scheduler::spawn(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let db = window.state::<Db>();
                let minimize_to_tray = db
                    .lock()
                    .ok()
                    .and_then(|conn| db::repo::settings_repo::get(&conn).ok())
                    .map(|s| s.minimize_to_tray)
                    .unwrap_or(true);

                if minimize_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::reorder_tasks,
            commands::tasks::list_daily_tasks,
            commands::tasks::list_weekly_tasks,
            commands::tasks::list_single_tasks,
            commands::tasks::list_timed_tasks,
            commands::tasks::toggle_task_completion,
            commands::tasks::start_timed_task,
            commands::tasks::pause_timed_task,
            commands::tasks::resume_timed_task,
            commands::tasks::restart_timed_task,
            commands::tasks::cancel_timed_task,
            commands::tasks::check_timed_task,
            commands::events::create_event,
            commands::events::update_event,
            commands::events::delete_event,
            commands::events::list_event_occurrences,
            commands::alarms::create_alarm,
            commands::alarms::update_alarm,
            commands::alarms::set_alarm_enabled,
            commands::alarms::delete_alarm,
            commands::alarms::list_alarms,
            commands::weekly_schedule::create_schedule_block,
            commands::weekly_schedule::update_schedule_block,
            commands::weekly_schedule::delete_schedule_block,
            commands::weekly_schedule::list_schedule_blocks,
            commands::world_clocks::create_world_clock,
            commands::world_clocks::delete_world_clock,
            commands::world_clocks::list_world_clocks,
            commands::world_clocks::reorder_world_clocks,
            commands::world_clocks::list_timezones,
            commands::timers::start_timer,
            commands::timers::pause_timer,
            commands::timers::resume_timer,
            commands::timers::restart_timer,
            commands::timers::cancel_timer,
            commands::timers::check_timer,
            commands::timers::add_timer_lap,
            commands::timers::get_active_timer,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::search::search,
            commands::dashboard::list_dashboard_tabs,
            commands::dashboard::create_dashboard_tab,
            commands::dashboard::update_dashboard_tab,
            commands::dashboard::delete_dashboard_tab,
            commands::dashboard::reorder_dashboard_tabs,
            commands::dashboard::restore_home_tab,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
