/* 今日宜 · 统一活动推荐引擎
 * 硬条件：时间、地点、材料、预算、能量（用户明确的唯一档可作硬）
 * 软条件：心情、难度、探索；不足时逐级放宽并返回 relaxed 列表
 * 历史：近 3 天完成优先排除；近 7 天降权；同日避免同分类连推
 * 加权随机；首次 seed=hash(today+profileId+state)；换一个加 rerollCount
 */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var u = TY.utils;
  if (!u) throw new Error("TodayYi.utils required");

  var SOFT_ORDER = ["moods", "difficulty", "energy", "explore"];

  function defaultSoftFlags() {
    return { moods: true, difficulty: true, energy: true, explore: true };
  }

  function asMap(ids) {
    var m = {};
    if (!ids) return m;
    if (Array.isArray(ids)) {
      ids.forEach(function (id) { if (id) m[id] = true; });
    } else if (typeof ids === "object") {
      Object.keys(ids).forEach(function (k) { if (ids[k]) m[k] = true; });
    }
    return m;
  }

  function matchHard(a, opts) {
    if (!a) return false;
    var exclude = asMap(opts.excludeIds);
    if (exclude[a.id]) return false;

    if (opts.durationMax != null && a.duration != null && a.duration > opts.durationMax) return false;
    if (opts.budgetMax != null && a.budgetMax != null && a.budgetMax > opts.budgetMax) return false;

    if (opts.place && a.places && a.places.length && a.places.indexOf(opts.place) === -1) return false;
    if (opts.social && a.social && a.social.length && a.social.indexOf(opts.social) === -1) return false;

    if (opts.categories && opts.categories.length && opts.categories.indexOf(a.category) === -1) return false;

    if (opts.availableMaterials && opts.availableMaterials.length && a.materials && a.materials.length) {
      var need = a.materials.filter(function (m) { return m && m !== "none"; });
      if (need.length) {
        var ok = need.every(function (m) {
          return opts.availableMaterials.indexOf(m) !== -1;
        });
        if (!ok) return false;
      }
    }
    return true;
  }

  function matchSoft(a, opts, flags) {
    flags = flags || defaultSoftFlags();
    // energy：默认软偏好（列表包含即可）；可配置 energyHard
    if (flags.energy && opts.energy && a.energy && a.energy.length) {
      if (a.energy.indexOf(opts.energy) === -1) return false;
    }
    if (flags.moods && opts.moods && opts.moods.length && a.moods && a.moods.length) {
      var hit = opts.moods.some(function (m) { return a.moods.indexOf(m) !== -1; });
      if (!hit) return false;
    }
    if (flags.difficulty && opts.difficultyMax != null && a.difficulty != null) {
      if (a.difficulty > opts.difficultyMax) return false;
    }
    return true;
  }

  function scoreActivity(a, opts, rng, ctx) {
    var w = 12 + rng() * 6;
    if (opts.moods && a.moods) {
      var mh = opts.moods.filter(function (m) { return a.moods.indexOf(m) !== -1; }).length;
      w += mh * 8;
    }
    if (opts.energy && a.energy && a.energy.indexOf(opts.energy) !== -1) w += 10;
    if (opts.place && a.places && a.places.indexOf(opts.place) !== -1) w += 6;

    // 探索偏好
    if (opts.exploreMode === "explore") {
      if (!ctx.recent7[a.id]) w += 8;
      else w -= 4;
    } else if (opts.exploreMode === "familiar") {
      if (ctx.recent7[a.id]) w += 4;
    } else {
      if (!ctx.recent7[a.id]) w += 3;
    }

    // 近 7 天惩罚
    if (ctx.recent7[a.id]) {
      w -= Math.min(35, 8 + ctx.recent7[a.id] * 7);
    }
    // 近 3 天已排除时不应进入；若进入则强惩罚
    if (ctx.recent3[a.id]) w *= 0.05;

    // 同日已用分类惩罚
    if (ctx.usedCategories && ctx.usedCategories[a.category]) w -= 18;

    // 主签偏好时长适中
    if (opts.preferDuration != null && a.duration != null) {
      var diff = Math.abs(a.duration - opts.preferDuration);
      w += Math.max(0, 8 - diff / 5);
    }

    if (opts.role === "side" && a.duration != null && a.duration <= 12) w += 6;
    if (opts.role === "main" && a.duration != null && a.duration >= 10) w += 4;

    return Math.max(0, w);
  }

  function pickWeighted(list, scoreFn, rng) {
    if (!list.length) return null;
    var total = 0;
    var scores = list.map(function (item) {
      var s = scoreFn(item);
      total += s;
      return s;
    });
    if (total <= 0) return null;
    var r = rng() * total;
    for (var i = 0; i < list.length; i++) {
      r -= scores[i];
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function buildRecentMaps(opts) {
    var recent3 = asMap(opts.recent3Ids || {});
    var recent7 = {};
    if (opts.recentHistory && typeof opts.recentHistory === "object") {
      Object.keys(opts.recentHistory).forEach(function (k) {
        recent7[k] = opts.recentHistory[k];
      });
    }
    // 从 history 模块自动取（若未传入）
    if (TY.history) {
      if (!opts.recent3Ids) {
        TY.history.listRecent(3).forEach(function (h) {
          if (h.activityId) recent3[h.activityId] = true;
        });
      }
      if (!opts.recentHistory) {
        recent7 = TY.history.recentIdMap(7);
      }
    }
    return { recent3: recent3, recent7: recent7 };
  }

  /**
   * recommendActivities(opts) → { item, relaxed, reason, poolSize }
   */
  function recommendActivities(opts) {
    opts = opts || {};
    var pool = opts.pool || TY.activityPool || [];
    var maps = buildRecentMaps(opts);
    var usedCategories = asMap(opts.usedCategories || {});
    var exclude = asMap(opts.excludeIds);

    // 近 3 天优先排除（候选充足时）
    var hardAll = pool.filter(function (a) {
      return matchHard(a, Object.assign({}, opts, { excludeIds: exclude }));
    });

    function withRecent3(list) {
      var filtered = list.filter(function (a) { return !maps.recent3[a.id]; });
      return filtered.length >= 2 ? filtered : list;
    }

    var flags = defaultSoftFlags();
    var relaxed = [];

    function poolWith(f) {
      return withRecent3(hardAll.filter(function (a) {
        return matchSoft(a, opts, f);
      }));
    }

    var candidates = poolWith(flags);
    if (!candidates.length) {
      for (var i = 0; i < SOFT_ORDER.length; i++) {
        var key = SOFT_ORDER[i];
        if (key === "moods" && (!opts.moods || !opts.moods.length)) continue;
        if (key === "difficulty" && opts.difficultyMax == null) continue;
        if (key === "energy" && !opts.energy) continue;
        flags[key] = false;
        relaxed.push(key);
        candidates = poolWith(flags);
        if (candidates.length) break;
      }
    }

    // 仍空：仅硬条件
    if (!candidates.length) {
      candidates = withRecent3(hardAll);
      if (candidates.length) {
        relaxed = SOFT_ORDER.slice();
      }
    }

    if (!candidates.length) {
      return { item: null, relaxed: relaxed, reason: "hard_empty", poolSize: 0 };
    }

    var seed = opts.seed != null ? opts.seed : Date.now();
    var rng = u.mulberry32(typeof seed === "number" ? seed : u.hashStr(String(seed)));
    var ctx = {
      recent3: maps.recent3,
      recent7: maps.recent7,
      usedCategories: usedCategories
    };

    var picked = pickWeighted(candidates, function (a) {
      return scoreActivity(a, opts, rng, ctx);
    }, rng);

    if (!picked) {
      // 权重全 0：均匀随机未排除池
      picked = pickWeighted(candidates, function () { return 1; }, rng);
    }

    if (!picked) {
      return { item: null, relaxed: relaxed, reason: "weight_zero", poolSize: candidates.length };
    }

    return {
      item: picked,
      relaxed: relaxed,
      reason: relaxed.length ? "soft_relaxed" : "ok",
      poolSize: candidates.length
    };
  }

  /** 一次生成主签 + 多个顺手建议 */
  function recommendBundle(opts) {
    opts = opts || {};
    var exclude = asMap(opts.excludeIds);
    var usedCat = {};
    var relaxedAll = [];
    var mainSeed = opts.seed != null ? opts.seed : 1;

    var mainRes = recommendActivities(Object.assign({}, opts, {
      seed: mainSeed,
      role: "main",
      preferDuration: opts.durationMax != null ? Math.min(opts.durationMax, 25) : 20,
      excludeIds: exclude
    }));
    if (!mainRes.item) {
      return { main: null, side: [], relaxed: mainRes.relaxed, reason: mainRes.reason };
    }
    exclude[mainRes.item.id] = true;
    usedCat[mainRes.item.category] = true;
    relaxedAll = relaxedAll.concat(mainRes.relaxed || []);

    var sideCount = opts.sideCount != null ? opts.sideCount : 2;
    var side = [];
    for (var s = 0; s < sideCount; s++) {
      var sideRes = recommendActivities(Object.assign({}, opts, {
        seed: u.hashStr(String(mainSeed) + "#side#" + s),
        role: "side",
        durationMax: opts.sideDurationMax != null
          ? opts.sideDurationMax
          : Math.min(opts.durationMax != null ? opts.durationMax : 15, 15),
        excludeIds: exclude,
        usedCategories: usedCat,
        preferDuration: 10
      }));
      if (sideRes.item) {
        side.push(sideRes.item);
        exclude[sideRes.item.id] = true;
        usedCat[sideRes.item.category] = true;
        relaxedAll = relaxedAll.concat(sideRes.relaxed || []);
      }
    }

    // 去重 relaxed
    var seen = {};
    var relaxed = [];
    relaxedAll.forEach(function (k) {
      if (!seen[k]) { seen[k] = true; relaxed.push(k); }
    });

    return {
      main: mainRes.item,
      side: side,
      relaxed: relaxed,
      reason: mainRes.reason
    };
  }

  function makeDaySeed(profileId, stateId, rerollCount) {
    return u.hashStr(
      u.todayKey() + "|" + (profileId || "anon") + "|" + (stateId || "default") + "|r" + (rerollCount || 0)
    );
  }

  function softLabel(key) {
    var map = {
      moods: "心情偏好",
      difficulty: "难度",
      energy: "精力匹配",
      explore: "探索偏好"
    };
    return map[key] || key;
  }

  TY.recommendation = {
    recommendActivities: recommendActivities,
    recommendBundle: recommendBundle,
    makeDaySeed: makeDaySeed,
    softLabel: softLabel,
    defaultSoftFlags: defaultSoftFlags
  };
})(window);
