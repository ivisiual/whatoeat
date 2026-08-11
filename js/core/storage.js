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
    focusTimer: "todayyi_focus_timer_v1",
    settings: "todayyi_settings_v1",
    beadWorks: "todayyi_bead_works_v1",
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

  var BACKUP_APP = "todayyi";
  var BACKUP_VERSION = 1;
  var MAX_BACKUP_BYTES = 5 * 1024 * 1024;

  /** 仅允许导入导出本应用使用的 localStorage 键。 */
  function backupKeys() {
    return [
      KEYS.profile,
      KEYS.dailyPlan,
      KEYS.activityHistory,
      KEYS.favorites,
      KEYS.studyTasks,
      KEYS.focusLogs,
      KEYS.focusTimer,
      KEYS.settings,
      KEYS.beadWorks,
      KEYS.fanfan.settings,
      KEYS.fanfan.settingsLegacy,
      KEYS.fanfan.currentMenu,
      KEYS.fanfan.recommendHistory,
      KEYS.fanfan.eatenHistory,
      KEYS.fanfan.favorites,
      KEYS.fanfan.hasArranged,
      KEYS.fanfan.calorieLogs,
      KEYS.fanfan.calorieSettings,
      KEYS.fanfan.menuCheckin
    ];
  }

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

  function createBackup() {
    var data = {};
    backupKeys().forEach(function (key) {
      var raw = getRaw(key);
      if (raw !== null) data[key] = raw;
    });
    return {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: data
    };
  }

  function validateBackup(backup) {
    if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
      throw new Error("备份文件格式不正确");
    }
    if (backup.app !== BACKUP_APP) {
      throw new Error("这不是今日宜的数据备份");
    }
    if (backup.version !== BACKUP_VERSION) {
      throw new Error("暂不支持这个备份版本");
    }
    if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
      throw new Error("备份文件缺少数据内容");
    }

    var allowed = {};
    backupKeys().forEach(function (key) { allowed[key] = true; });
    var recognized = [];
    var totalBytes = 0;
    Object.keys(backup.data).forEach(function (key) {
      if (!allowed[key]) return;
      var raw = backup.data[key];
      if (typeof raw !== "string") {
        throw new Error("备份中的数据类型不正确：" + key);
      }
      totalBytes += raw.length;
      if (totalBytes > MAX_BACKUP_BYTES) {
        throw new Error("备份数据过大，无法导入");
      }
      // hasArranged 是 YYYY-MM-DD 原始字符串，其余键均保存 JSON。
      if (key !== KEYS.fanfan.hasArranged) {
        try { JSON.parse(raw); } catch (e) {
          throw new Error("备份中的数据已损坏：" + key);
        }
      }
      recognized.push(key);
    });
    if (!recognized.length) throw new Error("备份中没有可导入的数据");
    return recognized;
  }

  /**
   * 用备份完整替换当前应用数据。全部校验通过后才写入；写入失败会回滚。
   */
  function restoreBackup(backup) {
    var importedKeys = validateBackup(backup);
    var allKeys = backupKeys();
    var before = {};
    allKeys.forEach(function (key) { before[key] = getRaw(key); });

    try {
      allKeys.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(backup.data, key)) {
          if (!setRaw(key, backup.data[key])) throw new Error("浏览器存储空间不足");
        } else {
          remove(key);
        }
      });
    } catch (err) {
      allKeys.forEach(function (key) {
        if (before[key] === null) remove(key);
        else setRaw(key, before[key]);
      });
      throw err;
    }
    return { ok: true, imported: importedKeys.length };
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
    setTodayPlan: setTodayPlan,
    backupKeys: backupKeys,
    createBackup: createBackup,
    validateBackup: validateBackup,
    restoreBackup: restoreBackup
  };
})(window);
