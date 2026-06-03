/**
 * LensPause · i18n 国际化系统
 * 支持自动语言检测 + 手动切换
 * 使用 sessionStorage 持久化用户选择（非 localStorage）
 */

(function () {
  "use strict";

  const STORAGE_KEY = "lenspause_lang";

  const TRANSLATIONS = {
    zh: {
      "brand.name": "LensPause",
      "brand.subtitle": "息影",
      "date.counter": "今日",
      "date.months": ["一","二","三","四","五","六","七","八","九","十","十一","十二"],
      "date.format": "{M}月{D}日",
      "hint.focus": "转动对焦环，寻找最佳合焦位置",
      "hint.wipe": "在画面上滑动擦拭雾气",
      "slider.near": "近端",
      "slider.ring": "对焦环",
      "slider.far": "远端",
      "hud.out": "失焦",
      "hud.near": "接近",
      "hud.locked": "合焦",
      "exif.camera": "CAMERA",
      "exif.lens": "LENS",
      "exif.film": "FILM",
      "exif.shutter": "SHUTTER",
      "exif.aperture": "APERTURE",
      "btn.restart": "再来一次",
      "btn.save": "保存心境",
      "toast.copied": "已复制到剪贴板",
      "share.title": "LensPause · 息影",
      "share.format": "「{title}」\n{quote}\n\n—— 每日一帧，片刻清晰",
      "photo.alt": "今日摄影作品",
      "fallback.title": "图片加载中…",
      "fallback.hint": "请检查网络连接",
      "boss.hint": "按 Esc 返回息影",
      "boss.ribbon.file": "文件",
      "boss.ribbon.home": "开始",
      "boss.ribbon.insert": "插入",
      "boss.ribbon.data": "数据",
      "boss.ribbon.review": "审阅",
      "boss.ribbon.view": "视图",
      "boss.toolbar.sort": "排序",
      "boss.toolbar.filter": "筛选",
      "boss.toolbar.pivot": "透视表",
      "boss.toolbar.format": "条件格式",
      "boss.toolbar.validate": "数据验证",
      "boss.sheet.summary": "Q3汇总",
      "boss.sheet.east": "华东区",
      "boss.sheet.north": "华北区",
      "boss.sheet.south": "华南区",
      "boss.sheet.southwest": "西南区",
      "boss.status.ready": "就绪",
      "boss.status.avg": "平均值",
      "boss.status.sum": "求和",
      "boss.status.count": "计数",
      "boss.table.region": "区域",
      "boss.table.manager": "负责人",
      "boss.table.q1": "Q1营收(万)",
      "boss.table.q2": "Q2营收(万)",
      "boss.table.q3": "Q3营收(万)",
      "boss.table.yoy": "同比增长",
      "boss.table.target": "目标完成率",
      "boss.table.note": "备注",
      "boss.note.q3": "Q3冲刺",
      "boss.note.new": "新客户导入",
      "boss.note.delay": "续约延迟",
      "boss.note.channel": "渠道调整",
      "boss.note.loss": "大客户流失",
      "lang.switch": "切换语言",
    },
    en: {
      "brand.name": "LensPause",
      "brand.subtitle": "Pause",
      "date.counter": "Today",
      "date.months": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      "date.format": "{M} {D}",
      "hint.focus": "Turn the focus ring to find the sweet spot",
      "hint.wipe": "Swipe across the image to wipe away the fog",
      "slider.near": "Near",
      "slider.ring": "Focus Ring",
      "slider.far": "Far",
      "hud.out": "Out of Focus",
      "hud.near": "Near Focus",
      "hud.locked": "Focused",
      "exif.camera": "CAMERA",
      "exif.lens": "LENS",
      "exif.film": "FILM",
      "exif.shutter": "SHUTTER",
      "exif.aperture": "APERTURE",
      "btn.restart": "Try Again",
      "btn.save": "Save Mood",
      "toast.copied": "Copied to clipboard",
      "share.title": "LensPause",
      "share.format": "「{title}」\n{quote}\n\n—— One frame a day, a moment of clarity",
      "photo.alt": "Today's Photo",
      "fallback.title": "Loading image…",
      "fallback.hint": "Please check your connection",
      "boss.hint": "Press Esc to return",
      "boss.ribbon.file": "File",
      "boss.ribbon.home": "Home",
      "boss.ribbon.insert": "Insert",
      "boss.ribbon.data": "Data",
      "boss.ribbon.review": "Review",
      "boss.ribbon.view": "View",
      "boss.toolbar.sort": "Sort",
      "boss.toolbar.filter": "Filter",
      "boss.toolbar.pivot": "Pivot",
      "boss.toolbar.format": "Format",
      "boss.toolbar.validate": "Validate",
      "boss.sheet.summary": "Q3 Summary",
      "boss.sheet.east": "East",
      "boss.sheet.north": "North",
      "boss.sheet.south": "South",
      "boss.sheet.southwest": "SW",
      "boss.status.ready": "Ready",
      "boss.status.avg": "Avg",
      "boss.status.sum": "Sum",
      "boss.status.count": "Count",
      "boss.table.region": "Region",
      "boss.table.manager": "Manager",
      "boss.table.q1": "Q1 Revenue",
      "boss.table.q2": "Q2 Revenue",
      "boss.table.q3": "Q3 Revenue",
      "boss.table.yoy": "YoY Growth",
      "boss.table.target": "Target Rate",
      "boss.table.note": "Note",
      "boss.note.q3": "Q3 Sprint",
      "boss.note.new": "New Client",
      "boss.note.delay": "Renewal Delay",
      "boss.note.channel": "Channel Adj.",
      "boss.note.loss": "Client Churn",
      "lang.switch": "Switch Language",
    },
  };

  // 检测浏览器语言
  function detectLanguage() {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && TRANSLATIONS[saved]) return saved;

    const nav = navigator.language || navigator.userLanguage || "zh";
    if (nav.toLowerCase().startsWith("zh")) return "zh";
    return "en";
  }

  let currentLang = detectLanguage();

  // 格式化字符串：支持 {key} 占位符
  function format(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
  }

  // 获取翻译值
  function t(key, vars) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.zh;
    const val = dict[key];
    if (val === undefined) {
      const fallback = TRANSLATIONS.zh[key];
      return fallback !== undefined ? format(fallback, vars) : key;
    }
    return format(val, vars);
  }

  // 设置语言
  function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    sessionStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
    updateDOM();
  }

  // 扫描 DOM 更新 data-i18n 元素
  function updateDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (!key) return;
      const text = t(key);
      // 特殊处理：如果元素内有其他节点（如计数器中的数字），只替换文本节点
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        el.textContent = text;
      } else {
        // 找到第一个纯文本节点替换，或插入到开头
        const textNode = Array.from(el.childNodes).find(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
        );
        if (textNode) {
          textNode.textContent = text;
        } else {
          el.insertBefore(document.createTextNode(text), el.firstChild);
        }
      }
    });
    // 更新 data-i18n-attr 属性
    document.querySelectorAll("[data-i18n-attr][data-i18n-attr-key]").forEach((el) => {
      const attr = el.dataset.i18nAttr;
      const key = el.dataset.i18nAttrKey;
      if (!attr || !key) return;
      el.setAttribute(attr, t(key));
    });
  }

  // 初始化语言切换按钮
  function initLangSwitcher() {
    const switcher = document.getElementById("lang-switcher");
    if (!switcher) return;

    const btns = switcher.querySelectorAll(".lang-btn");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.dataset.lang;
        if (lang === currentLang) return;
        setLanguage(lang);
        btns.forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
      });
    });

    // 初始化按钮状态
    btns.forEach((b) => b.classList.toggle("active", b.dataset.lang === currentLang));
  }

  // 暴露全局 API
  window.i18n = {
    t,
    setLanguage,
    getLanguage: () => currentLang,
    updateDOM,
    initLangSwitcher,
  };

  // DOM 就绪后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
      initLangSwitcher();
      updateDOM();
    });
  } else {
    document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
    initLangSwitcher();
    updateDOM();
  }
})();
