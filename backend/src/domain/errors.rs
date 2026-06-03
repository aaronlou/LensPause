/// 领域层错误枚举
/// 所有基础设施错误都映射到这里，保持领域纯净
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Photo not found: {0}")]
    NotFound(String),

    #[error("Photo pool is empty")]
    EmptyPool,

    #[error("Unsplash API unavailable: {0}")]
    UnsplashUnavailable(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
}
