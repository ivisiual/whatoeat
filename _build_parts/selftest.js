/**
 * 饭饭搭子 V2 自测（Node 环境，无浏览器）
 * 运行：node _build_parts/selftest.js
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

const elements = new Map();
function el(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      hidden: false,
      textContent: "",
      innerHTML: "",
      value: "",
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); },
        remove(c) { this._s.delete(c); },
        toggle(c, f) { if (f) this._s.add(c); else this._s.delete(c); },
        contains(c) { return this._s.has(c); }
      },
      style: {},
      setAttribute() {},
      getAttribute() { return null; },
      addEventListener() {},
      focus() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      appendChild() {},
      removeChild() {},
      scrollIntoView() {}
    });
  }
  return elements.get(id);
}

const documentStub = {
  readyState: "complete",
  body: el("body"),
  querySelector(sel) {
    if (sel.startsWith("#")) return el(sel.slice(1));
    return el("any");
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement(tag) {
    return {
      tagName: tag,
      style: {},
      value: "",
      textContent: "",
      innerHTML: "",
      setAttribute() {},
      appendChild() {},
      removeChild() {},
      select() {},
      focus() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
    };
  }
};

const windowStub = {
  FANFAN_CUISINE_DATA: null,
  FANFAN_DISHES: null,
  matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
  localStorage: makeLS()
};

const sandbox = {
  window: windowStub,
  document: documentStub,
  localStorage: windowStub.localStorage,
  navigator: { clipboard: null },
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  parseInt,
  parseFloat,
  isFinite,
  Set,
  Map,
  Error,
  encodeURIComponent,
  decodeURIComponent
};
sandbox.global = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(root, "data/cuisine-data.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "data/dishes-data.js"), "utf8"), sandbox);

// 从 app.js 抽出可测核心：通过运行完整 app（init 会绑 DOM，已 stub）
const appSrc = fs.readFileSync(path.join(root, "_build_parts/app.js"), "utf8");
// 暴露内部：在 app 末尾注入导出（仅测试用副本）
const exposed = appSrc.replace(
  /if \(document\.readyState === "loading"\) \{[\s\S]*\}\n\}\)\(\);?\s*$/,
  `
  // test hooks
  window.__TEST__ = {
    DISHES: DISHES,
    PRESETS: PRESETS,
    generatePlan: generatePlan,
    defaultSettings: defaultSettings,
    applyPreset: function(id) {
      var p = PRESETS.filter(function (x) { return x.id === id; })[0];
      var s = defaultSettings();
      if (p.scene) s.scene = p.scene;
      if (p.goal) s.goal = p.goal;
      if (p.exploreMode) s.exploreMode = p.exploreMode;
      ["breakfast","lunch","dinner"].forEach(function(m) {
        var base = s.meals[m];
        var pm = p.meals[m] || {};
        s.meals[m] = Object.assign({}, base, pm, {
          channelsAllowed: (pm.channelsAllowed || base.channelsAllowed).slice(),
          mealTypes: pm.mealTypes || [],
          mealGoals: pm.mealGoals || []
        });
      });
      return s;
    },
    dishById: dishById,
    recipeUrl: recipeUrl,
    isOvoLactoSuitable: isOvoLactoSuitable,
    MEALS: MEALS
  };
  // skip auto init for tests
})();
`
);

try {
  vm.runInContext(exposed, sandbox);
} catch (e) {
  console.error("APP LOAD FAIL", e);
  process.exit(1);
}

const T = sandbox.window.__TEST__;
let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log("  ✓", msg); }
  else { failed++; console.error("  ✗", msg); }
}

console.log("\n=== 数据 ===");
assert(T.DISHES.length >= 50, "菜品数量 >= 50，实际 " + T.DISHES.length);
assert(sandbox.window.FANFAN_CUISINE_DATA.cuisines.length >= 16, "菜系 >= 16");
const gan = T.DISHES.filter(d => (d.cuisineIds || []).indexOf("jiangxi") !== -1);
assert(gan.length >= 5, "赣菜探索菜存在: " + gan.length);
const yueRecipe = T.DISHES.filter(d => d.id === "yue-steamed-perch" || d.name === "清蒸鲈鱼");
assert(yueRecipe.length >= 1, "粤菜菜谱接入");
const disc = T.DISHES.filter(d => d.discoveryOnly);
assert(disc.every(d => !T.recipeUrl(d)), "discovery 无虚假 recipe URL");

console.log("\n=== 快捷方案渠道独立性 ===");
const presets = ["weekday_commute", "overtime_survive", "lazy_day", "home_cook_day"];
presets.forEach(pid => {
  const s = T.applyPreset(pid);
  const channels = T.MEALS.map(m => (s.meals[m].channelsAllowed || []).join("+"));
  const allSame = channels.every(c => c === channels[0]);
  if (pid === "home_cook_day") {
    assert(T.MEALS.every(m => s.meals[m].channelsAllowed.join() === "home_cook"), "居家做饭三餐自制");
  } else if (pid === "lazy_day") {
    assert(s.meals.breakfast.channelsAllowed.join() === "convenience", "懒得动早餐便利店");
    assert(s.meals.lunch.channelsAllowed.join() === "takeout", "懒得动午餐外卖");
    assert(s.meals.dinner.channelsAllowed.join() === "takeout", "懒得动晚餐外卖");
  } else if (pid === "overtime_survive") {
    assert(s.meals.breakfast.channelsAllowed[0] === "convenience", "加班早餐便利店");
    assert(s.meals.lunch.channelsAllowed[0] === "canteen", "加班午餐食堂");
    assert(s.meals.dinner.channelsAllowed[0] === "takeout", "加班晚餐外卖");
  } else if (pid === "weekday_commute") {
    assert(!allSame, "工作日通勤三餐渠道不完全相同: " + channels.join(" | "));
  }
});

console.log("\n=== 生成 100 次：工作日通勤 ===");
{
  const s = T.applyPreset("weekday_commute");
  s.scene = "office";
  const sigs = new Set();
  let empty = 0;
  let sameDishDay = 0;
  let allTakeout = 0;
  for (let i = 0; i < 100; i++) {
    const plan = T.generatePlan(s, { seedSalt: "t" + i });
    if (plan.anyEmpty) empty++;
    const ids = T.MEALS.map(m => plan.meals[m]).filter(Boolean);
    if (new Set(ids).size !== ids.length) sameDishDay++;
    sigs.add(plan.signature);
    const chs = T.MEALS.map(m => plan.channels[m]);
    if (chs.every(c => c === "takeout")) allTakeout++;
  }
  assert(empty < 20, "空结果较少: " + empty);
  assert(sameDishDay === 0, "单次菜单无重复菜: " + sameDishDay);
  assert(sigs.size > 15, "签名多样性: " + sigs.size);
  assert(allTakeout < 30, "不全是三餐外卖: " + allTakeout);
}

console.log("\n=== 加班续命渠道 ===");
{
  const s = T.applyPreset("overtime_survive");
  let ok = 0;
  for (let i = 0; i < 40; i++) {
    const plan = T.generatePlan(s, { seedSalt: "ot" + i });
    if (plan.anyEmpty) continue;
    if (plan.channels.breakfast === "convenience" &&
        plan.channels.lunch === "canteen" &&
        plan.channels.dinner === "takeout") ok++;
  }
  assert(ok >= 20, "加班续命渠道命中次数: " + ok);
}

console.log("\n=== 忌口牛肉硬条件 ===");
{
  const s = T.applyPreset("weekday_commute");
  s.goal = "high_protein";
  s.tags.noBeef = true;
  for (let i = 0; i < 50; i++) {
    const plan = T.generatePlan(s, { seedSalt: "beef" + i });
    T.MEALS.forEach(m => {
      const id = plan.meals[m];
      if (!id) return;
      const d = T.dishById(id);
      assert(d.protein !== "牛肉" && (d.allergens || []).indexOf("beef") === -1,
        "不含牛肉 " + d.name);
    });
  }
}

console.log("\n=== 蛋奶素 ===");
{
  const s = T.applyPreset("calorie_control");
  s.goal = "ovo_lacto";
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    const plan = T.generatePlan(s, { seedSalt: "ovo" + i });
    T.MEALS.forEach(m => {
      const id = plan.meals[m];
      if (!id) return;
      const d = T.dishById(id);
      if (!T.isOvoLactoSuitable(d)) bad++;
    });
  }
  assert(bad === 0, "蛋奶素无违规菜: bad=" + bad);
}

console.log("\n=== 粤菜自制有 recipe ===");
{
  const s = T.defaultSettings();
  s.cuisineIds = ["cantonese"];
  s.cuisineMode = "soft";
  s.meals.lunch.channelsAllowed = ["home_cook"];
  s.meals.dinner.channelsAllowed = ["home_cook"];
  s.meals.breakfast.channelsAllowed = ["home_cook", "convenience"];
  let withRecipe = 0;
  for (let i = 0; i < 30; i++) {
    const plan = T.generatePlan(s, { seedSalt: "yue" + i });
    T.MEALS.forEach(m => {
      const d = plan.meals[m] && T.dishById(plan.meals[m]);
      if (d && plan.channels[m] === "home_cook" && T.recipeUrl(d)) withRecipe++;
    });
  }
  assert(withRecipe > 0, "粤菜自制出现可访问菜谱: " + withRecipe);
}

console.log("\n=== 赣菜外卖无虚假菜谱 ===");
{
  const s = T.defaultSettings();
  s.cuisineIds = ["jiangxi"];
  s.cuisineMode = "soft";
  s.meals.lunch.channelsAllowed = ["takeout", "canteen"];
  s.meals.dinner.channelsAllowed = ["takeout", "canteen"];
  s.meals.breakfast.channelsAllowed = ["convenience"];
  let foundGan = 0;
  let fakeRecipe = 0;
  for (let i = 0; i < 40; i++) {
    const plan = T.generatePlan(s, { seedSalt: "gan" + i });
    T.MEALS.forEach(m => {
      const d = plan.meals[m] && T.dishById(plan.meals[m]);
      if (!d) return;
      if ((d.cuisineIds || []).indexOf("jiangxi") !== -1) {
        foundGan++;
        if (d.discoveryOnly && T.recipeUrl(d)) fakeRecipe++;
      }
    });
  }
  assert(foundGan > 0, "能推荐赣菜: " + foundGan);
  assert(fakeRecipe === 0, "赣菜 discovery 无虚假 recipe");
}

console.log("\n=== 连续生成尽量不同 ===");
{
  const s = T.applyPreset("weekday_commute");
  let prev = null;
  let same = 0;
  for (let i = 0; i < 20; i++) {
    const plan = T.generatePlan(s, {
      seedSalt: "seq" + i + Math.random(),
      forbidSignatures: prev ? [prev.signature] : [],
      prevMeals: prev ? prev.meals : null,
      requireAllMealsDifferent: !!prev,
      mustDifferMeals: prev ? { breakfast: prev.meals.breakfast, lunch: prev.meals.lunch, dinner: prev.meals.dinner } : {}
    });
    if (prev && plan.signature === prev.signature) same++;
    prev = plan;
  }
  assert(same <= 2, "连续 20 次完全相同签名次数: " + same);
}

console.log("\n==========");
console.log("通过:", passed, "失败:", failed);
process.exit(failed ? 1 : 0);
