pub mod migrations;
pub mod repo;

use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use std::path::Path;
use std::sync::{Mutex, MutexGuard};

/// Shared database handle stored as Tauri managed state.
/// A single connection guarded by a mutex is sufficient for a desktop
/// app with no concurrent writers; SQLite itself is not designed for
/// heavy multi-writer concurrency, and WAL mode keeps reads unblocked
/// while a write is in flight.
pub struct Db(pub Mutex<Connection>);

impl Db {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", true)?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        migrations::run(&conn)?;
        Ok(Self(Mutex::new(conn)))
    }

    /// Locks the connection for a command/service call. A poisoned mutex
    /// (only possible if an earlier call panicked while holding the lock)
    /// is surfaced as a normal `AppError` instead of unwinding the whole
    /// process, since a single bad request should never take down the app.
    pub fn lock(&self) -> AppResult<MutexGuard<'_, Connection>> {
        self.0
            .lock()
            .map_err(|_| AppError::Internal("Banco de dados indisponível.".into()))
    }

    #[cfg(test)]
    pub fn open_in_memory() -> rusqlite::Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", true)?;
        migrations::run(&conn)?;
        Ok(Self(Mutex::new(conn)))
    }
}
