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
    var list = (storage.getActivityHistory() || []).filter(function (h) {
      return h && h.id !== id;
    });
    storage.set(storage.KEYS.activityHistory, list);
    return list;
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
    categoryLabel: categoryLabel
  };
})(window);
