use crate::domain::{
    daily_photo::DailyPhoto,
    errors::DomainError,
    repository::DailyPhotoRepository,
    services::photo_selector::PhotoSelector,
};

/// 获取今日照片用例
/// 如果没有已分配的今日照片，则从照片池中选择并分配
pub struct GetTodayPhotoUseCase<R: DailyPhotoRepository> {
    repository: R,
    selector: PhotoSelector,
}

impl<R: DailyPhotoRepository> GetTodayPhotoUseCase<R> {
    pub fn new(repository: R) -> Self {
        Self {
            repository,
            selector: PhotoSelector::new(),
        }
    }

    pub async fn execute(&self) -> Result<DailyPhoto, DomainError> {
        let today = self.selector.today();

        // 先检查今天是否已有分配
        if let Some(photo) = self.repository.find_by_date(today).await? {
            return Ok(photo);
        }

        // 从照片池中选择
        let pool = self.repository.list_pool().await?;
        if pool.is_empty() {
            return Err(DomainError::EmptyPool);
        }

        let mut photo = self.selector.select_for_date(&pool, today)?;
        photo.assign_to_date(today)?;
        self.repository.save(&photo).await?;

        Ok(photo)
    }
}
