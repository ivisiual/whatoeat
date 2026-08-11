/* 今日宜 · 宜画画 */
(function (root) {
  "use strict";
  var TY = root.TodayYi;
  if (!TY || !TY.utils) return;
  var u = TY.utils;
  var $ = u.$;
  var $all = u.$all;

  var state = {
    tab: "draw",
    filter: "all",
    energy: null,
    durationMax: null,
    current: null,
    listSeed: 0
  };

  function pool() {
    if (TY.mergeActivityPool) TY.mergeActivityPool();
    return (TY.activityPool || []).filter(function (a) { return a.category === "draw"; });
  }

  function isDoneToday(id) {
    if (TY.history && TY.history.isCompletedToday) return TY.history.isCompletedToday(id);
    return (TY.storage.getActivityHistory() || []).some(function (h) {
      return h && h.date === u.todayKey() && h.activityId === id && h.status === "completed";
    });
  }

  function completeAct(act) {
    if (!act) return;
    if (TY.dailyPlan && TY.dailyPlan.markCompleted) {
      TY.dailyPlan.markCompleted(act.id, {
        category: "draw",
        title: act.title,
        duration: act.duration,
        sourcePage: "create"
      });
    } else {
      TY.storage.recordActivityCompletion({
        activityId: act.id,
        category: "draw",
        title: act.title,
        duration: act.duration,
        sourcePage: "create"
      });
    }
    u.toast("画画完成记下啦");
    render();
  }

  function favAct(act) {
    var r = TY.history.toggleFavorite({
      activityId: act.id,
      category: act.category,
      title: act.title,
      description: act.description
    });
    u.toast(r.added ? "已收藏" : "已取消收藏");
    render();
  }

  function pickRecommend() {
    var opts = {
      pool: pool(),
      categories: ["draw"],
      seed: u.hashStr(u.todayKey() + "|draw|" + state.listSeed),
      energy: state.energy || null,
      durationMax: state.durationMax,
      moods: ["create", "relax"],
      exploreMode: "balanced"
    };
    var res = TY.recommendation.recommendActivities(opts);
    state.current = res.item;
    return res;
  }

  function filteredList() {
    var list = pool().slice();
    if (state.filter === "short") list = list.filter(function (a) { return a.duration <= 12; });
    if (state.filter === "scene") list = list.filter(function (a) { return (a.tags || []).indexOf("scene") !== -1 || (a.tags || []).indexOf("city") !== -1; });
    if (state.filter === "cute") list = list.filter(function (a) { return (a.tags || []).indexOf("cute") !== -1 || (a.tags || []).indexOf("animal") !== -1; });
    if (state.filter === "food") list = list.filter(function (a) { return (a.tags || []).indexOf("food") !== -1; });
    if (state.durationMax != null) list = list.filter(function (a) { return a.duration <= state.durationMax; });
    // 稳定洗牌展示前 40
    var rng = u.mulberry32(u.hashStr(u.todayKey() + "|drawlist|" + state.filter + "|" + state.listSeed));
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list.slice(0, 40);
  }

  function cardHtml(act, featured) {
    if (!act) return "";
    var done = isDoneToday(act.id);
    var fav = TY.history.isFavorite(act.id);
    return (
      '<article class="act-card' + (featured ? " is-featured" : "") + (done ? " is-done" : "") + '">' +
        '<div class="act-top">' +
          '<span class="act-badge">🎨 画画</span>' +
          '<span class="act-meta">约 ' + act.duration + " 分钟 · 难度 " + (act.difficulty || 1) + "</span>" +
        "</div>" +
        "<h3>" + u.escapeHtml(act.title) + "</h3>" +
        '<p class="act-desc">' + u.escapeHtml(act.description || "") + "</p>" +
        '<div class="act-first"><strong>第一步</strong>' + u.escapeHtml(act.firstStep || "") + "</div>" +
        (act.completionText ? '<p class="hint" style="margin:0 0 0.45rem">完成：' + u.escapeHtml(act.completionText) + "</p>" : "") +
        '<div class="act-actions">' +
          (done
            ? '<button type="button" class="btn btn-checked btn-sm" disabled>今日已完成</button>'
            : '<button type="button" class="btn btn-eaten btn-sm btn-done" data-id="' + act.id + '">完成</button>') +
          '<button type="button" class="btn btn-secondary btn-sm btn-fav" data-id="' + act.id + '">' +
            (fav ? "已收藏" : "收藏") + "</button>" +
        "</div>" +
      "</article>"
    );
  }

  function bindCards(root) {
    $all(".btn-done", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = pool().filter(function (a) { return a.id === btn.getAttribute("data-id"); })[0];
        completeAct(act);
      });
    });
    $all(".btn-fav", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = pool().filter(function (a) { return a.id === btn.getAttribute("data-id"); })[0];
        favAct(act);
      });
    });
  }

  function render() {
    var rec = pickRecommend();
    var feat = $("#drawFeatured");
    if (feat) {
      if (rec.item) feat.innerHTML = cardHtml(rec.item, true);
      else feat.innerHTML = '<p class="hint">当前筛选下没有画画建议，试试放宽条件。</p>';
      bindCards(feat);
    }
    var soften = $("#drawSoften");
    if (soften) {
      if (rec.relaxed && rec.relaxed.length) {
        soften.hidden = false;
        soften.innerHTML = "<strong>已放宽：</strong>" + rec.relaxed.map(function (k) {
          return TY.recommendation.softLabel(k);
        }).join("、");
      } else {
        soften.hidden = true;
      }
    }
    var count = $("#drawCount");
    if (count) count.textContent = "素材库 " + pool().length + " 条 · 展示 " + filteredList().length + " 条";
    var list = $("#drawList");
    if (list) {
      list.innerHTML = filteredList().map(function (a) { return cardHtml(a, false); }).join("");
      bindCards(list);
    }
  }

  function setTab(tab) {
    state.tab = tab;
    var drawPane = $("#paneDraw");
    var beadPane = $("#paneBead");
    if (drawPane) drawPane.hidden = tab !== "draw";
    if (beadPane) beadPane.hidden = tab !== "bead";
    $all("[data-tab]").forEach(function (b) {
      var on = b.getAttribute("data-tab") === tab;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    // 从 hidden 切到拼豆时需重绘；selectPattern 会恢复 worksByPattern，不丢练习
    if (tab === "bead" && TY.beads && TY.beads.selectPattern && TY.beads.patterns) {
      setTimeout(function () {
        var st = TY.beads.getState && TY.beads.getState();
        var list = TY.beads.patterns();
        var id = (st && st.currentId) || null;
        if (!id) {
          var active = document.querySelector(".bead-thumb.is-active");
          if (active) id = active.getAttribute("data-bead-id");
        }
        if (!id && list[0]) id = list[0].id;
        if (id) TY.beads.selectPattern(id);
      }, 30);
    }
  }

  function init() {
    if (TY.navigation) TY.navigation.renderNav("#appNav");
    if (TY.mergeActivityPool) TY.mergeActivityPool();

    $all("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTab(btn.getAttribute("data-tab"));
      });
    });
    $all("[data-draw-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filter = btn.getAttribute("data-draw-filter");
        $all("[data-draw-filter]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        render();
      });
    });
    $all("[data-draw-dur]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-draw-dur");
        state.durationMax = v === "any" ? null : Number(v);
        $all("[data-draw-dur]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        render();
      });
    });
    var reroll = $("#btnDrawReroll");
    if (reroll) reroll.addEventListener("click", function () {
      state.listSeed++;
      render();
      u.toast("换了一条画画灵感");
    });

    setTab("draw");
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
