use serde::{Deserialize, Serialize};

use crate::domain::{
    daily_photo::DailyPhoto,
    exif_info::ExifInfo,
    focus_params::FocusParams,
};

/// 今日照片响应 DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodayPhotoDto {
    pub id: String,
    pub title: String,
    pub photographer: String,
    pub photographer_link: String,
    pub image_url: String,
    pub image_thumb_url: String,
    pub exif: ExifInfo,
    pub quote: String,
    pub focus_params: FocusParams,
    pub assigned_date: Option<String>,
}

impl From<DailyPhoto> for TodayPhotoDto {
    fn from(photo: DailyPhoto) -> Self {
        Self {
            id: photo.id.as_str().to_string(),
            title: photo.title,
            photographer: photo.photographer,
            photographer_link: photo.photographer_link,
            image_url: photo.image_url,
            image_thumb_url: photo.image_thumb_url,
            exif: photo.exif,
            quote: photo.quote,
            focus_params: photo.focus_params,
            assigned_date: photo.assigned_date.map(|d| d.to_string()),
        }
    }
}

/// 照片池列表项 DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoPoolItemDto {
    pub id: String,
    pub title: String,
    pub photographer: String,
    pub photographer_link: String,
    pub image_url: String,
    pub image_thumb_url: String,
    pub exif: ExifInfo,
    pub quote: String,
    pub focus_params: FocusParams,
    pub assigned_date: Option<String>,
}

impl From<DailyPhoto> for PhotoPoolItemDto {
    fn from(photo: DailyPhoto) -> Self {
        Self {
            id: photo.id.as_str().to_string(),
            title: photo.title,
            photographer: photo.photographer,
            photographer_link: photo.photographer_link,
            image_url: photo.image_url,
            image_thumb_url: photo.image_thumb_url,
            exif: photo.exif,
            quote: photo.quote,
            focus_params: photo.focus_params,
            assigned_date: photo.assigned_date.map(|d| d.to_string()),
        }
    }
}

/// 抓取请求 DTO
#[derive(Debug, Clone, Deserialize)]
pub struct FetchPhotosRequest {
    #[serde(default = "default_count")]
    pub count: usize,
}

fn default_count() -> usize {
    5
}
