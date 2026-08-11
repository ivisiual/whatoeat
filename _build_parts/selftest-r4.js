/**
 * Round 4 拼豆自测
 * node _build_parts/selftest-r4.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const store = {};

const windowStub = {
  TodayYi: null,
  TODAYYI_BEAD_PATTERNS: null,
  TODAYYI_BEAD_PALETTE_DEFAULT: null,
  devicePixelRatio: 1,
  innerWidth: 390,
  localStorage: {
    getItem(k) { return store[k] == null ? null : store[k]; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  },
  matchMedia() { return { matches: false, addEventListener() {} }; },
  location: { pathname: "/whatoeat/create.html" },
  addEventListener() {}
};

// minimal canvas mock for count-only tests
function mockCanvas() {
  const calls = [];
  const ctx = {
    setTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    arcTo() {},
    closePath() {},
    fill() {},
    ellipse() {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1
  };
  return {
    width: 0,
    height: 0,
    style: {},
    getContext() { return ctx; },
    toDataURL() { return "data:image/png;base64,AAA"; }
  };
}

const elements = {
  beadCanvas: mockCanvas(),
  beadCanvasWrap: { clientWidth: 320, offsetWidth: 320 },
  beadStats: { innerHTML: "" },
  beadList: { innerHTML: "" },
  beadTitle: { textContent: "" },
  beadDesc: { textContent: "" },
  btnBeadDone: { disabled: false, textContent: "", classList: { toggle() {} } },
  btnBeadFav: { textContent: "" },
  btnBeadExport: {},
  chkBeadGrid: { checked: true, addEventListener() {} },
  appNav: { innerHTML: "" }
};

const documentStub = {
  readyState: "loading", // prevent auto boot until APIs ready
  body: { appendChild() {}, removeChild() {} },
  querySelector(sel) {
    if (sel === "#beadCanvas") return elements.beadCanvas;
    if (sel === "#beadCanvasWrap") return elements.beadCanvasWrap;
    if (sel === "#beadStats") return elements.beadStats;
    if (sel === "#beadList") return elements.beadList;
    if (sel === "#beadTitle") return elements.beadTitle;
    if (sel === "#beadDesc") return elements.beadDesc;
    if (sel === "#btnBeadDone") return elements.btnBeadDone;
    if (sel === "#btnBeadFav") return elements.btnBeadFav;
    if (sel === "#btnBeadExport") return elements.btnBeadExport;
    if (sel === "#chkBeadGrid") return elements.chkBeadGrid;
    if (sel === "#appNav") return elements.appNav;
    if (sel === ".bead-thumb.is-active") return null;
    if (sel === "#toast") return { textContent: "", classList: { add() {}, remove() {} } };
    if (sel === ".toast-host") return null;
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement(tag) {
    return {
      tagName: tag,
      href: "",
      download: "",
      style: {},
      click() {},
      classList: { add() {}, remove() {} }
    };
  }
};

// list element needs querySelectorAll for bind
elements.beadList.querySelectorAll = function () { return []; };

const sandbox = {
  window: windowStub,
  document: documentStub,
  localStorage: windowStub.localStorage,
  navigator: {},
  location: windowStub.location,
  console,
  setTimeout,
  clearTimeout,
  Date, Math, JSON, Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isFinite, Set, Map, Error
};
sandbox.global = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
}

[
  "js/core/utils.js",
  "js/core/storage.js",
  "js/core/navigation.js",
  "js/core/recommendation.js",
  "js/core/history.js",
  "js/core/daily-plan.js",
  "data/bead-patterns.js",
  "js/modules/beads.js"
].forEach(load);

const TY = sandbox.window.TodayYi;
const patterns = sandbox.window.TODAYYI_BEAD_PATTERNS || [];

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log("  OK", msg); }
  else { failed++; console.error("  FAIL", msg); }
}

console.log("\n=== 图案数据 ===");
assert(patterns.length >= 14, "图案数量 >= 14: " + patterns.length);
const s8 = patterns.filter((p) => p.gridSize === 8);
const s16 = patterns.filter((p) => p.gridSize === 16);
assert(s8.length >= 8, "8×8 >= 8: " + s8.length);
assert(s16.length >= 6, "16×16 >= 6: " + s16.length);

let schemaBad = 0;
patterns.forEach((p) => {
  if (!p.id || !p.pattern || !p.palette || p.license !== "original") schemaBad++;
  if (p.pattern.length !== p.gridSize) schemaBad++;
  p.pattern.forEach((row) => {
    if (!row || row.length !== p.gridSize) schemaBad++;
  });
});
assert(schemaBad === 0, "图案 schema 与方阵尺寸");

console.log("\n=== 豆子统计与进度 ===");
{
  const st = TY.beads.countBeads(patterns[0].pattern);
  assert(st.total > 0, "豆子数 > 0: " + st.total);
  assert(Object.keys(st.counts).length >= 1, "至少 1 色");
  const heart = patterns.filter((p) => p.id === "bead-heart-8")[0];
  const st2 = TY.beads.countBeads(heart.pattern);
  assert(st2.total === heart.estimatedBeads, "estimatedBeads 一致: " + st2.total);
  const empty = heart.pattern.map((row) => row.map(() => 0));
  const prog0 = TY.beads.progressVsGuide(heart.pattern, empty);
  assert(prog0.correct === 0 && prog0.target === st2.total, "空板进度 0");
  const progFull = TY.beads.progressVsGuide(heart.pattern, heart.pattern);
  assert(progFull.ratio === 1, "满板还原 100%");
  // 多放错放不能 100%
  const over = heart.pattern.map((row) => row.slice());
  // 找一个应为空的格子多放
  outer: for (let r = 0; r < over.length; r++) {
    for (let c = 0; c < over[r].length; c++) {
      if (!over[r][c]) { over[r][c] = 9; break outer; }
    }
  }
  const progOver = TY.beads.progressVsGuide(heart.pattern, over);
  assert(progOver.ratio < 1, "多放后还原度 < 100%: " + progOver.ratio);
}

console.log("\n=== API ===");
assert(!!TY.beads.byId("bead-heart-8"), "byId 心");
assert(TY.beads.byId("nope") === null, "byId 空");
assert(TY.beads.patterns().length === patterns.length, "patterns()");

console.log("\n=== 完成记录 ===");
{
  TY.storage.recordActivityCompletion({
    activityId: "bead-heart-8",
    category: "beads",
    title: "小爱心（8×8）",
    duration: 20,
    sourcePage: "create"
  });
  const hist = TY.storage.getActivityHistory();
  assert(hist.some((h) => h.activityId === "bead-heart-8" && h.category === "beads"), "拼豆写入历史");
}

console.log("\n=== 页面 ===");
{
  const html = fs.readFileSync(path.join(root, "create.html"), "utf8");
  assert(html.includes("beadCanvas"), "canvas");
  assert(html.includes("./js/modules/beads.js"), "beads.js");
  assert(html.includes("./data/bead-patterns.js"), "bead-patterns.js");
  assert(!html.includes('src="/'), "无绝对路径");
  try {
    execSync("node --check \"" + path.join(root, "js/modules/beads.js") + "\"", { stdio: "pipe" });
    assert(true, "beads.js syntax");
  } catch (e) {
    assert(false, "beads.js syntax");
  }
}

console.log("\n==========");
console.log("通过:", passed, "失败:", failed);
process.exit(failed ? 1 : 0);
