/**
 * Round 1 自测：拆分后模块 + CR 修复
 * node _build_parts/selftest-r1.js
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
    hidden: false, textContent: "", innerHTML: "", value: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {}, setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    appendChild() {}, removeChild() {}, scrollIntoView() {},
    checked: false
  };
}

const documentStub = {
  readyState: "complete",
  body: el(),
  querySelector() { return el(); },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return el(); }
};

const windowStub = {
  FANFAN_CUISINE_DATA: null,
  FANFAN_DISHES: null,
  TodayYi: null,
  matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
  localStorage: makeLS(),
  location: { pathname: "/whatoeat/eat.html" },
  addEventListener() {}
};

const sandbox = {
  window: windowStub,
  document: documentStub,
  localStorage: windowStub.localStorage,
  navigator: { clipboard: null },
  location: windowStub.location,
  console,
  setTimeout,
  clearTimeout,
  Date, Math, JSON, Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isFinite, Set, Map, Error,
  encodeURIComponent, decodeURIComponent
};
sandbox.global = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), "utf8");
  vm.runInContext(code, sandbox, { filename: rel });
}

const files = [
  "js/core/utils.js",
  "js/core/storage.js",
  "js/core/navigation.js",
  "js/core/recommendation.js",
  "js/core/daily-plan.js",
  "js/core/history.js",
  "data/cuisine-data.js",
  "data/dishes-data.js"
];
files.forEach(load);

// Load eat.js but expose hooks by appending export after parse — patch init skip
let eatSrc = fs.readFileSync(path.join(root, "js/modules/eat.js"), "utf8");
eatSrc = eatSrc.replace(
  /if \(document\.readyState === "loading"\) \{[\s\S]*?\n  \}\n\}\)\(\);\s*\n*\}\)\(window\);\s*$/,
  `
  window.__EAT_TEST__ = {
    DISHES: DISHES,
    PRESETS: PRESETS,
    generatePlan: generatePlan,
    defaultSettings: defaultSettings,
    budgetMaxToDishOk: budgetMaxToDishOk,
    dishBudgetCap: dishBudgetCap,
    matchHardFilters: matchHardFilters,
    resolveSoftFlags: resolveSoftFlags,
    isOvoLactoSuitable: isOvoLactoSuitable,
    dishById: dishById,
    recipeUrl: recipeUrl,
    MEALS: MEALS,
    applyPreset: function (id) {
      var p = PRESETS.filter(function (x) { return x.id === id; })[0];
      var s = defaultSettings();
      if (p.scene) s.scene = p.scene;
      if (p.goal) s.goal = p.goal;
      if (p.exploreMode) s.exploreMode = p.exploreMode;
      ["breakfast","lunch","dinner"].forEach(function (m) {
        var base = s.meals[m];
        var pm = p.meals[m] || {};
        s.meals[m] = Object.assign({}, base, pm, {
          channelsAllowed: (pm.channelsAllowed || base.channelsAllowed).slice(),
          mealTypes: pm.mealTypes || [],
          mealGoals: pm.mealGoals || [],
          budgetFlex: false
        });
      });
      return s;
    }
  };
})();
})(window);
`
);

try {
  vm.runInContext(eatSrc, sandbox, { filename: "eat.js" });
} catch (e) {
  console.error("LOAD FAIL", e);
  process.exit(1);
}

const T = sandbox.window.__EAT_TEST__;
const TY = sandbox.window.TodayYi;
if (!T) {
  console.error("No test hooks");
  process.exit(1);
}

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log("  OK", msg); }
  else { failed++; console.error("  FAIL", msg); }
}

console.log("\n=== 模块加载 ===");
assert(!!TY && !!TY.utils && !!TY.storage && !!TY.navigation, "TodayYi core loaded");
assert(TY.storage.KEYS.fanfan.settings === "fanfan_settings_v3", "fanfan keys preserved");
assert(TY.storage.KEYS.profile === "todayyi_profile_v1", "todayyi namespace present");
assert(T.DISHES.length >= 50, "dishes merged: " + T.DISHES.length);

console.log("\n=== 预算硬上限 ===");
assert(T.budgetMaxToDishOk(15, "under15") === true, "≤15 允许 under15");
assert(T.budgetMaxToDishOk(15, "15to30") === false, "≤15 拒绝 15to30");
assert(T.budgetMaxToDishOk(20, "under15") === true, "≤20 允许 under15");
assert(T.budgetMaxToDishOk(20, "15to30") === false, "≤20 拒绝 15to30（修复点）");
assert(T.budgetMaxToDishOk(30, "15to30") === true, "≤30 允许 15to30");
assert(T.budgetMaxToDishOk(30, "over30") === false, "≤30 拒绝 over30");
assert(T.budgetMaxToDishOk(null, "over30") === true, "不限允许 over30");
assert(T.budgetMaxToDishOk(10, "under15") === true, "≤10 允许 under15 档");

console.log("\n=== 严格菜系不自动放宽 ===");
{
  const s = T.defaultSettings();
  s.cuisineIds = ["jiangxi"];
  s.cuisineMode = "strict";
  s.meals.lunch.channelsAllowed = ["home_cook"]; // 赣菜 discovery 无自制
  s.meals.dinner.channelsAllowed = ["home_cook"];
  s.meals.breakfast.channelsAllowed = ["home_cook"];
  const resolved = T.resolveSoftFlags(s, "lunch", "home_cook", {});
  assert(resolved.relaxed.indexOf("cuisine") === -1, "strict 不在 relaxed 列表: " + resolved.relaxed.join(","));
  // 硬匹配：无 jiangxi home_cook 时应失败
  const fake = { id: "x", name: "测试", meals: ["lunch"], channels: ["home_cook"], cuisineIds: ["cantonese"],
    allergens: [], protein: "蔬菜", budget: "under15", spicy: 0, goals: ["casual"], dietFlags: { ovoLactoSuitable: false } };
  assert(T.matchHardFilters(fake, s, "lunch", "home_cook", resolved.softFlags) === false, "严格模式拒绝非赣菜");
  const gan = { id: "y", name: "测试赣", meals: ["lunch"], channels: ["home_cook"], cuisineIds: ["jiangxi"],
    allergens: [], protein: "鸡肉", budget: "15to30", spicy: 1, goals: ["casual"], dietFlags: {} };
  assert(T.matchHardFilters(gan, s, "lunch", "home_cook", resolved.softFlags) === true, "严格模式接受赣菜");
}

console.log("\n=== 忌口硬条件 ===");
{
  const s = T.applyPreset("weekday_commute");
  s.tags.noBeef = true;
  s.tags.noSeafood = true;
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    const plan = T.generatePlan(s, { seedSalt: "tag" + i });
    T.MEALS.forEach((m) => {
      const d = plan.meals[m] && T.dishById(plan.meals[m]);
      if (!d) return;
      if (d.protein === "牛肉" || (d.allergens || []).indexOf("beef") !== -1) bad++;
      if (d.protein === "虾" || d.protein === "鱼" || (d.allergens || []).indexOf("seafood") !== -1) bad++;
    });
  }
  assert(bad === 0, "牛肉/海鲜忌口 40 轮: bad=" + bad);
  // null allergens 不抛错
  const noAll = { id: "z", name: "无过敏原字段", meals: ["lunch"], channels: ["canteen"],
    cuisineIds: [], protein: "蔬菜", budget: "under15", spicy: 0, goals: ["casual"],
    scenes: ["office"], hunger: ["normal"], tasteTags: [], dietFlags: {} };
  let threw = false;
  try {
    T.matchHardFilters(noAll, s, "lunch", "canteen", null);
  } catch (e) { threw = true; }
  assert(!threw, "allergens 缺失不抛错");
}

console.log("\n=== 工作日通勤生成 ===");
{
  const s = T.applyPreset("weekday_commute");
  let empty = 0;
  let same = 0;
  let allTakeout = 0;
  const sigs = new Set();
  for (let i = 0; i < 80; i++) {
    const plan = T.generatePlan(s, { seedSalt: "w" + i });
    if (plan.anyEmpty) empty++;
    const ids = T.MEALS.map((m) => plan.meals[m]).filter(Boolean);
    if (new Set(ids).size !== ids.length) same++;
    sigs.add(plan.signature);
    if (T.MEALS.every((m) => plan.channels[m] === "takeout")) allTakeout++;
  }
  assert(empty < 15, "空结果: " + empty);
  assert(same === 0, "餐内重复: " + same);
  assert(sigs.size > 10, "多样性: " + sigs.size);
  assert(allTakeout < 25, "全外卖次数: " + allTakeout);
}

console.log("\n=== 预算≤20 硬过滤在生成中生效 ===");
{
  const s = T.applyPreset("weekday_commute");
  s.meals.lunch.budgetMax = 20;
  s.meals.lunch.budgetFlex = false;
  s.meals.lunch.channelsAllowed = ["canteen", "takeout"];
  let over = 0;
  let ok = 0;
  for (let i = 0; i < 40; i++) {
    const plan = T.generatePlan(s, { seedSalt: "b20-" + i });
    const d = plan.meals.lunch && T.dishById(plan.meals.lunch);
    if (!d) continue;
    ok++;
    if (d.budget === "15to30" || d.budget === "over30") over++;
  }
  assert(ok > 0, "午餐有结果: " + ok);
  assert(over === 0, "≤20 不出现 15to30/over30: over=" + over);
}

console.log("\n=== 统一存储通信 ===");
{
  const r = TY.storage.recordActivityCompletion({
    category: "eat",
    activityId: "menu_test_1",
    title: "今天的三餐",
    sourcePage: "eat"
  });
  assert(r.ok && !r.duplicate, "首次写入活动历史");
  const r2 = TY.storage.recordActivityCompletion({
    category: "eat",
    activityId: "menu_test_1",
    title: "今天的三餐",
    sourcePage: "eat"
  });
  assert(r2.duplicate === true, "同日幂等");
  assert(TY.storage.getProfile().id, "profile id 存在");
}

console.log("\n=== 路径与结构 ===");
{
  const eatHtml = fs.readFileSync(path.join(root, "eat.html"), "utf8");
  assert(eatHtml.includes('./assets/css/tokens.css'), "相对 CSS");
  assert(eatHtml.includes('./js/modules/eat.js'), "相对 JS");
  assert(!eatHtml.includes('src="/'), "无绝对根路径 script");
  assert(!eatHtml.includes('href="/assets'), "无绝对 assets");
  assert(fs.existsSync(path.join(root, ".nojekyll")), ".nojekyll");
  assert(fs.existsSync(path.join(root, "index.html")), "index.html");
  assert(fs.existsSync(path.join(root, "eat.html")), "eat.html");
}

console.log("\n==========");
console.log("通过:", passed, "失败:", failed);
process.exit(failed ? 1 : 0);
