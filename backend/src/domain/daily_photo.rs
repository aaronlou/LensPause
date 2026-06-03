use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

use super::{
    errors::DomainError,
    exif_info::ExifInfo,
    focus_params::FocusParams,
    photo_id::PhotoId,
    photo_source::PhotoSource,
};

/// 每日照片聚合根
/// 封装照片的核心业务行为和不变量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyPhoto {
    pub id: PhotoId,
    pub title: String,
    pub photographer: String,
    pub photographer_link: String,
    pub image_url: String,
    pub image_thumb_url: String,
    pub exif: ExifInfo,
    pub quote: String,
    pub focus_params: FocusParams,
    pub source: PhotoSource,
    pub fetched_at: DateTime<Utc>,
    pub assigned_date: Option<NaiveDate>,
}

impl DailyPhoto {
    pub fn new(
        id: PhotoId,
        title: String,
        photographer: String,
        photographer_link: String,
        image_url: String,
        image_thumb_url: String,
        exif: ExifInfo,
        quote: String,
        focus_params: FocusParams,
        source: PhotoSource,
    ) -> Self {
        Self {
            id,
            title,
            photographer,
            photographer_link,
            image_url,
            image_thumb_url,
            exif,
            quote,
            focus_params,
            source,
            fetched_at: Utc::now(),
            assigned_date: None,
        }
    }

    /// 将照片分配为某日的"今日照片"
    pub fn assign_to_date(&mut self, date: NaiveDate) -> Result<(), DomainError> {
        self.assigned_date = Some(date);
        Ok(())
    }

    /// 检查照片是否已分配
    pub fn is_assigned(&self) -> bool {
        self.assigned_date.is_some()
    }
}
