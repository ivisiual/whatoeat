/* 今日宜 · 每日计划 */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var u = TY.utils;
  var storage = TY.storage;
  if (!u || !storage) throw new Error("TodayYi.utils + storage required");

  /** 今日状态预设 */
  var DAY_STATES = [
    {
      id: "low_home",
      emoji: "🛋️",
      label: "有点累 · 在家",
      energy: "low",
      place: "home",
      durationMax: 20,
      moods: ["relax"],
      exploreMode: "familiar"
    },
    {
      id: "office_break",
      emoji: "🖥️",
      label: "工位歇一会儿",
      energy: "low",
      place: "office",
      durationMax: 15,
      moods: ["relax"],
      exploreMode: "balanced"
    },
    {
      id: "focus_mode",
      emoji: "🎯",
      label: "想认真做点事",
      energy: "medium",
      place: "home",
      durationMax: 45,
      moods: ["focus"],
      exploreMode: "balanced"
    },
    {
      id: "create_vibe",
      emoji: "🎨",
      label: "手痒想创作",
      energy: "medium",
      place: "home",
      durationMax: 30,
      moods: ["create"],
      exploreMode: "explore"
    },
    {
      id: "get_moving",
      emoji: "🚶",
      label: "想动一动",
      energy: "high",
      place: "outdoor",
      durationMax: 40,
      moods: ["explore", "relax"],
      exploreMode: "explore"
    },
    {
      id: "weekend_soft",
      emoji: "🌤️",
      label: "轻松过一天",
      energy: "low",
      place: "home",
      durationMax: 25,
      moods: ["relax", "create"],
      exploreMode: "balanced"
    }
  ];

  function getStateById(id) {
    for (var i = 0; i < DAY_STATES.length; i++) {
      if (DAY_STATES[i].id === id) return DAY_STATES[i];
    }
    return DAY_STATES[0];
  }

  function emptyPlan(date) {
    return {
      date: date || u.todayKey(),
      stateId: null,
      state: null,
      main: null,
      side: [],
      completedIds: [],
      favoritedIds: [],
      rerollCount: 0,
      seed: null,
      relaxed: [],
      generatedAt: null
    };
  }

  function loadTodayPlan() {
    var plan = storage.getTodayPlan();
    var today = u.todayKey();
    if (!plan || plan.date !== today) {
      plan = emptyPlan(today);
      storage.setTodayPlan(plan);
    }
    return plan;
  }

  function saveTodayPlan(plan) {
    storage.setTodayPlan(plan);
  }

  function snapshotActivity(a) {
    if (!a) return null;
    return {
      id: a.id,
      category: a.category,
      title: a.title,
      description: a.description,
      firstStep: a.firstStep,
      duration: a.duration,
      completionText: a.completionText,
      steps: a.steps || [],
      moods: a.moods || [],
      energy: a.energy || [],
      places: a.places || [],
      tags: a.tags || []
    };
  }

  function generatePlan(stateId, options) {
    options = options || {};
    var plan = loadTodayPlan();
    var state = getStateById(stateId || plan.stateId || "low_home");
    var profile = storage.getProfile();
    var reroll = options.forceReroll
      ? (plan.rerollCount || 0) + 1
      : (plan.rerollCount || 0);

    // 首次生成（无 main）保持 reroll=0 稳定；强制换一批才 +1
    if (!plan.main && !options.forceReroll) reroll = 0;

    var seed = TY.recommendation.makeDaySeed(profile.id, state.id, reroll);
    var exclude = {};
    (plan.completedIds || []).forEach(function (id) { exclude[id] = true; });

    // 合并活动池
    if (TY.mergeActivityPool) TY.mergeActivityPool();
    var pool = TY.activityPool || [];

    var bundle = TY.recommendation.recommendBundle({
      pool: pool,
      seed: seed,
      energy: state.energy,
      place: state.place === "outdoor" ? "outdoor" : state.place,
      durationMax: state.durationMax,
      moods: state.moods,
      exploreMode: state.exploreMode,
      excludeIds: exclude,
      sideCount: 2,
      availableMaterials: options.availableMaterials || null,
      budgetMax: options.budgetMax != null ? options.budgetMax : null
    });

    // outdoor 地点：若池中无 outdoor，引擎硬条件可能空 → 回退 home+outdoor 软一点
    if (!bundle.main && state.place === "outdoor") {
      bundle = TY.recommendation.recommendBundle({
        pool: pool,
        seed: seed,
        energy: state.energy,
        place: null,
        durationMax: state.durationMax,
        moods: state.moods,
        exploreMode: state.exploreMode,
        excludeIds: exclude,
        sideCount: 2
      });
      if (bundle.relaxed.indexOf("place") === -1) bundle.relaxed.push("place");
    }

    plan.stateId = state.id;
    plan.state = {
      id: state.id,
      label: state.label,
      emoji: state.emoji,
      energy: state.energy,
      place: state.place,
      durationMax: state.durationMax
    };
    plan.main = snapshotActivity(bundle.main);
    plan.side = (bundle.side || []).map(snapshotActivity);
    plan.rerollCount = reroll;
    plan.seed = seed;
    plan.relaxed = bundle.relaxed || [];
    plan.generatedAt = Date.now();
    plan.date = u.todayKey();

    saveTodayPlan(plan);
    return plan;
  }

  function ensurePlanForState(stateId) {
    var plan = loadTodayPlan();
    if (plan.main && plan.stateId === stateId && plan.date === u.todayKey()) {
      return plan;
    }
    // 切换状态：重置 reroll，重新生成
    if (plan.stateId && plan.stateId !== stateId) {
      plan.rerollCount = 0;
      plan.main = null;
      plan.side = [];
      saveTodayPlan(plan);
    }
    return generatePlan(stateId, { forceReroll: false });
  }

  function rerollPlan() {
    var plan = loadTodayPlan();
    if (!plan.stateId) return generatePlan("low_home", { forceReroll: true });
    return generatePlan(plan.stateId, { forceReroll: true });
  }

  function markCompleted(activityId, meta) {
    meta = meta || {};
    var plan = loadTodayPlan();
    if (activityId && plan.completedIds.indexOf(activityId) === -1) {
      plan.completedIds.push(activityId);
      saveTodayPlan(plan);
    }
    if (activityId) {
      var act = null;
      if (plan.main && plan.main.id === activityId) act = plan.main;
      (plan.side || []).forEach(function (s) {
        if (s && s.id === activityId) act = s;
      });
      storage.recordActivityCompletion({
        activityId: activityId,
        category: (act && act.category) || meta.category || "other",
        title: (act && act.title) || meta.title || activityId,
        duration: (act && act.duration) != null ? act.duration : (meta.duration != null ? meta.duration : null),
        sourcePage: meta.sourcePage || "home",
        date: u.todayKey()
      });
    }
    return plan;
  }

  function isCompleted(activityId) {
    if (!activityId) return false;
    // 统一以活动历史为准，避免删除历史后 completedIds 残留
    if (TY.history && TY.history.isCompletedToday) {
      return TY.history.isCompletedToday(activityId);
    }
    var plan = loadTodayPlan();
    return (plan.completedIds || []).indexOf(activityId) !== -1;
  }

  function progressStats() {
    var plan = loadTodayPlan();
    var total = 0;
    var done = 0;
    if (plan.main) {
      total++;
      if (isCompleted(plan.main.id)) done++;
    }
    (plan.side || []).forEach(function (s) {
      if (!s) return;
      total++;
      if (isCompleted(s.id)) done++;
    });
    // 吃饭完成（fanfan）计入今日额外进度展示
    var eatDone = false;
    try {
      var menu = storage.get(storage.KEYS.fanfan.currentMenu, null);
      var checkins = storage.get(storage.KEYS.fanfan.menuCheckin, {}) || {};
      if (menu && menu.date === u.todayKey() && menu.id) {
        var key = menu.date + "|" + menu.id;
        if (checkins[key]) eatDone = true;
      }
      // 也看统一历史
      var hist = storage.getActivityHistory() || [];
      if (hist.some(function (h) {
        return h && h.date === u.todayKey() && h.category === "eat" && h.status === "completed";
      })) eatDone = true;
    } catch (e) {}

    return {
      total: total,
      done: done,
      eatDone: eatDone,
      ratio: total ? done / total : 0
    };
  }

  TY.dailyPlan = {
    DAY_STATES: DAY_STATES,
    getStateById: getStateById,
    emptyPlan: emptyPlan,
    loadTodayPlan: loadTodayPlan,
    saveTodayPlan: saveTodayPlan,
    generatePlan: generatePlan,
    ensurePlanForState: ensurePlanForState,
    rerollPlan: rerollPlan,
    markCompleted: markCompleted,
    isCompleted: isCompleted,
    progressStats: progressStats,
    snapshotActivity: snapshotActivity
  };
})(window);
