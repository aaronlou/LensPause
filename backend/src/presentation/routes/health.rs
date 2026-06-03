use axum::response::IntoResponse;
use serde_json::json;

pub async fn health_check() -> impl IntoResponse {
    axum::Json(json!({
        "status": "ok",
        "service": "lenspause-backend",
    }))
}
