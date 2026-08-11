/* 今日宜 · 首页模块 */
(function (root) {
  "use strict";
  var TY = root.TodayYi;
  if (!TY || !TY.utils || !TY.dailyPlan) {
    console.error("TodayYi core not loaded");
    return;
  }
  var u = TY.utils;
  var $ = u.$;
  var $all = u.$all;

  var CAT_META = {
    draw: { label: "宜画画", emoji: "🎨", href: "create.html" },
    study: { label: "宜学习", emoji: "📚", href: "study.html" },
    leisure: { label: "宜娱乐", emoji: "🎈", href: "relax.html" },
    beads: { label: "宜拼豆", emoji: "🧩", href: "create.html" },
    eat: { label: "宜吃饭", emoji: "🍱", href: "eat.html" }
  };

  function catMeta(cat) {
    return CAT_META[cat] || { label: "今日宜", emoji: "✨", href: "index.html" };
  }

  function renderStates(selectedId) {
    var row = $("#stateRow");
    if (!row) return;
    row.innerHTML = TY.dailyPlan.DAY_STATES.map(function (s) {
      var on = s.id === selectedId;
      return (
        '<button type="button" class="state-card" data-state="' + s.id +
        '" aria-pressed="' + (on ? "true" : "false") + '">' +
        '<span class="state-emoji" aria-hidden="true">' + s.emoji + "</span>" +
        '<span class="state-label">' + u.escapeHtml(s.label) + "</span>" +
        "</button>"
      );
    }).join("");
    $all("[data-state]", row).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-state");
        TY.dailyPlan.ensurePlanForState(id);
        refresh();
      });
    });
  }

  function renderProgress() {
    var el = $("#todayProgress");
    if (!el) return;
    var st = TY.dailyPlan.progressStats();
    var parts = [];
    parts.push("今日宜完成 <b>" + st.done + "</b> / " + st.total);
    if (st.eatDone) parts.push("· 吃饭已打卡 ✅");
    else parts.push('· <a href="eat.html">去安排三餐</a>');
    el.innerHTML = parts.join(" ");
    var bar = $("#progressBarFill");
    if (bar) {
      var pct = st.total ? Math.round(st.ratio * 100) : (st.eatDone ? 33 : 0);
      bar.style.width = Math.min(100, pct) + "%";
    }
  }

  function renderSoften(relaxed) {
    var box = $("#homeSoften");
    if (!box) return;
    if (!relaxed || !relaxed.length) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    var labels = relaxed.map(function (k) {
      return TY.recommendation.softLabel ? TY.recommendation.softLabel(k) : k;
    });
    box.hidden = false;
    box.innerHTML = "<strong>已为你放宽：</strong>" + u.escapeHtml(labels.join("、")) +
      "；时间/地点/预算等硬条件保持不变。";
  }

  function activityActions(act, role) {
    if (!act) return "";
    var done = TY.dailyPlan.isCompleted(act.id);
    var fav = TY.history.isFavorite(act.id);
    var meta = catMeta(act.category);
    return (
      '<div class="yi-card-actions">' +
        (done
          ? '<button type="button" class="btn btn-checked btn-sm" disabled>已完成</button>'
          : '<button type="button" class="btn btn-eaten btn-sm btn-complete" data-id="' +
            u.escapeHtml(act.id) + '" data-role="' + role + '">完成</button>') +
        '<button type="button" class="btn btn-secondary btn-sm btn-fav" data-id="' +
          u.escapeHtml(act.id) + '" aria-pressed="' + (fav ? "true" : "false") + '">' +
          (fav ? "已收藏" : "收藏") + "</button>" +
        '<a class="btn btn-ghost btn-sm" href="' + meta.href + '">' + meta.label + "</a>" +
      "</div>"
    );
  }

  function renderMain(plan) {
    var host = $("#mainSign");
    if (!host) return;
    var act = plan.main;
    if (!act) {
      host.innerHTML =
        '<div class="yi-empty">' +
        "<h3>还没有主签</h3>" +
        "<p>选一个「今天的状态」，我帮你抽今日宜做什么。</p>" +
        "</div>";
      return;
    }
    var meta = catMeta(act.category);
    var done = TY.dailyPlan.isCompleted(act.id);
    host.innerHTML =
      '<article class="yi-main-card' + (done ? " is-done" : "") + '">' +
        '<div class="yi-main-top">' +
          '<span class="yi-badge">' + meta.emoji + " " + meta.label + " · 今日主签</span>" +
          (act.duration != null ? '<span class="yi-duration">约 ' + act.duration + " 分钟</span>" : "") +
        "</div>" +
        '<h2 class="yi-title">' + u.escapeHtml(act.title) + "</h2>" +
        '<p class="yi-desc">' + u.escapeHtml(act.description || "") + "</p>" +
        '<div class="yi-first">' +
          "<strong>第一步</strong>" +
          "<span>" + u.escapeHtml(act.firstStep || "开始就好") + "</span>" +
        "</div>" +
        (act.completionText
          ? '<p class="yi-complete-hint">完成标准：' + u.escapeHtml(act.completionText) + "</p>"
          : "") +
        activityActions(act, "main") +
      "</article>";
  }

  function renderSide(plan) {
    var host = $("#sideSigns");
    if (!host) return;
    var list = plan.side || [];
    if (!list.length) {
      host.innerHTML = '<p class="hint">暂时没有顺手建议，试试换一批。</p>';
      return;
    }
    host.innerHTML = list.map(function (act, i) {
      if (!act) return "";
      var meta = catMeta(act.category);
      var done = TY.dailyPlan.isCompleted(act.id);
      return (
        '<article class="yi-side-card' + (done ? " is-done" : "") + '">' +
          '<div class="yi-main-top">' +
            '<span class="yi-badge yi-badge-soft">' + meta.emoji + " 顺手 · " + meta.label + "</span>" +
            (act.duration != null ? '<span class="yi-duration">' + act.duration + " 分</span>" : "") +
          "</div>" +
          '<h3 class="yi-title yi-title-sm">' + u.escapeHtml(act.title) + "</h3>" +
          '<p class="yi-desc">' + u.escapeHtml(act.firstStep || act.description || "") + "</p>" +
          activityActions(act, "side" + i) +
        "</article>"
      );
    }).join("");
  }

  function bindCardActions(rootEl) {
    if (!rootEl) return;
    $all(".btn-complete", rootEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        TY.dailyPlan.markCompleted(id, { sourcePage: "home" });
        u.toast("记下啦，做得好");
        refresh();
      });
    });
    $all(".btn-fav", rootEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var plan = TY.dailyPlan.loadTodayPlan();
        var act = null;
        if (plan.main && plan.main.id === id) act = plan.main;
        (plan.side || []).forEach(function (s) { if (s && s.id === id) act = s; });
        if (!act) return;
        var res = TY.history.toggleFavorite({
          activityId: act.id,
          category: act.category,
          title: act.title,
          description: act.description
        });
        u.toast(res.added ? "已收藏" : "已取消收藏");
        refresh();
      });
    });
  }

  function renderQuickLinks() {
    var host = $("#moduleLinks");
    if (!host) return;
    host.innerHTML = [
      { href: "eat.html", emoji: "🍱", t: "宜吃饭", d: "三餐与热量" },
      { href: "create.html", emoji: "🎨", t: "宜创作", d: "画画 / 拼豆" },
      { href: "study.html", emoji: "📚", t: "宜学习", d: "任务与专注" },
      { href: "relax.html", emoji: "🎈", t: "宜娱乐", d: "轻松小活动" },
      { href: "profile.html", emoji: "📒", t: "我的", d: "历史与收藏" }
    ].map(function (x) {
      return (
        '<a class="mod-link" href="' + x.href + '">' +
          '<span class="mod-emoji">' + x.emoji + "</span>" +
          '<span class="mod-text"><strong>' + x.t + "</strong><span>" + x.d + "</span></span>" +
        "</a>"
      );
    }).join("");
  }

  function refresh() {
    var plan = TY.dailyPlan.loadTodayPlan();
    // 无状态时默认选第一个并生成（稳定种子）
    if (!plan.stateId || !plan.main) {
      var defaultId = plan.stateId || "low_home";
      plan = TY.dailyPlan.ensurePlanForState(defaultId);
    }
    renderStates(plan.stateId);
    renderMain(plan);
    renderSide(plan);
    renderSoften(plan.relaxed);
    renderProgress();
    renderQuickLinks();

    var dateEl = $("#homeDate");
    if (dateEl) dateEl.textContent = u.formatChineseDate(new Date());

    var stateHint = $("#stateHint");
    if (stateHint && plan.state) {
      stateHint.textContent = plan.state.emoji + " " + plan.state.label +
        " · 刷新页面主签保持不变，点「换一批」才会换";
    }

    bindCardActions($("#mainSign"));
    bindCardActions($("#sideSigns"));
  }

  function bindChrome() {
    var reroll = $("#btnRerollPlan");
    if (reroll) {
      reroll.addEventListener("click", function () {
        TY.dailyPlan.rerollPlan();
        u.toast("换好一批新的建议");
        refresh();
      });
    }
    // 跨标签页：eat 打卡后刷新进度
    window.addEventListener("storage", function (e) {
      if (!e) return;
      var k = e.key || "";
      if (
        k.indexOf("todayyi_") === 0 ||
        k.indexOf("fanfan_") === 0
      ) {
        refresh();
      }
    });
    // 同页返回：pageshow
    window.addEventListener("pageshow", function () { refresh(); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") refresh();
    });
  }

  function init() {
    if (TY.mergeActivityPool) TY.mergeActivityPool();
    if (TY.navigation) TY.navigation.renderNav("#appNav");
    bindChrome();
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  TY.home = { refresh: refresh, init: init };
})(window);
