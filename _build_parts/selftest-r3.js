/**
 * Round 3 自测
 * node _build_parts/selftest-r3.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const store = {};

function makeLS() {
  return {
    getItem(k) { return store[k] == null ? null : store[k]; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  };
}

const windowStub = {
  TodayYi: null,
  matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
  localStorage: makeLS(),
  location: { pathname: "/whatoeat/create.html" },
  addEventListener() {}
};

const sandbox = {
  window: windowStub,
  document: {
    readyState: "complete",
    body: {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return { style: {}, classList: { add() {}, remove() {} } }; }
  },
  localStorage: windowStub.localStorage,
  navigator: {},
  location: windowStub.location,
  console,
  setTimeout,
  clearTimeout,
  clearInterval,
  setInterval,
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

console.log("\n=== 素材数量 ===");
const draws = sandbox.window.TODAYYI_DRAW_PROMPTS || [];
const leisures = sandbox.window.TODAYYI_LEISURE_ACTIVITIES || [];
const studies = sandbox.window.TODAYYI_STUDY_ACTIONS || [];
assert(draws.length >= 100, "画画 >= 100: " + draws.length);
assert(leisures.length >= 100, "娱乐 >= 100: " + leisures.length);
assert(studies.length >= 30, "学习动作 >= 30: " + studies.length);
assert(TY.activityPool.length >= 200, "总池 >= 200: " + TY.activityPool.length);

console.log("\n=== 统一结构 ===");
function checkSchema(arr, cat) {
  let bad = 0;
  arr.forEach((a) => {
    if (!a.id || !a.title || !a.firstStep || a.category !== cat) bad++;
    if (a.duration == null || !a.energy || !a.places) bad++;
    if (!a.license) bad++;
  });
  return bad;
}
assert(checkSchema(draws, "draw") === 0, "画画 schema");
assert(checkSchema(leisures, "leisure") === 0, "娱乐 schema");
assert(checkSchema(studies, "study") === 0, "学习 schema");

console.log("\n=== 推荐分类隔离 ===");
{
  const d = TY.recommendation.recommendActivities({
    pool: TY.activityPool,
    categories: ["draw"],
    seed: 1,
    durationMax: 30
  });
  assert(d.item && d.item.category === "draw", "只推画画");
  const l = TY.recommendation.recommendActivities({
    pool: TY.activityPool,
    categories: ["leisure"],
    place: "office",
    durationMax: 15,
    seed: 2
  });
  assert(l.item && l.item.category === "leisure", "只推娱乐");
  assert(l.item.places.indexOf("office") !== -1, "娱乐地点 office");
}

console.log("\n=== 学习存储键 ===");
{
  const tasks = [{ id: "t1", title: "复习", minutes: 25, done: false, ts: Date.now() }];
  TY.storage.set(TY.storage.KEYS.studyTasks, tasks);
  assert(TY.storage.get(TY.storage.KEYS.studyTasks, []).length === 1, "studyTasks 可写");
  TY.storage.set(TY.storage.KEYS.focusLogs, [{
    id: "f1", ts: Date.now(), date: TY.utils.todayKey(), minutes: 25, title: "专注", completed: true
  }]);
  assert(TY.storage.get(TY.storage.KEYS.focusLogs, []).length === 1, "focusLogs 可写");
  const r = TY.storage.recordActivityCompletion({
    activityId: "study-001",
    category: "study",
    title: "番茄钟",
    duration: 25,
    sourcePage: "study"
  });
  assert(r.ok, "学习完成写入统一历史");
}

console.log("\n=== 页面与语法 ===");
[
  "create.html", "study.html", "relax.html",
  "js/modules/draw.js", "js/modules/study.js", "js/modules/leisure.js"
].forEach((f) => {
  const full = path.join(root, f);
  assert(fs.existsSync(full), "exists " + f);
  if (f.endsWith(".js")) {
    try {
      execSync("node --check \"" + full + "\"", { stdio: "pipe" });
      assert(true, "syntax " + f);
    } catch (e) {
      assert(false, "syntax " + f);
    }
  } else {
    const h = fs.readFileSync(full, "utf8");
    assert(h.includes("./js/core/utils.js"), f + " 相对 js");
    assert(!h.includes('src="/'), f + " 无绝对路径");
    assert(h.includes("modules.css"), f + " modules.css");
  }
});

console.log("\n=== 完成幂等 ===");
{
  const r1 = TY.storage.recordActivityCompletion({
    activityId: "draw-001-three-colors",
    category: "draw",
    title: "测试画",
    sourcePage: "create"
  });
  const r2 = TY.storage.recordActivityCompletion({
    activityId: "draw-001-three-colors",
    category: "draw",
    title: "测试画",
    sourcePage: "create"
  });
  assert(r1.ok && r2.duplicate, "同日同活动幂等");
}

console.log("\n==========");
console.log("通过:", passed, "失败:", failed);
process.exit(failed ? 1 : 0);
