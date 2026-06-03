use super::exif_info::ExifInfo;

/// 返回 EXIF 模板库
/// 使用函数而非 const，避免 String 在 const 上下文中的限制
fn exif_templates() -> Vec<ExifInfo> {
    vec![
        ExifInfo::new(
            "LEICA M6".to_string(),
            "35mm f/2".to_string(),
            "Portra 400".to_string(),
            "1/125s".to_string(),
            "f/8".to_string(),
        ),
        ExifInfo::new(
            "Contax T2".to_string(),
            "38mm f/2.8".to_string(),
            "Kodak Gold 200".to_string(),
            "1/60s".to_string(),
            "f/4".to_string(),
        ),
        ExifInfo::new(
            "LEICA M10".to_string(),
            "50mm f/1.4".to_string(),
            "Digital".to_string(),
            "1/250s".to_string(),
            "f/2".to_string(),
        ),
        ExifInfo::new(
            "Rolleiflex 2.8F".to_string(),
            "80mm f/2.8".to_string(),
            "Ilford HP5".to_string(),
            "1/30s".to_string(),
            "f/5.6".to_string(),
        ),
        ExifInfo::new(
            "Ricoh GR III".to_string(),
            "18.3mm f/2.8".to_string(),
            "Digital".to_string(),
            "1/15s".to_string(),
            "f/2.8".to_string(),
        ),
        ExifInfo::new(
            "Hasselblad 500CM".to_string(),
            "80mm f/2.8".to_string(),
            "Kodak Tri-X 400".to_string(),
            "1/60s".to_string(),
            "f/11".to_string(),
        ),
        ExifInfo::new(
            "LEICA M3".to_string(),
            "50mm f/2".to_string(),
            "Kodachrome 64".to_string(),
            "1/125s".to_string(),
            "f/5.6".to_string(),
        ),
        ExifInfo::new(
            "Nikon FM2".to_string(),
            "28mm f/2.8".to_string(),
            "Fuji Pro 400H".to_string(),
            "1/500s".to_string(),
            "f/16".to_string(),
        ),
        ExifInfo::new(
            "Canon AE-1".to_string(),
            "50mm f/1.8".to_string(),
            "Kodak Ektar 100".to_string(),
            "1/250s".to_string(),
            "f/4".to_string(),
        ),
        ExifInfo::new(
            "Olympus XA".to_string(),
            "35mm f/2.8".to_string(),
            "CineStill 800T".to_string(),
            "1/30s".to_string(),
            "f/2.8".to_string(),
        ),
        ExifInfo::new(
            "Mamiya 7II".to_string(),
            "65mm f/4".to_string(),
            "Fuji Velvia 50".to_string(),
            "1/125s".to_string(),
            "f/8".to_string(),
        ),
        ExifInfo::new(
            "Pentax 67".to_string(),
            "105mm f/2.4".to_string(),
            "Kodak Portra 160".to_string(),
            "1/60s".to_string(),
            "f/2.4".to_string(),
        ),
        ExifInfo::new(
            "Fujifilm GW690III".to_string(),
            "90mm f/3.5".to_string(),
            "Ilford Delta 3200".to_string(),
            "1/15s".to_string(),
            "f/5.6".to_string(),
        ),
        ExifInfo::new(
            "Sony A7RIV".to_string(),
            "85mm f/1.4 GM".to_string(),
            "Digital".to_string(),
            "1/8000s".to_string(),
            "f/1.4".to_string(),
        ),
        ExifInfo::new(
            "Bronica SQ-A".to_string(),
            "80mm f/2.8".to_string(),
            "Fuji Provia 100F".to_string(),
            "1/125s".to_string(),
            "f/8".to_string(),
        ),
    ]
}

/// 诗意文案库
const QUOTES: &[&str] = &[
    "有时候，增加一点颗粒感，生活的粗糙也就成了质感。",
    "模糊不是缺陷，是光线在寻找另一种表达。",
    "每一束穿过尘埃的光，都是时间写下的诗。",
    "失焦的时刻，往往最能看清内心。",
    "在噪点与颗粒之间，藏着城市最真实的心跳。",
    "当你站得足够高，所有的模糊都会变成层次。",
    "决定性瞬间不在于清晰，而在于恰如其分的朦胧。",
    "对焦的过程，就是与世界重新校准距离的过程。",
    "快门落下的那一秒，时间学会了暂停。",
    "暗角里的阴影，是光线留给世界的余白。",
    "把曝光降低一档，让情绪多留一点呼吸的空间。",
    "取景框里的世界，永远比肉眼看到的更诚实。",
    "焦距拉长的时候，远方的事情会变得很近，近处的事情会退到背景里。",
    "胶片的意义不在于画质，而在于那份等待冲洗的未知。",
    "用手动模式拍照的人，都相信直觉比算法更懂美。",
    "有时候退后一步，反而能看到更多。",
    "过曝的人生也是一种风格，只要是你自己选择的光圈。",
    "黑白不是缺少颜色，而是拒绝被颜色干扰。",
    "构图严谨的照片后面，往往藏着一颗想放纵的心。",
    "冲洗胶片的暗房里，藏着摄影师最真实的表情。",
    "慢门记录的不是时间，而是时间的痕迹。",
    "把 ISO 调高，在黑暗里也能找到光。",
    "景深太浅的时候，背景再美也只是虚化的陪衬。",
    "按下快门前的那一秒犹豫，才是摄影最迷人的部分。",
    "宽容度高的胶片，才能容纳生活里那些过曝的瞬间。",
    "手持拍摄时的轻微抖动，是心跳留下的签名。",
    "徕卡黄斑对焦里，两个影子重合的瞬间，像是一种确认。",
    "拍虚了的照片，有时候比拍实的更有记忆。",
    "把相机放进口袋，用眼睛先拍一张。",
    "旅行时带一台胶片机，等于给回忆加了一层滤镜。",
    "阴天最适合拍照，因为光很软，就像好的关系。",
    "放大照片里的细节，你会发现原来世界这么精密。",
    "测光表不会说谎，但摄影师可以选择相信或忽略它。",
    "冲洗完一卷胶卷，才发现原来自己看了这么多东西。",
    "定焦镜头教会你：站对位置，比 zoom 更重要。",
];

/// 基于种子字符串生成确定性伪随机数（0-1）
fn seeded_random(seed: &str) -> f64 {
    let mut s: i64 = 0;
    for b in seed.bytes() {
        s = s.wrapping_mul(31).wrapping_add(b as i64);
    }
    let x = (s as f64).sin() * 10000.0;
    x - x.floor()
}

/// 从模板库中确定性选择 EXIF（基于 PhotoId）
pub fn select_exif(photo_id: &str) -> ExifInfo {
    let templates = exif_templates();
    let idx = (seeded_random(&(photo_id.to_string() + "_exif")) * templates.len() as f64) as usize;
    templates[idx % templates.len()].clone()
}

/// 从文案库中确定性选择文案（基于 PhotoId）
pub fn select_quote(photo_id: &str) -> String {
    let idx = (seeded_random(&(photo_id.to_string() + "_quote")) * QUOTES.len() as f64) as usize;
    QUOTES[idx % QUOTES.len()].to_string()
}
