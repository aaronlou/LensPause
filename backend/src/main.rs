use std::sync::Arc;

use axum::{
    extract::DefaultBodyLimit,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::{info, warn};

mod application;
mod domain;
mod infrastructure;
mod presentation;

use application::use_cases::{
    fetch_new_photos::FetchNewPhotosUseCase, get_today_photo::GetTodayPhotoUseCase,
    list_photo_pool::ListPhotoPoolUseCase,
};
use infrastructure::{
    db::sqlite::SqliteDailyPhotoRepository,
    http::unsplash_client::UnsplashClient,
};
use presentation::routes::{health, photos};

/// 全局应用状态（依赖注入容器）
pub struct AppState {
    pub repository: SqliteDailyPhotoRepository,
    pub get_today_photo: GetTodayPhotoUseCase<SqliteDailyPhotoRepository>,
    pub fetch_photos: FetchNewPhotosUseCase<SqliteDailyPhotoRepository>,
    pub list_pool: ListPhotoPoolUseCase<SqliteDailyPhotoRepository>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // 配置
    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "lenspause.db".to_string());
    let unsplash_client_id = std::env::var("UNSPLASH_CLIENT_ID").unwrap_or_else(|_| {
        warn!("UNSPLASH_CLIENT_ID not set; photo fetching will be unavailable");
        String::new()
    });

    // 基础设施层
    let repository = SqliteDailyPhotoRepository::new(&db_path)
        .expect("Failed to initialize database");

    let unsplash_client = UnsplashClient::new(unsplash_client_id);

    // 应用层用例
    let get_today_photo = GetTodayPhotoUseCase::new(repository.clone());
    let fetch_photos = FetchNewPhotosUseCase::new(repository.clone(), unsplash_client);
    let list_pool = ListPhotoPoolUseCase::new(repository.clone());

    let state = Arc::new(AppState {
        repository: repository.clone(),
        get_today_photo,
        fetch_photos,
        list_pool,
    });

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/photos/today", get(photos::today_photo))
        .route("/api/photos", get(photos::list_photos))
        .route("/api/photos/fetch", post(photos::fetch_photos))
        .route("/api/health", get(health::health_check))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024))
        .with_state(state)
        .fallback(|req: axum::http::Request<axum::body::Body>| async move {
            tracing::warn!("FALLBACK: {} {} matched no route", req.method(), req.uri());
            (StatusCode::NOT_FOUND, "no matching route").into_response()
        });

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(3001);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .expect("Failed to bind to port");

    info!("🚀 LensPause backend running on http://0.0.0.0:{}", port);
    axum::serve(listener, app).await.unwrap();
}
