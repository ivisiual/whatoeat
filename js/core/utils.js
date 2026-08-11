/* 今日宜 · utils */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};

  function $(sel, r) { return (r || document).querySelector(sel); }
  function $all(sel, r) { return Array.prototype.slice.call((r || document).querySelectorAll(sel)); }

  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < String(str).length; i++) {
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function todayKey(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }
  function formatChineseDate(d) {
    var week = ["日", "一", "二", "三", "四", "五", "六"];
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 周" + week[d.getDay()];
  }
  function formatRelativeTime(ts) {
    var d = new Date(ts);
    var now = new Date();
    var hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var dayDiff = Math.round((startToday - startThat) / 86400000);
    if (dayDiff === 0) return "今天 " + hm;
    if (dayDiff === 1) return "昨天 " + hm;
    if (dayDiff < 7) return dayDiff + " 天前 " + hm;
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + hm;
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function toast(msg) {
    var el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      var host = document.querySelector(".toast-host");
      if (!host) {
        host = document.createElement("div");
        host.className = "toast-host";
        host.setAttribute("aria-live", "assertive");
        document.body.appendChild(host);
      }
      host.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("is-on"); }, 2400);
  }
  function safeJsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function uid(prefix) {
    return (prefix || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  TY.utils = {
    $, $all, hashStr, mulberry32, todayKey, formatChineseDate, formatRelativeTime,
    escapeHtml, toast, safeJsonParse, uid, clone
  };
})(window);
