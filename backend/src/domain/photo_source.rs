use serde::{Deserialize, Serialize};

/// 照片来源值对象
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PhotoSource {
    pub provider: String,    // e.g. "unsplash"
    pub source_id: String,   // Unsplash photo id
    pub source_url: String,  // Unsplash photo page URL
}

impl PhotoSource {
    pub fn new(provider: String, source_id: String, source_url: String) -> Self {
        Self {
            provider,
            source_id,
            source_url,
        }
    }
}
