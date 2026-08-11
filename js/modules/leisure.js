/* 今日宜 · 宜娱乐 */
(function (root) {
  "use strict";
  var TY = root.TodayYi;
  if (!TY || !TY.utils) return;
  var u = TY.utils;
  var $ = u.$;
  var $all = u.$all;

  var state = {
    place: "any",
    energy: "any",
    durationMax: null,
    seed: 0
  };

  function pool() {
    if (TY.mergeActivityPool) TY.mergeActivityPool();
    return (TY.activityPool || []).filter(function (a) { return a.category === "leisure"; });
  }

  function completeAct(act) {
    if (!act) return;
    TY.storage.recordActivityCompletion({
      activityId: act.id,
      category: "leisure",
      title: act.title,
      duration: act.duration,
      sourcePage: "relax"
    });
    if (TY.dailyPlan) {
      try {
        var plan = TY.dailyPlan.loadTodayPlan();
        if (plan.completedIds.indexOf(act.id) === -1) {
          plan.completedIds.push(act.id);
          TY.dailyPlan.saveTodayPlan(plan);
        }
      } catch (e) {}
    }
    u.toast("轻松一下，已记下");
    render();
  }

  function recommendOne(extraSeed) {
    var opts = {
      pool: pool(),
      categories: ["leisure"],
      seed: u.hashStr(u.todayKey() + "|leisure|" + state.seed + "|" + (extraSeed || 0)),
      durationMax: state.durationMax,
      energy: state.energy === "any" ? null : state.energy,
      place: state.place === "any" ? null : state.place,
      moods: ["relax"],
      exploreMode: "balanced"
    };
    return TY.recommendation.recommendActivities(opts);
  }

  function recommendBundle() {
    var exclude = {};
    var items = [];
    var relaxed = [];
    for (var i = 0; i < 5; i++) {
      var r = recommendOne(i);
      if (r.item && !exclude[r.item.id]) {
        items.push(r.item);
        exclude[r.item.id] = true;
      }
      if (r.relaxed) relaxed = relaxed.concat(r.relaxed);
    }
    return { items: items, relaxed: relaxed };
  }

  function cardHtml(act, featured) {
    var done = (TY.storage.getActivityHistory() || []).some(function (h) {
      return h.date === u.todayKey() && h.activityId === act.id;
    });
    var fav = TY.history.isFavorite(act.id);
    return (
      '<article class="act-card' + (featured ? " is-featured" : "") + '">' +
        '<div class="act-top">' +
          '<span class="act-badge">🎈 娱乐</span>' +
          '<span class="act-meta">约 ' + act.duration + " 分钟" +
          (act.places ? " · " + act.places.join("/") : "") +
          "</span>" +
        "</div>" +
        "<h3>" + u.escapeHtml(act.title) + "</h3>" +
        '<p class="act-desc">' + u.escapeHtml(act.description || "") + "</p>" +
        '<div class="act-first"><strong>第一步</strong>' + u.escapeHtml(act.firstStep || "") + "</div>" +
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

  function bind(root) {
    $all(".btn-done", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = pool().filter(function (a) { return a.id === btn.getAttribute("data-id"); })[0];
        completeAct(act);
      });
    });
    $all(".btn-fav", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = pool().filter(function (a) { return a.id === btn.getAttribute("data-id"); })[0];
        if (!act) return;
        var r = TY.history.toggleFavorite({
          activityId: act.id,
          category: "leisure",
          title: act.title,
          description: act.description
        });
        u.toast(r.added ? "已收藏" : "已取消收藏");
        render();
      });
    });
  }

  function render() {
    var pack = recommendBundle();
    var host = $("#leisureList");
    var count = $("#leisureCount");
    if (count) count.textContent = "素材 " + pool().length + " 条 · 本次 " + pack.items.length + " 条";
    var soften = $("#leisureSoften");
    if (soften) {
      var uniq = [];
      var seen = {};
      (pack.relaxed || []).forEach(function (k) {
        if (!seen[k]) { seen[k] = true; uniq.push(k); }
      });
      if (uniq.length) {
        soften.hidden = false;
        soften.innerHTML = "<strong>已放宽：</strong>" + uniq.map(function (k) {
          return TY.recommendation.softLabel(k);
        }).join("、");
      } else soften.hidden = true;
    }
    if (host) {
      host.innerHTML = pack.items.map(function (a, i) {
        return cardHtml(a, i === 0);
      }).join("") || '<p class="hint">没有匹配的轻松活动，试试放宽地点或时长。</p>';
      bind(host);
    }
  }

  function init() {
    if (TY.navigation) TY.navigation.renderNav("#appNav");
    if (TY.mergeActivityPool) TY.mergeActivityPool();

    function pressGroup(sel, attr, key, cast) {
      $all(sel).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var v = btn.getAttribute(attr);
          state[key] = cast ? cast(v) : v;
          $all(sel).forEach(function (b) {
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          render();
        });
      });
    }
    pressGroup("[data-lei-place]", "data-lei-place", "place");
    pressGroup("[data-lei-energy]", "data-lei-energy", "energy");
    pressGroup("[data-lei-dur]", "data-lei-dur", "durationMax", function (v) {
      return v === "any" ? null : Number(v);
    });

    var reroll = $("#btnLeisureReroll");
    if (reroll) reroll.addEventListener("click", function () {
      state.seed++;
      render();
      u.toast("换一批轻松活动");
    });

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
