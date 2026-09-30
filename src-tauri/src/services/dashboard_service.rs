use crate::db::repo::dashboard_tabs_repo;
use crate::error::{AppError, AppResult};
use crate::models::dashboard_tab::{DashboardTab, WidgetPlacement};
use rusqlite::Connection;
use std::collections::HashSet;

pub const GRID_COLS: i64 = 12;
pub const GRID_ROWS: i64 = 12;
const MAX_WIDGETS: usize = 40;
const MAX_NAME_LEN: usize = 40;

fn validate_name(name: &str) -> AppResult<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("Dê um nome à guia.".into()));
    }
    if trimmed.chars().count() > MAX_NAME_LEN {
        return Err(AppError::Validation(format!("O nome pode ter até {MAX_NAME_LEN} caracteres.")));
    }
    Ok(trimmed.to_string())
}

/// Rejects layouts that are malformed, fall outside the 12x12 grid, or have
/// overlapping widgets — the layout comes from the UI, but a bad one saved
/// to disk would break the tab on every launch, so it's checked here too.
pub fn validate_layout(layout: &str) -> AppResult<()> {
    let items: Vec<WidgetPlacement> =
        serde_json::from_str(layout).map_err(|_| AppError::Validation("Layout inválido.".into()))?;

    if items.len() > MAX_WIDGETS {
        return Err(AppError::Validation(format!("Uma guia pode ter até {MAX_WIDGETS} widgets.")));
    }

    let mut ids = HashSet::new();
    let mut occupied = HashSet::new();
    for item in &items {
        if item.i.is_empty() || item.widget_type.is_empty() || !ids.insert(item.i.as_str()) {
            return Err(AppError::Validation("Layout inválido: widget sem identificação.".into()));
        }
        let inside = item.x >= 0 && item.y >= 0 && item.w >= 1 && item.h >= 1
            && item.x + item.w <= GRID_COLS && item.y + item.h <= GRID_ROWS;
        if !inside {
            return Err(AppError::Validation("Layout inválido: widget fora da grade.".into()));
        }
        for x in item.x..item.x + item.w {
            for y in item.y..item.y + item.h {
                if !occupied.insert((x, y)) {
                    return Err(AppError::Validation("Layout inválido: widgets sobrepostos.".into()));
                }
            }
        }
    }
    Ok(())
}

pub fn list_tabs(conn: &Connection) -> AppResult<Vec<DashboardTab>> {
    dashboard_tabs_repo::list(conn)
}

pub fn create_tab(conn: &Connection, name: &str, layout: &str) -> AppResult<DashboardTab> {
    let name = validate_name(name)?;
    validate_layout(layout)?;
    dashboard_tabs_repo::create(conn, &name, layout)
}

pub fn update_tab(conn: &Connection, id: &str, name: &str, layout: &str) -> AppResult<DashboardTab> {
    let name = validate_name(name)?;
    validate_layout(layout)?;
    dashboard_tabs_repo::update(conn, id, &name, layout)
}

pub fn delete_tab(conn: &Connection, id: &str) -> AppResult<()> {
    if dashboard_tabs_repo::count(conn)? <= 1 {
        return Err(AppError::Validation("Mantenha pelo menos uma guia.".into()));
    }
    dashboard_tabs_repo::delete(conn, id)
}

pub const HOME_TAB_ID: &str = "home";

/// Same layout the migration seeds: everything in one place.
const HOME_LAYOUT: &str = r#"[{"i":"calendar","type":"calendar","x":0,"y":0,"w":3,"h":7},{"i":"schedule","type":"schedule","x":3,"y":0,"w":6,"h":7},{"i":"focus","type":"focus","x":9,"y":0,"w":3,"h":3},{"i":"daily","type":"daily-tasks","x":9,"y":3,"w":3,"h":4},{"i":"events","type":"events","x":0,"y":7,"w":3,"h":5},{"i":"weekly","type":"weekly-tasks","x":3,"y":7,"w":6,"h":5},{"i":"time","type":"time","x":9,"y":7,"w":3,"h":5}]"#;

/// Brings back the default "Início" tab if it was deleted. If it still
/// exists it is returned untouched, so calling this is always safe.
pub fn restore_home_tab(conn: &Connection) -> AppResult<DashboardTab> {
    match dashboard_tabs_repo::find_by_id(conn, HOME_TAB_ID) {
        Ok(existing) => Ok(existing),
        Err(AppError::NotFound) => dashboard_tabs_repo::create_first_with_id(conn, HOME_TAB_ID, "Início", HOME_LAYOUT),
        Err(other) => Err(other),
    }
}

pub fn reorder_tabs(conn: &Connection, ordered_ids: &[String]) -> AppResult<()> {
    dashboard_tabs_repo::reorder(conn, ordered_ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;

    #[test]
    fn home_tab_is_seeded_with_a_valid_layout() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();
        let tabs = list_tabs(&conn).unwrap();
        assert_eq!(tabs.len(), 1);
        assert_eq!(tabs[0].id, "home");
        validate_layout(&tabs[0].layout).unwrap();
    }

    #[test]
    fn rejects_overlapping_or_out_of_grid_layouts() {
        let overlap = r#"[{"i":"a","type":"calendar","x":0,"y":0,"w":4,"h":4},{"i":"b","type":"events","x":3,"y":3,"w":2,"h":2}]"#;
        assert!(validate_layout(overlap).is_err());
        let outside = r#"[{"i":"a","type":"calendar","x":10,"y":0,"w":4,"h":4}]"#;
        assert!(validate_layout(outside).is_err());
        assert!(validate_layout("not json").is_err());
        assert!(validate_layout("[]").is_ok());
    }

    #[test]
    fn a_deleted_home_tab_can_be_restored_at_the_front() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();
        let extra = create_tab(&conn, "Estudos", "[]").unwrap();
        delete_tab(&conn, "home").unwrap();
        assert_eq!(list_tabs(&conn).unwrap().len(), 1);

        let home = restore_home_tab(&conn).unwrap();
        validate_layout(&home.layout).unwrap();
        let tabs = list_tabs(&conn).unwrap();
        assert_eq!(tabs.iter().map(|t| t.id.as_str()).collect::<Vec<_>>(), vec!["home", extra.id.as_str()]);

        // Restoring again changes nothing.
        restore_home_tab(&conn).unwrap();
        assert_eq!(list_tabs(&conn).unwrap().len(), 2);
    }

    #[test]
    fn the_last_tab_cannot_be_deleted() {
        let db = Db::open_in_memory().unwrap();
        let conn = db.lock().unwrap();
        assert!(delete_tab(&conn, "home").is_err());
        let extra = create_tab(&conn, "Estudos", "[]").unwrap();
        delete_tab(&conn, &extra.id).unwrap();
    }
}
