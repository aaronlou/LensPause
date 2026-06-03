use async_trait::async_trait;
use chrono::NaiveDate;

use super::{daily_photo::DailyPhoto, errors::DomainError, photo_id::PhotoId};

/// 每日照片仓库接口
#[async_trait]
pub trait DailyPhotoRepository: Send + Sync {
    async fn save(&self, photo: &DailyPhoto) -> Result<(), DomainError>;
    async fn find_by_id(&self, id: &PhotoId) -> Result<Option<DailyPhoto>, DomainError>;
    async fn find_by_date(&self, date: NaiveDate) -> Result<Option<DailyPhoto>, DomainError>;
    async fn find_today(&self) -> Result<Option<DailyPhoto>, DomainError>;
    async fn list_pool(&self) -> Result<Vec<DailyPhoto>, DomainError>;
    async fn count_pool(&self) -> Result<usize, DomainError>;
}
