/**
 * Round 2 自测
 * node _build_parts/selftest-r2.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const store = {};

function makeLS() {
  return {
    getItem(k) { return store[k] == null ? null : store[k]; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  };
}
function el() {
  return {
    hidden: false, textContent: "", innerHTML: "", value: "", style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    appendChild() {}, removeChild() {}, scrollIntoView() {}
  };
}

const windowStub = {
  FANFAN_CUISINE_DATA: null,
  FANFAN_DISHES: null,
  TodayYi: null,
  TODAYYI_DRAW_PROMPTS: null,
  TODAYYI_STUDY_ACTIONS: null,
  TODAYYI_LEISURE_ACTIVITIES: null,
  TODAYYI_BEAD_PATTERNS: null,
  matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
  localStorage: makeLS(),
  location: { pathname: "/whatoeat/index.html" },
  addEventListener() {}
};

const sandbox = {
  window: windowStub,
  document: {
    readyState: "complete",
    body: el(),
    querySelector() { return el(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return el(); },
    visibilityState: "visible"
  },
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
  "data/draw-prompts.js",
  "data/study-actions.js",
  "data/leisure-activities.js",
  "data/bead-patterns.js",
  "data/activity-pool.js"
].forEach(load);

const TY = sandbox.window.TodayYi;
TY.mergeActivityPool();

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log("  OK", msg); }
  else { failed++; console.error("  FAIL", msg); }
}

console.log("\n=== 活动池 ===");
assert(TY.activityPool.length >= 30, "池大小 >= 30: " + TY.activityPool.length);
assert(TY.activityPool.every((a) => a.id && a.category && a.title), "统一字段完整");
const cats = new Set(TY.activityPool.map((a) => a.category));
assert(cats.has("draw") && cats.has("study") && cats.has("leisure"), "含 draw/study/leisure");

console.log("\n=== 推荐引擎硬条件 ===");
{
  const hardEmpty = TY.recommendation.recommendActivities({
    pool: TY.activityPool,
    durationMax: 1,
    place: "office",
    seed: 1
  });
  // duration 1 may still have 5-min activities - use durationMax 0
  const none = TY.recommendation.recommendActivities({
    pool: TY.activityPool,
    durationMax: 0,
    seed: 1
  });
  assert(none.item === null && none.reason === "hard_empty", "durationMax=0 硬空");

  const office = TY.recommendation.recommendActivities({
    pool: TY.activityPool,
    place: "office",
    durationMax: 20,
    energy: "low",
    seed: 42
  });
  assert(!!office.item, "office 有结果: " + (office.item && office.item.title));
  if (office.item) {
    assert(office.item.places.indexOf("office") !== -1, "地点命中 office");
    assert(office.item.duration <= 20, "时长硬上限");
  }
}

console.log("\n=== 加权随机与种子稳定 ===");
{
  const profileId = "p_test";
  const stateId = "low_home";
  const s0 = TY.recommendation.makeDaySeed(profileId, stateId, 0);
  const s0b = TY.recommendation.makeDaySeed(profileId, stateId, 0);
  assert(s0 === s0b, "同日同状态种子稳定");
  const s1 = TY.recommendation.makeDaySeed(profileId, stateId, 1);
  assert(s0 !== s1, "reroll 改变种子");

  const r1 = TY.recommendation.recommendBundle({
    pool: TY.activityPool,
    seed: s0,
    energy: "low",
    place: "home",
    durationMax: 20,
    moods: ["relax"],
    sideCount: 2
  });
  const r2 = TY.recommendation.recommendBundle({
    pool: TY.activityPool,
    seed: s0,
    energy: "low",
    place: "home",
    durationMax: 20,
    moods: ["relax"],
    sideCount: 2
  });
  assert(r1.main && r2.main && r1.main.id === r2.main.id, "同种子主签相同");
  assert(r1.side.length === 2, "两个顺手建议");
  const ids = [r1.main.id].concat(r1.side.map((s) => s.id));
  assert(new Set(ids).size === ids.length, "主签与顺手不重复");
  // 尽量不同分类
  const sideCats = r1.side.map((s) => s.category);
  // not hard fail if same, but prefer
  console.log("    main cat", r1.main.category, "side", sideCats.join(","));
}

console.log("\n=== 近 3 天排除 ===");
{
  const sample = TY.activityPool[0];
  // 写入历史
  TY.storage.recordActivityCompletion({
    activityId: sample.id,
    category: sample.category,
    title: sample.title,
    sourcePage: "test"
  });
  // force completedAt recent via direct store
  const hist = TY.storage.getActivityHistory();
  hist[hist.length - 1].completedAt = Date.now();
  TY.storage.set(TY.storage.KEYS.activityHistory, hist);

  const res = TY.recommendation.recommendActivities({
    pool: TY.activityPool,
    seed: 99,
    durationMax: 60,
    place: "home",
    // 足够候选时排除
  });
  // 多次采样：被排除的应很少出现
  let hit = 0;
  for (let i = 0; i < 30; i++) {
    const r = TY.recommendation.recommendActivities({
      pool: TY.activityPool,
      seed: 1000 + i,
      durationMax: 60
    });
    if (r.item && r.item.id === sample.id) hit++;
  }
  assert(hit < 8, "近 3 天活动出现次数较低: " + hit);
}

console.log("\n=== 每日计划 ===");
{
  // 清 plan
  TY.storage.remove(TY.storage.KEYS.dailyPlan);
  const p1 = TY.dailyPlan.ensurePlanForState("focus_mode");
  assert(p1.main && p1.stateId === "focus_mode", "生成 focus 主签");
  const p1b = TY.dailyPlan.loadTodayPlan();
  assert(p1b.main.id === p1.main.id, "刷新读取相同主签");
  const p2 = TY.dailyPlan.rerollPlan();
  assert(p2.rerollCount === 1, "rerollCount=1");
  // 可能相同（池小）但种子不同
  assert(p2.seed !== p1.seed, "换一批种子变化");

  TY.dailyPlan.markCompleted(p2.main.id, { sourcePage: "home" });
  assert(TY.dailyPlan.isCompleted(p2.main.id), "完成标记");
  const st = TY.dailyPlan.progressStats();
  assert(st.done >= 1, "进度 done>=1");
}

console.log("\n=== 收藏 ===");
{
  const r = TY.history.toggleFavorite({
    activityId: "draw-rainy-store",
    category: "draw",
    title: "画一家雨天便利店"
  });
  assert(r.added && TY.history.isFavorite("draw-rainy-store"), "收藏成功");
  const r2 = TY.history.toggleFavorite({ activityId: "draw-rainy-store" });
  assert(!r2.added && !TY.history.isFavorite("draw-rainy-store"), "取消收藏");
}

console.log("\n=== 页面路径 ===");
{
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert(index.includes("./js/modules/home.js"), "home 模块");
  assert(index.includes("./assets/css/home.css"), "home CSS");
  assert(index.includes("./data/draw-prompts.js"), "种子数据");
  assert(!index.includes('src="/'), "无绝对 script");
  assert(fs.existsSync(path.join(root, "profile.html")), "profile 页");
  const files = [
    "js/core/recommendation.js",
    "js/core/daily-plan.js",
    "js/modules/home.js",
    "data/activity-pool.js"
  ];
  files.forEach((f) => {
    try {
      require("child_process").execSync("node --check \"" + path.join(root, f) + "\"", { stdio: "pipe" });
      assert(true, "syntax " + f);
    } catch (e) {
      assert(false, "syntax " + f + " " + e.message);
    }
  });
}

console.log("\n=== 连续换一批尽量不立即重复 ===");
{
  TY.storage.remove(TY.storage.KEYS.dailyPlan);
  let prev = null;
  let same = 0;
  for (let i = 0; i < 8; i++) {
    const p = i === 0
      ? TY.dailyPlan.ensurePlanForState("create_vibe")
      : TY.dailyPlan.rerollPlan();
    if (prev && p.main && prev.main && p.main.id === prev.main.id) same++;
    prev = p;
  }
  assert(same <= 3, "连续 8 次主签完全相同次数: " + same);
}

console.log("\n==========");
console.log("通过:", passed, "失败:", failed);
process.exit(failed ? 1 : 0);
