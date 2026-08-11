/* 今日宜 · 历史与收藏 */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var storage = TY.storage;
  var u = TY.utils;
  if (!storage || !u) throw new Error("TodayYi.storage + utils required");

  function listRecent(days) {
    days = days || 7;
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return (storage.getActivityHistory() || []).filter(function (h) {
      return h && h.completedAt && h.completedAt >= cutoff;
    });
  }

  function listToday() {
    var day = u.todayKey();
    return (storage.getActivityHistory() || []).filter(function (h) {
      return h && h.date === day;
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
    var list = storage.get(storage.KEYS.favorites, []);
    return Array.isArray(list) ? list : [];
  }

  function isFavorite(activityId) {
    return listFavorites().some(function (f) { return f && f.activityId === activityId; });
  }

  function toggleFavorite(item) {
    var list = listFavorites();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].activityId === item.activityId) { idx = i; break; }
    }
    var added = false;
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push({
        activityId: item.activityId,
        category: item.category || "",
        title: item.title || item.activityId,
        description: item.description || "",
        ts: Date.now()
      });
      added = true;
    }
    storage.set(storage.KEYS.favorites, list.slice(-100));
    return { list: list, added: added };
  }

  function removeHistory(id) {
    return removeCompletion({ historyId: id });
  }

  /**
   * 统一撤销完成：同步活动历史 + 今日计划 completedIds
   * opts: { historyId } 或 { activityId, date? }
   */
  function removeCompletion(opts) {
    opts = opts || {};
    var list = storage.getActivityHistory() || [];
    var removed = [];
    var kept = [];
    list.forEach(function (h) {
      if (!h) return;
      var hit = false;
      if (opts.historyId && h.id === opts.historyId) hit = true;
      if (opts.activityId && h.activityId === opts.activityId) {
        if (!opts.date || h.date === opts.date) hit = true;
      }
      if (hit) removed.push(h);
      else kept.push(h);
    });
    storage.set(storage.KEYS.activityHistory, kept);

    // 同步今日计划 completedIds（以及匹配到的其它日期：仅当明确 date 或删除的是今日）
    if (TY.dailyPlan && TY.dailyPlan.loadTodayPlan && removed.length) {
      try {
        var plan = TY.dailyPlan.loadTodayPlan();
        var today = u.todayKey();
        var idsToDrop = {};
        removed.forEach(function (h) {
          if (h.activityId && (!h.date || h.date === today || h.date === plan.date)) {
            idsToDrop[h.activityId] = true;
          }
        });
        if (plan.completedIds && plan.completedIds.length) {
          plan.completedIds = plan.completedIds.filter(function (id) {
            return !idsToDrop[id];
          });
          TY.dailyPlan.saveTodayPlan(plan);
        }
      } catch (e) {}
    }
    return { list: kept, removed: removed };
  }

  /** 完成态统一读历史（今日），避免与 completedIds 漂移 */
  function isCompletedToday(activityId) {
    if (!activityId) return false;
    var day = u.todayKey();
    return (storage.getActivityHistory() || []).some(function (h) {
      return h && h.activityId === activityId && h.date === day && h.status === "completed";
    });
  }

  function categoryLabel(cat) {
    var map = {
      draw: "画画",
      study: "学习",
      leisure: "娱乐",
      beads: "拼豆",
      eat: "吃饭",
      other: "其他"
    };
    return map[cat] || cat || "活动";
  }

  TY.history = {
    listRecent: listRecent,
    listToday: listToday,
    recentIdMap: recentIdMap,
    listFavorites: listFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    removeHistory: removeHistory,
    removeCompletion: removeCompletion,
    isCompletedToday: isCompletedToday,
    categoryLabel: categoryLabel
  };
})(window);
