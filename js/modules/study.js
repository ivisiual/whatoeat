/* 今日宜 · 宜学习：任务池 + 计时器 + 专注记录 */
(function (root) {
  "use strict";
  var TY = root.TodayYi;
  if (!TY || !TY.utils || !TY.storage) return;
  var u = TY.utils;
  var $ = u.$;
  var $all = u.$all;
  var KEY_TASKS = TY.storage.KEYS.studyTasks;
  var KEY_FOCUS = TY.storage.KEYS.focusLogs;

  var timer = {
    totalSec: 25 * 60,
    leftSec: 25 * 60,
    running: false,
    tickId: null,
    taskId: null,
    taskTitle: "",
    startedAt: null
  };

  function loadTasks() {
    var list = TY.storage.get(KEY_TASKS, []);
    return Array.isArray(list) ? list : [];
  }
  function saveTasks(list) {
    TY.storage.set(KEY_TASKS, list.slice(-100));
  }
  function loadFocus() {
    var list = TY.storage.get(KEY_FOCUS, []);
    return Array.isArray(list) ? list : [];
  }
  function saveFocus(list) {
    var cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    list = list.filter(function (x) { return x && x.ts && x.ts >= cutoff; }).slice(-200);
    TY.storage.set(KEY_FOCUS, list);
  }

  function studyPool() {
    if (TY.mergeActivityPool) TY.mergeActivityPool();
    return (TY.activityPool || []).filter(function (a) { return a.category === "study"; });
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function updateTimerUI() {
    var el = $("#timerDisplay");
    if (el) el.textContent = formatTime(timer.leftSec);
    var lab = $("#timerTaskLabel");
    if (lab) {
      lab.innerHTML = timer.taskTitle
        ? "当前任务：<strong>" + u.escapeHtml(timer.taskTitle) + "</strong>"
        : "未绑定任务 · 也可纯计时";
    }
    var startBtn = $("#btnTimerStart");
    var pauseBtn = $("#btnTimerPause");
    if (startBtn) startBtn.hidden = timer.running;
    if (pauseBtn) pauseBtn.hidden = !timer.running;
  }

  function stopTick() {
    if (timer.tickId) {
      clearInterval(timer.tickId);
      timer.tickId = null;
    }
    timer.running = false;
  }

  function onTimerComplete() {
    stopTick();
    timer.leftSec = 0;
    updateTimerUI();
    var mins = Math.round(timer.totalSec / 60);
    var logs = loadFocus();
    logs.push({
      id: u.uid("focus_"),
      ts: Date.now(),
      date: u.todayKey(),
      minutes: mins,
      taskId: timer.taskId,
      title: timer.taskTitle || "自由专注",
      plannedSec: timer.totalSec,
      completed: true
    });
    saveFocus(logs);

    TY.storage.recordActivityCompletion({
      activityId: timer.taskId || ("focus-" + mins + "m-" + u.todayKey()),
      category: "study",
      title: (timer.taskTitle || "专注") + " · " + mins + " 分钟",
      duration: mins,
      sourcePage: "study"
    });

    if (timer.taskId) {
      var tasks = loadTasks();
      tasks.forEach(function (t) {
        if (t.id === timer.taskId) t.done = true;
      });
      saveTasks(tasks);
    }

    u.toast("专注结束，已记入今日");
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(80); } catch (e) {}
    }
    renderTasks();
    renderFocus();
    renderActions();
  }

  function startTimer() {
    if (timer.leftSec <= 0) timer.leftSec = timer.totalSec;
    if (timer.running) return;
    timer.running = true;
    timer.startedAt = Date.now();
    updateTimerUI();
    timer.tickId = setInterval(function () {
      timer.leftSec -= 1;
      if (timer.leftSec <= 0) {
        onTimerComplete();
        return;
      }
      updateTimerUI();
    }, 1000);
  }

  function pauseTimer() {
    stopTick();
    updateTimerUI();
  }

  function resetTimer() {
    stopTick();
    timer.leftSec = timer.totalSec;
    updateTimerUI();
  }

  function setPreset(min) {
    stopTick();
    timer.totalSec = min * 60;
    timer.leftSec = timer.totalSec;
    $all("[data-timer-min]").forEach(function (b) {
      b.setAttribute("aria-pressed", Number(b.getAttribute("data-timer-min")) === min ? "true" : "false");
    });
    updateTimerUI();
  }

  function bindTaskToTimer(task) {
    if (!task) return;
    // 换绑任务时必须先停表，避免进行中的计时改记到新任务
    stopTick();
    timer.taskId = task.id;
    timer.taskTitle = task.title;
    var mins = Number(task.minutes);
    if (!isFinite(mins) || mins < 1) mins = 25;
    if (mins > 180) mins = 180;
    mins = Math.round(mins);
    timer.totalSec = mins * 60;
    timer.leftSec = timer.totalSec;
    // 预设芯片仅高亮标准档；自定义时长全部取消选中
    $all("[data-timer-min]").forEach(function (b) {
      var m = Number(b.getAttribute("data-timer-min"));
      b.setAttribute("aria-pressed", m === mins ? "true" : "false");
    });
    updateTimerUI();
    u.toast("已绑定「" + task.title + "」· " + mins + " 分钟");
  }

  function renderTasks() {
    var box = $("#taskList");
    if (!box) return;
    var list = loadTasks().slice().reverse();
    if (!list.length) {
      box.innerHTML = '<p class="hint">还没有任务。在上方添加，或从「今日学习动作」一键加入。</p>';
      return;
    }
    box.innerHTML = list.map(function (t) {
      return (
        '<div class="task-item' + (t.done ? " is-done" : "") + '" data-task="' + t.id + '">' +
          '<div class="task-body">' +
            "<strong>" + u.escapeHtml(t.title) + "</strong>" +
            "<span>" + (t.minutes || 25) + " 分钟" +
            (t.note ? " · " + u.escapeHtml(t.note) : "") +
            (t.done ? " · 已完成" : "") +
            "</span>" +
          "</div>" +
          '<div class="task-ops">' +
            (!t.done
              ? '<button type="button" class="btn btn-secondary btn-sm btn-bind" data-id="' + t.id + '">计时</button>' +
                '<button type="button" class="btn btn-eaten btn-sm btn-task-done" data-id="' + t.id + '">完成</button>'
              : "") +
            '<button type="button" class="btn btn-ghost btn-sm btn-task-del" data-id="' + t.id + '">删除</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    $all(".btn-bind", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = loadTasks().filter(function (x) { return x.id === btn.getAttribute("data-id"); })[0];
        if (t) bindTaskToTimer(t);
      });
    });
    $all(".btn-task-done", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var tasks = loadTasks();
        var t = null;
        tasks.forEach(function (x) {
          if (x.id === id) { x.done = true; t = x; }
        });
        saveTasks(tasks);
        if (t) {
          TY.storage.recordActivityCompletion({
            activityId: t.id,
            category: "study",
            title: t.title,
            duration: t.minutes || null,
            sourcePage: "study"
          });
        }
        u.toast("任务完成");
        renderTasks();
      });
    });
    $all(".btn-task-del", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        saveTasks(loadTasks().filter(function (x) { return x.id !== btn.getAttribute("data-id"); }));
        renderTasks();
      });
    });
  }

  function renderFocus() {
    var box = $("#focusLogList");
    if (!box) return;
    var today = u.todayKey();
    var logs = loadFocus().filter(function (x) { return x.date === today; }).reverse();
    var sum = logs.reduce(function (s, x) { return s + (Number(x.minutes) || 0); }, 0);
    var head = $("#focusSummary");
    if (head) head.textContent = "今日专注约 " + sum + " 分钟 · " + logs.length + " 段";
    if (!logs.length) {
      box.innerHTML = "<li>今天还没有专注记录</li>";
      return;
    }
    box.innerHTML = logs.map(function (x) {
      return "<li>" + u.escapeHtml(u.formatRelativeTime(x.ts)) + " · " +
        u.escapeHtml(x.title || "专注") + " · " + x.minutes + " 分钟</li>";
    }).join("");
  }

  function renderActions() {
    var box = $("#studyActions");
    if (!box) return;
    var seed = u.hashStr(u.todayKey() + "|study-actions");
    var res = TY.recommendation.recommendActivities({
      pool: studyPool(),
      categories: ["study"],
      seed: seed,
      durationMax: 45,
      moods: ["focus"],
      energy: "medium"
    });
    // 再抽 4 条不同的
    var exclude = {};
    var items = [];
    if (res.item) {
      items.push(res.item);
      exclude[res.item.id] = true;
    }
    for (var i = 0; i < 4; i++) {
      var r = TY.recommendation.recommendActivities({
        pool: studyPool(),
        categories: ["study"],
        seed: u.hashStr(seed + "#a" + i),
        durationMax: 45,
        excludeIds: exclude
      });
      if (r.item) {
        items.push(r.item);
        exclude[r.item.id] = true;
      }
    }
    box.innerHTML = items.map(function (a) {
      return (
        '<article class="act-card">' +
          '<div class="act-top"><span class="act-badge">📚 学习动作</span>' +
          '<span class="act-meta">约 ' + a.duration + " 分钟</span></div>" +
          "<h3>" + u.escapeHtml(a.title) + "</h3>" +
          '<p class="act-desc">' + u.escapeHtml(a.description || "") + "</p>" +
          '<div class="act-first"><strong>第一步</strong>' + u.escapeHtml(a.firstStep || "") + "</div>" +
          '<div class="act-actions">' +
            '<button type="button" class="btn btn-secondary btn-sm btn-add-action" data-id="' + a.id + '">加入任务池</button>' +
            '<button type="button" class="btn btn-eaten btn-sm btn-start-action" data-id="' + a.id + '">开始计时</button>' +
          "</div></article>"
      );
    }).join("") || '<p class="hint">暂无学习动作</p>';

    function findAct(id) {
      return studyPool().filter(function (x) { return x.id === id; })[0];
    }
    $all(".btn-add-action", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var a = findAct(btn.getAttribute("data-id"));
        if (!a) return;
        var tasks = loadTasks();
        tasks.push({
          id: u.uid("task_"),
          title: a.title,
          minutes: a.duration || 25,
          note: a.firstStep || "",
          done: false,
          fromAction: a.id,
          ts: Date.now()
        });
        saveTasks(tasks);
        u.toast("已加入任务池");
        renderTasks();
      });
    });
    $all(".btn-start-action", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var a = findAct(btn.getAttribute("data-id"));
        if (!a) return;
        var task = {
          id: a.id,
          title: a.title,
          minutes: a.duration || 25
        };
        // 若时长接近预设则用预设
        var m = Number(task.minutes);
        if (m <= 15) setPreset(15);
        else if (m <= 25) setPreset(25);
        else setPreset(45);
        bindTaskToTimer(task);
        startTimer();
      });
    });
  }

  function addTaskFromForm() {
    var title = ($("#taskTitle") && $("#taskTitle").value || "").trim();
    var minutes = Number($("#taskMinutes") && $("#taskMinutes").value) || 25;
    var note = ($("#taskNote") && $("#taskNote").value || "").trim();
    if (!title) { u.toast("请填写任务名称"); return; }
    if (minutes < 1 || minutes > 180) { u.toast("时长请在 1～180 分钟"); return; }
    var tasks = loadTasks();
    tasks.push({
      id: u.uid("task_"),
      title: title,
      minutes: minutes,
      note: note,
      done: false,
      ts: Date.now()
    });
    saveTasks(tasks);
    if ($("#taskTitle")) $("#taskTitle").value = "";
    if ($("#taskNote")) $("#taskNote").value = "";
    u.toast("已添加任务");
    renderTasks();
  }

  function init() {
    if (TY.navigation) TY.navigation.renderNav("#appNav");
    if (TY.mergeActivityPool) TY.mergeActivityPool();

    $all("[data-timer-min]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setPreset(Number(btn.getAttribute("data-timer-min")));
      });
    });
    var start = $("#btnTimerStart");
    var pause = $("#btnTimerPause");
    var reset = $("#btnTimerReset");
    if (start) start.addEventListener("click", startTimer);
    if (pause) pause.addEventListener("click", pauseTimer);
    if (reset) reset.addEventListener("click", resetTimer);
    var addBtn = $("#btnAddTask");
    if (addBtn) addBtn.addEventListener("click", addTaskFromForm);

    setPreset(25);
    renderTasks();
    renderFocus();
    renderActions();
    updateTimerUI();

    window.addEventListener("beforeunload", function () {
      if (timer.running) pauseTimer();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
