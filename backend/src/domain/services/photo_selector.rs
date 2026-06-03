use chrono::{Local, NaiveDate};

use crate::domain::{daily_photo::DailyPhoto, errors::DomainError};

/// 每日照片选择器（领域服务）
/// 基于日期哈希从照片池中确定性选择今日照片
pub struct PhotoSelector;

impl PhotoSelector {
    pub fn new() -> Self {
        Self
    }

    /// 从照片池中选择今日照片
    pub fn select_for_date(
        &self,
        pool: &[DailyPhoto],
        date: NaiveDate,
    ) -> Result<DailyPhoto, DomainError> {
        if pool.is_empty() {
            return Err(DomainError::EmptyPool);
        }

        // 基于日期生成确定性哈希
        let day_key = date.format("%Y%m%d").to_string();
        let hash = Self::hash_day_key(&day_key);
        let idx = (hash % pool.len() as u64) as usize;

        Ok(pool[idx].clone())
    }

    /// 获取今天的日期
    pub fn today(&self) -> NaiveDate {
        Local::now().date_naive()
    }

    fn hash_day_key(key: &str) -> u64 {
        let mut hash: u64 = 5381;
        for b in key.bytes() {
            hash = hash.wrapping_mul(33).wrapping_add(b as u64);
        }
        hash
    }
}
