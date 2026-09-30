use serde::{Serialize, Serializer};

/// A single error type for the whole backend. Every command returns
/// `Result<T, AppError>`; the frontend only ever sees `err.message`, a
/// user-safe string, while the technical detail is logged via `log::error!`
/// at the point the error is constructed (see `db.rs` helpers and services).
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Não foi possível encontrar o item solicitado.")]
    NotFound,

    #[error("{0}")]
    Validation(String),

    #[error("Erro de banco de dados: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Fuso horário inválido: {0}")]
    InvalidTimezone(String),

    #[error("Data ou horário inválido: {0}")]
    InvalidDateTime(String),

    #[error("Erro inesperado: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
