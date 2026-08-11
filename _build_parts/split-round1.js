/**
 * Round 1: split index monolith → eat.html + modular CSS/JS
 * Also applies CR fixes: budget, allergies, strict cuisine, calorie status
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const parts = __dirname;

function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("wrote", rel, Buffer.byteLength(content), "bytes");
}

/* ---------- CSS split ---------- */
const css = fs.readFileSync(path.join(parts, "styles.css"), "utf8");

// Extract :root block
const rootMatch = css.match(/:root\s*\{[\s\S]*?\n\}/);
if (!rootMatch) throw new Error("no :root");
const tokensCss = `/* 今日宜 · design tokens */\n${rootMatch[0]}\n`;

// Everything except :root, then split media queries to responsive
let rest = css.replace(rootMatch[0], "/* tokens in tokens.css */");

// Pull @media blocks into responsive.css
const mediaBlocks = [];
rest = rest.replace(/@media[^{]+\{[\s\S]*?\n\}(?=\s*(?:@media|\s*$|\s*\/\*))/g, (m) => {
  // This regex is fragile; do simpler approach
  return m;
});

// Simpler CSS split strategy:
// tokens.css = :root
// base.css = reset + layout primitives
// components.css = rest without @media
// responsive.css = all @media

const mediaRe = /@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g;
const mediaList = css.match(mediaRe) || [];
// Better nested media extraction with brace counting
function extractMedia(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf("@media", i);
    if (idx === -1) break;
    let j = src.indexOf("{", idx);
    if (j === -1) break;
    let depth = 0;
    let k = j;
    for (; k < src.length; k++) {
      if (src[k] === "{") depth++;
      else if (src[k] === "}") {
        depth--;
        if (depth === 0) {
          k++;
          break;
        }
      }
    }
    out.push(src.slice(idx, k));
    i = k;
  }
  return out;
}

const mediaAll = extractMedia(css);
let cssNoMedia = css;
mediaAll.forEach((m) => {
  cssNoMedia = cssNoMedia.replace(m, "");
});
// remove :root from components base
cssNoMedia = cssNoMedia.replace(rootMatch[0], "");

// base: early reset + page chrome
const baseMarkers = [
  "*, *::before",
  "html {",
  "body {",
  "button, input",
  "a {",
  ":focus-visible",
  ".sr-only",
  "[hidden]",
  ".bg-deco",
  ".blob",
  ".page {",
  ".site-header",
  ".brand",
  ".header-right",
  ".header-meta",
  ".btn-icon",
  ".layout {",
  ".site-footer"
];

// Practical split: base = reset+layout shell; components = everything else without media; responsive = media
const baseCss = `/* 今日宜 · base */
${rootMatch[0].replace(":root", "/* tokens loaded separately; keep fallback */\n:root")}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body {
  margin: 0; min-width: 320px; font-family: var(--font);
  color: var(--ink); background: var(--cream); line-height: 1.55;
  overflow-x: hidden;
  padding-left: var(--safe-l); padding-right: var(--safe-r);
}
button, input, select, textarea { font: inherit; color: inherit; }
a { color: var(--tomato-deep); }
:focus-visible { outline: 3px solid var(--yolk); outline-offset: 2px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
[hidden] { display: none !important; }

.bg-deco { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.blob { position: absolute; border-radius: 50%; opacity: 0.5; }
.blob-a {
  width: 220px; height: 220px; top: -60px; right: -40px;
  background: radial-gradient(circle at 30% 30%, var(--yolk-soft), transparent 70%);
}
.blob-b {
  width: 280px; height: 280px; bottom: 8%; left: -100px;
  background: radial-gradient(circle at 60% 40%, rgba(135,185,116,0.35), transparent 70%);
}
.blob-c {
  width: 150px; height: 150px; top: 40%; right: 5%;
  background: radial-gradient(circle at 40% 40%, rgba(255,107,87,0.16), transparent 70%);
}

.page {
  position: relative; z-index: 1;
  width: min(1180px, calc(100% - 32px));
  margin-inline: auto;
  padding: clamp(12px, 2vw, 20px) 0 calc(1.5rem + var(--safe-b) + var(--sticky-h));
  min-width: 0;
}

/* 全局顶栏导航 */
.app-nav {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 0.5rem 0.75rem; margin-bottom: clamp(0.65rem, 1.5vw, 1rem);
  padding: 0.45rem 0.65rem;
  background: rgba(255,255,255,0.78);
  border: 1.5px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  min-width: 0;
}
.app-nav-brand {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-weight: 800; color: var(--caramel); text-decoration: none;
  font-size: 0.95rem; min-height: var(--touch);
}
.app-nav-links {
  display: flex; flex-wrap: wrap; gap: 0.35rem; min-width: 0;
}
.app-nav-links a {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 40px; padding: 0.35rem 0.7rem;
  border-radius: var(--radius-pill);
  text-decoration: none; color: var(--ink-soft);
  font-size: 0.8rem; font-weight: 600;
  border: 1.5px solid transparent;
}
.app-nav-links a:hover { color: var(--caramel); background: var(--cream); }
.app-nav-links a[aria-current="page"] {
  background: var(--yolk); color: var(--caramel);
  border-color: #E8B040; font-weight: 800;
}

.site-footer {
  margin-top: 1.4rem; text-align: center; font-size: 0.74rem;
  color: var(--caramel-soft); line-height: 1.6; padding: 0 0.5rem;
}
.site-footer a { color: var(--caramel); }

.home-shell {
  background: rgba(255,255,255,0.85);
  border: 1.5px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: var(--panel-padding);
  min-width: 0;
}
.home-shell h1 { margin: 0 0 0.35rem; color: var(--caramel); font-size: var(--title-size); }
.home-shell p { margin: 0 0 0.85rem; color: var(--ink-soft); font-size: 0.9rem; }
.home-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.home-actions a.btn { text-decoration: none; }
`;

// components = original css without :root and without media, plus remove duplicated base bits carefully
// Use full cssNoMedia as components after stripping early resets already in base
const componentsCss = `/* 今日宜 · components (饭饭搭子 + 共享) */\n${cssNoMedia}\n`;

const responsiveCss = `/* 今日宜 · responsive */\n${mediaAll.join("\n\n")}\n
@media (max-width: 640px) {
  .page { width: calc(100% - 24px); }
}
@media (max-width: 480px) {
  .app-nav-links a { padding: 0.35rem 0.55rem; font-size: 0.74rem; }
}
`;

write("assets/css/tokens.css", tokensCss);
write("assets/css/base.css", baseCss);
write("assets/css/components.css", componentsCss);
write("assets/css/responsive.css", responsiveCss);

/* ---------- Core JS modules ---------- */
const utilsJs = `/* 今日宜 · utils */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};

  function $(sel, r) { return (r || document).querySelector(sel); }
  function $all(sel, r) { return Array.prototype.slice.call((r || document).querySelectorAll(sel)); }

  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < String(str).length; i++) {
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function todayKey(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }
  function formatChineseDate(d) {
    var week = ["日", "一", "二", "三", "四", "五", "六"];
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 周" + week[d.getDay()];
  }
  function formatRelativeTime(ts) {
    var d = new Date(ts);
    var now = new Date();
    var hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var dayDiff = Math.round((startToday - startThat) / 86400000);
    if (dayDiff === 0) return "今天 " + hm;
    if (dayDiff === 1) return "昨天 " + hm;
    if (dayDiff < 7) return dayDiff + " 天前 " + hm;
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + hm;
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function toast(msg) {
    var el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      var host = document.querySelector(".toast-host");
      if (!host) {
        host = document.createElement("div");
        host.className = "toast-host";
        host.setAttribute("aria-live", "assertive");
        document.body.appendChild(host);
      }
      host.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("is-on"); }, 2400);
  }
  function safeJsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function uid(prefix) {
    return (prefix || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  TY.utils = {
    $, $all, hashStr, mulberry32, todayKey, formatChineseDate, formatRelativeTime,
    escapeHtml, toast, safeJsonParse, uid, clone
  };
})(window);
`;

const storageJs = `/* 今日宜 · storage
 * 新命名空间 todayyi_* 与饭饭搭子 fanfan_* 并存；第一阶段不重命名 fanfan 键。
 */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var u = TY.utils;
  if (!u) throw new Error("TodayYi.utils required");

  var KEYS = {
    // 今日宜统一
    profile: "todayyi_profile_v1",
    dailyPlan: "todayyi_daily_plan_v1",
    activityHistory: "todayyi_activity_history_v1",
    favorites: "todayyi_favorites_v1",
    studyTasks: "todayyi_study_tasks_v1",
    focusLogs: "todayyi_focus_logs_v1",
    settings: "todayyi_settings_v1",
    // 饭饭搭子（保持原键，禁止改名）
    fanfan: {
      settings: "fanfan_settings_v3",
      settingsLegacy: "fanfan_settings_v2",
      currentMenu: "fanfan_current_menu_v2",
      recommendHistory: "fanfan_recommend_history_v2",
      eatenHistory: "fanfan_eaten_history_v2",
      favorites: "fanfan_favorites_v2",
      hasArranged: "fanfan_has_arranged_v2",
      calorieLogs: "fanfan_calorie_logs_v1",
      calorieSettings: "fanfan_calorie_settings_v1",
      menuCheckin: "fanfan_menu_checkin_v1"
    }
  };

  function get(key, fallback) {
    try {
      return u.safeJsonParse(localStorage.getItem(key), fallback);
    } catch (e) {
      return fallback;
    }
  }
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }
  function getRaw(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function setRaw(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function getProfile() {
    var p = get(KEYS.profile, null);
    if (!p || typeof p !== "object") {
      p = { id: u.uid("p_"), createdAt: Date.now() };
      set(KEYS.profile, p);
    }
    if (!p.id) {
      p.id = u.uid("p_");
      set(KEYS.profile, p);
    }
    return p;
  }

  /** 供首页汇总：把吃饭完成写入统一活动历史（不改 fanfan 原键） */
  function recordActivityCompletion(entry) {
    var list = get(KEYS.activityHistory, []);
    if (!Array.isArray(list)) list = [];
    var row = {
      id: entry.id || u.uid("log_"),
      activityId: entry.activityId || "",
      category: entry.category || "other",
      title: entry.title || "",
      date: entry.date || u.todayKey(),
      status: entry.status || "completed",
      duration: entry.duration == null ? null : entry.duration,
      sourcePage: entry.sourcePage || "",
      completedAt: entry.completedAt || Date.now()
    };
    // 幂等：同日同 activityId + category 不重复
    var exists = list.some(function (x) {
      return x && x.date === row.date && x.activityId === row.activityId &&
        x.category === row.category && x.status === "completed";
    });
    if (exists) return { ok: true, duplicate: true, entry: row };
    list.push(row);
    // 保留近 180 天
    var cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    list = list.filter(function (x) { return x && x.completedAt && x.completedAt >= cutoff; }).slice(-300);
    set(KEYS.activityHistory, list);
    return { ok: true, duplicate: false, entry: row };
  }

  function getActivityHistory() {
    return get(KEYS.activityHistory, []) || [];
  }

  function getTodayPlan() {
    return get(KEYS.dailyPlan, null);
  }
  function setTodayPlan(plan) {
    set(KEYS.dailyPlan, plan);
  }

  TY.storage = {
    KEYS: KEYS,
    get: get,
    set: set,
    getRaw: getRaw,
    setRaw: setRaw,
    remove: remove,
    getProfile: getProfile,
    recordActivityCompletion: recordActivityCompletion,
    getActivityHistory: getActivityHistory,
    getTodayPlan: getTodayPlan,
    setTodayPlan: setTodayPlan
  };
})(window);
`;

const navigationJs = `/* 今日宜 · navigation */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var u = TY.utils;
  if (!u) throw new Error("TodayYi.utils required");

  var LINKS = [
    { id: "home", href: "index.html", label: "今日宜" },
    { id: "eat", href: "eat.html", label: "宜吃饭" },
    { id: "create", href: "create.html", label: "宜创作", soon: true },
    { id: "study", href: "study.html", label: "宜学习", soon: true },
    { id: "relax", href: "relax.html", label: "宜娱乐", soon: true },
    { id: "profile", href: "profile.html", label: "我的", soon: true }
  ];

  function currentPageId() {
    var path = (location.pathname || "").replace(/\\\\/g, "/");
    var file = path.split("/").pop() || "index.html";
    if (!file || file === "") file = "index.html";
    if (file === "index.html" || file === "") return "home";
    if (file.indexOf("eat") === 0) return "eat";
    if (file.indexOf("create") === 0) return "create";
    if (file.indexOf("study") === 0) return "study";
    if (file.indexOf("relax") === 0) return "relax";
    if (file.indexOf("profile") === 0) return "profile";
    return "home";
  }

  function renderNav(mountSel) {
    var mount = u.$(mountSel || "#appNav");
    if (!mount) return;
    var cur = currentPageId();
    var links = LINKS.map(function (l) {
      if (l.soon && l.id !== cur) {
        return '<a href="' + l.href + '" data-soon="1" title="第二轮后开放">' + u.escapeHtml(l.label) + "</a>";
      }
      var curAttr = l.id === cur ? ' aria-current="page"' : "";
      return '<a href="' + l.href + '"' + curAttr + ">" + u.escapeHtml(l.label) + "</a>";
    }).join("");
    mount.innerHTML =
      '<a class="app-nav-brand" href="index.html">🌸 今日宜</a>' +
      '<nav class="app-nav-links" aria-label="主导航">' + links + "</nav>";

    // Round 1：未建模块点进轻提示页即可；soon 链仍可点到占位页
  }

  TY.navigation = {
    LINKS: LINKS,
    currentPageId: currentPageId,
    renderNav: renderNav
  };
})(window);
`;

// Stubs for round 2+
const recommendationJs = `/* 今日宜 · recommendation engine (Round 2 扩展活动推荐；吃饭引擎在 modules/eat.js) */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var u = TY.utils;

  /**
   * 统一活动推荐接口（Round 2 实现）
   * 硬条件：duration / place / materials / budget
   * 软条件：mood / difficulty / explore
   */
  function recommendActivities(opts) {
    opts = opts || {};
    var pool = opts.pool || TY.activityPool || [];
    var exclude = opts.excludeIds || {};
    var hard = pool.filter(function (a) {
      if (!a || exclude[a.id]) return false;
      if (opts.durationMax != null && a.duration != null && a.duration > opts.durationMax) return false;
      if (opts.budgetMax != null && a.budgetMax != null && a.budgetMax > opts.budgetMax) return false;
      if (opts.energy && a.energy && a.energy.indexOf(opts.energy) === -1) return false;
      if (opts.place && a.places && a.places.indexOf(opts.place) === -1) return false;
      if (opts.social && a.social && a.social.indexOf(opts.social) === -1) return false;
      if (opts.categories && opts.categories.length && opts.categories.indexOf(a.category) === -1) return false;
      if (opts.availableMaterials && opts.availableMaterials.length && a.materials && a.materials.length) {
        var ok = a.materials.every(function (m) {
          return opts.availableMaterials.indexOf(m) !== -1 || m === "none";
        });
        if (!ok) return false;
      }
      return true;
    });
    if (!hard.length) {
      return { item: null, relaxed: [], reason: "hard_empty" };
    }
    // 加权随机占位
    var rng = u.mulberry32(u.hashStr(String(opts.seed || Date.now())));
    var scores = hard.map(function (a) {
      var w = 10 + rng() * 5;
      if (opts.moods && a.moods) {
        var hit = opts.moods.filter(function (m) { return a.moods.indexOf(m) !== -1; }).length;
        w += hit * 6;
      }
      if (opts.recentHistory && opts.recentHistory[a.id]) w *= 0.2;
      return Math.max(0, w);
    });
    var total = scores.reduce(function (s, x) { return s + x; }, 0);
    if (total <= 0) return { item: null, relaxed: [], reason: "weight_zero" };
    var r = rng() * total;
    for (var i = 0; i < hard.length; i++) {
      r -= scores[i];
      if (r <= 0) return { item: hard[i], relaxed: [], reason: "ok" };
    }
    return { item: hard[hard.length - 1], relaxed: [], reason: "ok" };
  }

  TY.recommendation = { recommendActivities: recommendActivities };
})(window);
`;

const dailyPlanJs = `/* 今日宜 · daily plan (Round 2) */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var u = TY.utils;
  var storage = TY.storage;

  function emptyPlan(date) {
    return {
      date: date || u.todayKey(),
      state: null,
      main: null,
      side: [],
      completedIds: [],
      rerollCount: 0,
      seed: null
    };
  }

  function loadTodayPlan() {
    var plan = storage.getTodayPlan();
    var today = u.todayKey();
    if (!plan || plan.date !== today) {
      plan = emptyPlan(today);
      storage.setTodayPlan(plan);
    }
    return plan;
  }

  function saveTodayPlan(plan) {
    storage.setTodayPlan(plan);
  }

  function markCompleted(activityId) {
    var plan = loadTodayPlan();
    if (plan.completedIds.indexOf(activityId) === -1) {
      plan.completedIds.push(activityId);
      saveTodayPlan(plan);
    }
    return plan;
  }

  TY.dailyPlan = {
    emptyPlan: emptyPlan,
    loadTodayPlan: loadTodayPlan,
    saveTodayPlan: saveTodayPlan,
    markCompleted: markCompleted
  };
})(window);
`;

const historyJs = `/* 今日宜 · history helpers (Round 2) */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var storage = TY.storage;
  var u = TY.utils;

  function listRecent(days) {
    days = days || 7;
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return (storage.getActivityHistory() || []).filter(function (h) {
      return h && h.completedAt && h.completedAt >= cutoff;
    });
  }

  function recentIdMap(days) {
    var map = {};
    listRecent(days).forEach(function (h) {
      if (h.activityId) map[h.activityId] = (map[h.activityId] || 0) + 1;
    });
    return map;
  }

  function listFavorites() {
    return storage.get(storage.KEYS.favorites, []) || [];
  }

  function toggleFavorite(item) {
    var list = listFavorites();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].activityId === item.activityId) { idx = i; break; }
    }
    if (idx >= 0) list.splice(idx, 1);
    else list.push({
      activityId: item.activityId,
      category: item.category,
      title: item.title,
      ts: Date.now()
    });
    storage.set(storage.KEYS.favorites, list.slice(-100));
    return list;
  }

  TY.history = {
    listRecent: listRecent,
    recentIdMap: recentIdMap,
    listFavorites: listFavorites,
    toggleFavorite: toggleFavorite
  };
})(window);
`;

write("js/core/utils.js", utilsJs);
write("js/core/storage.js", storageJs);
write("js/core/navigation.js", navigationJs);
write("js/core/recommendation.js", recommendationJs);
write("js/core/daily-plan.js", dailyPlanJs);
write("js/core/history.js", historyJs);

/* ---------- Transform app.js → modules/eat.js with CR fixes ---------- */
let app = fs.readFileSync(path.join(parts, "app.js"), "utf8");

// Strip outer IIFE wrapper start/end and use TodayYi.utils where helpful — keep self-contained for stability
// Apply surgical CR fixes:

// 1) Budget: hard cap by dish tier correctly; ≤20 must not allow 15to30
const oldBudget = `  function budgetMaxToDishOk(budgetMax, dishBudget) {
    if (budgetMax == null) return true;
    var order = { under15: 15, "15to30": 30, over30: 45 };
    var dishMax = order[dishBudget] || 30;
    // dish.budget 是档位；用户 budgetMax 为硬上限
    if (budgetMax <= 15) return dishMax <= 15;
    if (budgetMax <= 30) return dishMax <= 30;
    return true;
  }`;

const newBudget = `  /** 菜品预算档位上界（硬比较用） */
  function dishBudgetCap(dishBudget) {
    if (dishBudget === "under15") return 15;
    if (dishBudget === "15to30") return 30;
    if (dishBudget === "over30") return 999;
    return 30;
  }
  /**
   * 用户 budgetMax 为硬上限（元）：
   * - ≤15：仅 under15
   * - ≤20 / ≤30：不可 over30（15to30 的 cap=30，仅当 budgetMax>=30 才放行 15to30）
   * - null：不限
   * 「15+ / 30+」在 UI 层应写入 budgetMax=null（无硬上限）
   */
  function budgetMaxToDishOk(budgetMax, dishBudget) {
    if (budgetMax == null || budgetMax === "" || budgetMax === "any") return true;
    var cap = Number(budgetMax);
    if (!isFinite(cap)) return true;
    // 数据只有 under15 / 15to30 / over30 三档；≤10 与 ≤15 共用 under15 档
    if (cap <= 15) return dishBudgetCap(dishBudget) <= 15;
    return dishBudgetCap(dishBudget) <= cap;
  }`;

if (!app.includes("function budgetMaxToDishOk")) throw new Error("budget fn missing");
app = app.replace(oldBudget, newBudget);
if (app.includes("var order = { under15: 15")) {
  console.warn("budget replace may have failed");
}

// 2) Allergy null-safe + broader protein checks
const oldTags = `    var tags = settings.tags || {};
    if (tags.noSpicy && dish.spicy > 0) return false;
    if (tags.noBeef && (dish.allergens.indexOf("beef") !== -1 || dish.protein === "牛肉")) return false;
    if (tags.noPork && (dish.allergens.indexOf("pork") !== -1 || dish.protein === "猪肉")) return false;
    if (tags.noSeafood && (dish.allergens.indexOf("seafood") !== -1 || (dish.dietFlags && dish.dietFlags.containsSeafood))) return false;
    if (tags.noEgg && dish.allergens.indexOf("egg") !== -1) return false;
    if (tags.noMilk && dish.allergens.indexOf("milk") !== -1) return false;
    if (tags.noNuts && dish.allergens.indexOf("nuts") !== -1) return false;`;

const newTags = `    var tags = settings.tags || {};
    var allergens = dish.allergens || [];
    var protein = dish.protein || "";
    if (tags.noSpicy && (dish.spicy || 0) > 0) return false;
    if (tags.noBeef && (allergens.indexOf("beef") !== -1 || protein === "牛肉" || /牛肉/.test(dish.name || ""))) return false;
    if (tags.noPork && (allergens.indexOf("pork") !== -1 || protein === "猪肉" || protein === "腊肉")) return false;
    if (tags.noSeafood && (
      allergens.indexOf("seafood") !== -1 ||
      protein === "虾" || protein === "鱼" ||
      (dish.dietFlags && dish.dietFlags.containsSeafood) ||
      /海鲜|虾|鱼|蟹|贝|海参/.test(dish.name || "")
    )) return false;
    if (tags.noEgg && allergens.indexOf("egg") !== -1) return false;
    if (tags.noMilk && allergens.indexOf("milk") !== -1) return false;
    if (tags.noNuts && allergens.indexOf("nuts") !== -1) return false;`;

if (!app.includes(oldTags)) {
  // try looser
  console.warn("exact tags block not found, trying alternate");
}
app = app.replace(oldTags, newTags);

// 3) Strict cuisine: NEVER auto-relax (remove special-case that flips cuisineMode)
const oldStrictRelax = `      if (key === "goal" && (settings.goal === "casual" || settings.goal === "ovo_lacto")) continue;
      // 严格菜系放宽：从必须改为优先（softFlags.cuisine=false 且临时改 mode 逻辑在硬条件里）
      if (key === "cuisine" && settings.cuisineMode === "strict") {
        // 通过 softFlags.cuisine=false 让硬条件中的严格菜系失效
        flags.cuisine = false;
        relaxed.push(key);
        // 临时：用 soft 语义继续
        if (poolSize(flags) > 0) break;
        continue;
      }
      flags[key] = false;`;

const newStrictRelax = `      if (key === "goal" && (settings.goal === "casual" || settings.goal === "ovo_lacto")) continue;
      // 严格菜系是硬条件：绝不自动放宽
      if (key === "cuisine" && settings.cuisineMode === "strict") continue;
      // 软菜系可放宽（仅加权偏好时 cuisine 在 softFlags 中关闭）
      flags[key] = false;`;

app = app.replace(oldStrictRelax, newStrictRelax);

// Remove settingsForMatch cuisineMode soft flip for strict
const oldMatchFlip = `        var settingsForMatch = settings;
        if (resolved.relaxed.indexOf("cuisine") !== -1 && settings.cuisineMode === "strict") {
          settingsForMatch = Object.assign({}, settings, { cuisineMode: "soft" });
        }`;
const newMatchFlip = `        var settingsForMatch = settings;`;
app = app.replace(oldMatchFlip, newMatchFlip);

// Strict cuisine hard filter: ignore softFlags.cuisine gate — always hard when strict
const oldCuisineHard = `    // 严格菜系：硬条件
    if (settings.cuisineMode === "strict" && settings.cuisineIds && settings.cuisineIds.length && softFlags.cuisine) {
      var hit = (dish.cuisineIds || []).some(function (id) {
        return settings.cuisineIds.indexOf(id) !== -1;
      });
      if (!hit) return false;
    }`;
const newCuisineHard = `    // 严格菜系：硬条件（不可被 softFlags 关掉）
    if (settings.cuisineMode === "strict" && settings.cuisineIds && settings.cuisineIds.length) {
      var hit = (dish.cuisineIds || []).some(function (id) {
        return settings.cuisineIds.indexOf(id) !== -1;
      });
      if (!hit) return false;
    }`;
app = app.replace(oldCuisineHard, newCuisineHard);

// 4) Budget UI: 15+ / 30+ → null hard max (not fake caps 25/45)
// In renderMealEditors budget options and click handler
app = app.replace(
  `function budgetOptionsForMeal(meal) {
    if (meal === "breakfast") {
      return [
        { v: 10, l: "≤10" }, { v: 15, l: "≤15" }, { v: 25, l: "15+" }, { v: null, l: "不限" }
      ];
    }
    return [
      { v: 20, l: "≤20" }, { v: 30, l: "≤30" }, { v: 45, l: "30+" }, { v: null, l: "不限" }
    ];
  }`,
  `function budgetOptionsForMeal(meal) {
    if (meal === "breakfast") {
      return [
        { v: 10, l: "≤10" }, { v: 15, l: "≤15" }, { v: "plus15", l: "15+" }, { v: null, l: "不限" }
      ];
    }
    return [
      { v: 20, l: "≤20" }, { v: 30, l: "≤30" }, { v: "plus30", l: "30+" }, { v: null, l: "不限" }
    ];
  }`
);

// Fix budget chip selection logic
app = app.replace(
  `      var budHtml = budgetOpts.map(function (o) {
        var sel = (o.v == null && ms.budgetMax == null) ||
          (o.v != null && Number(ms.budgetMax) === o.v);
        // 15+ / 30+ 映射
        if (meal === "breakfast" && o.v === 25 && ms.budgetMax != null && ms.budgetMax > 15 && ms.budgetMax !== 10 && ms.budgetMax !== 15) sel = true;
        if (meal !== "breakfast" && o.v === 45 && ms.budgetMax != null && ms.budgetMax > 30 && ms.budgetMax !== 20 && ms.budgetMax !== 30) sel = true;
        return chipRadio("budget", o.v == null ? "any" : String(o.v), o.l, !!sel);
      }).join("");`,
  `      var budHtml = budgetOpts.map(function (o) {
        var sel = false;
        if (o.v == null) sel = ms.budgetMax == null && !ms.budgetFlex;
        else if (o.v === "plus15" || o.v === "plus30") sel = !!ms.budgetFlex;
        else sel = !ms.budgetFlex && Number(ms.budgetMax) === Number(o.v);
        return chipRadio("budget", o.v == null ? "any" : String(o.v), o.l, !!sel);
      }).join("");`
);

app = app.replace(
  `    $all("[data-budget]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        var v = btn.getAttribute("data-budget");
        state.settings.meals[meal].budgetMax = v === "any" ? null : Number(v);
        state.settings.presetId = null;
        saveSettings(state.settings);
        renderMealEditors();
        renderPresets();
        updatePresetSummary();
      });
    });`,
  `    $all("[data-budget]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        var v = btn.getAttribute("data-budget");
        if (v === "any") {
          state.settings.meals[meal].budgetMax = null;
          state.settings.meals[meal].budgetFlex = false;
        } else if (v === "plus15" || v === "plus30") {
          // 15+ / 30+：无硬上限，仅软偏好更高消费
          state.settings.meals[meal].budgetMax = null;
          state.settings.meals[meal].budgetFlex = v;
        } else {
          state.settings.meals[meal].budgetMax = Number(v);
          state.settings.meals[meal].budgetFlex = false;
        }
        state.settings.presetId = null;
        saveSettings(state.settings);
        renderMealEditors();
        renderPresets();
        updatePresetSummary();
      });
    });`
);

// normalizeMealSetting: preserve budgetFlex
app = app.replace(
  `    return {
      channelsAllowed: channels,
      budgetMax: budgetMax,
      timeMax: timeMax,
      hunger: raw.hunger || def.hunger,
      mealTypes: Array.isArray(raw.mealTypes) ? raw.mealTypes : [],
      mealGoals: Array.isArray(raw.mealGoals) ? raw.mealGoals : [],
      equipment: raw.equipment || "any",
      prepTime: raw.prepTime || "any",
      waitTime: raw.waitTime || "any"
    };`,
  `    return {
      channelsAllowed: channels,
      budgetMax: budgetMax,
      budgetFlex: raw.budgetFlex || false,
      timeMax: timeMax,
      hunger: raw.hunger || def.hunger,
      mealTypes: Array.isArray(raw.mealTypes) ? raw.mealTypes : [],
      mealGoals: Array.isArray(raw.mealGoals) ? raw.mealGoals : [],
      equipment: raw.equipment || "any",
      prepTime: raw.prepTime || "any",
      waitTime: raw.waitTime || "any"
    };`
);

// defaultMealSetting add budgetFlex
app = app.replace(
  /function defaultMealSetting\(meal\) \{\s*if \(meal === "breakfast"\) \{\s*return \{\s*channelsAllowed: \["convenience", "canteen"\],\s*budgetMax: 15, timeMax: 10, hunger: "normal",/,
  `function defaultMealSetting(meal) {
    if (meal === "breakfast") {
      return {
        channelsAllowed: ["convenience", "canteen"],
        budgetMax: 15, budgetFlex: false, timeMax: 10, hunger: "normal",`
);
// May need to add budgetFlex to other defaults - use global replace on pattern
app = app.replace(/budgetMax: 30, timeMax: 25, hunger: "normal",/g, 'budgetMax: 30, budgetFlex: false, timeMax: 25, hunger: "normal",');
app = app.replace(/budgetMax: 30, timeMax: 35, hunger: "normal",/g, 'budgetMax: 30, budgetFlex: false, timeMax: 35, hunger: "normal",');

// 5) Calorie: findRecommendLog should prefer current menu; hasMenuCalorieCheckin fix
// When all three meals individually checked in (same dish ids), still detect
// Also wire recordActivityCompletion to TodayYi.storage when marking eaten

const markEatenExtra = `    // 同步到今日宜统一历史（不改 fanfan 键）
    try {
      if (window.TodayYi && window.TodayYi.storage) {
        window.TodayYi.storage.recordActivityCompletion({
          category: "eat",
          activityId: menu.id || menu.signature,
          title: "今天的三餐",
          duration: null,
          sourcePage: "eat",
          date: todayKey()
        });
      }
      if (window.TodayYi && window.TodayYi.dailyPlan) {
        window.TodayYi.dailyPlan.markCompleted(menu.id || menu.signature || "eat-today");
      }
    } catch (eSync) {}
`;

// Insert before toast in markEatenToday
app = app.replace(
  `    toast(wrote ? "记下啦，预计热量已写入今日打卡" : "这套餐已经打过卡啦");
    updateEatButton();`,
  markEatenExtra + `    toast(wrote ? "记下啦，预计热量已写入今日打卡" : "这套餐已经打过卡啦");
    updateEatButton();`
);

// Soften notice when strict cuisine yields empty
app = app.replace(
  `    if (plan.anyEmpty && !plan.meals.breakfast && !plan.meals.lunch && !plan.meals.dinner) {
      renderNoMatchState();
      toast("候选不足，试试放宽渠道、菜系或忌口");
      return;
    }`,
  `    if (plan.anyEmpty && !plan.meals.breakfast && !plan.meals.lunch && !plan.meals.dinner) {
      renderNoMatchState();
      if (settings.cuisineMode === "strict" && settings.cuisineIds && settings.cuisineIds.length) {
        toast("严格菜系下候选不足；忌口/预算未放宽。可关闭「只看所选菜系」或增加渠道");
      } else {
        toast("候选不足，试试放宽渠道、菜系或忌口");
      }
      return;
    }`
);

// Wrap as module
const eatModule = `/* 今日宜 · 饭饭搭子模块 (eat)
 * 保留 fanfan_* localStorage 键；由 eat.html 加载。
 */
(function (root) {
  "use strict";

${app.replace(/^\(function \(\) \{\s*"use strict";\s*/, "").replace(/\}\)\(\);\s*$/, "")}

})(window);
`;

// The app already starts with (function () { "use strict";
// My replace might be wrong. Let me check.
let eatBody = app;
if (eatBody.trimStart().startsWith("(function")) {
  eatBody = eatBody.replace(/^\s*\(function\s*\(\)\s*\{\s*"use strict";\s*/, "");
  eatBody = eatBody.replace(/\}\)\s*\(\)\s*;\s*$/, "");
}

const eatJs = `/* 今日宜 · modules/eat.js — 饭饭搭子完整逻辑 */
(function (root) {
  "use strict";
${eatBody}
})(window);
`;

write("js/modules/eat.js", eatJs);

/* ---------- HTML pages ---------- */
const bodyHtml = fs.readFileSync(path.join(parts, "body.html"), "utf8");
// Inject nav mount after .page opens
let eatBodyHtml = bodyHtml.replace(
  `<div class="page">
    <header class="site-header">`,
  `<div class="page">
    <div class="app-nav" id="appNav"></div>
    <header class="site-header">`
);

const cssLinks = `  <link rel="stylesheet" href="./assets/css/tokens.css" />
  <link rel="stylesheet" href="./assets/css/base.css" />
  <link rel="stylesheet" href="./assets/css/components.css" />
  <link rel="stylesheet" href="./assets/css/responsive.css" />`;

const jsScripts = `  <script src="./js/core/utils.js"></script>
  <script src="./js/core/storage.js"></script>
  <script src="./js/core/navigation.js"></script>
  <script src="./js/core/recommendation.js"></script>
  <script src="./js/core/daily-plan.js"></script>
  <script src="./js/core/history.js"></script>
  <script src="./data/cuisine-data.js"></script>
  <script src="./data/dishes-data.js"></script>
  <script src="./js/modules/eat.js"></script>
  <script>
    (function () {
      if (window.TodayYi && TodayYi.navigation) {
        TodayYi.navigation.renderNav("#appNav");
      }
    })();
  </script>`;

const eatHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="description" content="今日宜 · 宜吃饭 — 替选择困难的你，认真想好今天三顿饭" />
  <meta name="theme-color" content="#FF6B57" />
  <title>宜吃饭 · 今日宜</title>
${cssLinks}
</head>
<body>
${eatBodyHtml}
${jsScripts}
</body>
</html>
`;

write("eat.html", eatHtml);

const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="description" content="今日宜 — 今天适合做什么" />
  <meta name="theme-color" content="#FF6B57" />
  <title>今日宜</title>
${cssLinks}
</head>
<body>
  <div class="bg-deco" aria-hidden="true">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
  </div>
  <div class="page">
    <div class="app-nav" id="appNav"></div>
    <section class="home-shell" aria-label="今日宜首页">
      <h1>今日宜</h1>
      <p>先从「宜吃饭」开始。画画、学习、娱乐与拼豆会在后续版本陆续开放。本页为第一轮地基页，完整「今日主签」将在第二轮上线。</p>
      <div class="home-actions">
        <a class="btn btn-primary" href="./eat.html" style="width:auto;min-width:12rem">去宜吃饭</a>
        <a class="btn btn-secondary" href="./eat.html">饭饭搭子 · 三餐推荐</a>
      </div>
      <p class="hint" style="margin-top:1rem">数据仅存本机 localStorage。旧版饭饭搭子记录会完整保留。</p>
    </section>
    <footer class="site-footer">
      <p>今日宜 · 纯静态 · 可部署 GitHub Pages</p>
    </footer>
  </div>
  <div class="toast-host" aria-live="assertive"><div class="toast" id="toast" role="status"></div></div>
  <script src="./js/core/utils.js"></script>
  <script src="./js/core/storage.js"></script>
  <script src="./js/core/navigation.js"></script>
  <script src="./js/core/daily-plan.js"></script>
  <script src="./js/core/history.js"></script>
  <script>
    (function () {
      TodayYi.navigation.renderNav("#appNav");
    })();
  </script>
</body>
</html>
`;

write("index.html", indexHtml);

// Placeholder pages for nav (round 1)
const placeholder = (title, id) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#FF6B57" />
  <title>${title} · 今日宜</title>
${cssLinks}
</head>
<body>
  <div class="page">
    <div class="app-nav" id="appNav"></div>
    <section class="home-shell">
      <h1>${title}</h1>
      <p>该模块将在后续开发轮次上线。当前请使用「宜吃饭」。</p>
      <div class="home-actions">
        <a class="btn btn-primary" href="./eat.html" style="width:auto">去宜吃饭</a>
        <a class="btn btn-secondary" href="./index.html">回首页</a>
      </div>
    </section>
  </div>
  <script src="./js/core/utils.js"></script>
  <script src="./js/core/storage.js"></script>
  <script src="./js/core/navigation.js"></script>
  <script>TodayYi.navigation.renderNav("#appNav");</script>
</body>
</html>
`;

write("create.html", placeholder("宜创作", "create"));
write("study.html", placeholder("宜学习", "study"));
write("relax.html", placeholder("宜娱乐", "relax"));
write("profile.html", placeholder("我的", "profile"));

console.log("Round 1 split done");
