use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde_json::json;

use crate::domain::errors::DomainError;

/// API 层错误类型
/// 将领域错误映射为 HTTP 响应
#[derive(Debug)]
pub struct ApiError(DomainError);

impl From<DomainError> for ApiError {
    fn from(err: DomainError) -> Self {
        Self(err)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self.0 {
            DomainError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            DomainError::EmptyPool => (
                StatusCode::SERVICE_UNAVAILABLE,
                "Photo pool is empty. Please fetch some photos first.".to_string(),
            ),
            DomainError::UnsplashUnavailable(msg) => {
                (StatusCode::BAD_GATEWAY, format!("Unsplash API error: {}", msg))
            }
            DomainError::DatabaseError(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", msg))
            }
            DomainError::InvalidParameter(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
        };

        let body = Json(json!({
            "error": message,
        }));

        (status, body).into_response()
    }
}
