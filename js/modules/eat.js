/* 今日宜 · modules/eat.js — 饭饭搭子完整逻辑 */
(function (root) {
  "use strict";
/* =========================================================
   饭饭搭子 · app V2
   三餐独立渠道 · 快捷方案 · 菜系 OR · 热量打卡
   ========================================================= */
(function () {
  "use strict";

  var STORAGE = {
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
  };

  var MEAL_LABEL = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐", drink: "饮料" };
  var MEAL_EMOJI = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
  var SPICY_LABEL = ["不辣", "微辣", "中辣", "重辣"];
  var DIFF_LABEL = ["轻松", "一般", "要动手"];
  var FILL_LABEL = ["轻盈", "适中", "很顶饱"];
  var CHANNEL_LABEL = {
    canteen: "食堂", takeout: "外卖", convenience: "便利店", home_cook: "自己做"
  };
  var ACTION_LABEL = {
    first: "首次安排",
    reroll: "重新换一组",
    swap_breakfast: "换了早餐",
    swap_lunch: "换了午餐",
    swap_dinner: "换了晚餐",
    restore: "恢复显示"
  };
  var SCENE_HINT = {
    office: "附近大多数食堂都能找到，不用继续纠结。",
    home: "在家就好好吃饭，不用将就。",
    overtime: "加班也要喂饱自己，简单顶饱就好。",
    post_workout: "运动完补一点，蛋白和碳水都照顾到。"
  };
  var TASTE_LABEL = {
    hot: "热乎乎", refreshing: "清爽", spicy: "香辣",
    sweet_sour: "酸甜", soupy: "汤汤水水", rice_friendly: "特别下饭"
  };
  var GOAL_LABEL = { casual: "随心吃", light: "吃轻一点", high_protein: "高蛋白", ovo_lacto: "蛋奶素" };
  var SCENE_LABEL = { office: "在公司", home: "在家", overtime: "今天加班", post_workout: "刚运动完" };
  var HUNGER_LABEL = { low: "垫一口", normal: "正常", starving: "很饿" };
  var MEAL_TYPE_LABEL = { rice: "饭", noodle: "粉面", soup: "汤粥", light: "轻食", snack: "小吃" };
  var MEAL_GOAL_LABEL = { light: "清爽", filling: "顶饱", high_protein: "高蛋白", veggies: "蔬菜多" };
  var HOWTOCOOK = "https://github.com/Anduin2017/HowToCook/blob/master/";
  var MEALS = ["breakfast", "lunch", "dinner"];
  var ALL_CHANNELS = ["canteen", "takeout", "convenience", "home_cook"];
  var CUISINE_QUICK_IDS = ["cantonese", "hunan", "sichuan", "jiangxi"];

  var CUISINE_DATA = window.FANFAN_CUISINE_DATA || { cuisines: [], recipes: [], discoveryDishes: [] };
  var CUISINE_MAP = {};
  (CUISINE_DATA.cuisines || []).forEach(function (c) { CUISINE_MAP[c.id] = c; });

  /* ---------- 快捷方案 ---------- */
  var PRESETS = [
    {
      id: "weekday_commute", emoji: "🚇", title: "工作日通勤",
      desc: "便利店 · 食堂/外卖 · 自己做/外卖",
      scene: "office", goal: "casual",
      meals: {
        breakfast: { channelsAllowed: ["convenience", "canteen"], budgetMax: 15, timeMax: 10, hunger: "normal" },
        lunch: { channelsAllowed: ["canteen", "takeout"], budgetMax: 30, timeMax: 25, hunger: "starving" },
        dinner: { channelsAllowed: ["home_cook", "takeout"], budgetMax: 30, timeMax: 35, hunger: "normal" }
      }
    },
    {
      id: "overtime_survive", emoji: "💻", title: "加班续命",
      desc: "便利店 · 食堂 · 外卖",
      scene: "overtime", goal: "casual",
      meals: {
        breakfast: { channelsAllowed: ["convenience"], budgetMax: 15, timeMax: 10, hunger: "normal" },
        lunch: { channelsAllowed: ["canteen"], budgetMax: 30, timeMax: 20, hunger: "normal" },
        dinner: { channelsAllowed: ["takeout"], budgetMax: 35, timeMax: 40, hunger: "starving" }
      }
    },
    {
      id: "calorie_control", emoji: "🥗", title: "控卡工作日",
      desc: "便利店/自制 · 食堂轻食 · 自制",
      scene: "office", goal: "light",
      meals: {
        breakfast: { channelsAllowed: ["convenience", "home_cook"], budgetMax: 15, timeMax: 15, hunger: "normal", mealGoals: ["light"] },
        lunch: { channelsAllowed: ["canteen", "takeout"], budgetMax: 30, budgetFlex: false, timeMax: 25, hunger: "normal", mealTypes: ["light", "rice"], mealGoals: ["light", "veggies"] },
        dinner: { channelsAllowed: ["home_cook"], budgetMax: 25, timeMax: 30, hunger: "normal", mealGoals: ["light", "veggies"] }
      }
    },
    {
      id: "gym_day", emoji: "💪", title: "健身训练日",
      desc: "高蛋白早餐 · 食堂 · 高蛋白自制",
      scene: "post_workout", goal: "high_protein",
      meals: {
        breakfast: { channelsAllowed: ["home_cook", "convenience"], budgetMax: 20, timeMax: 15, hunger: "normal", mealGoals: ["high_protein"] },
        lunch: { channelsAllowed: ["canteen"], budgetMax: 35, timeMax: 25, hunger: "starving", mealGoals: ["high_protein", "filling"] },
        dinner: { channelsAllowed: ["home_cook"], budgetMax: 35, timeMax: 35, hunger: "normal", mealGoals: ["high_protein"] }
      }
    },
    {
      id: "home_cook_day", emoji: "🏠", title: "居家做饭",
      desc: "三餐均以自制为主",
      scene: "home", goal: "casual",
      meals: {
        breakfast: { channelsAllowed: ["home_cook"], budgetMax: 15, timeMax: 20, hunger: "normal" },
        lunch: { channelsAllowed: ["home_cook"], budgetMax: 30, timeMax: 40, hunger: "normal" },
        dinner: { channelsAllowed: ["home_cook"], budgetMax: 30, timeMax: 45, hunger: "normal" }
      }
    },
    {
      id: "lazy_day", emoji: "🛋️", title: "懒得动",
      desc: "便利店 · 外卖 · 外卖",
      scene: "home", goal: "casual",
      meals: {
        breakfast: { channelsAllowed: ["convenience"], budgetMax: 15, timeMax: 10, hunger: "low" },
        lunch: { channelsAllowed: ["takeout"], budgetMax: 35, timeMax: 40, hunger: "normal" },
        dinner: { channelsAllowed: ["takeout"], budgetMax: 35, timeMax: 40, hunger: "normal" }
      }
    },
    {
      id: "weekend_explore", emoji: "🗺️", title: "周末探索",
      desc: "地方早餐 · 地方菜/外卖 · 自制或外出",
      scene: "home", goal: "casual", exploreMode: "explore",
      meals: {
        breakfast: { channelsAllowed: ["canteen", "takeout", "convenience"], budgetMax: 20, timeMax: 25, hunger: "normal" },
        lunch: { channelsAllowed: ["takeout", "canteen"], budgetMax: 45, timeMax: 40, hunger: "normal" },
        dinner: { channelsAllowed: ["home_cook", "takeout"], budgetMax: 40, timeMax: 45, hunger: "normal" }
      }
    }
  ];

  /* ---------- 工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
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
  function greetingByHour(h) {
    if (h < 6) return "夜深了，也记得吃饭";
    if (h < 11) return "早上好，先把早餐安排上";
    if (h < 14) return "中午好，午餐别再纠结了";
    if (h < 18) return "下午好，晚点吃什么我帮你想";
    if (h < 22) return "晚上好，热乎的一顿安排上";
    return "夜猫子也要好好吃饭";
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
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("is-on"); }, 2400);
  }
  function safeJsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ---------- 菜品库：内置 + 地方菜种子 ---------- */
  var DISHES = Array.isArray(window.FANFAN_DISHES) ? window.FANFAN_DISHES.slice() : [];

  var CUISINE_EMOJI = {
    cantonese: "🐟", hunan: "🌶️", sichuan: "🌶️", jiangxi: "🦆", shandong: "🦐",
    fujian: "🐚", guangxi: "🍜", shaanxi: "🍜", hubei: "🍜", jiangsu: "🍲",
    zhejiang: "🐟", anhui: "🥬", guizhou: "🌶️", shanghai: "🥟", northeast: "🥬", xinjiang: "🐑"
  };

  function inferAllergensFromName(name) {
    var a = [];
    if (/牛|牛肉/.test(name)) a.push("beef");
    if (/猪|肉丝|肉片|回锅|排骨|腊肉|瘦肉|猪肉|咕噜|鱼香|水煮肉/.test(name) && !/牛肉|羊肉|鸡|虾|鱼|兔/.test(name)) a.push("pork");
    if (/猪|排骨|腊肉|回锅|猪肉|咕噜/.test(name)) a.push("pork");
    if (/虾|鱼|海参|蛏|鲈|鲤|海鲜|水煮鱼|啤酒鱼/.test(name)) a.push("seafood");
    if (/蛋|抱蛋|皮蛋/.test(name)) a.push("egg");
    if (/奶|芝士|奶酪/.test(name)) a.push("milk");
    if (/花生|坚果|宫保/.test(name)) a.push("nuts");
    return a;
  }
  function inferProtein(name, allergens) {
    if (/牛/.test(name)) return "牛肉";
    if (/羊/.test(name)) return "羊肉";
    if (/鸡|乌鸡/.test(name)) return "鸡肉";
    if (/鸭|兔/.test(name)) return /鸭/.test(name) ? "鸭肉" : "兔肉";
    if (/虾/.test(name)) return "虾";
    if (/鱼|海参|蛏|鲈|鲤/.test(name)) return "鱼";
    if (/蛋/.test(name)) return "鸡蛋";
    if (/豆腐|豆/.test(name)) return "豆腐";
    if (allergens.indexOf("pork") !== -1 || /肉|排骨|腊/.test(name)) return "猪肉";
    if (/面|粉|米|菜|笋/.test(name)) return "蔬菜";
    return "综合";
  }
  function inferStaple(name, mealSlots) {
    if (/粉|面|凉皮|河粉|螺蛳/.test(name)) return "面条";
    if (/粥/.test(name)) return "粥";
    if (/饭/.test(name)) return "米饭";
    if ((mealSlots || []).indexOf("breakfast") !== -1 && /蛋|粥|面/.test(name)) return /面/.test(name) ? "面条" : "粥";
    return "米饭";
  }
  function cuisineRecipeToDish(r) {
    var allergens = inferAllergensFromName(r.name);
    var protein = inferProtein(r.name, allergens);
    var spicy = /水煮|回锅|鱼香|口水|辣椒|辣|湘|川|赣|黔/.test(r.name) ? 2 : (/酱|豉|蒸|白灼|清/.test(r.name) ? 0 : 1);
    var slots = r.mealSlots && r.mealSlots.length ? r.mealSlots : ["lunch", "dinner"];
    return {
      id: r.id,
      name: r.name,
      emoji: CUISINE_EMOJI[(r.cuisineIds || [])[0]] || "🍽️",
      meals: slots,
      scenes: ["home", "office", "overtime", "post_workout"],
      goals: protein === "鸡肉" || protein === "牛肉" || protein === "虾" || protein === "鱼" || protein === "鸡蛋"
        ? ["casual", "high_protein"] : ["casual"],
      channels: ["home_cook"],
      budget: "15to30",
      hunger: ["normal", "starving"],
      tasteTags: spicy >= 2 ? ["spicy", "hot", "rice_friendly"] : ["hot", "rice_friendly"],
      prepMinutes: 30,
      takeoutWait: null,
      equipment: ["wok"],
      allergens: allergens,
      spicy: spicy,
      fullness: 2,
      difficulty: 1,
      protein: protein,
      staple: inferStaple(r.name, slots),
      calories: null,
      reason: "地方风味自制菜，做法来自开源菜谱。",
      tip: "按菜谱步骤做即可；分量可按人数调整。",
      searchQuery: r.takeoutSearchTerm || r.name,
      orderTip: "",
      canteenKeyword: r.name,
      recipePath: (r.source && r.source.path) || "",
      recipeUrl: (r.source && r.source.url) || "",
      cuisineIds: r.cuisineIds || [],
      hasVerifiedRecipe: !!(r.source && r.source.url && r.source.verification === "recipe_path_checked"),
      discoveryOnly: false
    };
  }
  function discoveryToDish(d) {
    var allergens = inferAllergensFromName(d.name);
    var protein = inferProtein(d.name, allergens);
    return {
      id: d.id,
      name: d.name,
      emoji: CUISINE_EMOJI[(d.cuisineIds || [])[0]] || "🦆",
      meals: ["lunch", "dinner"],
      scenes: ["office", "home", "overtime"],
      goals: ["casual"],
      channels: d.supportedChannels || ["takeout", "canteen"],
      budget: "15to30",
      hunger: ["normal", "starving"],
      tasteTags: ["spicy", "hot", "rice_friendly"],
      prepMinutes: null,
      takeoutWait: 35,
      equipment: [],
      allergens: allergens,
      spicy: 2,
      fullness: 2,
      difficulty: 0,
      protein: protein,
      staple: inferStaple(d.name, ["lunch", "dinner"]),
      calories: null,
      reason: "赣菜名菜探索：可在外卖平台或食堂搜索。",
      tip: "暂无开源菜谱链接，可记菜名去点外卖或食堂看看。",
      searchQuery: d.takeoutSearchTerm || d.name,
      orderTip: "搜索「" + d.name + "」试试附近店铺。",
      canteenKeyword: d.name,
      recipePath: "",
      recipeUrl: "",
      cuisineIds: d.cuisineIds || [],
      hasVerifiedRecipe: false,
      discoveryOnly: true,
      sourceNote: d.source || null
    };
  }

  function mergeCuisineDishes() {
    var existingIds = {};
    DISHES.forEach(function (d) { existingIds[d.id] = true; });
    (CUISINE_DATA.recipes || []).forEach(function (r) {
      if (existingIds[r.id]) return;
      // 按名称去重：若内置库已有同名自制菜，给内置补 cuisineIds
      var found = null;
      for (var i = 0; i < DISHES.length; i++) {
        if (DISHES[i].name === r.name || (DISHES[i].recipePath && r.source && DISHES[i].recipePath === r.source.path)) {
          found = DISHES[i];
          break;
        }
      }
      if (found) {
        found.cuisineIds = Array.from(new Set((found.cuisineIds || []).concat(r.cuisineIds || [])));
        if (r.source && r.source.url) {
          found.recipeUrl = r.source.url;
          found.hasVerifiedRecipe = true;
        }
        if (r.source && r.source.path && !found.recipePath) found.recipePath = r.source.path;
        return;
      }
      DISHES.push(cuisineRecipeToDish(r));
      existingIds[r.id] = true;
    });
    (CUISINE_DATA.discoveryDishes || []).forEach(function (d) {
      if (existingIds[d.id]) return;
      DISHES.push(discoveryToDish(d));
      existingIds[d.id] = true;
    });
  }

  function normalizeDishes() {
    var meatProt = { "鸡肉": 1, "猪肉": 1, "牛肉": 1, "虾": 1, "鱼": 1, "鸭肉": 1, "兔肉": 1, "羊肉": 1 };
    var uncertainRe = /套餐|拼盘|自选|关东煮|麻辣烫|拌饭|例汤|小炒|火锅/;
    DISHES.forEach(function (d) {
      if (!d.cuisineIds) d.cuisineIds = [];
      if (typeof d.hasVerifiedRecipe !== "boolean") {
        d.hasVerifiedRecipe = !!(d.recipePath || d.recipeUrl) && !d.discoveryOnly;
      }
      if (!d.allergens) d.allergens = [];
      var allergens = d.allergens;
      var containsMeat =
        !!meatProt[d.protein] ||
        d.protein === "综合" ||
        allergens.indexOf("pork") !== -1 ||
        allergens.indexOf("beef") !== -1;
      var containsSeafood =
        d.protein === "虾" || d.protein === "鱼" || allergens.indexOf("seafood") !== -1;
      var uncertain = uncertainRe.test(d.name || "") || d.protein === "综合";
      var claimed = (d.goals || []).indexOf("ovo_lacto") !== -1;
      var ovoOk = claimed && !containsMeat && !containsSeafood && !uncertain;
      if (d.dietFlags && typeof d.dietFlags.ovoLactoSuitable === "boolean") {
        ovoOk = d.dietFlags.ovoLactoSuitable === true && !containsMeat && !containsSeafood;
      }
      d.dietFlags = {
        containsMeat: !!containsMeat,
        containsSeafood: !!containsSeafood,
        ovoLactoSuitable: !!ovoOk
      };
      if (!d.dietFlags.ovoLactoSuitable) {
        d.goals = (d.goals || []).filter(function (g) { return g !== "ovo_lacto"; });
      } else if ((d.goals || []).indexOf("ovo_lacto") === -1) {
        d.goals = (d.goals || []).concat(["ovo_lacto"]);
      }

      // mealTypes 推断
      if (!d.mealTypes || !d.mealTypes.length) {
        var types = [];
        var st = d.staple || "";
        if (/米|饭/.test(st) || /饭/.test(d.name || "")) types.push("rice");
        if (/面|粉|河粉|凉皮/.test(st) || /面|粉/.test(d.name || "")) types.push("noodle");
        if (/粥|汤/.test(st) || /粥|汤/.test(d.name || "")) types.push("soup");
        if (/沙拉|轻食|蔬菜|凉拌|白灼菜/.test(d.name || "") || d.fullness === 0) types.push("light");
        if (/小吃|串|拼盘|关东|油条|包子|点心/.test(d.name || "")) types.push("snack");
        if (!types.length) types.push("rice");
        d.mealTypes = types;
      }
      // mealGoals 推断
      if (!d.mealGoals || !d.mealGoals.length) {
        var mg = [];
        if (d.fullness === 0 || (d.goals || []).indexOf("light") !== -1) mg.push("light");
        if (d.fullness === 2) mg.push("filling");
        if ((d.goals || []).indexOf("high_protein") !== -1 ||
          ["鸡肉", "牛肉", "虾", "鱼", "鸡蛋", "豆腐", "乳制品"].indexOf(d.protein) !== -1) mg.push("high_protein");
        if (d.protein === "蔬菜" || /菜|笋|沙拉|凉拌/.test(d.name || "")) mg.push("veggies");
        d.mealGoals = mg;
      }
    });
  }

  mergeCuisineDishes();
  normalizeDishes();

  function dishById(id) {
    for (var i = 0; i < DISHES.length; i++) if (DISHES[i].id === id) return DISHES[i];
    return null;
  }
  function recipeUrl(dish) {
    if (!dish || dish.discoveryOnly) return "";
    if (dish.recipeUrl) return dish.recipeUrl;
    if (dish.recipePath) return HOWTOCOOK + dish.recipePath;
    return "";
  }
  function makeSignature(meals) {
    return MEALS.map(function (m) { return meals[m] || ""; }).join("|");
  }
  function cuisineLabel(id) {
    return (CUISINE_MAP[id] && CUISINE_MAP[id].label) || id;
  }

  /* ---------- 设置与迁移 ---------- */
  function defaultMealSetting(meal) {
    if (meal === "breakfast") {
      return {
        channelsAllowed: ["convenience", "canteen"],
        budgetMax: 15, budgetFlex: false, timeMax: 10, hunger: "normal",
        mealTypes: [], mealGoals: [],
        equipment: "any", prepTime: "any", waitTime: "any"
      };
    }
    if (meal === "lunch") {
      return {
        channelsAllowed: ["canteen", "takeout"],
        budgetMax: 30, budgetFlex: false, timeMax: 25, hunger: "normal",
        mealTypes: [], mealGoals: [],
        equipment: "any", prepTime: "any", waitTime: "any"
      };
    }
    return {
      channelsAllowed: ["home_cook", "takeout"],
      budgetMax: 30, budgetFlex: false, timeMax: 35, hunger: "normal",
      mealTypes: [], mealGoals: [],
      equipment: "any", prepTime: "any", waitTime: "any"
    };
  }

  function defaultSettings() {
    return {
      version: 3,
      presetId: "weekday_commute",
      scene: "office",
      goal: "casual",
      dailyBudget: "any",
      tastes: [],
      cuisineIds: [],
      cuisineMode: "soft",
      exploreMode: "balanced",
      avoidRecent: true,
      tags: {
        noSpicy: false, noBeef: false, noPork: false,
        noSeafood: false, noEgg: false, noMilk: false, noNuts: false
      },
      meals: {
        breakfast: defaultMealSetting("breakfast"),
        lunch: defaultMealSetting("lunch"),
        dinner: defaultMealSetting("dinner")
      }
    };
  }

  function budgetCodeToMax(code) {
    if (code === "under15") return 15;
    if (code === "15to30") return 30;
    if (code === "over30") return null;
    return null;
  }
  /** 菜品预算档位上界（硬比较用） */
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
  }

  function migrateLegacySettings(legacy) {
    var def = defaultSettings();
    if (!legacy || typeof legacy !== "object") return def;
    var s = clone(def);
    s.scene = legacy.scene || s.scene;
    s.goal = legacy.goal || s.goal;
    s.tastes = Array.isArray(legacy.tastes) ? legacy.tastes : [];
    s.tags = Object.assign({}, def.tags, legacy.tags || {});
    var ch = legacy.channel || "any";
    var channels = ch === "any" ? ALL_CHANNELS.slice() : [ch];
    var bMax = budgetCodeToMax(legacy.budget || "any");
    MEALS.forEach(function (m) {
      s.meals[m] = Object.assign({}, defaultMealSetting(m), {
        channelsAllowed: channels.slice(),
        budgetMax: bMax,
        hunger: legacy.hunger || "normal",
        equipment: legacy.equipment || "any",
        prepTime: legacy.prepTime || "any",
        waitTime: legacy.waitTime || "any",
        timeMax: legacy.channel === "takeout" && legacy.waitTime !== "any"
          ? parseInt(legacy.waitTime, 10) || defaultMealSetting(m).timeMax
          : (legacy.channel === "home_cook" && legacy.prepTime !== "any"
            ? parseInt(legacy.prepTime, 10) || defaultMealSetting(m).timeMax
            : defaultMealSetting(m).timeMax)
      });
    });
    // 旧预算 over30：不设上限
    if (legacy.budget === "over30") {
      MEALS.forEach(function (m) { s.meals[m].budgetMax = null; });
    }
    s.presetId = null;
    return s;
  }

  function normalizeMealSetting(raw, meal) {
    var def = defaultMealSetting(meal);
    if (!raw || typeof raw !== "object") return clone(def);
    var channels = Array.isArray(raw.channelsAllowed)
      ? raw.channelsAllowed.filter(function (c) { return ALL_CHANNELS.indexOf(c) !== -1; })
      : def.channelsAllowed.slice();
    if (!channels.length) channels = def.channelsAllowed.slice();
    var budgetMax = raw.budgetMax;
    if (budgetMax === "any" || budgetMax === undefined) budgetMax = def.budgetMax;
    if (budgetMax != null) budgetMax = Number(budgetMax);
    if (budgetMax != null && !isFinite(budgetMax)) budgetMax = def.budgetMax;
    var timeMax = raw.timeMax != null ? Number(raw.timeMax) : def.timeMax;
    if (!isFinite(timeMax)) timeMax = def.timeMax;
    return {
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
    };
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE.settings);
      if (raw) {
        var parsed = safeJsonParse(raw, null);
        if (parsed && parsed.meals) {
          var def = defaultSettings();
          return {
            version: 3,
            presetId: parsed.presetId != null ? parsed.presetId : null,
            scene: parsed.scene || def.scene,
            goal: parsed.goal || def.goal,
            dailyBudget: parsed.dailyBudget || def.dailyBudget,
            tastes: Array.isArray(parsed.tastes) ? parsed.tastes : [],
            cuisineIds: Array.isArray(parsed.cuisineIds) ? parsed.cuisineIds : [],
            cuisineMode: parsed.cuisineMode === "strict" ? "strict" : "soft",
            exploreMode: parsed.exploreMode || "balanced",
            avoidRecent: parsed.avoidRecent !== false,
            tags: Object.assign({}, def.tags, parsed.tags || {}),
            meals: {
              breakfast: normalizeMealSetting(parsed.meals.breakfast, "breakfast"),
              lunch: normalizeMealSetting(parsed.meals.lunch, "lunch"),
              dinner: normalizeMealSetting(parsed.meals.dinner, "dinner")
            }
          };
        }
      }
      // 迁移旧版
      var legacy = safeJsonParse(localStorage.getItem(STORAGE.settingsLegacy), null);
      if (legacy) {
        var migrated = migrateLegacySettings(legacy);
        saveSettings(migrated);
        return migrated;
      }
    } catch (e) {
      console.warn("settings load failed", e);
    }
    return defaultSettings();
  }

  function saveSettings(s) {
    try {
      localStorage.setItem(STORAGE.settings, JSON.stringify(s));
    } catch (e) {}
  }
  function snapshotFilters(s) { return clone(s); }

  function applyPreset(presetId) {
    var p = PRESETS.filter(function (x) { return x.id === presetId; })[0];
    if (!p) return;
    var s = state.settings;
    s.presetId = p.id;
    if (p.scene) s.scene = p.scene;
    if (p.goal) s.goal = p.goal;
    if (p.exploreMode) s.exploreMode = p.exploreMode;
    MEALS.forEach(function (m) {
      var base = defaultMealSetting(m);
      var pm = p.meals[m] || {};
      s.meals[m] = normalizeMealSetting(Object.assign({}, base, pm, {
        equipment: s.meals[m].equipment || "any",
        prepTime: s.meals[m].prepTime || "any",
        waitTime: s.meals[m].waitTime || "any",
        mealTypes: pm.mealTypes || [],
        mealGoals: pm.mealGoals || []
      }), m);
    });
    saveSettings(s);
    applySettingsToUI();
    toast("已填入「" + p.title + "」，可继续细调");
  }

  function presetSummaryText(settings) {
    return MEALS.map(function (m) {
      var ch = (settings.meals[m].channelsAllowed || []).map(function (c) {
        return CHANNEL_LABEL[c] || c;
      }).join("/");
      return MEAL_LABEL[m] + ch;
    }).join(" · ");
  }

  /* ---------- 历史存储 ---------- */
  function loadCurrentMenu() {
    return safeJsonParse(localStorage.getItem(STORAGE.currentMenu), null);
  }
  function saveCurrentMenu(menu) {
    try { localStorage.setItem(STORAGE.currentMenu, JSON.stringify(menu)); } catch (e) {}
  }
  function pruneRecommend(list) {
    var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return (list || []).filter(function (h) {
      return h && h.ts && h.ts >= cutoff;
    }).slice(-100);
  }
  function loadRecommendHistory() {
    return pruneRecommend(safeJsonParse(localStorage.getItem(STORAGE.recommendHistory), []));
  }
  function saveRecommendHistory(list) {
    try { localStorage.setItem(STORAGE.recommendHistory, JSON.stringify(pruneRecommend(list))); } catch (e) {}
  }
  function loadEatenHistory() {
    var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return safeJsonParse(localStorage.getItem(STORAGE.eatenHistory), []).filter(function (h) {
      return h && h.ts && h.ts >= cutoff;
    }).slice(-100);
  }
  function saveEatenHistory(list) {
    try { localStorage.setItem(STORAGE.eatenHistory, JSON.stringify(list.slice(-100))); } catch (e) {}
  }
  function loadFavorites() {
    return safeJsonParse(localStorage.getItem(STORAGE.favorites), []);
  }
  function saveFavorites(list) {
    try { localStorage.setItem(STORAGE.favorites, JSON.stringify(list)); } catch (e) {}
  }
  function hasArrangedBefore() {
    return localStorage.getItem(STORAGE.hasArranged) === todayKey();
  }
  function markArranged() {
    try { localStorage.setItem(STORAGE.hasArranged, todayKey()); } catch (e) {}
  }
  function pushRecommendHistory(entry) {
    var list = loadRecommendHistory();
    list.push(entry);
    saveRecommendHistory(list);
  }
  function recentSignatures(n) {
    var list = loadRecommendHistory();
    var out = [];
    for (var i = list.length - 1; i >= 0 && out.length < n; i--) {
      if (list[i].signature) out.push(list[i].signature);
    }
    return out;
  }
  function recentMealDishIds(meal, n) {
    var list = loadRecommendHistory();
    var ids = [];
    var seen = {};
    for (var i = list.length - 1; i >= 0 && ids.length < n; i--) {
      var id = list[i].meals && list[i].meals[meal];
      if (id && !seen[id]) {
        seen[id] = true;
        ids.push(id);
      }
    }
    return ids;
  }

  /** 最近 3 天吃过 / 推荐过的菜 ID 集合 */
  function recentDaysDishIds(days) {
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    var map = {};
    loadEatenHistory().forEach(function (h) {
      if (!h.ts || h.ts < cutoff || !h.meals) return;
      MEALS.forEach(function (m) { if (h.meals[m]) map[h.meals[m]] = true; });
    });
    loadRecommendHistory().forEach(function (h) {
      if (!h.ts || h.ts < cutoff || !h.meals) return;
      MEALS.forEach(function (m) { if (h.meals[m]) map[h.meals[m]] = true; });
    });
    return map;
  }

  function recent7DayWeightMap() {
    var listE = loadEatenHistory();
    var listR = loadRecommendHistory();
    var map = {};
    var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    function add(h, w) {
      if (!h.ts || h.ts < cutoff || !h.meals) return;
      MEALS.forEach(function (m) {
        var id = h.meals[m];
        if (id) map[id] = (map[id] || 0) + w;
      });
    }
    listE.forEach(function (h) { add(h, 2); });
    listR.forEach(function (h) { add(h, 1); });
    return map;
  }

  /* ---------- 热量 ---------- */
  var COMMON_FOODS = [
    { name: "白米饭（一碗）", kcal: 230, meal: "lunch", portion: "约200g" },
    { name: "杂粮饭（一碗）", kcal: 210, meal: "lunch", portion: "约200g" },
    { name: "全麦面包（两片）", kcal: 160, meal: "breakfast", portion: "2片" },
    { name: "油条（1根）", kcal: 280, meal: "breakfast", portion: "1根" },
    { name: "包子（肉包1个）", kcal: 220, meal: "breakfast", portion: "1个" },
    { name: "豆浆（无糖一杯）", kcal: 90, meal: "drink", portion: "约300ml" },
    { name: "牛奶（一杯）", kcal: 130, meal: "drink", portion: "约250ml" },
    { name: "水煮蛋（1个）", kcal: 70, meal: "breakfast", portion: "1个" },
    { name: "茶叶蛋（1个）", kcal: 85, meal: "breakfast", portion: "1个" },
    { name: "香蕉（1根）", kcal: 90, meal: "snack", portion: "中等大小" },
    { name: "苹果（1个）", kcal: 80, meal: "snack", portion: "中等大小" },
    { name: "酸奶（杯装）", kcal: 120, meal: "snack", portion: "约150g" },
    { name: "鸡胸肉（100g）", kcal: 165, meal: "lunch", portion: "100g" },
    { name: "清蒸鱼（一份）", kcal: 180, meal: "dinner", portion: "约150g鱼肉" },
    { name: "青菜（一碟）", kcal: 40, meal: "dinner", portion: "约200g" },
    { name: "西红柿炒蛋（一盘）", kcal: 280, meal: "lunch", portion: "约1人份" },
    { name: "宫保鸡丁（一盘）", kcal: 420, meal: "lunch", portion: "约1人份" },
    { name: "盖浇饭（普通）", kcal: 650, meal: "lunch", portion: "1份" },
    { name: "牛肉面（一碗）", kcal: 550, meal: "lunch", portion: "1碗" },
    { name: "沙拉（鸡胸轻食）", kcal: 350, meal: "lunch", portion: "1份" },
    { name: "便利店饭团（1个）", kcal: 200, meal: "breakfast", portion: "1个" },
    { name: "便利店便当", kcal: 520, meal: "lunch", portion: "1盒" },
    { name: "奶茶（中杯少糖）", kcal: 350, meal: "drink", portion: "中杯" },
    { name: "美式咖啡", kcal: 10, meal: "drink", portion: "中杯" },
    { name: "粥（一碗）", kcal: 150, meal: "breakfast", portion: "约300ml" },
    { name: "饺子（10个）", kcal: 400, meal: "dinner", portion: "10个" },
    { name: "蛋炒饭（一盘）", kcal: 520, meal: "dinner", portion: "1人份" }
  ];

  function defaultCalorieSettings() {
    return { targetEnabled: false, targetKcal: 1800 };
  }
  function loadCalorieSettings() {
    var raw = safeJsonParse(localStorage.getItem(STORAGE.calorieSettings), null);
    var def = defaultCalorieSettings();
    if (!raw || typeof raw !== "object") return def;
    var t = Number(raw.targetKcal);
    return {
      targetEnabled: !!raw.targetEnabled,
      targetKcal: (isFinite(t) && t >= 800 && t <= 5000) ? Math.round(t) : def.targetKcal
    };
  }
  function saveCalorieSettings(s) {
    try {
      localStorage.setItem(STORAGE.calorieSettings, JSON.stringify({
        targetEnabled: !!s.targetEnabled,
        targetKcal: Math.max(800, Math.min(5000, Math.round(Number(s.targetKcal) || 1800)))
      }));
    } catch (e) {}
  }
  function loadAllCalorieLogs() {
    var raw = safeJsonParse(localStorage.getItem(STORAGE.calorieLogs), {});
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw;
  }
  function pruneCalorieLogs(all) {
    var out = {};
    Object.keys(all || {}).forEach(function (day) {
      var list = Array.isArray(all[day]) ? all[day] : [];
      var kept = list.filter(function (item) {
        return item && item.ts && isFinite(Number(item.kcal));
      });
      if (kept.length) out[day] = kept;
    });
    var days = Object.keys(out).sort();
    if (days.length > 180) {
      days.slice(0, days.length - 180).forEach(function (d) { delete out[d]; });
    }
    return out;
  }
  function saveAllCalorieLogs(all) {
    try { localStorage.setItem(STORAGE.calorieLogs, JSON.stringify(pruneCalorieLogs(all))); } catch (e) {}
  }
  function getTodayLogs() {
    var all = loadAllCalorieLogs();
    var day = todayKey();
    var list = Array.isArray(all[day]) ? all[day] : [];
    return list.filter(function (item) {
      return item && item.id && item.name && isFinite(Number(item.kcal));
    });
  }
  function setTodayLogs(list) {
    var all = loadAllCalorieLogs();
    all[todayKey()] = list;
    saveAllCalorieLogs(all);
  }
  function dishDefaultKcal(dish) {
    if (!dish) return 400;
    if (dish.calories && isFinite(dish.calories.default)) return Math.round(dish.calories.default);
    if (dish.calories && isFinite(dish.calories.min) && isFinite(dish.calories.max)) {
      return Math.round((dish.calories.min + dish.calories.max) / 2);
    }
    // 无热量数据的地方菜：温和估算
    if (dish.fullness === 0) return 280;
    if (dish.fullness === 2) return 520;
    return 400;
  }
  function formatDishCalories(dish) {
    if (!dish) return "—";
    if (dish.calories && isFinite(dish.calories.min) && isFinite(dish.calories.max)) {
      return dish.calories.min + "–" + dish.calories.max + " kcal（估）";
    }
    return "约 " + dishDefaultKcal(dish) + " kcal（估）";
  }
  function clampKcal(n) {
    var v = Math.round(Number(n));
    if (!isFinite(v) || v < 1 || v > 5000) return null;
    return v;
  }
  function sumLogs(list) {
    return (list || []).reduce(function (s, x) { return s + (Number(x.kcal) || 0); }, 0);
  }
  function splitByMeal(list) {
    var o = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, drink: 0 };
    (list || []).forEach(function (x) {
      var m = x.meal || "snack";
      if (o[m] == null) o.snack += Number(x.kcal) || 0;
      else o[m] += Number(x.kcal) || 0;
    });
    return o;
  }
  function findRecommendLog(meal, dishId, menuId) {
    if (!dishId) return null;
    var list = getTodayLogs();
    for (var i = 0; i < list.length; i++) {
      if (list[i].source === "recommend" && list[i].meal === meal && list[i].dishId === dishId) {
        // 指定菜单时优先匹配 menuId，避免跨菜单误判；无 menuId 字段则兼容旧数据
        if (menuId && list[i].menuId && list[i].menuId !== menuId) continue;
        return list[i];
      }
    }
    return null;
  }
  function findLogById(id) {
    var list = getTodayLogs();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function upsertLog(entry) {
    var list = getTodayLogs();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === entry.id) { idx = i; break; }
    }
    if (entry.source === "recommend" && entry.dishId) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].source === "recommend" && list[j].meal === entry.meal && list[j].dishId === entry.dishId) {
          idx = j;
          entry.id = list[j].id;
          break;
        }
      }
    }
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    setTodayLogs(list);
    renderEnergyCard();
  }
  function deleteLog(id) {
    setTodayLogs(getTodayLogs().filter(function (x) { return x.id !== id; }));
    renderEnergyCard();
  }
  function isMealCheckedIn(meal) {
    if (!state.menu || !state.menu.meals || !state.menu.meals[meal]) return false;
    return !!findRecommendLog(meal, state.menu.meals[meal], state.menu.id) ||
      !!findRecommendLog(meal, state.menu.meals[meal]);
  }
  function getLockedMealsFromLogs() {
    var locked = {};
    if (!state.menu || !state.menu.meals) return locked;
    MEALS.forEach(function (m) {
      if (state.menu.meals[m] && isMealCheckedIn(m)) {
        locked[m] = state.menu.meals[m];
      }
    });
    return locked;
  }

  function loadMenuCheckins() {
    return safeJsonParse(localStorage.getItem(STORAGE.menuCheckin), {}) || {};
  }
  function saveMenuCheckins(map) {
    try { localStorage.setItem(STORAGE.menuCheckin, JSON.stringify(map)); } catch (e) {}
  }
  function menuCheckinKey(menu) {
    if (!menu) return "";
    return (menu.date || todayKey()) + "|" + (menu.id || menu.signature || "");
  }
  function hasMenuCalorieCheckin(menu) {
    var key = menuCheckinKey(menu);
    if (!key) return false;
    var map = loadMenuCheckins();
    if (map[key]) return true;
    // 兼容旧数据：同日同菜单 ID 的 recommend 日志
    if (!menu || !menu.meals || !menu.id) return false;
    var logs = getTodayLogs();
    var matched = 0;
    var needed = 0;
    MEALS.forEach(function (m) {
      if (!menu.meals[m]) return;
      needed++;
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].source === "recommend" && logs[i].meal === m &&
            logs[i].dishId === menu.meals[m] && logs[i].menuId === menu.id) {
          matched++;
          break;
        }
      }
    });
    return needed > 0 && matched === needed;
  }

  /* ---------- 推荐引擎 ---------- */
  function isOvoLactoSuitable(dish) {
    if (!dish) return false;
    if ((dish.goals || []).indexOf("ovo_lacto") === -1) return false;
    if (!dish.dietFlags || dish.dietFlags.ovoLactoSuitable !== true) return false;
    if (dish.dietFlags.containsMeat || dish.dietFlags.containsSeafood) return false;
    return true;
  }

  function mealSetting(settings, meal) {
    return (settings.meals && settings.meals[meal]) || defaultMealSetting(meal);
  }

  /** 硬筛选：忌口、蛋奶素、渠道、预算、厨具、餐次；菜系严格模式 */
  function matchHardFilters(dish, settings, meal, channel, softFlags) {
    softFlags = softFlags || defaultSoftFlags();
    if (meal && (dish.meals || []).indexOf(meal) === -1) return false;

    // 渠道：必须支持本次选中渠道
    if (channel) {
      if ((dish.channels || []).indexOf(channel) === -1) return false;
    } else {
      var allowed = mealSetting(settings, meal).channelsAllowed || [];
      if (allowed.length && !allowed.some(function (c) { return (dish.channels || []).indexOf(c) !== -1; })) {
        return false;
      }
    }

    var ms = mealSetting(settings, meal);
    if (!budgetMaxToDishOk(ms.budgetMax, dish.budget)) return false;

    // 唯一渠道时厨具为硬条件
    if (channel === "home_cook" || (ms.channelsAllowed.length === 1 && ms.channelsAllowed[0] === "home_cook")) {
      if (ms.equipment && ms.equipment !== "any") {
        if (!dish.equipment || dish.equipment.indexOf(ms.equipment) === -1) return false;
      }
    }

    var tags = settings.tags || {};
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
    if (tags.noNuts && allergens.indexOf("nuts") !== -1) return false;

    if (settings.goal === "ovo_lacto" && !isOvoLactoSuitable(dish)) return false;

    // 严格菜系：硬条件（不可被 softFlags 关掉）
    if (settings.cuisineMode === "strict" && settings.cuisineIds && settings.cuisineIds.length) {
      var hit = (dish.cuisineIds || []).some(function (id) {
        return settings.cuisineIds.indexOf(id) !== -1;
      });
      if (!hit) return false;
    }

    return true;
  }

  function matchSoftFilters(dish, settings, meal, channel, softFlags) {
    softFlags = softFlags || defaultSoftFlags();
    var ms = mealSetting(settings, meal);

    if (softFlags.scene && (dish.scenes || []).indexOf(settings.scene) === -1) return false;
    if (softFlags.goal && settings.goal !== "ovo_lacto" && settings.goal !== "casual") {
      if ((dish.goals || []).indexOf(settings.goal) === -1) return false;
    }
    if (softFlags.hunger && (dish.hunger || []).indexOf(ms.hunger) === -1) return false;

    if (softFlags.tastes && settings.tastes && settings.tastes.length) {
      var ok = settings.tastes.some(function (t) { return (dish.tasteTags || []).indexOf(t) !== -1; });
      if (!ok) return false;
    }

    // 餐型
    if (softFlags.mealTypes && ms.mealTypes && ms.mealTypes.length) {
      var mtOk = ms.mealTypes.some(function (t) { return (dish.mealTypes || []).indexOf(t) !== -1; });
      if (!mtOk) return false;
    }
    // 当餐目标
    if (softFlags.mealGoals && ms.mealGoals && ms.mealGoals.length) {
      var mgOk = ms.mealGoals.some(function (t) { return (dish.mealGoals || []).indexOf(t) !== -1; });
      if (!mgOk) return false;
    }

    // 时间软偏好
    if (softFlags.time) {
      if (channel === "takeout" && ms.timeMax != null) {
        if (dish.takeoutWait != null && dish.takeoutWait > ms.timeMax) return false;
      }
      if (channel === "home_cook" && ms.timeMax != null) {
        if (dish.prepMinutes != null && dish.prepMinutes > ms.timeMax) return false;
      }
      // 兼容旧 waitTime/prepTime 字段
      if (channel === "takeout" && ms.waitTime && ms.waitTime !== "any") {
        var wl = parseInt(ms.waitTime, 10);
        if (dish.takeoutWait != null && dish.takeoutWait > wl) return false;
      }
      if (channel === "home_cook" && ms.prepTime && ms.prepTime !== "any") {
        var pl = parseInt(ms.prepTime, 10);
        if (dish.prepMinutes != null && dish.prepMinutes > pl) return false;
      }
    }

    // 软菜系：在 soft 模式下不硬过滤（加权），在 softFlags.cuisine 关闭后完全忽略
    // 严格模式已在硬条件处理
    return true;
  }

  function matchFilters(dish, settings, meal, channel, softFlags) {
    return matchHardFilters(dish, settings, meal, channel, softFlags) &&
      matchSoftFilters(dish, settings, meal, channel, softFlags);
  }

  function defaultSoftFlags() {
    return {
      scene: true, goal: true, hunger: true, tastes: true,
      time: true, mealTypes: true, mealGoals: true, cuisine: true, explore: true
    };
  }

  function softFlagLabel(key, settings) {
    if (key === "scene") return SCENE_LABEL[settings.scene] || "场景";
    if (key === "goal") return GOAL_LABEL[settings.goal] || "目标";
    if (key === "hunger") return "胃口";
    if (key === "tastes") {
      if (!settings.tastes || !settings.tastes.length) return "口味";
      return settings.tastes.map(function (t) { return TASTE_LABEL[t] || t; }).join("、");
    }
    if (key === "time") return "等待/制作时间";
    if (key === "mealTypes") return "餐型";
    if (key === "mealGoals") return "当餐目标";
    if (key === "cuisine") {
      if (!settings.cuisineIds || !settings.cuisineIds.length) return "菜系";
      return settings.cuisineIds.map(cuisineLabel).join("、");
    }
    if (key === "explore") return "探索偏好";
    return key;
  }

  function pickChannelForMeal(settings, meal, rng) {
    var allowed = (mealSetting(settings, meal).channelsAllowed || []).slice();
    if (!allowed.length) allowed = ALL_CHANNELS.slice();
    // 按候选池大小加权
    var weights = allowed.map(function (ch) {
      var n = DISHES.filter(function (d) {
        return (d.meals || []).indexOf(meal) !== -1 && (d.channels || []).indexOf(ch) !== -1;
      }).length;
      return Math.max(1, n);
    });
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var r = rng() * total;
    for (var i = 0; i < allowed.length; i++) {
      r -= weights[i];
      if (r <= 0) return allowed[i];
    }
    return allowed[allowed.length - 1];
  }

  function weightDish(dish, settings, meal, channel, ctx, rng) {
    var w = 8 + rng() * 4;
    var ms = mealSetting(settings, meal);

    // 菜系命中 +18
    if (settings.cuisineIds && settings.cuisineIds.length) {
      var cHit = (dish.cuisineIds || []).some(function (id) {
        return settings.cuisineIds.indexOf(id) !== -1;
      });
      if (cHit) w += 18;
      else if (settings.cuisineMode === "soft") w -= 2;
    }

    // 目标 +14
    if ((dish.goals || []).indexOf(settings.goal) !== -1) w += 14;
    if (ms.mealGoals && ms.mealGoals.length) {
      var mg = ms.mealGoals.filter(function (g) { return (dish.mealGoals || []).indexOf(g) !== -1; }).length;
      w += mg * 8;
    }

    // 口味 +8
    if (settings.tastes && settings.tastes.length) {
      var th = settings.tastes.filter(function (t) { return (dish.tasteTags || []).indexOf(t) !== -1; }).length;
      w += th * 8;
    }

    // 渠道契合 +12
    if ((dish.channels || []).indexOf(channel) !== -1) w += 12;
    if ((dish.scenes || []).indexOf(settings.scene) !== -1) w += 6;
    if ((dish.hunger || []).indexOf(ms.hunger) !== -1) w += 6;

    // 探索
    if (settings.exploreMode === "explore") {
      if (dish.cuisineIds && dish.cuisineIds.length) w += 8;
      if (dish.discoveryOnly) w += 6;
      if (ctx.recent7[dish.id]) w -= 10;
      else w += 4;
    } else if (settings.exploreMode === "familiar") {
      if (ctx.recent7[dish.id]) w += 4;
      if (dish.discoveryOnly) w -= 4;
    } else {
      if (!ctx.recent7[dish.id]) w += 3;
    }

    // 近 7 天惩罚
    if (ctx.recent7[dish.id]) {
      w -= Math.min(35, 8 + ctx.recent7[dish.id] * 6);
    }

    // 今日组合惩罚
    if (ctx.usedStaple[dish.staple] && dish.staple !== "无主食") w -= 14;
    if (ctx.usedProtein[dish.protein]) w -= 20;
    if (ctx.usedChannels[channel]) w -= 6;
    if (ctx.usedTasteKeys) {
      var overlap = (dish.tasteTags || []).filter(function (t) { return ctx.usedTasteKeys[t]; }).length;
      if (overlap >= 2) w -= 8;
    }

    if (ctx.sessionMealSeen[dish.id]) w *= 0.4;
    if (ctx.excludeIds[dish.id]) return 0;
    if (ctx.usedIds[dish.id]) return 0;
    if (ctx.recent3[dish.id] && ctx.avoidRecent) {
      // 候选充足时已在池中排除；若仍进入则强惩罚
      w *= 0.05;
    }

    if (settings.goal === "light") {
      if (dish.fullness === 0) w += 6;
      if (dish.fullness === 2) w -= 4;
    }
    if (settings.goal === "high_protein" || (ms.mealGoals || []).indexOf("high_protein") !== -1) {
      if (["鸡肉", "牛肉", "虾", "鱼", "鸡蛋", "豆腐", "乳制品"].indexOf(dish.protein) !== -1) w += 10;
    }
    if (ms.hunger === "starving" && dish.fullness === 2) w += 8;
    if (ms.hunger === "low" && dish.fullness === 0) w += 6;

    return Math.max(0, w);
  }

  function resolveSoftFlags(settings, meal, channel, excludeMap) {
    var order = ["mealTypes", "mealGoals", "tastes", "time", "hunger", "explore", "scene", "goal", "cuisine"];
    var flags = defaultSoftFlags();
    var relaxed = [];

    function poolSize(f) {
      return DISHES.filter(function (d) {
        return matchFilters(d, settings, meal, channel, f) && !(excludeMap && excludeMap[d.id]);
      }).length;
    }

    if (poolSize(flags) > 0) return { softFlags: flags, relaxed: relaxed };

    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      if (key === "tastes" && (!settings.tastes || !settings.tastes.length)) continue;
      if (key === "mealTypes" && !(mealSetting(settings, meal).mealTypes || []).length) continue;
      if (key === "mealGoals" && !(mealSetting(settings, meal).mealGoals || []).length) continue;
      if (key === "cuisine" && (!settings.cuisineIds || !settings.cuisineIds.length)) continue;
      if (key === "goal" && (settings.goal === "casual" || settings.goal === "ovo_lacto")) continue;
      // 严格菜系是硬条件：绝不自动放宽
      if (key === "cuisine" && settings.cuisineMode === "strict") continue;
      // 软菜系可放宽（仅加权偏好时 cuisine 在 softFlags 中关闭）
      flags[key] = false;
      relaxed.push(key);
      if (poolSize(flags) > 0) break;
    }
    return { softFlags: flags, relaxed: relaxed };
  }

  function pickWeighted(candidates, scoreFn, rng) {
    if (!candidates.length) return null;
    var total = 0;
    var scores = candidates.map(function (d) {
      var s = scoreFn(d);
      total += s;
      return s;
    });
    if (total <= 0) return null;
    var r = rng() * total;
    for (var i = 0; i < candidates.length; i++) {
      r -= scores[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function generatePlan(settings, options) {
    options = options || {};
    var fixed = options.fixedMeals || {};
    var fixedChannels = options.fixedChannels || {};
    var excludePerMeal = options.excludePerMeal || {};
    var mustDiffer = options.mustDifferMeals || {};
    var forbidSigs = {};
    (options.forbidSignatures || []).forEach(function (s) { forbidSigs[s] = true; });

    var recent3 = settings.avoidRecent ? recentDaysDishIds(3) : {};
    var recent7 = recent7DayWeightMap();
    var sessionMealSeen = options.sessionMealSeen || {};
    var best = null;
    var allRelaxed = {};

    for (var attempt = 0; attempt < 28; attempt++) {
      var seed = hashStr(
        todayKey() + "#" + JSON.stringify(settings) + "#" + (options.seedSalt || "") +
        "#a" + attempt + "#" + Date.now() + "#" + Math.random()
      );
      var usedIds = {};
      var usedStaple = {};
      var usedProtein = {};
      var usedChannels = {};
      var usedTasteKeys = {};
      var meals = {};
      var channels = {};
      var empty = [];
      var attemptRelaxed = {};

      MEALS.forEach(function (meal, idx) {
        if (fixed[meal]) {
          meals[meal] = fixed[meal];
          var keep = dishById(fixed[meal]);
          var chKeep = fixedChannels[meal] || (keep && keep.channels && keep.channels[0]) || "takeout";
          channels[meal] = chKeep;
          if (keep) {
            usedIds[keep.id] = true;
            if (keep.staple !== "无主食") usedStaple[keep.staple] = true;
            usedProtein[keep.protein] = true;
            usedChannels[chKeep] = true;
            (keep.tasteTags || []).forEach(function (t) { usedTasteKeys[t] = true; });
          }
          return;
        }

        var rng = mulberry32(hashStr(String(seed) + "#" + meal + "#" + idx));
        var channel = pickChannelForMeal(settings, meal, rng);
        channels[meal] = channel;

        var exclude = Object.assign({}, excludePerMeal[meal] || {});
        if (mustDiffer[meal]) exclude[mustDiffer[meal]] = true;

        // 最近 3 天排除（候选充足时）
        var recentExclude = {};
        if (settings.avoidRecent) {
          Object.keys(recent3).forEach(function (id) { recentExclude[id] = true; });
        }

        var resolved = resolveSoftFlags(settings, meal, channel, Object.assign({}, exclude, recentExclude, usedIds));
        resolved.relaxed.forEach(function (k) {
          attemptRelaxed[k] = true;
          allRelaxed[k] = true;
        });
        var softFlags = resolved.softFlags;

        // 严格菜系放宽时：临时 soft 匹配
        var settingsForMatch = settings;

        function buildPool(withRecentExclude, extraExclude) {
          return DISHES.filter(function (d) {
            if (usedIds[d.id]) return false;
            if (exclude[d.id]) return false;
            if (extraExclude && extraExclude[d.id]) return false;
            if (withRecentExclude && recentExclude[d.id]) return false;
            return matchFilters(d, settingsForMatch, meal, channel, softFlags);
          });
        }

        var pool = buildPool(true, null);
        // 候选不足则不排除近 3 天
        if (pool.length < 2) pool = buildPool(false, null);

        // 硬条件兜底
        if (!pool.length) {
          pool = DISHES.filter(function (d) {
            return matchHardFilters(d, settingsForMatch, meal, channel, softFlags) &&
              !exclude[d.id] && !usedIds[d.id];
          });
          if (pool.length) {
            Object.keys(defaultSoftFlags()).forEach(function (k) { allRelaxed[k] = true; });
          }
        }

        // 渠道候选仍空：尝试同餐其他 allowed 渠道
        if (!pool.length) {
          var allowed = mealSetting(settings, meal).channelsAllowed || [];
          for (var ai = 0; ai < allowed.length && !pool.length; ai++) {
            if (allowed[ai] === channel) continue;
            var ch2 = allowed[ai];
            pool = DISHES.filter(function (d) {
              return matchHardFilters(d, settingsForMatch, meal, ch2, softFlags) &&
                !exclude[d.id] && !usedIds[d.id];
            });
            if (pool.length) {
              channel = ch2;
              channels[meal] = ch2;
            }
          }
        }

        if (!pool.length) {
          empty.push(meal);
          meals[meal] = null;
          return;
        }

        var ctx = {
          recent3: recent3,
          recent7: recent7,
          sessionMealSeen: sessionMealSeen,
          excludeIds: exclude,
          usedIds: usedIds,
          usedStaple: usedStaple,
          usedProtein: usedProtein,
          usedChannels: usedChannels,
          usedTasteKeys: usedTasteKeys,
          avoidRecent: !!settings.avoidRecent,
          meal: meal
        };

        var picked = pickWeighted(pool, function (d) {
          return weightDish(d, settingsForMatch, meal, channel, ctx, rng);
        }, rng);

        // 权重全 0：重建未使用池（仅去掉 usedIds，不回退已用菜）
        if (!picked) {
          var freshPool = pool.filter(function (d) { return !usedIds[d.id]; });
          if (freshPool.length) {
            // 均匀权重
            picked = pickWeighted(freshPool, function () { return 1; }, rng);
          }
        }

        // 放宽主食/蛋白惩罚再试
        if (!picked) {
          ctx.usedStaple = {};
          ctx.usedProtein = {};
          picked = pickWeighted(pool, function (d) {
            return weightDish(d, settingsForMatch, meal, channel, ctx, rng);
          }, rng);
        }

        if (!picked || usedIds[picked.id]) {
          empty.push(meal);
          meals[meal] = null;
          return;
        }

        meals[meal] = picked.id;
        usedIds[picked.id] = true;
        if (picked.staple !== "无主食") usedStaple[picked.staple] = true;
        usedProtein[picked.protein] = true;
        usedChannels[channel] = true;
        (picked.tasteTags || []).forEach(function (t) { usedTasteKeys[t] = true; });
      });

      var sig = makeSignature(meals);
      var plan = {
        meals: meals,
        channels: channels,
        signature: sig,
        emptyMeals: empty,
        anyEmpty: empty.length > 0,
        filters: snapshotFilters(settings),
        relaxedKeys: Object.keys(Object.assign({}, allRelaxed, attemptRelaxed)),
        ts: Date.now()
      };

      if (plan.anyEmpty) {
        if (!best) best = plan;
        continue;
      }
      if (forbidSigs[sig] && attempt < 22) continue;

      if (options.requireAllMealsDifferent && options.prevMeals) {
        var sameCount = MEALS.filter(function (m) {
          return options.prevMeals[m] && meals[m] === options.prevMeals[m];
        }).length;
        if (sameCount > 0 && attempt < 14) continue;
      }

      return plan;
    }

    return best || {
      meals: { breakfast: null, lunch: null, dinner: null },
      channels: { breakfast: null, lunch: null, dinner: null },
      signature: "||",
      emptyMeals: MEALS.slice(),
      anyEmpty: true,
      filters: snapshotFilters(settings),
      relaxedKeys: Object.keys(allRelaxed),
      ts: Date.now()
    };
  }

  function menuFromPlan(plan, action) {
    var names = {};
    MEALS.forEach(function (m) {
      var d = plan.meals[m] ? dishById(plan.meals[m]) : null;
      names[m] = d ? d.name : "";
    });
    return {
      id: uid(),
      date: todayKey(),
      ts: Date.now(),
      action: action,
      filters: plan.filters || snapshotFilters(state.settings),
      meals: {
        breakfast: plan.meals.breakfast,
        lunch: plan.meals.lunch,
        dinner: plan.meals.dinner
      },
      channels: {
        breakfast: plan.channels.breakfast,
        lunch: plan.channels.lunch,
        dinner: plan.channels.dinner
      },
      names: names,
      signature: plan.signature || makeSignature(plan.meals),
      relaxedKeys: plan.relaxedKeys || []
    };
  }

  /* ---------- 状态 ---------- */
  var state = {
    settings: loadSettings(),
    menu: null,
    revealing: false,
    historyTab: "recommend",
    sessionSeenSigs: {},
    sessionMealSeen: {},
    openMealEditor: "lunch",
    mealsExpanded: true
  };

  /* ---------- 动作 ---------- */
  function restoreLastMenu() {
    var saved = loadCurrentMenu();
    var isToday = false;
    if (saved) {
      if (saved.date) isToday = saved.date === todayKey();
      else if (saved.ts) isToday = todayKey(new Date(saved.ts)) === todayKey();
    }
    if (saved && isToday && saved.meals &&
      (saved.meals.breakfast || saved.meals.lunch || saved.meals.dinner)) {
      if (!saved.date) saved.date = todayKey();
      if (!saved.channels) saved.channels = {};
      state.menu = saved;
      if (saved.signature) state.sessionSeenSigs[saved.signature] = true;
      MEALS.forEach(function (m) {
        if (saved.meals[m]) state.sessionMealSeen[saved.meals[m]] = true;
      });
      renderResults({ animate: false });
      updateArrangeButton();
      updateEatButton();
      return true;
    }
    if (saved && !isToday) {
      try { localStorage.removeItem(STORAGE.currentMenu); } catch (e) {}
    }
    state.menu = null;
    renderResults({ animate: false });
    updateArrangeButton();
    updateEatButton();
    return false;
  }

  function generateNewMenu(opts) {
    opts = opts || {};
    var settings = state.settings;
    saveSettings(settings);

    var forbid = recentSignatures(20);
    Object.keys(state.sessionSeenSigs).forEach(function (s) { forbid.push(s); });
    if (state.menu && state.menu.signature) forbid.push(state.menu.signature);

    var isFirst = !hasArrangedBefore() && !state.menu;
    var action = isFirst ? "first" : "reroll";

    var locked = opts.forceAll ? {} : getLockedMealsFromLogs();
    var lockedChannels = {};
    var lockedKeys = Object.keys(locked);
    if (lockedKeys.length && !opts.forceAll) {
      toast(lockedKeys.map(function (m) { return MEAL_LABEL[m]; }).join("、") + "已经吃过，只帮你重新安排后面的餐。");
      lockedKeys.forEach(function (m) {
        if (state.menu && state.menu.channels) lockedChannels[m] = state.menu.channels[m];
      });
    }

    var mustDiffer = {};
    if (state.menu && state.menu.meals) {
      MEALS.forEach(function (m) {
        if (!locked[m] && state.menu.meals[m]) mustDiffer[m] = state.menu.meals[m];
      });
    }

    var plan = generatePlan(settings, {
      forbidSignatures: forbid,
      seedSalt: "gen-" + Date.now() + "-" + Math.random(),
      sessionMealSeen: state.sessionMealSeen,
      prevMeals: state.menu ? state.menu.meals : null,
      requireAllMealsDifferent: !!state.menu && !lockedKeys.length,
      mustDifferMeals: mustDiffer,
      fixedMeals: locked,
      fixedChannels: lockedChannels
    });

    if (plan.anyEmpty && !plan.meals.breakfast && !plan.meals.lunch && !plan.meals.dinner) {
      renderNoMatchState();
      if (settings.cuisineMode === "strict" && settings.cuisineIds && settings.cuisineIds.length) {
        toast("严格菜系下候选不足；忌口/预算未放宽。可关闭「只看所选菜系」或增加渠道");
      } else {
        toast("候选不足，试试放宽渠道、菜系或忌口");
      }
      return;
    }

    var menu = menuFromPlan(plan, action);
    var toastMsg = action === "first" ? "三顿饭安排好啦" : "换好一组新的";
    if (plan.anyEmpty) toastMsg = "候选有限，部分餐次未能配齐";
    applyMenu(menu, {
      recordHistory: true, animate: true, collapseFilters: true,
      scrollToResults: true, toastMsg: toastMsg
    });
    markArranged();
    updateArrangeButton();
    updateEatButton();
  }

  function rerollAllMeals(opts) {
    opts = opts || {};
    if (!state.menu) { generateNewMenu(opts); return; }
    generateNewMenu(Object.assign({}, opts, {}));
  }

  function swapOneMeal(meal) {
    if (!state.menu) { generateNewMenu(); return; }
    if (isMealCheckedIn(meal)) {
      toast("这顿已打卡，请先在明细中删除记录再换菜");
      return;
    }
    var settings = state.settings;
    var fixed = {};
    var fixedChannels = {};
    MEALS.forEach(function (m) {
      if (m !== meal) {
        fixed[m] = state.menu.meals[m];
        if (state.menu.channels) fixedChannels[m] = state.menu.channels[m];
      }
    });
    var exclude = {};
    exclude[meal] = {};
    if (state.menu.meals[meal]) exclude[meal][state.menu.meals[meal]] = true;
    recentMealDishIds(meal, 5).forEach(function (id) { exclude[meal][id] = true; });

    var forbid = recentSignatures(20);
    Object.keys(state.sessionSeenSigs).forEach(function (s) { forbid.push(s); });

    var plan = generatePlan(settings, {
      fixedMeals: fixed,
      fixedChannels: fixedChannels,
      excludePerMeal: exclude,
      forbidSignatures: forbid,
      seedSalt: "swap-" + meal + "-" + Date.now(),
      sessionMealSeen: state.sessionMealSeen,
      mustDifferMeals: (function () {
        var o = {};
        o[meal] = state.menu.meals[meal];
        return o;
      })()
    });

    if (!plan.meals[meal]) {
      exclude = {};
      exclude[meal] = {};
      if (state.menu.meals[meal]) exclude[meal][state.menu.meals[meal]] = true;
      plan = generatePlan(settings, {
        fixedMeals: fixed,
        fixedChannels: fixedChannels,
        excludePerMeal: exclude,
        forbidSignatures: forbid,
        seedSalt: "swap-relax-" + meal + "-" + Date.now(),
        sessionMealSeen: state.sessionMealSeen
      });
    }

    if (!plan.meals[meal]) {
      toast("这顿暂时没有更多候选，试试放宽筛选");
      return;
    }
    var menu = menuFromPlan(plan, "swap_" + meal);
    applyMenu(menu, { recordHistory: true, animate: false, swapMeal: meal, toastMsg: MEAL_LABEL[meal] + "已换好" });
  }

  function applyMenu(menu, opts) {
    opts = opts || {};
    state.menu = menu;
    saveCurrentMenu(menu);
    if (menu.signature) state.sessionSeenSigs[menu.signature] = true;
    MEALS.forEach(function (m) {
      if (menu.meals[m]) state.sessionMealSeen[menu.meals[m]] = true;
    });
    if (opts.recordHistory) {
      pushRecommendHistory({
        id: menu.id,
        ts: menu.ts || Date.now(),
        action: menu.action,
        filters: menu.filters,
        meals: menu.meals,
        channels: menu.channels,
        names: menu.names,
        signature: menu.signature
      });
    }
    renderResults({
      animate: opts.animate,
      swapMeal: opts.swapMeal,
      collapseFilters: opts.collapseFilters,
      scrollToResults: opts.scrollToResults
    });
    updateEatButton();
    if (opts.toastMsg) toast(opts.toastMsg);
  }

  function restoreHistoryEntry(entry) {
    if (!entry || !entry.meals) return;
    var menu = {
      id: entry.id || uid(),
      date: todayKey(),
      ts: Date.now(),
      action: "restore",
      filters: entry.filters || snapshotFilters(state.settings),
      meals: {
        breakfast: entry.meals.breakfast,
        lunch: entry.meals.lunch,
        dinner: entry.meals.dinner
      },
      channels: entry.channels || {},
      names: entry.names || {},
      signature: entry.signature || makeSignature(entry.meals)
    };
    MEALS.forEach(function (m) {
      if (!menu.names[m] && menu.meals[m]) {
        var d = dishById(menu.meals[m]);
        menu.names[m] = d ? d.name : "";
      }
      if (!menu.channels[m] && menu.meals[m]) {
        var dd = dishById(menu.meals[m]);
        menu.channels[m] = dd && dd.channels ? dd.channels[0] : null;
      }
    });
    applyMenu(menu, { recordHistory: false, animate: false, toastMsg: "已恢复这一组" });
    updateArrangeButton();
    updateEatButton();
    closeHistoryDrawer();
  }

  function eatenKeyForMenu(menu) {
    if (!menu || !menu.signature) return "";
    return (menu.date || todayKey()) + "|" + menu.signature;
  }
  function hasEatenThisMenu(menu) {
    var key = eatenKeyForMenu(menu);
    if (!key) return false;
    return loadEatenHistory().some(function (h) {
      var hk = (h.date || todayKey(h.ts ? new Date(h.ts) : new Date())) + "|" + (h.signature || "");
      return hk === key;
    });
  }

  /** 今天就吃这套：写入吃过历史 + 预计热量（幂等，防连点） */
  function markEatenToday() {
    if (!state.menu || !state.menu.meals) {
      toast("先安排一套菜单吧");
      return;
    }
    var menu = state.menu;
    var ckey = menuCheckinKey(menu);

    if (hasMenuCalorieCheckin(menu)) {
      toast("这套餐已经打过卡啦");
      updateEatButton();
      return;
    }

    // 先占位锁，防止连点双写
    var map2 = loadMenuCheckins();
    if (map2[ckey]) {
      toast("这套餐已经打过卡啦");
      updateEatButton();
      return;
    }
    map2[ckey] = { ts: Date.now(), menuId: menu.id, signature: menu.signature };
    saveMenuCheckins(map2);

    // 写入吃过历史（与推荐历史分开）
    if (!hasEatenThisMenu(menu)) {
      var list = loadEatenHistory();
      list.push({
        id: uid(),
        ts: Date.now(),
        date: todayKey(),
        eatenKey: eatenKeyForMenu(menu),
        meals: menu.meals,
        channels: menu.channels,
        names: menu.names,
        signature: menu.signature,
        filters: menu.filters
      });
      saveEatenHistory(list);
    }

    // 写入预计热量（按 菜单ID + 餐次 + 菜品 幂等）
    var wrote = 0;
    MEALS.forEach(function (m) {
      var id = menu.meals[m];
      if (!id) return;
      if (findRecommendLog(m, id, menu.id)) return;
      // 同餐同菜已记过（无 menuId 的旧数据）也不再写
      if (findRecommendLog(m, id)) return;
      var dish = dishById(id);
      if (!dish) return;
      upsertLog({
        id: uid(),
        meal: m,
        name: dish.name,
        dishId: dish.id,
        portion: 1,
        portionLabel: "标准 · 预计",
        kcal: dishDefaultKcal(dish),
        source: "recommend",
        menuId: menu.id,
        ts: Date.now()
      });
      wrote++;
    });

    // 同步到今日宜统一历史（不改 fanfan 键；markCompleted 内幂等）
    try {
      if (window.TodayYi && window.TodayYi.dailyPlan) {
        window.TodayYi.dailyPlan.markCompleted(menu.id || menu.signature || "eat-today", {
          category: "eat",
          title: "今天的三餐",
          duration: null,
          sourcePage: "eat"
        });
      } else if (window.TodayYi && window.TodayYi.storage) {
        window.TodayYi.storage.recordActivityCompletion({
          category: "eat",
          activityId: menu.id || menu.signature,
          title: "今天的三餐",
          duration: null,
          sourcePage: "eat",
          date: todayKey()
        });
      }
    } catch (eSync) {}
    toast(wrote ? "记下啦，预计热量已写入今日打卡" : "这套餐已经打过卡啦");
    updateEatButton();
    if (state.menu) renderResults({ animate: false });
    if (state.historyTab === "eaten") renderHistoryDrawerBody();
  }

  function updateEatButton() {
    var btn = $("#btnEatSet");
    if (btn && state.menu) {
      if (hasMenuCalorieCheckin(state.menu)) {
        btn.textContent = "已打卡这套";
        btn.disabled = false;
      } else {
        btn.textContent = "今天就吃这套";
        btn.disabled = false;
      }
    }
    renderEnergyCard();
  }

  function updateArrangeButton() {
    var text = (hasArrangedBefore() || state.menu)
      ? "这组不对胃口，再来一组"
      : "帮我安排今天三顿饭";
    var stickyText = (hasArrangedBefore() || state.menu)
      ? "不对胃口，再来一组"
      : "帮我安排今天三顿饭";
    var btn = $("#btnArrange");
    var sticky = $("#btnArrangeSticky");
    if (btn) btn.textContent = text;
    if (sticky) sticky.textContent = stickyText;
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  /* ---------- UI：筛选 ---------- */
  function renderPresets() {
    var row = $("#presetRow");
    if (!row) return;
    row.innerHTML = PRESETS.map(function (p) {
      var pressed = state.settings.presetId === p.id ? "true" : "false";
      return (
        '<button type="button" class="preset-card" role="option" data-preset="' + p.id +
        '" aria-pressed="' + pressed + '">' +
        '<div class="pc-emoji" aria-hidden="true">' + p.emoji + "</div>" +
        '<div class="pc-title">' + escapeHtml(p.title) + "</div>" +
        '<div class="pc-desc">' + escapeHtml(p.desc) + "</div>" +
        "</button>"
      );
    }).join("");
    $all("[data-preset]", row).forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyPreset(btn.getAttribute("data-preset"));
      });
    });
    updatePresetSummary();
  }

  function updatePresetSummary() {
    var el = $("#presetSummaryText");
    if (el) el.textContent = presetSummaryText(state.settings);
  }

  function budgetOptionsForMeal(meal) {
    if (meal === "breakfast") {
      return [
        { v: 10, l: "≤10" }, { v: 15, l: "≤15" }, { v: "plus15", l: "15+" }, { v: null, l: "不限" }
      ];
    }
    return [
      { v: 20, l: "≤20" }, { v: 30, l: "≤30" }, { v: "plus30", l: "30+" }, { v: null, l: "不限" }
    ];
  }
  function timeOptionsForMeal(meal) {
    if (meal === "breakfast") {
      return [
        { v: 5, l: "5分" }, { v: 10, l: "10分" }, { v: 20, l: "20分" }, { v: null, l: "不限" }
      ];
    }
    if (meal === "lunch") {
      return [
        { v: 15, l: "15分" }, { v: 30, l: "30分" }, { v: 45, l: "45分" }, { v: null, l: "不限" }
      ];
    }
    return [
      { v: 20, l: "20分" }, { v: 35, l: "35分" }, { v: 50, l: "50分" }, { v: null, l: "不限" }
    ];
  }

  function renderMealEditors() {
    var root = $("#mealEditors");
    if (!root) return;
    var openMeal = state.openMealEditor || "lunch";
    root.innerHTML = MEALS.map(function (meal) {
      var ms = mealSetting(state.settings, meal);
      var isOpen = !isMobileLayout() || meal === openMeal;
      var budgetOpts = budgetOptionsForMeal(meal);
      var timeOpts = timeOptionsForMeal(meal);
      var hasHome = ms.channelsAllowed.indexOf("home_cook") !== -1;
      var hasTakeout = ms.channelsAllowed.indexOf("takeout") !== -1;

      function chipMulti(attr, value, label, selected) {
        return '<button type="button" class="chip sm" data-meal="' + meal + '" data-' + attr + '="' + value +
          '" aria-pressed="' + (selected ? "true" : "false") + '">' + label + "</button>";
      }
      function chipRadio(attr, value, label, selected) {
        return '<button type="button" class="chip sm" data-meal="' + meal + '" data-' + attr + '="' + value +
          '" role="radio" aria-checked="' + (selected ? "true" : "false") + '">' + label + "</button>";
      }

      var chHtml = ALL_CHANNELS.map(function (c) {
        return chipMulti("channel", c, CHANNEL_LABEL[c], ms.channelsAllowed.indexOf(c) !== -1);
      }).join("");

      var budHtml = budgetOpts.map(function (o) {
        var sel = false;
        if (o.v == null) sel = ms.budgetMax == null && !ms.budgetFlex;
        else if (o.v === "plus15" || o.v === "plus30") sel = !!ms.budgetFlex;
        else sel = !ms.budgetFlex && Number(ms.budgetMax) === Number(o.v);
        return chipRadio("budget", o.v == null ? "any" : String(o.v), o.l, !!sel);
      }).join("");

      var timeHtml = timeOpts.map(function (o) {
        var sel = (o.v == null && (ms.timeMax == null)) || Number(ms.timeMax) === o.v;
        if (o.v == null && ms.timeMax == null) sel = true;
        return chipRadio("time", o.v == null ? "any" : String(o.v), o.l, !!sel);
      }).join("");

      var hungerHtml = ["low", "normal", "starving"].map(function (h) {
        return chipRadio("hunger", h, HUNGER_LABEL[h], ms.hunger === h);
      }).join("");

      var typeHtml = Object.keys(MEAL_TYPE_LABEL).map(function (t) {
        return chipMulti("mealtype", t, MEAL_TYPE_LABEL[t], (ms.mealTypes || []).indexOf(t) !== -1);
      }).join("");

      var goalHtml = Object.keys(MEAL_GOAL_LABEL).map(function (g) {
        return chipMulti("mealgoal", g, MEAL_GOAL_LABEL[g], (ms.mealGoals || []).indexOf(g) !== -1);
      }).join("");

      var homeBlock = hasHome
        ? '<div class="cond-block" data-cond="home">' +
          '<span class="filter-label">厨具</span><div class="chip-row">' +
          [["any", "不限"], ["wok", "炒锅"], ["microwave", "微波炉"], ["rice_cooker", "电饭煲"], ["none", "几乎不开火"]].map(function (pair) {
            return chipRadio("equip", pair[0], pair[1], ms.equipment === pair[0]);
          }).join("") +
          "</div></div>"
        : "";

      var takeoutBlock = hasTakeout
        ? '<div class="cond-block" data-cond="takeout">' +
          '<span class="filter-label">外卖可等</span><div class="chip-row">' +
          [["any", "不限"], ["20", "20分内"], ["30", "30分内"], ["45", "45分内"]].map(function (pair) {
            return chipRadio("wait", pair[0], pair[1], String(ms.waitTime || "any") === pair[0]);
          }).join("") +
          "</div></div>"
        : "";

      return (
        '<div class="meal-editor' + (isOpen ? " is-open" : "") + '" data-meal="' + meal + '">' +
        '<button type="button" class="meal-editor-head" data-toggle-meal="' + meal +
        '" aria-expanded="' + (isOpen ? "true" : "false") + '">' +
        '<span>' + MEAL_EMOJI[meal] + " " + MEAL_LABEL[meal] + "</span>" +
        '<span class="chev">▾</span></button>' +
        '<div class="meal-editor-body">' +
        '<span class="filter-label">用餐渠道（可多选）</span><div class="chip-row">' + chHtml + "</div>" +
        '<span class="filter-label">单餐预算</span><div class="chip-row">' + budHtml + "</div>" +
        '<span class="filter-label">可等待/制作时间</span><div class="chip-row">' + timeHtml + "</div>" +
        '<span class="filter-label">胃口</span><div class="chip-row">' + hungerHtml + "</div>" +
        '<span class="filter-label">餐型（可多选）</span><div class="chip-row">' + typeHtml + "</div>" +
        '<span class="filter-label">当餐目标（可多选）</span><div class="chip-row">' + goalHtml + "</div>" +
        homeBlock + takeoutBlock +
        "</div></div>"
      );
    }).join("");

    // 绑定
    $all("[data-toggle-meal]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!isMobileLayout()) return;
        var m = btn.getAttribute("data-toggle-meal");
        state.openMealEditor = state.openMealEditor === m ? "" : m;
        renderMealEditors();
      });
    });

    $all("[data-channel]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        var ch = btn.getAttribute("data-channel");
        var arr = state.settings.meals[meal].channelsAllowed;
        var idx = arr.indexOf(ch);
        if (idx === -1) arr.push(ch);
        else {
          if (arr.length === 1) { toast("至少保留一种渠道"); return; }
          arr.splice(idx, 1);
        }
        state.settings.presetId = null;
        saveSettings(state.settings);
        renderMealEditors();
        renderPresets();
        updatePresetSummary();
      });
    });

    function bindMealRadio(attr, handler) {
      $all("[data-" + attr + "]", root).forEach(function (btn) {
        if (btn.hasAttribute("data-channel") || btn.hasAttribute("data-mealtype") || btn.hasAttribute("data-mealgoal")) return;
        btn.addEventListener("click", function () {
          handler(btn.getAttribute("data-meal"), btn.getAttribute("data-" + attr));
          state.settings.presetId = null;
          saveSettings(state.settings);
          renderMealEditors();
          renderPresets();
          updatePresetSummary();
        });
      });
    }

    $all("[data-budget]", root).forEach(function (btn) {
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
    });
    $all("[data-time]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        var v = btn.getAttribute("data-time");
        state.settings.meals[meal].timeMax = v === "any" ? null : Number(v);
        state.settings.presetId = null;
        saveSettings(state.settings);
        renderMealEditors();
        renderPresets();
        updatePresetSummary();
      });
    });
    $all("[data-hunger]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        state.settings.meals[meal].hunger = btn.getAttribute("data-hunger");
        state.settings.presetId = null;
        saveSettings(state.settings);
        renderMealEditors();
        renderPresets();
        updatePresetSummary();
      });
    });
    $all("[data-mealtype]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        var t = btn.getAttribute("data-mealtype");
        var arr = state.settings.meals[meal].mealTypes || [];
        var idx = arr.indexOf(t);
        if (idx === -1) arr.push(t); else arr.splice(idx, 1);
        state.settings.meals[meal].mealTypes = arr;
        state.settings.presetId = null;
        saveSettings(state.settings);
        renderMealEditors();
        renderPresets();
      });
    });
    $all("[data-mealgoal]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        var t = btn.getAttribute("data-mealgoal");
        var arr = state.settings.meals[meal].mealGoals || [];
        var idx = arr.indexOf(t);
        if (idx === -1) arr.push(t); else arr.splice(idx, 1);
        state.settings.meals[meal].mealGoals = arr;
        state.settings.presetId = null;
        saveSettings(state.settings);
        renderMealEditors();
        renderPresets();
      });
    });
    $all("[data-equip]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        state.settings.meals[meal].equipment = btn.getAttribute("data-equip");
        saveSettings(state.settings);
        renderMealEditors();
      });
    });
    $all("[data-wait]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        state.settings.meals[meal].waitTime = btn.getAttribute("data-wait");
        saveSettings(state.settings);
        renderMealEditors();
      });
    });
  }

  function renderCuisineQuick() {
    var box = $("#cuisineQuick");
    if (!box) return;
    var selected = state.settings.cuisineIds || [];
    var html = '<button type="button" class="chip" data-cuisine="__none__" aria-pressed="' +
      (selected.length ? "false" : "true") + '">不限</button>';
    CUISINE_QUICK_IDS.forEach(function (id) {
      var c = CUISINE_MAP[id];
      if (!c) return;
      html += '<button type="button" class="chip" data-cuisine="' + id + '" aria-pressed="' +
        (selected.indexOf(id) !== -1 ? "true" : "false") + '">' + escapeHtml(c.label) + "</button>";
    });
    html += '<button type="button" class="chip" data-cuisine="__more__" aria-pressed="false">更多</button>';
    box.innerHTML = html;
    $all("[data-cuisine]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-cuisine");
        if (id === "__more__") { openCuisineDrawer(); return; }
        if (id === "__none__") {
          state.settings.cuisineIds = [];
        } else {
          var arr = state.settings.cuisineIds;
          var idx = arr.indexOf(id);
          if (idx === -1) arr.push(id); else arr.splice(idx, 1);
        }
        saveSettings(state.settings);
        renderCuisineQuick();
        renderCuisineSelected();
      });
    });
    renderCuisineSelected();
  }

  function renderCuisineSelected() {
    var box = $("#cuisineSelected");
    if (!box) return;
    var ids = state.settings.cuisineIds || [];
    box.innerHTML = ids.map(function (id) {
      return '<span class="cuisine-tag">' + escapeHtml(cuisineLabel(id)) +
        '<button type="button" data-rm-cuisine="' + id + '" aria-label="移除">×</button></span>';
    }).join("");
    $all("[data-rm-cuisine]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-rm-cuisine");
        state.settings.cuisineIds = state.settings.cuisineIds.filter(function (x) { return x !== id; });
        saveSettings(state.settings);
        renderCuisineQuick();
        renderCuisineFullList();
      });
    });
  }

  function openCuisineDrawer() {
    var mask = $("#cuisineMask");
    var drawer = $("#cuisineDrawer");
    if (!mask || !drawer) return;
    mask.hidden = false;
    drawer.hidden = false;
    renderCuisineFullList();
    requestAnimationFrame(function () {
      mask.classList.add("is-open");
      drawer.classList.add("is-open");
    });
    var search = $("#cuisineSearch");
    if (search) search.focus();
  }
  function closeCuisineDrawer() {
    var mask = $("#cuisineMask");
    var drawer = $("#cuisineDrawer");
    if (mask) mask.classList.remove("is-open");
    if (drawer) drawer.classList.remove("is-open");
    setTimeout(function () {
      if (mask) mask.hidden = true;
      if (drawer) drawer.hidden = true;
    }, 280);
    renderCuisineQuick();
  }
  function renderCuisineFullList() {
    var box = $("#cuisineFullList");
    if (!box) return;
    var q = (($("#cuisineSearch") && $("#cuisineSearch").value) || "").trim();
    var groups = {
      popular: "热门",
      classic: "八大菜系",
      regional: "地方风味"
    };
    var list = (CUISINE_DATA.cuisines || []).filter(function (c) {
      if (!q) return true;
      return (c.label + c.shortLabel + c.region + c.id).indexOf(q) !== -1;
    });
    var html = "";
    ["popular", "classic", "regional"].forEach(function (g) {
      var items = list.filter(function (c) { return c.group === g; });
      if (!items.length) return;
      html += '<div class="cuisine-group-title">' + groups[g] + '</div><div class="cuisine-grid">';
      items.forEach(function (c) {
        var on = (state.settings.cuisineIds || []).indexOf(c.id) !== -1;
        html += '<button type="button" class="chip" data-full-cuisine="' + c.id +
          '" aria-pressed="' + (on ? "true" : "false") + '">' +
          escapeHtml(c.label) + (c.region ? " · " + escapeHtml(c.region) : "") + "</button>";
      });
      html += "</div>";
    });
    if (!html) html = '<p class="form-hint">没有匹配的菜系</p>';
    box.innerHTML = html;
    $all("[data-full-cuisine]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-full-cuisine");
        var arr = state.settings.cuisineIds;
        var idx = arr.indexOf(id);
        if (idx === -1) arr.push(id); else arr.splice(idx, 1);
        saveSettings(state.settings);
        renderCuisineFullList();
        renderCuisineSelected();
      });
    });
  }

  function applySettingsToUI() {
    var s = state.settings;
    $all("#sceneGroup .chip").forEach(function (b) {
      b.setAttribute("aria-checked", b.getAttribute("data-scene") === s.scene ? "true" : "false");
    });
    $all("#goalGroup .chip").forEach(function (b) {
      b.setAttribute("aria-checked", b.getAttribute("data-goal") === s.goal ? "true" : "false");
    });
    $all("#dailyBudgetGroup .chip").forEach(function (b) {
      b.setAttribute("aria-checked", b.getAttribute("data-daily-budget") === s.dailyBudget ? "true" : "false");
    });
    $all("#tasteGroup .chip").forEach(function (b) {
      var t = b.getAttribute("data-taste");
      b.setAttribute("aria-pressed", s.tastes.indexOf(t) !== -1 ? "true" : "false");
    });
    $all("#exploreGroup .chip").forEach(function (b) {
      b.setAttribute("aria-checked", b.getAttribute("data-explore") === s.exploreMode ? "true" : "false");
    });
    $all("#tagGroup .chip").forEach(function (b) {
      var tag = b.getAttribute("data-tag");
      b.setAttribute("aria-pressed", s.tags[tag] ? "true" : "false");
    });
    var strict = $("#chkCuisineStrict");
    if (strict) strict.checked = s.cuisineMode === "strict";
    var avoid = $("#chkAvoidRecent");
    if (avoid) avoid.checked = s.avoidRecent !== false;
    var hint = $("#modeHint");
    if (hint) hint.textContent = SCENE_HINT[s.scene] || "点一个快捷方案，再点主按钮，三顿饭马上就好。";
    renderPresets();
    renderMealEditors();
    renderCuisineQuick();
    updateFilterSummaryText();
    updatePresetSummary();
  }

  function updateFilterSummaryText() {
    var s = state.settings;
    var parts = [
      SCENE_LABEL[s.scene] || s.scene,
      GOAL_LABEL[s.goal] || s.goal,
      presetSummaryText(s)
    ];
    var el = $("#filterSummaryText");
    if (el) el.textContent = parts.join(" · ");
  }

  function setFilterCollapsed(collapsed) {
    var panel = $("#filterPanel");
    if (!panel) return;
    if (collapsed && isMobileLayout() && state.menu) {
      panel.classList.add("is-collapsed");
      updateFilterSummaryText();
    } else {
      panel.classList.remove("is-collapsed");
    }
  }

  function showSoftenNotice(keys, settings) {
    var box = $("#softenNotice");
    if (!box) return;
    if (!keys || !keys.length) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    var labels = [];
    var seen = {};
    keys.forEach(function (k) {
      if (k === "tastes" && (!settings.tastes || !settings.tastes.length)) return;
      if (k === "cuisine" && (!settings.cuisineIds || !settings.cuisineIds.length)) return;
      if (k === "goal" && (settings.goal === "casual" || settings.goal === "ovo_lacto")) return;
      var lab = softFlagLabel(k, settings);
      if (!seen[lab]) { seen[lab] = true; labels.push(lab); }
    });
    if (!labels.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    var cuisineNote = keys.indexOf("cuisine") !== -1
      ? "已把菜系从必须改为优先；"
      : "";
    box.innerHTML = "<strong>匹配结果有限：</strong>" + cuisineNote +
      "已放宽 " + escapeHtml(labels.join("、")) + "；忌口与过敏条件保持不变。";
  }

  /* ---------- 结果渲染 ---------- */
  function selectedChannel(meal, dish) {
    if (state.menu && state.menu.channels && state.menu.channels[meal]) {
      return state.menu.channels[meal];
    }
    // 兼容旧菜单：从当前设置 channelsAllowed 与 dish.channels 取交集
    if (dish && dish.channels && dish.channels.length) {
      var allowed = mealSetting(state.settings, meal).channelsAllowed || [];
      for (var i = 0; i < dish.channels.length; i++) {
        if (allowed.indexOf(dish.channels[i]) !== -1) return dish.channels[i];
      }
      return dish.channels[0];
    }
    return "takeout";
  }

  function timeMeta(dish, channel) {
    if (channel === "home_cook" && dish.prepMinutes != null) return "做约 " + dish.prepMinutes + " 分钟";
    if (channel === "takeout" && dish.takeoutWait != null) return "等约 " + dish.takeoutWait + " 分钟";
    if (channel === "convenience") return "即取即食";
    if (channel === "canteen") return "食堂现取";
    return "—";
  }

  function renderPlaceholder() {
    return (
      '<div class="buddy">' +
        '<div class="buddy-face" aria-hidden="true">🦊</div>' +
        '<div class="buddy-text"><strong>饭饭还在等指令</strong><br/>点个快捷方案，再按主按钮，三顿饭会依次揭晓～</div>' +
      "</div>" +
      '<div class="meal-list">' +
        placeholderCard("breakfast", "早餐还空着", "豆浆、粥、三明治…随你挑") +
        placeholderCard("lunch", "午餐待揭晓", "盖饭、轻食、食堂小炒") +
        placeholderCard("dinner", "晚餐待揭晓", "热汤、炒菜或便利店也行") +
      "</div>"
    );
  }
  function placeholderCard(meal, title, sub) {
    return (
      '<article class="meal-card is-placeholder is-shown" data-meal="' + meal + '">' +
        '<div class="ph-emoji" aria-hidden="true">' + MEAL_EMOJI[meal] + "</div>" +
        '<div class="ph-text"><strong>' + title + "</strong><span>" + sub + "</span></div>" +
      "</article>"
    );
  }
  function metaItem(k, v) {
    return '<div class="meta-item"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>";
  }

  function renderCard(meal, dish, animate) {
    if (!dish) {
      return (
        '<article class="meal-card is-shown" data-meal="' + meal + '">' +
        '<div class="meal-top"><div class="food-visual"><span class="emoji">🤔</span></div>' +
        '<div class="meal-info"><span class="meal-badge">' + MEAL_EMOJI[meal] + " " + MEAL_LABEL[meal] +
        '</span><h3 class="meal-name">这顿暂时没匹配</h3>' +
        '<p class="meal-reason">试试放宽渠道、预算、菜系或忌口。</p></div></div></article>'
      );
    }
    var ch = selectedChannel(meal, dish);
    var url = (ch === "home_cook" && dish.hasVerifiedRecipe !== false) ? recipeUrl(dish) : "";
    if (dish.discoveryOnly) url = "";
    var recipeBtn = "";
    if (url) {
      recipeBtn = '<a class="btn btn-link btn-sm" href="' + url + '" target="_blank" rel="noopener noreferrer">查看做法</a>';
    } else if (ch === "takeout" || dish.discoveryOnly) {
      recipeBtn = '<button type="button" class="btn btn-link btn-sm btn-copy-search" data-q="' +
        escapeHtml(dish.searchQuery || dish.name) + '">去外卖平台搜这道菜</button>';
    } else if (ch === "canteen") {
      recipeBtn = '<button type="button" class="btn btn-link btn-sm btn-copy-search" data-q="' +
        escapeHtml(dish.canteenKeyword || dish.name) + '">记住菜名去食堂看看</button>';
    }

    var extraRows = "";
    if (ch === "takeout") {
      extraRows =
        '<div class="search-row"><span>外卖搜索词</span><code>' + escapeHtml(dish.searchQuery || dish.name) + "</code></div>" +
        (dish.orderTip ? '<div class="tip-box"><strong>点单提示 · </strong>' + escapeHtml(dish.orderTip) + "</div>" : "");
    } else if (ch === "canteen") {
      extraRows =
        '<div class="search-row"><span>档口关键词</span><code>' + escapeHtml(dish.canteenKeyword || dish.name || "综合窗口") + "</code></div>";
    } else if (ch === "convenience") {
      extraRows =
        '<div class="search-row"><span>组合提示</span><code>' + escapeHtml(dish.orderTip || dish.searchQuery || "便利店加热即食") + "</code></div>";
    } else if (ch === "home_cook") {
      extraRows = '<div class="tip-box"><strong>小贴士 · </strong>' + escapeHtml(dish.tip || "按步骤慢慢做就好。") + "</div>";
    }
    if (ch !== "home_cook" && dish.tip) {
      extraRows += '<div class="tip-box"><strong>小贴士 · </strong>' + escapeHtml(dish.tip) + "</div>";
    }

    var cuisinePills = (dish.cuisineIds || []).map(function (id) {
      return '<span class="cuisine-pill">' + escapeHtml(cuisineLabel(id)) + "</span>";
    }).join("");

    var cls = "meal-card" + (animate ? "" : " is-shown");
    var log = findRecommendLog(meal, dish.id);
    var eatBtn = log
      ? '<button type="button" class="btn btn-checked btn-sm btn-checkin" data-meal="' + meal + '" data-id="' + dish.id + '">已打卡 · 修改</button>'
      : '<button type="button" class="btn btn-secondary btn-sm btn-checkin" data-meal="' + meal + '" data-id="' + dish.id + '">吃了这顿</button>';
    var swapDis = log ? " disabled" : "";
    var swapTitle = log ? ' title="已打卡的餐次请先在明细中删除记录再换菜"' : "";

    return (
      '<article class="' + cls + '" data-meal="' + meal + '" data-id="' + dish.id + '">' +
      '<div class="meal-top">' +
        '<div class="food-visual" aria-hidden="true"><span class="plate"></span><span class="emoji">' + (dish.emoji || "🍽️") + "</span></div>" +
        '<div class="meal-info">' +
          '<span class="meal-badge">' + MEAL_EMOJI[meal] + " " + MEAL_LABEL[meal] +
          '<span class="channel-pill">' + (CHANNEL_LABEL[ch] || ch) + "</span>" + cuisinePills + "</span>" +
          '<h3 class="meal-name">' + escapeHtml(dish.name) + "</h3>" +
          '<p class="meal-reason">' + escapeHtml(dish.reason || "") + "</p>" +
        "</div>" +
      "</div>" +
      '<div class="meta-grid">' +
        metaItem("渠道", CHANNEL_LABEL[ch] || ch) +
        metaItem("时间", timeMeta(dish, ch)) +
        metaItem("辣度", SPICY_LABEL[dish.spicy] || "不辣") +
        metaItem("饱腹感", FILL_LABEL[dish.fullness] || "适中") +
        metaItem("蛋白质", escapeHtml(dish.protein || "—")) +
        metaItem("热量估算", escapeHtml(formatDishCalories(dish))) +
      "</div>" +
      extraRows +
      '<div class="card-actions">' +
        eatBtn +
        (recipeBtn || "") +
        '<button type="button" class="btn btn-secondary btn-sm btn-swap" data-meal="' + meal + '"' + swapDis + swapTitle + ">换一道</button>" +
      "</div></article>"
    );
  }

  function renderNoMatchState() {
    showSoftenNotice([], state.settings);
    $("#resultsArea").innerHTML =
      '<div class="no-match">' +
      "<h3>硬条件组合下没有合适的菜</h3>" +
      "<p>忌口、预算或唯一渠道可能太严。可增加可用渠道、放宽预算，或减少忌口后再试。软偏好（口味/菜系/胃口）系统会自动放宽并告知你。</p>" +
      '<button type="button" class="btn btn-primary" id="btnRelax" style="max-width:280px;margin:0 auto">放宽渠道与预算后再试</button>' +
      "</div>";
    $("#bottomActions").hidden = true;
    $("#resultsSub").textContent = "没有匹配菜品";
    var btn = $("#btnRelax");
    if (btn) {
      btn.addEventListener("click", function () {
        MEALS.forEach(function (m) {
          state.settings.meals[m].channelsAllowed = ALL_CHANNELS.slice();
          state.settings.meals[m].budgetMax = null;
        });
        if (state.settings.cuisineMode === "strict") state.settings.cuisineMode = "soft";
        saveSettings(state.settings);
        applySettingsToUI();
        toast("已放宽渠道与预算，忌口保持不变");
        setFilterCollapsed(false);
      });
    }
  }

  function renderResults(options) {
    options = options || {};
    var area = $("#resultsArea");
    var menu = state.menu;
    if (!menu || !menu.meals) {
      showSoftenNotice([], state.settings);
      area.innerHTML = renderPlaceholder();
      $("#bottomActions").hidden = true;
      $("#resultsSub").textContent = "选好条件后点主按钮，三顿饭会在这里揭晓";
      setFilterCollapsed(false);
      return;
    }
    var dishes = {
      breakfast: menu.meals.breakfast ? dishById(menu.meals.breakfast) : null,
      lunch: menu.meals.lunch ? dishById(menu.meals.lunch) : null,
      dinner: menu.meals.dinner ? dishById(menu.meals.dinner) : null
    };
    if (!dishes.breakfast && !dishes.lunch && !dishes.dinner) {
      renderNoMatchState();
      return;
    }
    showSoftenNotice(menu.relaxedKeys || [], menu.filters || state.settings);
    $("#resultsSub").textContent =
      formatRelativeTime(menu.ts || Date.now()) + " · " + (ACTION_LABEL[menu.action] || "当前菜单");
    area.innerHTML =
      '<div class="meal-list">' +
      renderCard("breakfast", dishes.breakfast, options.animate) +
      renderCard("lunch", dishes.lunch, options.animate) +
      renderCard("dinner", dishes.dinner, options.animate) +
      "</div>";
    $("#bottomActions").hidden = false;

    $all(".btn-swap", area).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) { toast("已打卡的餐次请先删除记录再换菜"); return; }
        swapOneMeal(btn.getAttribute("data-meal"));
      });
    });
    $all(".btn-checkin", area).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var meal = btn.getAttribute("data-meal");
        var id = btn.getAttribute("data-id");
        var dish = dishById(id);
        var existing = findRecommendLog(meal, id);
        openCheckinDialog(meal, dish, existing || null);
      });
    });
    $all(".btn-copy-search", area).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var q = btn.getAttribute("data-q") || "";
        function done() { toast("已复制「" + q + "」，去外卖或食堂搜一下吧"); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(q).then(done).catch(function () {
            toast("搜索词：" + q);
          });
        } else toast("搜索词：" + q);
      });
    });
    renderEnergyCard();
    updateEatButton();

    if (options.animate) revealCards();
    else {
      $all(".meal-card", area).forEach(function (c) {
        c.classList.add("is-shown");
        if (options.swapMeal && c.getAttribute("data-meal") === options.swapMeal) {
          c.classList.add("is-swapping");
        }
      });
    }
    if (options.collapseFilters) setFilterCollapsed(true);
    if (options.scrollToResults && isMobileLayout()) {
      var panel = $("#resultsPanel");
      if (panel) setTimeout(function () {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  function revealCards() {
    var cards = $all(".meal-card", $("#resultsArea"));
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.revealing = true;
    cards.forEach(function (card, i) {
      if (reduced) {
        card.classList.add("is-shown");
        if (i === cards.length - 1) state.revealing = false;
        return;
      }
      setTimeout(function () {
        card.classList.add("is-shown");
        if (i === cards.length - 1) state.revealing = false;
      }, 160 + i * 260);
    });
  }

  /* ---------- 能量 UI / 弹层 ---------- */
  function renderEnergyCard() {
    var logs = getTodayLogs();
    var total = sumLogs(logs);
    var split = splitByMeal(logs);
    var calSet = loadCalorieSettings();
    var nums = $("#energyNums");
    var hint = $("#energyHint");
    var splitEl = $("#energyMealSplit");
    var compact = $("#energyCompactText");
    var ringWrap = $("#energyRingWrap");
    var ringFg = $("#energyRingFg");
    var ringLabel = $("#energyRingLabel");
    var chk = $("#chkCalTarget");
    var inp = $("#inputCalTarget");
    var wrap = $("#targetInputWrap");

    if (chk) chk.checked = !!calSet.targetEnabled;
    if (inp) inp.value = String(calSet.targetKcal || 1800);
    if (wrap) wrap.hidden = !calSet.targetEnabled;

    if (splitEl) {
      splitEl.innerHTML =
        "早 <b>" + Math.round(split.breakfast) + "</b> · 午 <b>" + Math.round(split.lunch) +
        "</b> · 晚 <b>" + Math.round(split.dinner) + "</b> · 加餐/饮 <b>" +
        Math.round(split.snack + split.drink) + "</b>";
    }

    if (calSet.targetEnabled) {
      var target = calSet.targetKcal;
      var left = target - total;
      if (nums) nums.innerHTML = Math.round(total) + ' <span>/ ' + target + " kcal（估）</span>";
      if (compact) compact.textContent = "今日 " + Math.round(total) + " / " + target + " kcal（估）";
      if (ringWrap) {
        ringWrap.hidden = false;
        var circ = 2 * Math.PI * 28;
        var ratio = Math.min(1, total / Math.max(1, target));
        if (ringFg) {
          ringFg.setAttribute("stroke-dasharray", String(circ));
          ringFg.setAttribute("stroke-dashoffset", String(circ * (1 - ratio)));
        }
        ringWrap.classList.toggle("over", total > target);
        if (ringLabel) ringLabel.textContent = total > target ? "略超" : (Math.round(ratio * 100) + "%");
      }
      if (hint) {
        if (total > target) hint.textContent = "今天比目标多了一点点，也不用刻意饿下一顿。热量是估算值。";
        else if (total === 0) hint.textContent = "记下来就很好，不需要每顿都完美。";
        else hint.textContent = "剩余参考约 " + Math.max(0, Math.round(left)) + " kcal · 估算值，仅供参考。";
      }
    } else {
      if (nums) nums.innerHTML = Math.round(total) + " <span>kcal · 今日已记录（估）</span>";
      if (compact) compact.textContent = "今日已记录 " + Math.round(total) + " kcal（估）";
      if (ringWrap) ringWrap.hidden = true;
      if (hint) {
        hint.textContent = total > 0
          ? "今天已记录约 " + Math.round(total) + " kcal。热量是估算值，分量和做法都会影响结果。"
          : "记下来就很好，不需要每顿都完美。可随时补记或打卡推荐餐。";
      }
    }
    updateRerollLockUI();
  }

  function updateRerollLockUI() {
    var locked = getLockedMealsFromLogs();
    var keys = Object.keys(locked);
    var hint = $("#rerollLockHint");
    var forceBtn = $("#btnRerollAllForce");
    if (!keys.length) {
      if (hint) hint.hidden = true;
      if (forceBtn) forceBtn.hidden = true;
      return;
    }
    if (hint) {
      hint.hidden = false;
      hint.textContent = keys.map(function (m) { return MEAL_LABEL[m]; }).join("、") +
        "已经吃过，重新安排时会保留这些餐次；也可「仍然重新安排全部」（不会删除摄入记录）。";
    }
    if (forceBtn) forceBtn.hidden = false;
  }

  var modalFocusReturn = null;
  var openModalId = null;

  function openModal(id) {
    modalFocusReturn = document.activeElement;
    openModalId = id;
    var mask = $("#modalMask");
    var sheet = $("#" + id);
    if (!mask || !sheet) return;
    mask.hidden = false;
    sheet.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(function () {
      mask.classList.add("is-open");
      sheet.classList.add("is-open");
      var focusable = sheet.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (focusable) focusable.focus();
    });
  }
  /** 补记食物编辑态（避免 data-edit-id 残留覆盖旧记录） */
  var editingLogId = null;
  function clearAddFoodEditState() {
    editingLogId = null;
    var modal = $("#addFoodModal");
    if (modal) modal.removeAttribute("data-edit-id");
  }
  function setAddFoodEditState(logId) {
    editingLogId = logId || null;
    var modal = $("#addFoodModal");
    if (!modal) return;
    if (logId) modal.setAttribute("data-edit-id", logId);
    else modal.removeAttribute("data-edit-id");
  }

  function closeModal(id) {
    var mask = $("#modalMask");
    var closingId = id || openModalId;
    var sheet = closingId ? $("#" + closingId) : null;
    if (closingId === "addFoodModal") clearAddFoodEditState();
    if (sheet) {
      sheet.classList.remove("is-open");
      setTimeout(function () { sheet.hidden = true; }, 280);
    }
    if (mask) {
      mask.classList.remove("is-open");
      setTimeout(function () {
        if (!$all(".modal-sheet.is-open").length) {
          mask.hidden = true;
          document.body.classList.remove("modal-open");
        }
      }, 280);
    }
    openModalId = null;
    if (modalFocusReturn && modalFocusReturn.focus) {
      try { modalFocusReturn.focus(); } catch (e) {}
    }
    modalFocusReturn = null;
  }
  function closeAllModals() {
    clearAddFoodEditState();
    $all(".modal-sheet").forEach(function (s) {
      s.classList.remove("is-open");
      s.hidden = true;
    });
    var mask = $("#modalMask");
    if (mask) { mask.classList.remove("is-open"); mask.hidden = true; }
    document.body.classList.remove("modal-open");
    openModalId = null;
  }

  function openCheckinDialog(meal, dish, existing) {
    if (!dish && !existing) return;
    var name = existing ? existing.name : dish.name;
    var base = existing
      ? Math.round(Number(existing.kcal) / (Number(existing.portion) || 1))
      : dishDefaultKcal(dish);
    var portion = existing ? Number(existing.portion) || 1 : 1;
    var kcal = existing ? Number(existing.kcal) : Math.round(base * portion);
    $("#checkinTitle").textContent = existing ? "修改打卡" : ("吃了这顿 · " + (MEAL_LABEL[meal] || ""));
    $("#checkinName").value = name;
    $("#checkinMeal").value = meal;
    $("#checkinDishId").value = (existing && existing.dishId) || (dish && dish.id) || "";
    $("#checkinLogId").value = existing ? existing.id : "";
    $("#checkinBaseKcal").value = String(base);
    $("#checkinKcal").value = String(Math.round(kcal));
    $all("#portionGroup .chip").forEach(function (b) {
      var p = parseFloat(b.getAttribute("data-portion"));
      b.setAttribute("aria-checked", Math.abs(p - portion) < 0.01 ? "true" : "false");
    });
    var del = $("#btnDeleteCheckin");
    if (del) del.hidden = !existing;
    openModal("checkinModal");
  }
  function applyPortionToKcal() {
    var base = Number($("#checkinBaseKcal").value) || 0;
    var portion = 1;
    $all("#portionGroup .chip").forEach(function (b) {
      if (b.getAttribute("aria-checked") === "true") portion = parseFloat(b.getAttribute("data-portion")) || 1;
    });
    $("#checkinKcal").value = String(Math.round(base * portion));
  }
  function saveCheckinFromDialog() {
    var name = ($("#checkinName").value || "").trim();
    var meal = $("#checkinMeal").value || "lunch";
    var dishId = $("#checkinDishId").value || null;
    var logId = $("#checkinLogId").value || uid();
    var portion = 1;
    var portionLabel = "标准";
    $all("#portionGroup .chip").forEach(function (b) {
      if (b.getAttribute("aria-checked") === "true") {
        portion = parseFloat(b.getAttribute("data-portion")) || 1;
        portionLabel = b.textContent.replace(/\s+/g, " ").trim();
      }
    });
    var kcal = clampKcal($("#checkinKcal").value);
    if (!name) { toast("请填写菜名"); return; }
    if (kcal == null) { toast("请输入 1～5000 之间的热量"); return; }
    upsertLog({
      id: logId, meal: meal, name: name, dishId: dishId,
      portion: portion, portionLabel: portionLabel, kcal: kcal,
      source: dishId ? "recommend" : "custom", ts: Date.now()
    });
    closeModal("checkinModal");
    toast("已记下这一顿");
    if (state.menu) renderResults({ animate: false });
  }

  function fillQuickFoods() {
    var box = $("#quickFoods");
    if (!box) return;
    box.innerHTML = COMMON_FOODS.map(function (f, i) {
      return '<button type="button" class="chip" data-cf="' + i + '">' +
        escapeHtml(f.name) + " · " + f.kcal + "</button>";
    }).join("");
    $all("[data-cf]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = COMMON_FOODS[parseInt(btn.getAttribute("data-cf"), 10)];
        if (!f) return;
        $("#addFoodName").value = f.name;
        $("#addFoodPortion").value = f.portion || "";
        $("#addFoodKcal").value = String(f.kcal);
        $("#addFoodMeal").value = f.meal || "snack";
      });
    });
  }
  function fillRecentFoods() {
    var box = $("#recentFoods");
    if (!box) return;
    var all = loadAllCalorieLogs();
    var recent = [];
    var seen = {};
    Object.keys(all).sort().reverse().forEach(function (day) {
      (all[day] || []).slice().reverse().forEach(function (x) {
        if (!x || !x.name || seen[x.name]) return;
        seen[x.name] = true;
        recent.push(x);
      });
    });
    recent = recent.slice(0, 12);
    if (!recent.length) {
      box.innerHTML = '<span class="form-hint">暂无最近记录</span>';
      return;
    }
    box.innerHTML = recent.map(function (x, i) {
      return '<button type="button" class="chip" data-rf="' + i + '">' +
        escapeHtml(x.name) + " · " + Math.round(x.kcal) + "</button>";
    }).join("");
    $all("[data-rf]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var x = recent[parseInt(btn.getAttribute("data-rf"), 10)];
        if (!x) return;
        $("#addFoodName").value = x.name;
        $("#addFoodPortion").value = x.portionLabel || "";
        $("#addFoodKcal").value = String(Math.round(x.kcal));
        $("#addFoodMeal").value = x.meal || "snack";
      });
    });
  }
  function openAddFoodDialog(opts) {
    opts = opts || {};
    fillQuickFoods();
    fillRecentFoods();
    // 新增模式必须清编辑态；编辑模式由 openEditFoodDialog 设置
    if (!opts.editId) clearAddFoodEditState();
    $("#addFoodName").value = "";
    $("#addFoodPortion").value = "";
    $("#addFoodKcal").value = "";
    $("#addFoodMeal").value = "snack";
    var now = new Date();
    $("#addFoodTime").value = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    var title = $("#addFoodTitle");
    if (title) title.textContent = opts.editId ? "修改记录" : "补记食物";
    openModal("addFoodModal");
  }
  function openEditFoodDialog(log) {
    if (!log) return;
    openAddFoodDialog({ editId: log.id });
    setAddFoodEditState(log.id);
    $("#addFoodName").value = log.name || "";
    $("#addFoodPortion").value = log.portionLabel || "";
    $("#addFoodKcal").value = String(log.kcal || "");
    $("#addFoodMeal").value = log.meal || "snack";
  }
  function saveAddFood() {
    var name = ($("#addFoodName").value || "").trim();
    var portion = ($("#addFoodPortion").value || "").trim();
    var kcal = clampKcal($("#addFoodKcal").value);
    var meal = $("#addFoodMeal").value || "snack";
    if (!name) { toast("请填写食物名称"); return; }
    if (kcal == null) { toast("请输入 1～5000 之间的热量"); return; }
    var timeStr = $("#addFoodTime").value || "";
    var ts = Date.now();
    if (timeStr) {
      var parts = timeStr.split(":");
      var d = new Date();
      d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
      ts = d.getTime();
    }
    var editId = editingLogId || $("#addFoodModal").getAttribute("data-edit-id");
    upsertLog({
      id: editId || uid(), meal: meal, name: name, dishId: null,
      portion: 1, portionLabel: portion || "自定义", kcal: kcal,
      source: "custom", ts: ts
    });
    clearAddFoodEditState();
    closeModal("addFoodModal");
    toast(editId ? "已更新记录" : ("已补记 · " + name));
    if (state.menu) renderResults({ animate: false });
  }
  function openEnergyDetail() {
    var logs = getTodayLogs().slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    var total = sumLogs(logs);
    $("#energyDetailTotal").textContent = Math.round(total) + " kcal（估）";
    $("#energyDetailHint").textContent = "热量是估算值，分量和做法都会影响结果。";
    var list = $("#energyLogList");
    if (!logs.length) {
      list.innerHTML = '<p class="form-hint">今天还没有记录。可以从推荐卡「吃了这顿」或补记开始。</p>';
    } else {
      list.innerHTML = logs.map(function (x) {
        return (
          '<div class="log-item" data-log-id="' + escapeHtml(x.id) + '">' +
            '<div class="log-body"><strong>' + escapeHtml(x.name) + "</strong>" +
            (MEAL_LABEL[x.meal] || x.meal) + " · " + escapeHtml(x.portionLabel || "") +
            " · " + formatRelativeTime(x.ts || Date.now()) + "</div>" +
            '<div style="text-align:right"><div class="log-kcal">' + Math.round(x.kcal) + " kcal</div>" +
            '<div class="log-ops">' +
            '<button type="button" class="btn btn-ghost btn-sm btn-edit-log" data-id="' + escapeHtml(x.id) + '">修改</button>' +
            '<button type="button" class="btn btn-ghost btn-sm btn-del-log" data-id="' + escapeHtml(x.id) + '">删除</button>' +
            "</div></div></div>"
        );
      }).join("");
      $all(".btn-edit-log", list).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var log = findLogById(btn.getAttribute("data-id"));
          if (!log) return;
          closeModal("energyDetailModal");
          if (log.source === "recommend" && log.dishId) {
            openCheckinDialog(log.meal, dishById(log.dishId) || { name: log.name, calories: { default: log.kcal } }, log);
          } else {
            openEditFoodDialog(log);
          }
        });
      });
      $all(".btn-del-log", list).forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm("删除这条摄入记录？")) return;
          deleteLog(btn.getAttribute("data-id"));
          openEnergyDetail();
          if (state.menu) renderResults({ animate: false });
          toast("已删除");
        });
      });
    }
    openModal("energyDetailModal");
  }

  /* ---------- 历史 / 收藏 / 复制 ---------- */
  function openHistoryDrawer() {
    var mask = $("#drawerMask");
    var drawer = $("#historyDrawer");
    mask.hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(function () {
      mask.classList.add("is-open");
      drawer.classList.add("is-open");
    });
    renderHistoryDrawerBody();
    $("#btnCloseHistory").focus();
  }
  function closeHistoryDrawer() {
    var mask = $("#drawerMask");
    var drawer = $("#historyDrawer");
    mask.classList.remove("is-open");
    drawer.classList.remove("is-open");
    setTimeout(function () {
      mask.hidden = true;
      drawer.hidden = true;
    }, 280);
  }
  function renderHistoryDrawerBody() {
    var body = $("#drawerBody");
    var foot = $("#drawerFoot");
    var isRec = state.historyTab === "recommend";
    $("#tabRecommend").setAttribute("aria-selected", isRec ? "true" : "false");
    $("#tabRecommend").setAttribute("aria-pressed", isRec ? "true" : "false");
    $("#tabEaten").setAttribute("aria-selected", !isRec ? "true" : "false");
    $("#tabEaten").setAttribute("aria-pressed", !isRec ? "true" : "false");
    foot.hidden = !isRec;
    if (isRec) {
      var list = loadRecommendHistory().slice().reverse();
      if (!list.length) {
        body.innerHTML = '<p class="hint">还没有推荐历史。安排一顿就会记下来。</p>';
        return;
      }
      body.innerHTML = list.map(function (item) {
        var names = MEALS.map(function (m) {
          return MEAL_LABEL[m] + " " + (item.names && item.names[m] ? item.names[m] : "—");
        }).join(" · ");
        return (
          '<article class="hist-item">' +
            '<div class="hist-top"><span class="hist-time">' + escapeHtml(formatRelativeTime(item.ts)) + "</span>" +
            '<span class="hist-action">' + escapeHtml(ACTION_LABEL[item.action] || item.action || "推荐") + "</span></div>" +
            '<div class="hist-names">' + escapeHtml(names) + "</div>" +
            '<div class="hist-actions">' +
            '<button type="button" class="btn btn-secondary btn-sm btn-restore" data-id="' + escapeHtml(item.id) + '">恢复这一组</button>' +
            '<button type="button" class="btn btn-ghost btn-sm btn-del-hist" data-id="' + escapeHtml(item.id) + '">删除</button>' +
            "</div></article>"
        );
      }).join("");
      $all(".btn-restore", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var entry = loadRecommendHistory().filter(function (h) { return h.id === btn.getAttribute("data-id"); })[0];
          restoreHistoryEntry(entry);
        });
      });
      $all(".btn-del-hist", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          saveRecommendHistory(loadRecommendHistory().filter(function (h) { return h.id !== btn.getAttribute("data-id"); }));
          renderHistoryDrawerBody();
          toast("已删除这条历史");
        });
      });
    } else {
      var eaten = loadEatenHistory().slice().reverse();
      foot.hidden = true;
      if (!eaten.length) {
        body.innerHTML = '<p class="hint">还没有「真正吃过」的记录。对菜单满意时点「今天就吃这套」。</p>';
        return;
      }
      body.innerHTML = eaten.map(function (item) {
        var names = MEALS.map(function (m) {
          return MEAL_LABEL[m] + " " + (item.names && item.names[m] ? item.names[m] : "—");
        }).join(" · ");
        return (
          '<article class="hist-item">' +
            '<div class="hist-top"><span class="hist-time">' + escapeHtml(formatRelativeTime(item.ts)) + "</span>" +
            '<span class="hist-action" style="background:#E8F5E0;color:#4A7C3A">吃过</span></div>' +
            '<div class="hist-names">' + escapeHtml(names) + "</div>" +
            '<div class="hist-actions">' +
            '<button type="button" class="btn btn-secondary btn-sm btn-restore-eaten" data-id="' + escapeHtml(item.id) + '">恢复到菜单</button>' +
            '<button type="button" class="btn btn-ghost btn-sm btn-del-eaten" data-id="' + escapeHtml(item.id) + '">删除</button>' +
            "</div></article>"
        );
      }).join("");
      $all(".btn-restore-eaten", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var entry = loadEatenHistory().filter(function (h) { return h.id === btn.getAttribute("data-id"); })[0];
          restoreHistoryEntry(entry);
        });
      });
      $all(".btn-del-eaten", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          saveEatenHistory(loadEatenHistory().filter(function (h) { return h.id !== btn.getAttribute("data-id"); }));
          renderHistoryDrawerBody();
          toast("已删除");
        });
      });
    }
  }

  function renderFavorites() {
    var list = loadFavorites();
    var ul = $("#favList");
    var empty = $("#favEmpty");
    ul.innerHTML = "";
    if (!list.length) { empty.hidden = false; return; }
    empty.hidden = true;
    list.slice().reverse().forEach(function (item) {
      var li = document.createElement("li");
      var names = MEALS.map(function (m) { return (item.names && item.names[m]) || ""; }).filter(Boolean).join(" / ");
      li.innerHTML =
        '<div class="hist-item" style="margin:0"><div class="hist-names">' + escapeHtml(names) + "</div>" +
        '<div class="hist-actions"><button type="button" class="btn btn-secondary btn-sm btn-fav-restore" data-ts="' +
        item.ts + '">恢复</button></div></div>';
      ul.appendChild(li);
    });
    $all(".btn-fav-restore", ul).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ts = Number(btn.getAttribute("data-ts"));
        var entry = loadFavorites().filter(function (f) { return f.ts === ts; })[0];
        restoreHistoryEntry(entry);
      });
    });
  }
  function favoriteToday() {
    if (!state.menu) { toast("先安排一套菜单吧"); return; }
    var favs = loadFavorites();
    favs.push({
      ts: Date.now(),
      meals: state.menu.meals,
      channels: state.menu.channels,
      names: state.menu.names,
      signature: state.menu.signature,
      filters: state.menu.filters
    });
    saveFavorites(favs.slice(-50));
    toast("已收藏今天的菜单");
    renderFavorites();
  }
  function copyMenu() {
    if (!state.menu) { toast("还没有菜单"); return; }
    var lines = ["【饭饭搭子】" + todayKey(), ""];
    MEALS.forEach(function (m) {
      var d = state.menu.meals[m] ? dishById(state.menu.meals[m]) : null;
      if (!d) { lines.push(MEAL_LABEL[m] + "：—"); return; }
      var ch = selectedChannel(m, d);
      lines.push(MEAL_LABEL[m] + "：" + d.name + "（" + (CHANNEL_LABEL[ch] || "") + " · " + formatDishCalories(d) + "）");
    });
    lines.push("", "热量均为估算，仅供参考。");
    var text = lines.join("\n");
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("菜单已复制"); } catch (e) { toast("复制失败，请手动选择"); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("菜单已复制"); }).catch(fallback);
    } else fallback();
  }

  /* ---------- 事件 ---------- */
  function bindRadioGroup(groupSel, attr, key) {
    $all(groupSel + " .chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.settings[key] = btn.getAttribute(attr);
        saveSettings(state.settings);
        applySettingsToUI();
      });
    });
  }

  function bindEvents() {
    bindRadioGroup("#sceneGroup", "data-scene", "scene");
    bindRadioGroup("#goalGroup", "data-goal", "goal");
    bindRadioGroup("#exploreGroup", "data-explore", "exploreMode");

    $all("#dailyBudgetGroup .chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.settings.dailyBudget = btn.getAttribute("data-daily-budget");
        saveSettings(state.settings);
        applySettingsToUI();
      });
    });
    $all("#tasteGroup .chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = btn.getAttribute("data-taste");
        var idx = state.settings.tastes.indexOf(t);
        if (idx === -1) state.settings.tastes.push(t);
        else state.settings.tastes.splice(idx, 1);
        saveSettings(state.settings);
        applySettingsToUI();
      });
    });
    $all("#tagGroup .chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tag = btn.getAttribute("data-tag");
        state.settings.tags[tag] = !state.settings.tags[tag];
        saveSettings(state.settings);
        applySettingsToUI();
      });
    });

    var strict = $("#chkCuisineStrict");
    if (strict) strict.addEventListener("change", function () {
      state.settings.cuisineMode = strict.checked ? "strict" : "soft";
      saveSettings(state.settings);
    });
    var avoid = $("#chkAvoidRecent");
    if (avoid) avoid.addEventListener("change", function () {
      state.settings.avoidRecent = !!avoid.checked;
      saveSettings(state.settings);
    });

    function onArrange() { generateNewMenu(); }
    $("#btnArrange").addEventListener("click", onArrange);
    var sticky = $("#btnArrangeSticky");
    if (sticky) sticky.addEventListener("click", onArrange);

    $("#btnRerollAll").addEventListener("click", function () { rerollAllMeals(); });
    var forceBtn = $("#btnRerollAllForce");
    if (forceBtn) forceBtn.addEventListener("click", function () { rerollAllMeals({ forceAll: true }); });

    var eatSet = $("#btnEatSet");
    if (eatSet) eatSet.addEventListener("click", markEatenToday);

    var addFoodBottom = $("#btnAddFoodBottom");
    if (addFoodBottom) addFoodBottom.addEventListener("click", openAddFoodDialog);
    var addFood = $("#btnAddFood");
    if (addFood) addFood.addEventListener("click", openAddFoodDialog);
    var energyLogs = $("#btnEnergyLogs");
    if (energyLogs) energyLogs.addEventListener("click", openEnergyDetail);
    var energyDetail = $("#btnEnergyDetail");
    if (energyDetail) energyDetail.addEventListener("click", openEnergyDetail);

    $("#btnFavorite").addEventListener("click", favoriteToday);
    $("#btnCopy").addEventListener("click", copyMenu);

    var chk = $("#chkCalTarget");
    var inp = $("#inputCalTarget");
    if (chk) chk.addEventListener("change", function () {
      var s = loadCalorieSettings();
      s.targetEnabled = chk.checked;
      saveCalorieSettings(s);
      renderEnergyCard();
    });
    if (inp) inp.addEventListener("change", function () {
      var s = loadCalorieSettings();
      s.targetKcal = Number(inp.value) || 1800;
      s.targetEnabled = true;
      saveCalorieSettings(s);
      if (chk) chk.checked = true;
      renderEnergyCard();
    });

    $all("#portionGroup .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        $all("#portionGroup .chip").forEach(function (x) { x.setAttribute("aria-checked", "false"); });
        b.setAttribute("aria-checked", "true");
        applyPortionToKcal();
      });
    });
    var saveCi = $("#btnSaveCheckin");
    if (saveCi) saveCi.addEventListener("click", saveCheckinFromDialog);
    var delCi = $("#btnDeleteCheckin");
    if (delCi) delCi.addEventListener("click", function () {
      var id = $("#checkinLogId").value;
      if (!id) return;
      if (!confirm("删除这条打卡记录？")) return;
      deleteLog(id);
      closeModal("checkinModal");
      if (state.menu) renderResults({ animate: false });
      toast("已删除");
    });
    ["btnCloseCheckin", "btnCancelCheckin"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("click", function () { closeModal("checkinModal"); });
    });
    ["btnCloseAddFood", "btnCancelAddFood"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("click", function () { closeModal("addFoodModal"); });
    });
    var saveAf = $("#btnSaveAddFood");
    if (saveAf) saveAf.addEventListener("click", saveAddFood);
    ["btnCloseEnergyDetail", "btnCloseEnergyDetail2"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("click", function () { closeModal("energyDetailModal"); });
    });
    var fromDetail = $("#btnAddFoodFromDetail");
    if (fromDetail) fromDetail.addEventListener("click", function () {
      closeModal("energyDetailModal");
      openAddFoodDialog();
    });

    var mask = $("#modalMask");
    if (mask) mask.addEventListener("click", function () { closeAllModals(); });

    $("#btnOpenHistory").addEventListener("click", openHistoryDrawer);
    $("#btnCloseHistory").addEventListener("click", closeHistoryDrawer);
    $("#drawerMask").addEventListener("click", closeHistoryDrawer);
    $("#tabRecommend").addEventListener("click", function () {
      state.historyTab = "recommend";
      renderHistoryDrawerBody();
    });
    $("#tabEaten").addEventListener("click", function () {
      state.historyTab = "eaten";
      renderHistoryDrawerBody();
    });
    $("#btnClearHistory").addEventListener("click", function () {
      if (!confirm("清空全部推荐历史？吃过记录不受影响。")) return;
      saveRecommendHistory([]);
      renderHistoryDrawerBody();
      toast("推荐历史已清空");
    });

    $("#btnCloseCuisine").addEventListener("click", closeCuisineDrawer);
    $("#cuisineMask").addEventListener("click", closeCuisineDrawer);
    $("#btnCuisineDone").addEventListener("click", closeCuisineDrawer);
    $("#btnCuisineClear").addEventListener("click", function () {
      state.settings.cuisineIds = [];
      saveSettings(state.settings);
      renderCuisineFullList();
      renderCuisineSelected();
    });
    var csearch = $("#cuisineSearch");
    if (csearch) csearch.addEventListener("input", renderCuisineFullList);

    var editBtn = $("#btnEditFilters");
    if (editBtn) editBtn.addEventListener("click", function () {
      setFilterCollapsed(false);
      var full = $("#filterFull");
      if (full) full.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var expandMeals = $("#btnExpandMeals");
    if (expandMeals) expandMeals.addEventListener("click", function () {
      state.mealsExpanded = !state.mealsExpanded;
      var wrap = $("#mealEditorsWrap");
      if (wrap) wrap.hidden = !state.mealsExpanded;
      expandMeals.setAttribute("aria-expanded", state.mealsExpanded ? "true" : "false");
      expandMeals.textContent = state.mealsExpanded ? "收起细调" : "细调三餐";
    });

    // details aria-expanded
    $all("details.fold").forEach(function (d) {
      d.addEventListener("toggle", function () {
        var sum = d.querySelector("summary");
        if (sum) sum.setAttribute("aria-expanded", d.open ? "true" : "false");
      });
    });

    $("#btnToggleFav").addEventListener("click", function () {
      var panel = $("#favPanel");
      var open = panel.hidden;
      panel.hidden = !open;
      $("#btnToggleFav").setAttribute("aria-expanded", open ? "true" : "false");
      if (open) renderFavorites();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAllModals();
        closeHistoryDrawer();
        closeCuisineDrawer();
      }
    });

    window.addEventListener("resize", function () {
      renderMealEditors();
      if (!isMobileLayout()) setFilterCollapsed(false);
    });
  }

  function renderMetaHeader() {
    var now = new Date();
    $("#todayDate").textContent = formatChineseDate(now);
    $("#greeting").textContent = greetingByHour(now.getHours());
  }

  function init() {
    renderMetaHeader();
    applySettingsToUI();
    bindEvents();
    restoreLastMenu();
    renderEnergyCard();
    updateArrangeButton();
    // 若默认工作日通勤但用户无 preset，保持现状
    if (!state.settings.presetId && !localStorage.getItem(STORAGE.settings) && !localStorage.getItem(STORAGE.settingsLegacy)) {
      // 新用户：摘要已是默认三餐设置
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

})(window);
