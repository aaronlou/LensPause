use crate::domain::{
    daily_photo::DailyPhoto,
    errors::DomainError,
    focus_params::FocusParams,
    metadata_templates::{select_exif, select_quote},
    photo_id::PhotoId,
    photo_source::PhotoSource,
};

/// 照片策展器（领域服务）
/// 将外部图库 API 的原始数据包装为领域实体
pub struct PhotoCurator;

impl PhotoCurator {
    pub fn new() -> Self {
        Self
    }

    /// 将 Unsplash 原始数据策展为 DailyPhoto 实体
    pub fn curate(
        &self,
        unsplash_id: String,
        title: String,
        photographer: String,
        photographer_link: String,
        photo_page_url: String,
        image_url: String,
        image_thumb_url: String,
    ) -> Result<DailyPhoto, DomainError> {
        let photo_id = PhotoId::generate();
        let id_str = photo_id.as_str().to_string();

        // 确定性分配元数据
        let exif = select_exif(&id_str);
        let quote = select_quote(&id_str);
        let focus_params = self.generate_focus_params(&id_str);

        let source = PhotoSource::new("unsplash".to_string(), unsplash_id, photo_page_url);

        Ok(DailyPhoto::new(
            photo_id,
            title,
            photographer,
            photographer_link,
            image_url,
            image_thumb_url,
            exif,
            quote,
            focus_params,
            source,
        ))
    }

    /// 生成确定性对焦参数（基于 PhotoId 哈希）
    fn generate_focus_params(&self, photo_id: &str) -> FocusParams {
        let r1 = Self::seeded_random(&(photo_id.to_string() + "_sweet"));
        let r2 = Self::seeded_random(&(photo_id.to_string() + "_tolerance"));
        let r3 = Self::seeded_random(&(photo_id.to_string() + "_curve"));

        FocusParams::new(
            (20.0 + r1 * 60.0) as u8, // sweet_spot: 20-80
            (3.0 + r2 * 5.0) as u8,   // tolerance: 3-8
            (0.5 + r3 * 0.6) as f32,  // curve: 0.5-1.1
        )
    }

    fn seeded_random(seed: &str) -> f64 {
        let mut s: i64 = 0;
        for b in seed.bytes() {
            s = s.wrapping_mul(31).wrapping_add(b as i64);
        }
        let x = (s as f64).sin() * 10000.0;
        x - x.floor()
    }
}
