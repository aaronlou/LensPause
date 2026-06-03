use std::time::Duration;

use crate::domain::errors::DomainError;

const UNSPLASH_API_URL: &str = "https://api.unsplash.com/photos/random";

/// Unsplash 原始照片信息
#[derive(Debug, Clone)]
pub struct UnsplashRawPhoto {
    pub id: String,
    pub title: String,
    pub photographer: String,
    pub photographer_link: String,
    pub photo_page_url: String,
    pub display_url: String,
    pub thumb_url: String,
}

#[derive(Clone)]
pub struct UnsplashClient {
    client_id: String,
}

impl UnsplashClient {
    pub fn new(client_id: String) -> Self {
        Self { client_id }
    }

    pub async fn fetch_random(&self) -> Result<UnsplashRawPhoto, DomainError> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| {
                DomainError::UnsplashUnavailable(format!("HTTP client build failed: {}", e))
            })?;

        let response = client
            .get(format!("{}?client_id={}", UNSPLASH_API_URL, self.client_id))
            .send()
            .await
            .map_err(|e| {
                DomainError::UnsplashUnavailable(format!("Unsplash request failed: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(DomainError::UnsplashUnavailable(format!(
                "Unsplash returned {}: {}",
                status, text
            )));
        }

        let data: serde_json::Value = response.json().await.map_err(|e| {
            DomainError::UnsplashUnavailable(format!("Unsplash parse error: {}", e))
        })?;

        let id = data["id"].as_str().unwrap_or("").to_string();
        let display_url = data["urls"]["regular"].as_str().unwrap_or("").to_string();
        let thumb_url = data["urls"]["small"].as_str().unwrap_or("").to_string();
        let title = data["description"]
            .as_str()
            .or_else(|| data["alt_description"].as_str())
            .unwrap_or("Untitled")
            .to_string();
        let photographer = data["user"]["name"]
            .as_str()
            .unwrap_or("Unknown")
            .to_string();
        let photographer_link = data["user"]["links"]["html"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let photo_page_url = data["links"]["html"].as_str().unwrap_or("").to_string();

        if id.is_empty() || display_url.is_empty() {
            return Err(DomainError::UnsplashUnavailable(
                "Unsplash returned incomplete photo data".to_string(),
            ));
        }

        Ok(UnsplashRawPhoto {
            id,
            title,
            photographer,
            photographer_link,
            photo_page_url,
            display_url,
            thumb_url,
        })
    }
}
