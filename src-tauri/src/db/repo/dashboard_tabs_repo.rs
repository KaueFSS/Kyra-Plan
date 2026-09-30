use crate::error::{AppError, AppResult};
use crate::models::dashboard_tab::DashboardTab;
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn row_to_tab(row: &Row) -> rusqlite::Result<DashboardTab> {
    Ok(DashboardTab {
        id: row.get("id")?,
        name: row.get("name")?,
        position: row.get("position")?,
        layout: row.get("layout")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<DashboardTab>> {
    let mut stmt = conn.prepare("SELECT * FROM dashboard_tabs ORDER BY position, created_at")?;
    let tabs = stmt.query_map([], row_to_tab)?.collect::<Result<Vec<_>, _>>()?;
    Ok(tabs)
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<DashboardTab> {
    conn.query_row("SELECT * FROM dashboard_tabs WHERE id = ?1", params![id], row_to_tab)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            other => AppError::Database(other),
        })
}

pub fn create(conn: &Connection, name: &str, layout: &str) -> AppResult<DashboardTab> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO dashboard_tabs (id, name, layout, position)
         VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(position), -1) + 1 FROM dashboard_tabs))",
        params![id, name, layout],
    )?;
    find_by_id(conn, &id)
}

/// Inserts a tab with a fixed id at the very front, pushing the others back.
pub fn create_first_with_id(conn: &Connection, id: &str, name: &str, layout: &str) -> AppResult<DashboardTab> {
    let tx = conn.unchecked_transaction()?;
    tx.execute("UPDATE dashboard_tabs SET position = position + 1", [])?;
    tx.execute(
        "INSERT INTO dashboard_tabs (id, name, layout, position) VALUES (?1, ?2, ?3, 0)",
        params![id, name, layout],
    )?;
    tx.commit()?;
    find_by_id(conn, id)
}

pub fn update(conn: &Connection, id: &str, name: &str, layout: &str) -> AppResult<DashboardTab> {
    let affected = conn.execute(
        "UPDATE dashboard_tabs SET name = ?1, layout = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![name, layout, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    find_by_id(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM dashboard_tabs WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn count(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row("SELECT COUNT(*) FROM dashboard_tabs", [], |r| r.get(0))?)
}

pub fn reorder(conn: &Connection, ordered_ids: &[String]) -> AppResult<()> {
    let tx = conn.unchecked_transaction()?;
    for (position, id) in ordered_ids.iter().enumerate() {
        tx.execute("UPDATE dashboard_tabs SET position = ?1 WHERE id = ?2", params![position as i64, id])?;
    }
    tx.commit()?;
    Ok(())
}
