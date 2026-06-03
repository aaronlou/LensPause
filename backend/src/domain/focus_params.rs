use serde::{Deserialize, Serialize};

/// 对焦参数值对象
/// 决定前端滑块的最佳合焦位置和清晰度曲线
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FocusParams {
    /// 最佳对焦位置 (0-100)
    pub sweet_spot: u8,
    /// 清晰容差区间半径
    pub tolerance: u8,
    /// 清晰度曲线陡峭度 (0.5 - 1.1)
    pub curve: f32,
}

impl FocusParams {
    pub fn new(sweet_spot: u8, tolerance: u8, curve: f32) -> Self {
        Self {
            sweet_spot,
            tolerance,
            curve,
        }
    }
}
