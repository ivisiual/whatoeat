/* 今日宜 · storage
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
