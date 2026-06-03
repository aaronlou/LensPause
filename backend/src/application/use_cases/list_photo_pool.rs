use crate::domain::{errors::DomainError, repository::DailyPhotoRepository};

/// 列出照片池用例
pub struct ListPhotoPoolUseCase<R: DailyPhotoRepository> {
    repository: R,
}

impl<R: DailyPhotoRepository> ListPhotoPoolUseCase<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub async fn execute(&self) -> Result<Vec<crate::domain::daily_photo::DailyPhoto>, DomainError> {
        self.repository.list_pool().await
    }
}
