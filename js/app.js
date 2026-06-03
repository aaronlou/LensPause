/**
 * LensPause · 息影
 * 核心应用逻辑
 * 纯原生 ES6+，无外部依赖
 */

(function () {
  "use strict";

  // ============================================
  // 状态管理（纯内存，禁止 localStorage）
  // ============================================
  const state = {
    photo: null,
    focusValue: 0,
    wipeProgress: 0,
    isRevealed: false,
    isBossMode: false,
    isDragging: false,
    lastWipeTime: 0,
    totalPixels: 0,
    clearedPixels: 0,
    wipeThreshold: 0.85,
    canvasScale: 1,
  };

  // ============================================
  // DOM 引用
  // ============================================
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    app: $("app"),
    ambientLight: $("ambient-light"),
    photoImage: $("photo-image"),
    fogCanvas: $("fog-canvas"),
    focusSlider: $("focus-slider"),
    sliderFill: $("slider-fill"),
    sliderTicks: $("slider-ticks"),
    sweetSpotZone: $("sweet-spot-zone"),
    focusValue: $("focus-value"),
    hudDot: $("hud-dot"),
    hudText: $("hud-text"),
    focusHud: $("focus-hud"),
    customCursor: $("custom-cursor"),
    interactionHint: $("interaction-hint"),
    revealCard: $("reveal-card"),
    photoTitle: $("photo-title"),
    photoPhotographer: $("photo-photographer"),
    exifCamera: $("exif-camera"),
    exifLens: $("exif-lens"),
    exifFilm: $("exif-film"),
    exifShutter: $("exif-shutter"),
    exifAperture: $("exif-aperture"),
    photoQuote: $("photo-quote"),
    focusProgress: $("focus-progress"),
    wipeProgress: $("wipe-progress"),
    bossScreen: $("boss-screen"),
    excelTbody: $("excel-tbody"),
    excelAvg: $("excel-avg"),
    excelSum: $("excel-sum"),
    dateDisplay: $("date-display"),
    btnRestart: $("btn-restart"),
    btnShare: $("btn-share"),
  };

  const ctx = els.fogCanvas.getContext("2d", { willReadFrequently: true });

  // ============================================
  // 音效系统（预留接口）
  // ============================================
  const audio = {
    ctx: null,
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    // 播放对焦摩擦声（频率随速度变化）
    playFocus(speed = 0.5) {
      // MVP 预留：实际接入时替换为真实音频缓冲
      // this._playTone(200 + speed * 400, 0.02, "sawtooth", 0.03);
    },
    // 播放擦拭白噪音
    playWipe(intensity = 0.5) {
      // MVP 预留
      // this._playNoise(0.03 * intensity);
    },
    // 播放快门声
    playShutter() {
      // MVP 预留
      // this._playClick();
    },
    _playTone(freq, duration, type = "sine", volume = 0.1) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    },
    _playNoise(volume = 0.05) {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    },
    _playClick() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    },
  };

  // ============================================
  // 初始化
  // ============================================
  function init() {
    initDateDisplay();
    loadTodayPhoto();
    initCanvas();
    initSliderTicks();
    initFocusSlider();
    initWipeInteraction();
    initCustomCursor();
    initAmbientLight();
    initBossKey();
    initRevealActions();
    initAudioOnFirstInteraction();
  }

  function initDateDisplay() {
    const now = new Date();
    const months = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
    els.dateDisplay.textContent = `${months[now.getMonth()]}月${now.getDate()}日`;
  }

  async function loadTodayPhoto() {
    try {
      const apiBase = window.location.hostname === "localhost"
        ? "http://localhost:3001"
        : "";
      const resp = await fetch(`${apiBase}/api/photos/today`);
      if (!resp.ok) throw new Error("API failed");
      const data = await resp.json();

      // 适配后端数据结构到前端 state.photo
      state.photo = {
        id: data.id,
        url: data.image_url,
        title: data.title,
        photographer: data.photographer,
        photographer_link: data.photographer_link,
        exif: data.exif,
        quote: data.quote,
        sweetSpot: data.focus_params.sweet_spot,
        tolerance: data.focus_params.tolerance,
        curve: data.focus_params.curve,
      };
    } catch (err) {
      console.warn("Backend unavailable, using fallback photo", err);
      // Fallback：当后端不可用时使用内置数据
      state.photo = getFallbackPhoto();
    }

    els.photoImage.src = state.photo.url;
    els.photoImage.alt = state.photo.title;
    els.photoImage.onerror = () => {
      els.photoImage.style.display = "none";
      const wrapper = els.photoImage.parentElement;
      let fallback = wrapper.querySelector(".photo-fallback");
      if (!fallback) {
        fallback = document.createElement("div");
        fallback.className = "photo-fallback";
        fallback.innerHTML = `
          <div class="fallback-content">
            <p class="fallback-title">${state.photo.title}</p>
            <p class="fallback-hint">图片加载中…</p>
          </div>
        `;
        wrapper.appendChild(fallback);
      }
    };
    updateSweetSpotZone();
  }

  function getFallbackPhoto() {
    const fallbackPhotos = [
      {
        id: "fallback-001",
        url: "https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png",
        title: "晨雾中的灯塔",
        photographer: "Hiroshi Sugimoto",
        photographer_link: "",
        exif: { camera: "LEICA M6", lens: "35mm f/2", film: "Portra 400", shutter: "1/125s", aperture: "f/8" },
        quote: "有时候，增加一点颗粒感，生活的粗糙也就成了质感。",
        sweetSpot: 47, tolerance: 5, curve: 0.78,
      },
    ];
    return fallbackPhotos[0];
  }

  // ============================================
  // Canvas 雾气层
  // ============================================
  function initCanvas() {
    resizeCanvas();
    drawFog();
    state.totalPixels = els.fogCanvas.width * els.fogCanvas.height;
    window.addEventListener("resize", debounce(resizeCanvas, 150));
  }

  function resizeCanvas() {
    const wrapper = els.photoImage.parentElement;
    const rect = wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 仅在尺寸变化时重绘，避免不必要的重置
    const prevW = els.fogCanvas.width;
    const prevH = els.fogCanvas.height;
    const newW = Math.round(rect.width * dpr);
    const newH = Math.round(rect.height * dpr);

    if (prevW === newW && prevH === newH) return;

    els.fogCanvas.width = newW;
    els.fogCanvas.height = newH;
    els.fogCanvas.style.width = rect.width + "px";
    els.fogCanvas.style.height = rect.height + "px";
    state.canvasScale = dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFog();
  }

  function drawFog() {
    const w = els.fogCanvas.width / state.canvasScale;
    const h = els.fogCanvas.height / state.canvasScale;

    // 填充半透明雾气底色
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(210, 200, 190, 0.55)";
    ctx.fillRect(0, 0, w, h);

    // 叠加噪点纹理
    const imageData = ctx.getImageData(0, 0, els.fogCanvas.width, els.fogCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    // 重置透明像素计数
    state.clearedPixels = 0;
    state.wipeProgress = 0;
    updateWipeProgressUI();
  }

  // ============================================
  // 刻度标记
  // ============================================
  function initSliderTicks() {
    const container = els.sliderTicks;
    container.innerHTML = "";
    for (let i = 0; i <= 100; i += 5) {
      const tick = document.createElement("div");
      tick.className = "tick-mark" + (i % 25 === 0 ? " major" : "");
      tick.style.left = i + "%";
      tick.dataset.value = i;
      container.appendChild(tick);
    }
  }

  // ============================================
  // 甜点区域视觉标记
  // ============================================
  function updateSweetSpotZone() {
    if (!state.photo) return;
    const p = state.photo;
    const left = Math.max(0, p.sweetSpot - p.tolerance);
    const width = Math.min(100, p.sweetSpot + p.tolerance) - left;
    els.sweetSpotZone.style.left = left + "%";
    els.sweetSpotZone.style.width = width + "%";
    els.sweetSpotZone.classList.add("visible");
  }

  // ============================================
  // 清晰度算法（类高斯曲线）
  // ============================================
  function calculateBlur(sliderValue, sweetSpot, tolerance, curve) {
    const dist = Math.abs(sliderValue - sweetSpot);

    if (dist <= tolerance) {
      // 甜点区间内：smoothstep 实现中心最清晰
      const t = dist / tolerance;
      return t * t * (3 - 2 * t) * 2.5; // 0 ~ 2.5px
    }

    // 超出甜点区：指数增长模糊
    const overshoot = dist - tolerance;
    const maxOvershoot = Math.max(sweetSpot, 100 - sweetSpot);
    const normalized = overshoot / maxOvershoot;
    return 2.5 + 17.5 * Math.pow(normalized, curve);
  }

  // ============================================
  // 对焦精度 HUD 更新
  // ============================================
  function updateFocusHUD(value) {
    if (!state.photo) return;
    const p = state.photo;
    const dist = Math.abs(value - p.sweetSpot);
    const dot = els.hudDot;
    const text = els.hudText;
    const hud = els.focusHud;

    if (dist <= p.tolerance) {
      dot.className = "hud-dot locked";
      text.className = "hud-text locked";
      text.textContent = "合焦";
      hud.classList.add("in-range");
      els.focusSlider.classList.add("in-sweet-spot");
    } else if (dist <= p.tolerance * 2.5) {
      dot.className = "hud-dot near";
      text.className = "hud-text near";
      text.textContent = "接近";
      hud.classList.remove("in-range");
      els.focusSlider.classList.remove("in-sweet-spot");
    } else {
      dot.className = "hud-dot";
      text.className = "hud-text";
      text.textContent = "失焦";
      hud.classList.remove("in-range");
      els.focusSlider.classList.remove("in-sweet-spot");
    }
  }

  // ============================================
  // 对焦滑块
  // ============================================
  function initFocusSlider() {
    els.focusSlider.addEventListener("input", handleFocusInput);
    els.focusSlider.addEventListener("change", handleFocusChange);
    // 移动端触摸优化：阻止滑块触摸时触发页面滚动
    els.focusSlider.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
    updateFocusVisuals(0);
  }

  let lastTickCrossed = -1;

  function handleFocusInput(e) {
    const value = parseInt(e.target.value, 10);
    state.focusValue = value;
    updateFocusVisuals(value);
    audio.playFocus(value / 100);
    hideInteractionHint();

    // 刻度段落感：经过 5% 刻度点时触发 click 反馈
    const tickSpacing = 5;
    const currentTick = Math.round(value / tickSpacing);
    if (currentTick !== lastTickCrossed) {
      lastTickCrossed = currentTick;
      // 视觉反馈
      els.focusSlider.classList.add("click-bump");
      setTimeout(() => els.focusSlider.classList.remove("click-bump"), 80);
      // 触觉反馈（移动端）
      if (navigator.vibrate) navigator.vibrate(6);
      // 更新刻度高亮
      document.querySelectorAll(".tick-mark").forEach((t) => {
        const tv = parseInt(t.dataset.value, 10);
        t.classList.toggle("active", tv === currentTick * tickSpacing);
      });
    }

    checkRevealCondition();
  }

  function handleFocusChange() {
    // 滑块释放时的处理：稍微吸附到最近的刻度
    const value = parseInt(els.focusSlider.value, 10);
    const snapped = Math.round(value / 5) * 5;
    if (Math.abs(snapped - value) <= 2) {
      els.focusSlider.value = snapped;
      state.focusValue = snapped;
      updateFocusVisuals(snapped);
    }
  }

  function updateFocusVisuals(value) {
    const p = state.photo;
    let blurPx = 20;
    if (p) {
      blurPx = calculateBlur(value, p.sweetSpot, p.tolerance, p.curve);
    }
    els.photoImage.style.filter = `blur(${blurPx}px)`;
    els.sliderFill.style.width = value + "%";
    els.focusValue.textContent = value + "%";
    els.focusProgress.style.height = value + "%";
    updateFocusHUD(value);
  }

  // ============================================
  // 雾气擦拭交互
  // ============================================
  function initWipeInteraction() {
    const canvas = els.fogCanvas;

    canvas.addEventListener("mousedown", onWipeStart);
    canvas.addEventListener("touchstart", onWipeStart, { passive: false });

    document.addEventListener("mousemove", onWipeMove);
    document.addEventListener("touchmove", onWipeMove, { passive: false });

    document.addEventListener("mouseup", onWipeEnd);
    document.addEventListener("touchend", onWipeEnd);
  }

  function getCanvasPos(e) {
    const rect = els.fogCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function onWipeStart(e) {
    if (state.isRevealed || state.isBossMode) return;
    state.isDragging = true;
    audio.init();
    audio.playWipe();
    hideInteractionHint();

    const pos = getCanvasPos(e);
    eraseAt(pos.x, pos.y);
    e.preventDefault();
  }

  function onWipeMove(e) {
    if (!state.isDragging || state.isRevealed || state.isBossMode) return;

    const pos = getCanvasPos(e);
    eraseAt(pos.x, pos.y);

    // 限制检测频率（每 300ms 检测一次，平衡性能与响应）
    const now = Date.now();
    if (now - state.lastWipeTime > 300) {
      state.lastWipeTime = now;
      requestAnimationFrame(checkWipeProgress);
    }

    if (e.touches) e.preventDefault();
  }

  function onWipeEnd() {
    state.isDragging = false;
    if (!state.isRevealed && !state.isBossMode) {
      requestAnimationFrame(checkWipeProgress);
    }
  }

  function eraseAt(x, y) {
    const radius = 32;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 边缘柔化：再画一个更大但透明度更低的圆
    const grad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 1.5);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function checkWipeProgress() {
    const w = els.fogCanvas.width;
    const h = els.fogCanvas.height;
    const total = w * h;

    // 抽样检测（提升性能）：每 4 个像素取 1 个
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    let transparent = 0;
    const step = 4;
    const sampleTotal = Math.ceil(total / (step * step));

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        if (data[idx + 3] < 50) {
          transparent++;
        }
      }
    }

    const ratio = transparent / sampleTotal;
    state.wipeProgress = Math.min(1, ratio);
    updateWipeProgressUI();

    if (state.wipeProgress >= state.wipeThreshold) {
      checkRevealCondition();
    }
  }

  function updateWipeProgressUI() {
    const pct = Math.round(state.wipeProgress * 100);
    els.wipeProgress.style.height = pct + "%";
  }

  function hideInteractionHint() {
    els.interactionHint.classList.add("hidden");
  }

  // ============================================
  // 显影逻辑
  // ============================================
  function checkRevealCondition() {
    if (state.isRevealed || !state.photo) return;
    const p = state.photo;
    const inSweetSpot = Math.abs(state.focusValue - p.sweetSpot) <= p.tolerance;
    if (inSweetSpot && state.wipeProgress >= state.wipeThreshold) {
      performReveal();
    }
  }

  function performReveal() {
    state.isRevealed = true;

    // 清除剩余雾气
    const w = els.fogCanvas.width / state.canvasScale;
    const h = els.fogCanvas.height / state.canvasScale;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    // 确保图片完全清晰
    els.photoImage.style.filter = "blur(0px)";

    // 禁用滑块
    els.focusSlider.disabled = true;

    // 播放快门声
    audio.playShutter();

    // 填充信息卡片
    fillRevealCard();

    // 显示卡片
    requestAnimationFrame(() => {
      els.revealCard.classList.add("visible");
      els.revealCard.setAttribute("aria-hidden", "false");
      els.app.classList.add("revealed");
    });

    // 隐藏进度指示器
    els.focusProgress.parentElement.parentElement.style.opacity = "0";
  }

  function fillRevealCard() {
    const p = state.photo;
    if (!p) return;
    els.photoTitle.textContent = p.title;
    els.photoPhotographer.textContent = `摄影 / ${p.photographer}`;
    els.exifCamera.textContent = p.exif.camera;
    els.exifLens.textContent = p.exif.lens;
    els.exifFilm.textContent = p.exif.film;
    els.exifShutter.textContent = p.exif.shutter;
    els.exifAperture.textContent = p.exif.aperture;
    els.photoQuote.textContent = p.quote;
  }

  function resetReveal() {
    state.isRevealed = false;
    state.focusValue = 0;
    state.wipeProgress = 0;
    lastTickCrossed = -1;

    els.revealCard.classList.remove("visible");
    els.revealCard.setAttribute("aria-hidden", "true");
    els.app.classList.remove("revealed");

    els.focusSlider.disabled = false;
    els.focusSlider.value = 0;
    updateFocusVisuals(0);
    updateWipeProgressUI();
    updateFocusHUD(0);
    updateSweetSpotZone();

    // 清除刻度高亮
    document.querySelectorAll(".tick-mark").forEach((t) => t.classList.remove("active"));

    els.focusProgress.parentElement.parentElement.style.opacity = "";
    els.interactionHint.classList.remove("hidden");

    drawFog();
  }

  // ============================================
  // 显影后操作
  // ============================================
  function initRevealActions() {
    els.btnRestart.addEventListener("click", resetReveal);
    els.btnShare.addEventListener("click", handleShare);
  }

  function handleShare() {
    const text = `LensPause · 息影\n「${state.photo.title}」\n${state.photo.quote}\n\n—— 每日一帧，片刻清晰`;
    if (navigator.share) {
      navigator.share({
        title: "LensPause · 息影",
        text: text,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast("已复制到剪贴板");
      });
    }
  }

  function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 10000;
      pointer-events: none;
      animation: fadeInUp 0.3s ease forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.5s ease";
      setTimeout(() => toast.remove(), 500);
    }, 2000);
  }

  // ============================================
  // 自定义光标
  // ============================================
  function initCustomCursor() {
    const photoArea = els.photoImage.parentElement;

    photoArea.addEventListener("mouseenter", () => {
      if (!state.isRevealed && !state.isBossMode) {
        els.customCursor.classList.add("active");
      }
    });

    photoArea.addEventListener("mouseleave", () => {
      els.customCursor.classList.remove("active");
    });

    document.addEventListener("mousemove", (e) => {
      els.customCursor.style.left = e.clientX + "px";
      els.customCursor.style.top = e.clientY + "px";
    });
  }

  // ============================================
  // 环境光晕（带阻尼跟随）
  // ============================================
  function initAmbientLight() {
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;
    let rafId = null;

    document.addEventListener("mousemove", (e) => {
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
      if (!rafId) {
        rafId = requestAnimationFrame(updateLight);
      }
    });

    function updateLight() {
      // 阻尼系数 0.06，营造水波纹般的缓慢跟随感
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      els.ambientLight.style.setProperty("--mouse-x", currentX + "%");
      els.ambientLight.style.setProperty("--mouse-y", currentY + "%");

      const dx = Math.abs(targetX - currentX);
      const dy = Math.abs(targetY - currentY);
      if (dx > 0.1 || dy > 0.1) {
        rafId = requestAnimationFrame(updateLight);
      } else {
        rafId = null;
      }
    }
  }

  // ============================================
  // Boss Key — Excel 伪装
  // ============================================
  function initBossKey() {
    generateExcelData();

    // 桌面端：Esc 键
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        toggleBossMode();
      }
    });

    // 移动端：长按品牌名 1.5s 触发（更隐蔽）
    const brand = $("brand-trigger");
    let longPressTimer = null;

    const startLongPress = (e) => {
      longPressTimer = setTimeout(() => {
        toggleBossMode();
        if (navigator.vibrate) navigator.vibrate(50);
      }, 1200);
    };

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    brand.addEventListener("touchstart", startLongPress, { passive: true });
    brand.addEventListener("touchend", cancelLongPress);
    brand.addEventListener("touchmove", cancelLongPress);
    brand.addEventListener("touchcancel", cancelLongPress);
    // 桌面端也支持双击品牌名
    brand.addEventListener("dblclick", toggleBossMode);
  }

  function toggleBossMode() {
    state.isBossMode = !state.isBossMode;

    if (state.isBossMode) {
      els.bossScreen.style.display = "flex";
      els.bossScreen.setAttribute("aria-hidden", "false");
      // 强制重排以触发过渡
      void els.bossScreen.offsetWidth;
      els.bossScreen.style.opacity = "1";
      document.body.style.overflow = "auto";
    } else {
      els.bossScreen.style.opacity = "0";
      setTimeout(() => {
        els.bossScreen.style.display = "none";
        els.bossScreen.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "hidden";
      }, 200);
    }
  }

  function generateExcelData() {
    const regions = ["华东区", "华北区", "华南区", "西南区", "西北区", "东北区", "华中区"];
    const managers = ["张伟", "李娜", "王强", "刘洋", "陈静", "杨磊", "赵敏", "孙涛", "周洁", "吴磊"];
    const notes = ["", "Q3冲刺", "新客户导入", "续约延迟", "渠道调整", "", "大客户流失", ""];
    let totalSum = 0;

    const tbody = els.excelTbody;
    tbody.innerHTML = "";

    for (let i = 0; i < 50; i++) {
      const q1 = randomRange(120, 580);
      const q2 = randomRange(140, 620);
      const q3 = randomRange(130, 650);
      const yoy = randomRange(-12, 28);
      const targetRate = randomRange(78, 125);
      totalSum += q3;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${regions[i % regions.length]}</td>
        <td>${managers[i % managers.length]}</td>
        <td>${q1.toFixed(1)}</td>
        <td>${q2.toFixed(1)}</td>
        <td>${q3.toFixed(1)}</td>
        <td style="color:${yoy >= 0 ? "#217346" : "#c45c4a"}">${yoy > 0 ? "+" : ""}${yoy.toFixed(1)}%</td>
        <td>${targetRate.toFixed(1)}%</td>
        <td>${notes[i % notes.length]}</td>
      `;
      tbody.appendChild(tr);
    }

    els.excelSum.textContent = totalSum.toFixed(1);
    els.excelAvg.textContent = (totalSum / 50).toFixed(1);
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // ============================================
  // 音频初始化（首次交互后）
  // ============================================
  function initAudioOnFirstInteraction() {
    const events = ["click", "touchstart", "mousedown"];
    const handler = () => {
      audio.init();
      events.forEach((e) => document.removeEventListener(e, handler));
    };
    events.forEach((e) => document.addEventListener(e, handler, { once: true }));
  }

  // ============================================
  // 工具函数
  // ============================================
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ============================================
  // 调试/演示模式（通过 URL 参数触发）
  // ============================================
  function applyDemoParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("focus")) {
      const val = parseInt(params.get("focus"), 10);
      state.focusValue = val;
      els.focusSlider.value = val;
      updateFocusVisuals(val);
      hideInteractionHint();
    }
    if (params.has("wipe")) {
      const ratio = parseFloat(params.get("wipe"));
      // 模拟擦除：随机擦除对应比例的像素
      const w = els.fogCanvas.width / state.canvasScale;
      const h = els.fogCanvas.height / state.canvasScale;
      ctx.globalCompositeOperation = "destination-out";
      const totalArea = w * h;
      const eraseArea = totalArea * ratio;
      const brushSize = 40;
      const strokes = Math.ceil(eraseArea / (Math.PI * brushSize * brushSize));
      for (let i = 0; i < strokes; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, Math.PI * 2);
        ctx.fill();
      }
      state.wipeProgress = ratio;
      updateWipeProgressUI();
      hideInteractionHint();
    }
    if (params.has("reveal")) {
      const p = state.photo;
      const revealFocus = p ? p.sweetSpot : 50;
      state.focusValue = revealFocus;
      state.wipeProgress = 1;
      els.focusSlider.value = revealFocus;
      updateFocusVisuals(revealFocus);
      updateWipeProgressUI();
      // 演示模式：跳过动画直接显示
      state.isRevealed = true;
      ctx.clearRect(0, 0, els.fogCanvas.width / state.canvasScale, els.fogCanvas.height / state.canvasScale);
      els.photoImage.style.filter = "blur(0px)";
      els.focusSlider.disabled = true;
      fillRevealCard();
      els.revealCard.style.transition = "none";
      els.revealCard.classList.add("visible");
      els.revealCard.setAttribute("aria-hidden", "false");
      els.app.classList.add("revealed");
    }
    if (params.has("boss")) {
      toggleBossMode();
    }
  }

  // ============================================
  // 启动
  // ============================================
  async function onReady() {
    initDateDisplay();
    await loadTodayPhoto();
    initCanvas();
    initSliderTicks();
    initFocusSlider();
    initWipeInteraction();
    initCustomCursor();
    initAmbientLight();
    initBossKey();
    initRevealActions();
    initAudioOnFirstInteraction();
    // 延迟应用演示参数
    setTimeout(applyDemoParams, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => onReady());
  } else {
    onReady();
  }
})();
