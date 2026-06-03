use crate::domain::{
    errors::DomainError, repository::DailyPhotoRepository, services::photo_curator::PhotoCurator,
};
use crate::infrastructure::http::unsplash_client::UnsplashClient;

/// 从 Unsplash 抓取新照片用例
pub struct FetchNewPhotosUseCase<R: DailyPhotoRepository> {
    repository: R,
    unsplash: UnsplashClient,
    curator: PhotoCurator,
}

impl<R: DailyPhotoRepository> FetchNewPhotosUseCase<R> {
    pub fn new(repository: R, unsplash: UnsplashClient) -> Self {
        Self {
            repository,
            unsplash,
            curator: PhotoCurator::new(),
        }
    }

    pub async fn execute(&self, count: usize) -> Result<usize, DomainError> {
        let mut fetched = 0;

        for _ in 0..count {
            match self.unsplash.fetch_random().await {
                Ok(raw) => {
                    let photo = self.curator.curate(
                        raw.id,
                        raw.title,
                        raw.photographer,
                        raw.photographer_link,
                        raw.photo_page_url,
                        raw.display_url,
                        raw.thumb_url,
                    )?;

                    if let Err(e) = self.repository.save(&photo).await {
                        tracing::warn!("Failed to save photo: {}", e);
                        continue;
                    }
                    fetched += 1;
                }
                Err(e) => {
                    tracing::warn!("Unsplash fetch failed: {}", e);
                    continue;
                }
            }
        }

        if fetched == 0 {
            return Err(DomainError::UnsplashUnavailable(
                "All fetch attempts failed".to_string(),
            ));
        }

        Ok(fetched)
    }
}
