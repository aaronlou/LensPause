use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{NaiveDate, Utc};
use rusqlite::Connection;

use crate::domain::{
    daily_photo::DailyPhoto, errors::DomainError, exif_info::ExifInfo, focus_params::FocusParams,
    photo_id::PhotoId, photo_source::PhotoSource, repository::DailyPhotoRepository,
};

/// SQLite 实现的每日照片仓库
#[derive(Clone)]
pub struct SqliteDailyPhotoRepository {
    conn: Arc<Mutex<Connection>>,
}

impl SqliteDailyPhotoRepository {
    pub fn new(db_path: &str) -> Result<Self, DomainError> {
        let conn =
            Connection::open(db_path).map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Self::init_schema(&conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    fn init_schema(conn: &Connection) -> Result<(), DomainError> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS daily_photos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                photographer TEXT NOT NULL,
                photographer_link TEXT,
                image_url TEXT NOT NULL,
                image_thumb_url TEXT,
                camera TEXT,
                lens TEXT,
                film TEXT,
                shutter TEXT,
                aperture TEXT,
                quote TEXT NOT NULL,
                sweet_spot INTEGER NOT NULL,
                tolerance INTEGER NOT NULL,
                curve REAL NOT NULL,
                source TEXT NOT NULL,
                source_id TEXT,
                source_url TEXT,
                fetched_at TEXT NOT NULL,
                assigned_date TEXT
            )",
            [],
        )
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    fn row_to_photo(row: &rusqlite::Row) -> Result<DailyPhoto, rusqlite::Error> {
        let id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let photographer: String = row.get(2)?;
        let photographer_link: String = row.get(3).unwrap_or_default();
        let image_url: String = row.get(4)?;
        let image_thumb_url: String = row.get(5).unwrap_or_default();
        let camera: String = row.get(6).unwrap_or_default();
        let lens: String = row.get(7).unwrap_or_default();
        let film: String = row.get(8).unwrap_or_default();
        let shutter: String = row.get(9).unwrap_or_default();
        let aperture: String = row.get(10).unwrap_or_default();
        let quote: String = row.get(11)?;
        let sweet_spot: u8 = row.get::<_, i64>(12)? as u8;
        let tolerance: u8 = row.get::<_, i64>(13)? as u8;
        let curve: f32 = row.get::<_, f64>(14)? as f32;
        let source: String = row.get(15)?;
        let source_id: String = row.get(16).unwrap_or_default();
        let source_url: String = row.get(17).unwrap_or_default();
        let fetched_at_str: String = row.get(18)?;
        let assigned_date_str: Option<String> = row.get(19).ok();

        let fetched_at = fetched_at_str
            .parse::<chrono::DateTime<Utc>>()
            .unwrap_or_else(|_| Utc::now());

        let assigned_date =
            assigned_date_str.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());

        Ok(DailyPhoto {
            id: PhotoId::new(id),
            title,
            photographer,
            photographer_link,
            image_url,
            image_thumb_url,
            exif: ExifInfo::new(camera, lens, film, shutter, aperture),
            quote,
            focus_params: FocusParams::new(sweet_spot, tolerance, curve),
            source: PhotoSource::new(source, source_id, source_url),
            fetched_at,
            assigned_date,
        })
    }
}

#[async_trait]
impl DailyPhotoRepository for SqliteDailyPhotoRepository {
    async fn save(&self, photo: &DailyPhoto) -> Result<(), DomainError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO daily_photos (
                id, title, photographer, photographer_link,
                image_url, image_thumb_url,
                camera, lens, film, shutter, aperture,
                quote, sweet_spot, tolerance, curve,
                source, source_id, source_url, fetched_at, assigned_date
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
            [
                photo.id.as_str(),
                &photo.title,
                &photo.photographer,
                &photo.photographer_link,
                &photo.image_url,
                &photo.image_thumb_url,
                &photo.exif.camera,
                &photo.exif.lens,
                &photo.exif.film,
                &photo.exif.shutter,
                &photo.exif.aperture,
                &photo.quote,
                &(photo.focus_params.sweet_spot.to_string()),
                &(photo.focus_params.tolerance.to_string()),
                &(photo.focus_params.curve.to_string()),
                &photo.source.provider,
                &photo.source.source_id,
                &photo.source.source_url,
                &photo.fetched_at.to_rfc3339(),
                &photo.assigned_date.map(|d| d.to_string()).unwrap_or_default(),
            ],
        )
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    async fn find_by_id(&self, id: &PhotoId) -> Result<Option<DailyPhoto>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT * FROM daily_photos WHERE id = ?1")
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        let mut rows = stmt
            .query_map([id.as_str()], Self::row_to_photo)
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(rows
            .next()
            .transpose()
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?)
    }

    async fn find_by_date(&self, date: NaiveDate) -> Result<Option<DailyPhoto>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT * FROM daily_photos WHERE assigned_date = ?1")
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        let mut rows = stmt
            .query_map([date.to_string()], Self::row_to_photo)
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(rows
            .next()
            .transpose()
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?)
    }

    async fn find_today(&self) -> Result<Option<DailyPhoto>, DomainError> {
        let today = Utc::now().date_naive();
        self.find_by_date(today).await
    }

    async fn list_pool(&self) -> Result<Vec<DailyPhoto>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT * FROM daily_photos ORDER BY fetched_at DESC")
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        let photos: Vec<DailyPhoto> = stmt
            .query_map([], Self::row_to_photo)
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(photos)
    }

    async fn count_pool(&self) -> Result<usize, DomainError> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM daily_photos", [], |row| row.get(0))
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;
        Ok(count as usize)
    }
}
