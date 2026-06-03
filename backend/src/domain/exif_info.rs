use serde::{Deserialize, Serialize};

/// EXIF 信息值对象
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExifInfo {
    pub camera: String,
    pub lens: String,
    pub film: String,
    pub shutter: String,
    pub aperture: String,
}

impl ExifInfo {
    pub fn new(camera: String, lens: String, film: String, shutter: String, aperture: String) -> Self {
        Self {
            camera,
            lens,
            film,
            shutter,
            aperture,
        }
    }
}
