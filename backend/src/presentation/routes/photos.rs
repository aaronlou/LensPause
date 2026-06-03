use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::{IntoResponse, Json},
};
use serde::Deserialize;
use tracing::info;

use crate::{
    application::dto::{PhotoPoolItemDto, TodayPhotoDto},
    presentation::error::ApiError,
    AppState,
};

/// GET /api/photos/today
pub async fn today_photo(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, ApiError> {
    info!("today_photo handler called");
    let photo = state.get_today_photo.execute().await?;
    info!("today_photo handler succeeded: {}", photo.title);
    Ok(Json(TodayPhotoDto::from(photo)))
}

/// GET /api/photos
pub async fn list_photos(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, ApiError> {
    info!("list_photos handler called");
    let photos = state.list_pool.execute().await?;
    let dtos: Vec<PhotoPoolItemDto> = photos.into_iter().map(PhotoPoolItemDto::from).collect();
    Ok(Json(dtos))
}

/// POST /api/photos/fetch
#[derive(Debug, Deserialize)]
pub struct FetchQuery {
    #[serde(default = "default_count")]
    count: usize,
}

fn default_count() -> usize {
    5
}

pub async fn fetch_photos(
    State(state): State<Arc<AppState>>,
    Query(query): Query<FetchQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let count = query.count.min(20); // 限制最大 20 张
    info!("fetch_photos handler called, count={}", count);
    let fetched = state.fetch_photos.execute(count).await?;
    info!("fetch_photos handler succeeded, fetched {} photos", fetched);
    Ok(Json(serde_json::json!({
        "fetched": fetched,
    })))
}
