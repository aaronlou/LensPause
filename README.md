# LensPause · 息影

> 每日一帧，片刻清晰 — One frame a day, a moment of clarity.

**LensPause** 是一款正念摄影交互应用。每天你都会收到一张摄影作品，但画面一开始是完全模糊的——你需要转动虚拟对焦环，在失焦与清晰之间找到最佳合焦位置。这个过程邀请你暂停、专注，在微观的掌控感中找回内心的清晰。

## 功能

### 每日一帧
每次打开或刷新页面时，从照片池中随机展示一张摄影作品。照片由 Unsplash API 自动拉取补充。点击「再来一次」可继续换图。

### 手动对焦体验
转动屏幕上的对焦环（滑块），画面从完全模糊逐渐变清晰。对焦参数（甜点位置、容差区间、清晰度曲线）每次随机生成，让体验保持新鲜和不确定。

### 对焦 HUD
实时对焦状态指示：失焦 → 接近 → 合焦。滑块带有段落吸附和触觉反馈（移动端振动），模拟机械对焦环的阻尼感。

### 显影卡片
合焦后雾气消散，快门声响起，画面完全清晰。同时弹出显影卡片，展示：
- 作品标题与摄影师
- EXIF 信息（机身、镜头、胶片、快门、光圈）
- 一句正念短句

### 再来一次
每轮显影后可以换一张照片重新开始，随机从照片池中抽取。同一会话中连续 4 次重来后，会弹出支持弹窗。

### Boss Key — Excel 伪装
按 Esc 键一键切换到伪装的 Excel 报表界面。移动端长按品牌名 1.2 秒触发。适合在工作间隙放心使用。

### 中英文国际化
支持中文 / English 切换，自动检测浏览器语言偏好。

### 环境光晕
鼠标移动驱动环境光晕以水波纹般的阻尼效果跟随，营造沉浸氛围。

### 音频系统
预留了对焦摩擦声、快门声、擦拭白噪音的音频接口，可在后续版本接入真实音频素材。

### 分享保存
通过 Web Share API 或剪贴板复制，将当前照片与短句分享出去。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML / CSS / ES6+，零外部依赖 |
| 后端 | Rust + Axum + SQLite |
| 图片来源 | Unsplash API |
| 网关 | Caddy（HTTPS + 静态文件 + 反向代理） |
| 部署 | Docker Compose |

## 架构

```
lenspause/
├── index.html          # SPA 入口
├── css/style.css       # 全局样式
├── js/
│   ├── app.js          # 核心交互逻辑
│   ├── i18n.js         # 中英文国际化
│   └── photos.js       # 本地照片数据源（fallback）
├── backend/            # Rust API 服务
│   └── src/
│       ├── domain/     # 领域模型（DailyPhoto 聚合根）
│       ├── application/# 用例层（取今日照片/拉取照片池/列出照片池）
│       ├── infrastructure/ # SQLite 持久化 + Unsplash HTTP 客户端
│       └── presentation/   # REST API 路由
├── docker-compose.yml       # 本地开发
├── docker-compose.prod.yml  # 生产部署
└── Caddyfile                # Caddy 网关配置
```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/photos/today` | 获取今日照片 |
| GET | `/api/photos` | 列出照片池 |
| POST | `/api/photos/fetch?count=N` | 从 Unsplash 拉取 N 张新照片 |
| GET | `/api/health` | 健康检查 |

## 快速开始

### 本地开发

```bash
# 1. 配置 Unsplash API 密钥
cp .env.example .env
# 编辑 .env，填入 UNSPLASH_CLIENT_ID

# 2. 启动服务
docker compose up -d

# 3. 访问 http://localhost
```

### 生产部署

```bash
# 1. 登录 GHCR
echo $GITHUB_PAT | docker login ghcr.io -u USERNAME --password-stdin

# 2. 拉取并启动
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

生产环境使用预构建镜像 `ghcr.io/aaronlou/lenspause-backend:latest`，Caddy 只暴露内部端口 `127.0.0.1:18080`，由上游反向代理处理 HTTPS。

## 演示参数

可通过 URL 参数快速进入特定状态：

- `?focus=45` — 跳转到指定对焦值
- `?reveal` — 直接显影当前照片
- `?boss` — 进入 Boss Key 伪装模式
