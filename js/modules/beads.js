/* 今日宜 · 拼豆
 * Canvas 渲染 · 点涂练习 · 配色统计 · PNG 导出 · 完成打卡
 */
(function (root) {
  "use strict";
  var TY = root.TodayYi;
  if (!TY || !TY.utils) return;
  var u = TY.utils;
  var $ = u.$;
  var $all = u.$all;

  var WORKS_KEY = (TY.storage && TY.storage.KEYS && TY.storage.KEYS.beadWorks) || "todayyi_bead_works_v1";

  var state = {
    currentId: null,
    showGrid: true,
    cellPx: 0,
    /** 练习层：可点涂修改的二维数组 */
    work: null,
    /** patternId -> work grid，跨标签/切换保留 */
    worksByPattern: loadWorksMap(),
    /** 当前画笔色号；0 = 橡皮 */
    brush: 1,
    /** practice: 点涂；guide: 只看图纸（不影响 work） */
    mode: "practice",
    sizeFilter: "all",
    painting: false
  };

  function loadWorksMap() {
    try {
      if (TY.storage) {
        var raw = TY.storage.get(WORKS_KEY, {});
        return raw && typeof raw === "object" ? raw : {};
      }
    } catch (e) {}
    return {};
  }
  function persistWorks() {
    try {
      if (TY.storage) TY.storage.set(WORKS_KEY, state.worksByPattern || {});
    } catch (e) {}
  }
  function saveCurrentWork() {
    if (state.currentId && state.work) {
      state.worksByPattern[state.currentId] = cloneGrid(state.work);
      persistWorks();
    }
  }

  function patterns() {
    return root.TODAYYI_BEAD_PATTERNS || [];
  }

  function byId(id) {
    var list = patterns();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function cloneGrid(grid) {
    if (!grid) return null;
    return grid.map(function (row) {
      return row.slice();
    });
  }

  function countBeads(pattern) {
    var counts = {};
    var total = 0;
    if (!pattern) return { total: 0, counts: counts };
    for (var r = 0; r < pattern.length; r++) {
      for (var c = 0; c < pattern[r].length; c++) {
        var v = pattern[r][c];
        if (v && v !== 0) {
          total++;
          counts[v] = (counts[v] || 0) + 1;
        }
      }
    }
    return { total: total, counts: counts };
  }

  function progressVsGuide(guide, work) {
    if (!guide || !work) {
      return { placed: 0, correct: 0, target: 0, missing: 0, wrong: 0, ratio: 0 };
    }
    var placed = 0;
    var correct = 0;
    var target = 0;
    var missing = 0;
    var wrong = 0;
    for (var r = 0; r < guide.length; r++) {
      for (var c = 0; c < guide[r].length; c++) {
        var g = guide[r][c] || 0;
        var w = work[r] ? work[r][c] || 0 : 0;
        if (g) target++;
        if (w) placed++;
        if (g && w === g) correct++;
        else if (g && !w) missing++;
        else if (w && w !== g) wrong++; // 颜色错或空位多放
      }
    }
    // 多放/错放会拉低还原度：correct / max(target, placed)
    var denom = Math.max(target, placed, 1);
    return {
      placed: placed,
      correct: correct,
      target: target,
      missing: missing,
      wrong: wrong,
      ratio: correct / denom
    };
  }

  function paletteColor(pat, code) {
    if (code === 0 || code == null) return null;
    if (pat.palette && pat.palette[code] != null) return pat.palette[code];
    var def = root.TODAYYI_BEAD_PALETTE_DEFAULT || {};
    return def[code] || "#CCCCCC";
  }

  function codesInPattern(pat) {
    var st = countBeads(pat.pattern);
    return Object.keys(st.counts)
      .map(Number)
      .sort(function (a, b) { return a - b; });
  }

  function computeCellPx(gridSize, maxCssPx) {
    var n = gridSize || 8;
    var max = maxCssPx || 360;
    var cell = Math.floor(max / n);
    return Math.max(10, Math.min(28, cell));
  }

  function boardMaxWidth() {
    var wrap = $("#beadCanvasWrap");
    if (!wrap) return Math.min(360, (window.innerWidth || 400) - 48);
    var w = wrap.clientWidth || wrap.offsetWidth || 320;
    return Math.max(200, Math.min(420, w - 4));
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawCell(ctx, x, y, cell, col, ghost) {
    var pad = 1;
    if (col) {
      ctx.beginPath();
      var inset = Math.max(1, Math.floor(cell * 0.08));
      var rr = Math.max(2, cell * 0.22);
      roundRect(ctx, x + inset, y + inset, cell - inset * 2, cell - inset * 2, rr);
      ctx.fillStyle = col;
      if (ghost) ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (!ghost) {
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.ellipse(
          x + cell * 0.38,
          y + cell * 0.35,
          cell * 0.18,
          cell * 0.12,
          -0.4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else {
      ctx.fillStyle = ghost ? "transparent" : "rgba(255,255,255,0.55)";
      if (!ghost) ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
    }
  }

  /** 绘制：练习模式 = 底图浅影 + 练习层；图纸模式 = 仅图纸 */
  function drawBoard(pat) {
    var canvas = $("#beadCanvas");
    if (!canvas || !pat || !pat.pattern) return;
    var n = pat.gridSize || pat.pattern.length;
    var maxW = boardMaxWidth();
    var cell = computeCellPx(n, maxW);
    state.cellPx = cell;
    var size = n * cell;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#F5EBD9";
    ctx.fillRect(0, 0, size, size);

    var guide = pat.pattern;
    var work = state.work || guide;
    var practice = state.mode === "practice";

    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var x = c * cell;
        var y = r * cell;
        var gCode = guide[r] ? guide[r][c] : 0;
        var wCode = work[r] ? work[r][c] : 0;

        if (practice) {
          // 底图提示（未放置处显示浅影）
          if (gCode && !wCode) {
            drawCell(ctx, x, y, cell, paletteColor(pat, gCode), true);
          }
          if (wCode) {
            drawCell(ctx, x, y, cell, paletteColor(pat, wCode), false);
            // 与图纸不符：红框提示
            if (gCode && wCode !== gCode) {
              ctx.strokeStyle = "rgba(232,85,64,0.85)";
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
            } else if (gCode && wCode === gCode) {
              // 正确：细绿点
              ctx.fillStyle = "rgba(111,160,92,0.9)";
              ctx.beginPath();
              ctx.arc(x + cell - 4, y + 4, 2.2, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (!gCode) {
            drawCell(ctx, x, y, cell, null, false);
          }
        } else {
          drawCell(ctx, x, y, cell, paletteColor(pat, gCode), false);
        }

        if (state.showGrid) {
          ctx.strokeStyle = "rgba(110,75,58,0.18)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        }
      }
    }
  }

  function renderPalette(pat) {
    var box = $("#beadPalette");
    if (!box || !pat) return;
    var codes = codesInPattern(pat);
    var html =
      '<button type="button" class="bead-brush' +
      (state.brush === 0 ? " is-active" : "") +
      '" data-brush="0" title="橡皮">橡皮</button>';
    codes.forEach(function (code) {
      var hex = paletteColor(pat, code) || "#ccc";
      html +=
        '<button type="button" class="bead-brush' +
        (state.brush === code ? " is-active" : "") +
        '" data-brush="' +
        code +
        '" style="--sw:' +
        hex +
        '" title="色号 ' +
        code +
        '">' +
        '<span class="bead-brush-dot" style="background:' +
        hex +
        '"></span>' +
        code +
        "</button>";
    });
    box.innerHTML = html;
    try {
      $all("[data-brush]", box).forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.brush = Number(btn.getAttribute("data-brush"));
          renderPalette(pat);
          var hint = $("#beadBrushHint");
          if (hint) {
            hint.textContent =
              state.brush === 0
                ? "画笔：橡皮（点格子清除）"
                : "画笔：色号 " + state.brush;
          }
        });
      });
    } catch (e) {}
  }

  function renderStats(pat) {
    var box = $("#beadStats");
    if (!box || !pat) return;
    var guideSt = countBeads(pat.pattern);
    var workSt = countBeads(state.work || pat.pattern);
    var prog = progressVsGuide(pat.pattern, state.work || pat.pattern);
    var colors = Object.keys(guideSt.counts).sort(function (a, b) {
      return Number(a) - Number(b);
    });
    var rows = colors
      .map(function (code) {
        var hex = paletteColor(pat, Number(code)) || "#ccc";
        var need = guideSt.counts[code] || 0;
        var have = workSt.counts[code] || 0;
        return (
          '<div class="bead-swatch-row">' +
          '<span class="bead-swatch" style="background:' +
          hex +
          '"></span>' +
          "<span>色号 " +
          code +
          " · 需 " +
          need +
          " · 已摆 " +
          have +
          "</span>" +
          '<code class="bead-hex">' +
          hex +
          "</code>" +
          "</div>"
        );
      })
      .join("");

    var pct = Math.round(prog.ratio * 100);
    box.innerHTML =
      '<div class="bead-stat-summary">' +
      "<div><b>" +
      pat.gridSize +
      "×" +
      pat.gridSize +
      "</b> 网格</div>" +
      "<div>图纸 <b>" +
      guideSt.total +
      "</b> 颗</div>" +
      "<div>正确 <b>" +
      prog.correct +
      "</b> · 漏 " +
      prog.missing +
      " · 错 " +
      prog.wrong +
      "</div>" +
      "<div>还原 <b>" +
      pct +
      "%</b></div>" +
      "</div>" +
      '<div class="bead-progress-bar" aria-hidden="true"><div class="bead-progress-fill" style="width:' +
      pct +
      '%"></div></div>' +
      '<div class="bead-swatches">' +
      (rows || "<p class='hint'>空图案</p>") +
      "</div>";
  }

  function renderList() {
    var host = $("#beadList");
    if (!host) return;
    var list = patterns();
    var filter = state.sizeFilter || "all";
    var shown = list.filter(function (p) {
      if (filter === "8") return p.gridSize === 8;
      if (filter === "16") return p.gridSize === 16;
      return true;
    });
    host.innerHTML =
      shown
        .map(function (p) {
          var on = p.id === state.currentId;
          return (
            '<button type="button" class="bead-thumb' +
            (on ? " is-active" : "") +
            '" data-bead-id="' +
            p.id +
            '" aria-pressed="' +
            (on ? "true" : "false") +
            '">' +
            '<span class="bead-thumb-title">' +
            u.escapeHtml(p.title) +
            "</span>" +
            '<span class="bead-thumb-meta">' +
            p.gridSize +
            "×" +
            p.gridSize +
            " · " +
            (p.estimatedBeads || countBeads(p.pattern).total) +
            " 豆 · " +
            (p.colorCount || Object.keys(countBeads(p.pattern).counts).length) +
            " 色</span>" +
            "</button>"
          );
        })
        .join("") || '<p class="hint">没有图案</p>';

    try {
      $all("[data-bead-id]", host).forEach(function (btn) {
        if (btn && btn.addEventListener) {
          btn.addEventListener("click", function () {
            selectPattern(btn.getAttribute("data-bead-id"));
          });
        }
      });
    } catch (eBind) {}
  }

  function isDoneToday(id) {
    if (TY.history && TY.history.isCompletedToday) return TY.history.isCompletedToday(id);
    return (TY.storage.getActivityHistory() || []).some(function (h) {
      return h && h.date === u.todayKey() && h.activityId === id && h.status === "completed";
    });
  }

  function renderDetail(pat) {
    var title = $("#beadTitle");
    var desc = $("#beadDesc");
    if (title) title.textContent = pat ? pat.title : "选择图案";
    if (desc) {
      desc.textContent = pat
        ? (pat.description || "") +
          " · 练习模式可点格子摆豆；底图浅影是图纸提示"
        : "从下方列表点选一张原创图案开始。";
    }
    var doneBtn = $("#btnBeadDone");
    if (doneBtn) {
      var done = pat && isDoneToday(pat.id);
      doneBtn.disabled = !pat || done;
      doneBtn.textContent = done ? "今日已完成" : "摆完了 · 打卡";
      if (doneBtn.classList) {
        doneBtn.classList.toggle("btn-checked", !!done);
        doneBtn.classList.toggle("btn-eaten", !done);
      }
    }
    var favBtn = $("#btnBeadFav");
    if (favBtn && pat && TY.history) {
      favBtn.textContent = TY.history.isFavorite(pat.id) ? "已收藏" : "收藏";
    }
    var modeBtns = $all("[data-bead-mode]");
    modeBtns.forEach(function (b) {
      var on = b.getAttribute("data-bead-mode") === state.mode;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function emptyLike(grid) {
    return grid.map(function (row) {
      return row.map(function () {
        return 0;
      });
    });
  }

  /**
   * 选择图案：保留/恢复 worksByPattern，不因模式切换改写作品
   * opts.forceNewEmpty: 强制空板（仅「清空练习」）
   */
  function selectPattern(id, opts) {
    opts = opts || {};
    var pat = byId(id);
    if (!pat) return;
    // 先保存当前作品
    saveCurrentWork();
    state.currentId = id;
    if (opts.forceNewEmpty) {
      state.work = emptyLike(pat.pattern);
      state.worksByPattern[id] = cloneGrid(state.work);
      persistWorks();
    } else if (state.worksByPattern[id]) {
      state.work = cloneGrid(state.worksByPattern[id]);
    } else {
      // 首次进入：空练习板（与图纸分离）
      state.work = emptyLike(pat.pattern);
      state.worksByPattern[id] = cloneGrid(state.work);
      persistWorks();
    }
    var codes = codesInPattern(pat);
    if (codes.indexOf(state.brush) === -1 && state.brush !== 0) {
      state.brush = codes[0] || 1;
    }
    renderList();
    renderDetail(pat);
    renderPalette(pat);
    renderStats(pat);
    drawBoard(pat);
    var hint = $("#beadBrushHint");
    if (hint) {
      hint.textContent =
        state.mode === "guide"
          ? "图纸模式：只读预览（不改你的练习板）"
          : "画笔：色号 " + state.brush + " · 按住可拖动画";
    }
  }

  function resetWork() {
    var pat = byId(state.currentId);
    if (!pat) return;
    state.work = emptyLike(pat.pattern);
    state.worksByPattern[state.currentId] = cloneGrid(state.work);
    persistWorks();
    renderStats(pat);
    drawBoard(pat);
    u.toast("已清空练习板");
  }

  function fillFromGuide() {
    var pat = byId(state.currentId);
    if (!pat) return;
    state.work = cloneGrid(pat.pattern);
    state.worksByPattern[state.currentId] = cloneGrid(state.work);
    persistWorks();
    renderStats(pat);
    drawBoard(pat);
    u.toast("已填满图纸（对照用）");
  }

  function cellFromEvent(ev, canvas, n, cell) {
    var rect = canvas.getBoundingClientRect();
    var clientX = ev.clientX;
    var clientY = ev.clientY;
    if (ev.touches && ev.touches[0]) {
      clientX = ev.touches[0].clientX;
      clientY = ev.touches[0].clientY;
    } else if (ev.changedTouches && ev.changedTouches[0]) {
      clientX = ev.changedTouches[0].clientX;
      clientY = ev.changedTouches[0].clientY;
    }
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    // 考虑 canvas CSS 缩放
    var scaleX = rect.width / (n * cell);
    var scaleY = rect.height / (n * cell);
    var c = Math.floor(x / (cell * scaleX));
    var r = Math.floor(y / (cell * scaleY));
    if (r < 0 || c < 0 || r >= n || c >= n) return null;
    return { r: r, c: c };
  }

  function paintAt(r, c) {
    if (state.mode !== "practice" || !state.work) return;
    if (!state.work[r]) return;
    state.work[r][c] = state.brush;
    saveCurrentWork();
    var pat = byId(state.currentId);
    if (pat) {
      drawBoard(pat);
      renderStats(pat);
    }
  }

  function bindCanvasPaint() {
    var canvas = $("#beadCanvas");
    if (!canvas || typeof canvas.addEventListener !== "function") return;

    function down(ev) {
      if (state.mode !== "practice") return;
      var pat = byId(state.currentId);
      if (!pat) return;
      ev.preventDefault();
      state.painting = true;
      var n = pat.gridSize || pat.pattern.length;
      var pos = cellFromEvent(ev, canvas, n, state.cellPx || 16);
      if (pos) paintAt(pos.r, pos.c);
    }
    function move(ev) {
      if (!state.painting || state.mode !== "practice") return;
      var pat = byId(state.currentId);
      if (!pat) return;
      ev.preventDefault();
      var n = pat.gridSize || pat.pattern.length;
      var pos = cellFromEvent(ev, canvas, n, state.cellPx || 16);
      if (pos) paintAt(pos.r, pos.c);
    }
    function up() {
      state.painting = false;
    }

    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", down, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", up);
    canvas.addEventListener("touchcancel", up);
  }

  function exportPng() {
    var canvas = $("#beadCanvas");
    var pat = byId(state.currentId);
    if (!canvas || !pat) {
      u.toast("请先选择图案");
      return;
    }
    try {
      var name = (pat.title || pat.id).replace(/[\\/:*?"<>|]/g, "_");
      var a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "bead-" + name + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      u.toast("已导出 PNG");
    } catch (e) {
      u.toast("导出失败，请换浏览器试试");
    }
  }

  function completeCurrent() {
    var pat = byId(state.currentId);
    if (!pat) return;
    if (isDoneToday(pat.id)) {
      u.toast("今天已经打过卡啦");
      renderDetail(pat);
      return;
    }
    var prog = progressVsGuide(pat.pattern, state.work || pat.pattern);
    var title = pat.title + (prog.ratio >= 0.95 ? " · 高还原" : "");
    if (TY.dailyPlan && TY.dailyPlan.markCompleted) {
      TY.dailyPlan.markCompleted(pat.id, {
        category: "beads",
        title: title,
        duration: pat.duration,
        sourcePage: "create"
      });
    } else {
      TY.storage.recordActivityCompletion({
        activityId: pat.id,
        category: "beads",
        title: title,
        duration: pat.duration,
        sourcePage: "create"
      });
    }
    saveCurrentWork();
    var msg =
      prog.ratio >= 0.95
        ? "还原度 " + Math.round(prog.ratio * 100) + "%，漂亮！"
        : "已打卡 · 当前还原 " + Math.round(prog.ratio * 100) + "%";
    u.toast(msg);
    renderDetail(pat);
  }

  function favCurrent() {
    var pat = byId(state.currentId);
    if (!pat || !TY.history) return;
    var r = TY.history.toggleFavorite({
      activityId: pat.id,
      category: "beads",
      title: pat.title,
      description: pat.description
    });
    u.toast(r.added ? "已收藏" : "已取消收藏");
    renderDetail(pat);
  }

  function redraw() {
    var pat = byId(state.currentId);
    if (pat) drawBoard(pat);
  }

  function on(el, ev, fn) {
    if (el && typeof el.addEventListener === "function") el.addEventListener(ev, fn);
  }

  function init() {
    var list = patterns();
    if (!list.length) return;

    $all("[data-bead-size]").forEach(function (btn) {
      on(btn, "click", function () {
        state.sizeFilter = btn.getAttribute("data-bead-size");
        $all("[data-bead-size]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        renderList();
      });
    });

    $all("[data-bead-mode]").forEach(function (btn) {
      on(btn, "click", function () {
        // 模式只影响渲染，不改写 worksByPattern / work
        state.mode = btn.getAttribute("data-bead-mode") || "practice";
        var pat = byId(state.currentId);
        if (pat && !state.work) {
          state.work = state.worksByPattern[state.currentId]
            ? cloneGrid(state.worksByPattern[state.currentId])
            : emptyLike(pat.pattern);
        }
        renderDetail(pat);
        if (pat) {
          drawBoard(pat);
          renderStats(pat);
        }
        var hint = $("#beadBrushHint");
        if (hint) {
          hint.textContent =
            state.mode === "guide"
              ? "图纸模式：只读预览（不改你的练习板）"
              : "练习模式：选色后点格子摆豆";
        }
      });
    });

    var gridToggle = $("#chkBeadGrid");
    if (gridToggle) {
      gridToggle.checked = state.showGrid;
      on(gridToggle, "change", function () {
        state.showGrid = !!gridToggle.checked;
        redraw();
      });
    }

    on($("#btnBeadExport"), "click", exportPng);
    on($("#btnBeadDone"), "click", completeCurrent);
    on($("#btnBeadFav"), "click", favCurrent);
    on($("#btnBeadReset"), "click", resetWork);
    on($("#btnBeadFill"), "click", fillFromGuide);

    bindCanvasPaint();

    window.addEventListener("resize", function () {
      clearTimeout(redraw._t);
      redraw._t = setTimeout(redraw, 120);
    });

    selectPattern(list[0].id);
  }

  TY.beads = {
    countBeads: countBeads,
    progressVsGuide: progressVsGuide,
    cloneGrid: cloneGrid,
    byId: byId,
    patterns: patterns,
    selectPattern: selectPattern,
    exportPng: exportPng,
    drawBoard: drawBoard,
    getState: function () {
      return state;
    }
  };

  function boot() {
    if (!$("#beadCanvas") && !$("#beadList")) return;
    init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
