use crate::db::repo::{task_lists_repo, tasks_repo};
use crate::error::{AppError, AppResult};
use crate::models::task::{Task, TaskType};
use crate::models::task_list::TaskList;
use rusqlite::Connection;

const MAX_NAME_LEN: usize = 40;

fn validate(name: &str, color: &str) -> AppResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("Dê um nome à lista.".into()));
    }
    if name.chars().count() > MAX_NAME_LEN {
        return Err(AppError::Validation(format!("O nome pode ter até {MAX_NAME_LEN} caracteres.")));
    }
    let hex = color.len() == 7 && color.starts_with('#') && color[1..].chars().all(|c| c.is_ascii_hexdigit());
    if !hex {
        return Err(AppError::Validation("Cor inválida.".into()));
    }
    Ok(name.to_string())
}

pub fn list(conn: &Connection) -> AppResult<Vec<TaskList>> {
    task_lists_repo::list(conn)
}

pub fn create(conn: &Connection, name: &str, color: &str) -> AppResult<TaskList> {
    let name = validate(name, color)?;
    task_lists_repo::create(conn, &name, color)
}

pub fn update(conn: &Connection, id: &str, name: &str, color: &str) -> AppResult<TaskList> {
    let name = validate(name, color)?;
    task_lists_repo::update(conn, id, &name, color)
}

/// Removes a list together with its tasks; the last list always stays.
pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    if task_lists_repo::count(conn)? <= 1 {
        return Err(AppError::Validation("Mantenha pelo menos uma lista.".into()));
    }
    task_lists_repo::delete(conn, id)
}

/// Moves a one-off task to another list (drag-and-drop between widgets).
pub fn move_task(conn: &Connection, task_id: &str, list_id: &str) -> AppResult<Task> {
    task_lists_repo::find_by_id(conn, list_id)?;
    let task = tasks_repo::find_by_id(conn, task_id)?;
    if task.task_type != TaskType::Single {
        return Err(AppError::Validation("Só tarefas avulsas ficam em listas.".into()));
    }
    tasks_repo::set_list(conn, task_id, list_id)?;
    tasks_repo::find_by_id(conn, task_id)
}
