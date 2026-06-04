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
    isRevealed: false,
    isBossMode: false,
    isDragging: false,
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
    bossScreen: $("boss-screen"),
    excelTbody: $("excel-tbody"),
    excelAvg: $("excel-avg"),
    excelSum: $("excel-sum"),
    dateDisplay: $("date-display"),
    btnRestart: $("btn-restart"),
    btnShare: $("btn-share"),
    revealInner: $("reveal-inner"),
    revealHandle: $("reveal-handle"),
    donateModal: $("donate-modal"),
    donateOverlay: $("donate-overlay"),
    donateClose: $("donate-close"),
    donateDismiss: $("donate-dismiss"),
    donateCta: $("donate-cta"),
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

    initAmbientLight();
    initBossKey();
    initRevealActions();
    initAudioOnFirstInteraction();
  }

  function initDateDisplay() {
    const now = new Date();
    const months = window.i18n.t("date.months");
    const M = months[now.getMonth()];
    const D = now.getDate();
    els.dateDisplay.textContent = window.i18n.t("date.format", { M, D });
  }

  async function loadTodayPhoto() {
    const apiBase = window.location.hostname === "localhost"
      ? "http://localhost:3001"
      : "";

    try {
      let resp = await fetch(`${apiBase}/api/photos/today`);

      // 如果 photo pool 为空（503），自动触发 fetch 填充池子
      if (resp.status === 503) {
        console.log("Photo pool empty, fetching new photos...");
        const fetchResp = await fetch(`${apiBase}/api/photos/fetch?count=10`, { method: "POST" });
        if (fetchResp.ok) {
          console.log("Photos fetched, retrying today photo...");
          resp = await fetch(`${apiBase}/api/photos/today`);
        }
      }

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

    // 每次加载都重新随机化 sweetSpot，让用户每次都有不确定性
    randomizeFocusParams();

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
            <p class="fallback-hint">${window.i18n.t("fallback.title")}</p>
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
        url: "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&q=80",
        title: "晨雾中的灯塔",
        photographer: "Hiroshi Sugimoto",
        photographer_link: "",
        exif: { camera: "LEICA M6", lens: "35mm f/2", film: "Portra 400", shutter: "1/125s", aperture: "f/8" },
        quote: "有时候，增加一点颗粒感，生活的粗糙也就成了质感。",
        sweetSpot: 47, tolerance: 5, curve: 0.78,
      },
      {
        id: "fallback-002",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
        title: "雨后的玻璃窗",
        photographer: "Saul Leiter",
        photographer_link: "",
        exif: { camera: "Contax T2", lens: "38mm f/2.8", film: "Kodak Gold 200", shutter: "1/60s", aperture: "f/4" },
        quote: "模糊不是缺陷，是光线在寻找另一种表达。",
        sweetSpot: 35, tolerance: 6, curve: 0.65,
      },
      {
        id: "fallback-003",
        url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=800&q=80",
        title: "旧书店的午后",
        photographer: "William Eggleston",
        photographer_link: "",
        exif: { camera: "LEICA M10", lens: "50mm f/1.4", film: "Digital", shutter: "1/250s", aperture: "f/2" },
        quote: "每一束穿过尘埃的光，都是时间写下的诗。",
        sweetSpot: 55, tolerance: 4, curve: 0.9,
      },
    ];
    return fallbackPhotos[Math.floor(Math.random() * fallbackPhotos.length)];
  }

  // 每次页面加载时随机化对焦参数，制造不确定性
  function randomizeFocusParams() {
    if (!state.photo) return;
    // sweetSpot: 20-80 之间随机整数
    state.photo.sweetSpot = Math.floor(20 + Math.random() * 61);
    // tolerance: 5-10 之间随机整数（配合 step=5 段落感，确保总能合焦）
    state.photo.tolerance = Math.floor(5 + Math.random() * 6);
    // curve: 0.5-1.1 之间随机，保留两位小数
    state.photo.curve = Math.round((0.5 + Math.random() * 0.6) * 100) / 100;
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
      text.textContent = window.i18n.t("hud.locked");
      hud.classList.add("in-range");
      els.focusSlider.classList.add("in-sweet-spot");
    } else if (dist <= p.tolerance * 2.5) {
      dot.className = "hud-dot near";
      text.className = "hud-text near";
      text.textContent = window.i18n.t("hud.near");
      hud.classList.remove("in-range");
      els.focusSlider.classList.remove("in-sweet-spot");
    } else {
      dot.className = "hud-dot";
      text.className = "hud-text";
      text.textContent = window.i18n.t("hud.out");
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

    // 经过 5% 刻度点时轻反馈
    const tickSpacing = 5;
    const currentTick = Math.floor(value / tickSpacing);
    if (currentTick !== lastTickCrossed) {
      lastTickCrossed = currentTick;
      document.querySelectorAll(".tick-mark").forEach((t) => {
        const tv = parseInt(t.dataset.value, 10);
        t.classList.toggle("active", tv === currentTick * tickSpacing);
      });
    }

    checkRevealCondition();
  }

  function handleFocusChange() {
    // 释放时不再吸附，保留用户精调结果
    const value = parseInt(els.focusSlider.value, 10);
    state.focusValue = value;
    updateFocusVisuals(value);
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
    if (inSweetSpot) {
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
    els.photoPhotographer.textContent = `${p.photographer}`;
    els.exifCamera.textContent = p.exif.camera;
    els.exifLens.textContent = p.exif.lens;
    els.exifFilm.textContent = p.exif.film;
    els.exifShutter.textContent = p.exif.shutter;
    els.exifAperture.textContent = p.exif.aperture;
    els.photoQuote.textContent = p.quote;
  }

  // ============================================
  // 打赏弹窗计数与触发
  // ============================================
  const DONATE_COUNT_KEY = "lenspause_restart_count";
  const DONATE_DATE_KEY = "lenspause_restart_date";
  const DONATE_THRESHOLD = 4;

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function incrementRestartCount() {
    const today = getTodayStr();
    const storedDate = sessionStorage.getItem(DONATE_DATE_KEY);
    let count = parseInt(sessionStorage.getItem(DONATE_COUNT_KEY) || "0", 10);

    if (storedDate !== today) {
      count = 0;
      sessionStorage.setItem(DONATE_DATE_KEY, today);
    }

    count += 1;
    sessionStorage.setItem(DONATE_COUNT_KEY, String(count));
    return count;
  }

  function shouldShowDonate() {
    const today = getTodayStr();
    const storedDate = sessionStorage.getItem(DONATE_DATE_KEY);
    const count = parseInt(sessionStorage.getItem(DONATE_COUNT_KEY) || "0", 10);
    return storedDate === today && count >= DONATE_THRESHOLD;
  }

  function showDonateModal() {
    if (!els.donateModal) return;
    els.donateModal.style.display = "flex";
    els.donateModal.setAttribute("aria-hidden", "false");
    void els.donateModal.offsetWidth;
    els.donateModal.style.opacity = "1";
  }

  function hideDonateModal() {
    if (!els.donateModal) return;
    els.donateModal.style.opacity = "0";
    setTimeout(() => {
      els.donateModal.style.display = "none";
      els.donateModal.setAttribute("aria-hidden", "true");
    }, 300);
  }

  function initDonateModal() {
    if (!els.donateModal) return;

    els.donateClose.addEventListener("click", hideDonateModal);
    els.donateDismiss.addEventListener("click", hideDonateModal);
    els.donateOverlay.addEventListener("click", hideDonateModal);

    // 金额按钮切换
    document.querySelectorAll(".amount-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".amount-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  async function loadRandomPhoto(allowAutoFetch = true) {
    const apiBase = window.location.hostname === "localhost"
      ? "http://localhost:3001"
      : "";

    try {
      let resp = await fetch(`${apiBase}/api/photos`);

      // 如果 photo pool 为空（503），自动触发 fetch 填充池子
      if (allowAutoFetch && resp.status === 503) {
        console.log("Photo pool empty, fetching new photos...");
        const fetchResp = await fetch(`${apiBase}/api/photos/fetch?count=10`, { method: "POST" });
        if (fetchResp.ok) {
          console.log("Photos fetched, retrying pool...");
          resp = await fetch(`${apiBase}/api/photos`);
        }
      }

      if (!resp.ok) throw new Error("API failed");
      const pool = await resp.json();
      if (!Array.isArray(pool) || pool.length === 0) throw new Error("Empty pool");

      // 随机选一张（尽量不和当前重复）
      let attempts = 0;
      let selected;
      do {
        selected = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
      } while (state.photo && selected.id === state.photo.id && attempts < 5);

      state.photo = {
        id: selected.id,
        url: selected.image_url,
        title: selected.title,
        photographer: selected.photographer,
        photographer_link: selected.photographer_link,
        exif: selected.exif,
        quote: selected.quote,
        sweetSpot: selected.focus_params.sweet_spot,
        tolerance: selected.focus_params.tolerance,
        curve: selected.focus_params.curve,
      };
      randomizeFocusParams();
    } catch (err) {
      console.warn("Failed to load random photo, using local fallback", err);
      if (!state.photo) {
        state.photo = getFallbackPhoto();
        randomizeFocusParams();
      }
    }

    // 更新图片元素
    els.photoImage.src = state.photo.url;
    els.photoImage.alt = state.photo.title;
    updateSweetSpotZone();
  }

  function resetReveal() {
    state.isRevealed = false;
    state.focusValue = 0;
    lastTickCrossed = -1;

    els.revealCard.classList.remove("visible");
    els.revealCard.setAttribute("aria-hidden", "true");
    els.app.classList.remove("revealed");

    els.focusSlider.disabled = false;
    els.focusSlider.value = 0;
    updateFocusVisuals(0);
    updateFocusHUD(0);
    updateSweetSpotZone();

    // 清除刻度高亮
    document.querySelectorAll(".tick-mark").forEach((t) => t.classList.remove("active"));

    els.focusProgress.parentElement.parentElement.style.opacity = "";
    els.interactionHint.classList.remove("hidden");

    drawFog();

    // 换一张新照片
    loadRandomPhoto().then(() => {
      els.photoImage.src = state.photo.url;
      els.photoImage.alt = state.photo.title;
      updateSweetSpotZone();
    });

    // 计数并判断是否弹出打赏
    const count = incrementRestartCount();
    if (count >= DONATE_THRESHOLD) {
      setTimeout(showDonateModal, 600);
    }
  }

  // ============================================
  // 显影后操作
  // ============================================
  function dismissRevealCard() {
    if (!state.isRevealed) return;
    els.revealCard.classList.remove("visible");
    els.revealCard.setAttribute("aria-hidden", "true");
    els.app.classList.remove("revealed");
    els.focusProgress.parentElement.parentElement.style.opacity = "";
  }

  function initRevealActions() {
    els.btnRestart.addEventListener("click", resetReveal);
    els.btnShare.addEventListener("click", handleShare);

    // 点击照片区域收起卡片
    document.getElementById("photo-area").addEventListener("click", (e) => {
      if (state.isRevealed) {
        dismissRevealCard();
      }
    });

    // 拖拽手柄：点击 + 下滑手势收起卡片
    let touchStartY = 0;
    let touchMoved = false;

    els.revealHandle.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissRevealCard();
    });

    els.revealHandle.addEventListener("touchstart", (e) => {
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    }, { passive: true });

    els.revealHandle.addEventListener("touchmove", (e) => {
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 10) {
        touchMoved = true;
        dismissRevealCard();
      }
    }, { passive: true });

    els.revealHandle.addEventListener("touchend", (e) => {
      if (!touchMoved) {
        dismissRevealCard();
      }
    });
  }

  function handleShare() {
    const text = window.i18n.t("share.format", {
      title: state.photo.title,
      quote: state.photo.quote,
    });
    if (navigator.share) {
      navigator.share({
        title: window.i18n.t("share.title"),
        text: text,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(window.i18n.t("toast.copied"));
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

    // i18n 切换时重新生成 Boss 数据（保持英文即可，Excel 伪装无 i18n 必要）
    document.addEventListener("i18n:changed", () => {
      initDateDisplay();
      updateFocusHUD(state.focusValue);
    });

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
    const regions = ["East", "North", "South", "SW", "NW", "NE", "Central"];
    const managers = ["Zhang", "Li", "Wang", "Liu", "Chen", "Yang", "Zhao", "Sun", "Zhou", "Wu"];
    const notes = ["", "Q3 Sprint", "New Client", "Renewal Delay", "Channel Adj.", "", "Client Churn", ""];
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
    if (params.has("reveal")) {
      const p = state.photo;
      const revealFocus = p ? p.sweetSpot : 50;
      state.focusValue = revealFocus;
      els.focusSlider.value = revealFocus;
      updateFocusVisuals(revealFocus);
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
    await loadRandomPhoto();
    initCanvas();
    initSliderTicks();
    initFocusSlider();

    initAmbientLight();
    initBossKey();
    initRevealActions();
    initAudioOnFirstInteraction();
    initDonateModal();
    // 延迟应用演示参数
    setTimeout(applyDemoParams, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => onReady());
  } else {
    onReady();
  }
})();
