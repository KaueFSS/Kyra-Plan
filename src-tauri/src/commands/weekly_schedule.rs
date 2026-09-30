use crate::db::repo::weekly_schedule_repo;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::weekly_schedule::{
    CreateWeeklyScheduleBlockInput, UpdateWeeklyScheduleBlockInput, WeeklyScheduleBlock,
};
use crate::services::time_util;
use tauri::State;

fn validate_block(day_of_week: u8, start_time: &str, end_time: &str, title: &str) -> AppResult<()> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("O título do bloco é obrigatório.".into()));
    }
    if day_of_week > 6 {
        return Err(AppError::Validation("Dia da semana inválido.".into()));
    }
    let start = time_util::parse_hhmm(start_time)?;
    let end = time_util::parse_hhmm(end_time)?;
    if end <= start {
        return Err(AppError::Validation("O horário final deve ser após o inicial.".into()));
    }
    Ok(())
}

#[tauri::command]
pub fn create_schedule_block(db: State<Db>, input: CreateWeeklyScheduleBlockInput) -> AppResult<WeeklyScheduleBlock> {
    validate_block(input.day_of_week, &input.start_time, &input.end_time, &input.title)?;
    let conn = db.lock()?;
    weekly_schedule_repo::create(&conn, &input)
}

#[tauri::command]
pub fn update_schedule_block(db: State<Db>, input: UpdateWeeklyScheduleBlockInput) -> AppResult<WeeklyScheduleBlock> {
    validate_block(input.day_of_week, &input.start_time, &input.end_time, &input.title)?;
    let conn = db.lock()?;
    weekly_schedule_repo::update(&conn, &input)
}

#[tauri::command]
pub fn delete_schedule_block(db: State<Db>, id: String) -> AppResult<()> {
    let conn = db.lock()?;
    weekly_schedule_repo::delete(&conn, &id)
}

#[tauri::command]
pub fn list_schedule_blocks(db: State<Db>) -> AppResult<Vec<WeeklyScheduleBlock>> {
    let conn = db.lock()?;
    weekly_schedule_repo::list_all(&conn)
}
