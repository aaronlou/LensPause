/**
 * LensPause - 每日摄影图片数据源
 * 每日通过日期索引映射选择一张图片
 * 每张照片有独立的对焦参数（sweetSpot/tolerance/curve）
 */

const PHOTOS = [
  {
    id: "001",
    url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
    title: "晨雾中的灯塔",
    photographer: "Hiroshi Sugimoto",
    exif: {
      camera: "LEICA M6",
      lens: "35mm f/2",
      film: "Portra 400",
      shutter: "1/125s",
      aperture: "f/8",
    },
    quote: "有时候，增加一点颗粒感，生活的粗糙也就成了质感。",
  },
  {
    id: "002",
    url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
    title: "雨后的玻璃窗",
    photographer: "Saul Leiter",
    exif: {
      camera: "Contax T2",
      lens: "38mm f/2.8",
      film: "Kodak Gold 200",
      shutter: "1/60s",
      aperture: "f/4",
    },
    quote: "模糊不是缺陷，是光线在寻找另一种表达。",
  },
  {
    id: "003",
    url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
    title: "旧书店的午后",
    photographer: "William Eggleston",
    exif: {
      camera: "LEICA M10",
      lens: "50mm f/1.4",
      film: "Digital",
      shutter: "1/250s",
      aperture: "f/2",
    },
    quote: "每一束穿过尘埃的光，都是时间写下的诗。",
  },
  {
    id: "004",
    url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
    title: "车站的告别",
    photographer: "Fan Ho",
    exif: {
      camera: "Rolleiflex 2.8F",
      lens: "80mm f/2.8",
      film: "Ilford HP5",
      shutter: "1/30s",
      aperture: "f/5.6",
    },
    quote: "失焦的时刻，往往最能看清内心。",
  },
  {
    id: "005",
    url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
    title: "深夜食堂",
    photographer: "Daido Moriyama",
    exif: {
      camera: "Ricoh GR III",
      lens: "18.3mm f/2.8",
      film: "Digital",
      shutter: "1/15s",
      aperture: "f/2.8",
    },
    quote: "在噪点与颗粒之间，藏着城市最真实的心跳。",
  },
  {
    id: "006",
    url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
    title: "山巅云海",
    photographer: "Ansel Adams",
    exif: {
      camera: "Hasselblad 500CM",
      lens: "80mm f/2.8",
      film: "Kodak Tri-X 400",
      shutter: "1/60s",
      aperture: "f/11",
    },
    quote: "当你站得足够高，所有的模糊都会变成层次。",
  },
  {
    id: "007",
    url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
    title: "老巷深处",
    photographer: "Henri Cartier-Bresson",
    exif: {
      camera: "LEICA M3",
      lens: "50mm f/2",
      film: "Kodachrome 64",
      shutter: "1/125s",
      aperture: "f/5.6",
    },
    quote: "决定性瞬间不在于清晰，而在于恰如其分的朦胧。",
  },
];

/**
 * 基于字符串生成确定性伪随机数（0-1）
 * 相同输入总是返回相同输出
 */
function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
    s = s & 0xffffffff;
  }
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

/**
 * 为每张照片生成对焦参数
 * - sweetSpot: 最佳对焦位置 (20-80)，不同照片不同
 * - tolerance: 清晰容差区间 (3-8)
 * - curve: 清晰度曲线陡峭度 (0.5-1.1)，模拟不同镜头的景深特征
 */
function generateFocusParams(photo) {
  const r1 = seededRandom(photo.id + "_sweet");
  const r2 = seededRandom(photo.id + "_tolerance");
  const r3 = seededRandom(photo.id + "_curve");

  return {
    sweetSpot: Math.round(20 + r1 * 60),     // 20 ~ 80
    tolerance: Math.round(3 + r2 * 5),       // 3 ~ 8
    curve: 0.5 + r3 * 0.6,                   // 0.5 ~ 1.1
  };
}

// 为每张照片绑定对焦参数
PHOTOS.forEach((photo) => {
  const params = generateFocusParams(photo);
  photo.sweetSpot = params.sweetSpot;
  photo.tolerance = params.tolerance;
  photo.curve = params.curve;
});

/**
 * 获取今日图片索引
 * 基于日期计算，确保同一天返回同一图片
 */
function getTodayPhotoIndex() {
  const now = new Date();
  const dayKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) % PHOTOS.length;
  }
  return hash;
}

/**
 * 获取今日摄影图片（含对焦参数）
 */
function getTodayPhoto() {
  const index = getTodayPhotoIndex();
  return PHOTOS[index];
}

/**
 * 获取上一张/下一张图片（用于切换）
 */
function getPhotoByOffset(offset) {
  const currentIndex = getTodayPhotoIndex();
  const newIndex = (currentIndex + offset + PHOTOS.length) % PHOTOS.length;
  return PHOTOS[newIndex];
}
