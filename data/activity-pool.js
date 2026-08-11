/* 今日宜 · 合并活动池（加载各种子后调用） */
(function (root) {
  "use strict";
  function merge() {
    var list = [];
    function add(arr) {
      if (!arr || !arr.length) return;
      for (var i = 0; i < arr.length; i++) list.push(arr[i]);
    }
    add(root.TODAYYI_DRAW_PROMPTS);
    add(root.TODAYYI_STUDY_ACTIONS);
    add(root.TODAYYI_LEISURE_ACTIVITIES);
    add(root.TODAYYI_BEAD_PATTERNS);
    root.TodayYi = root.TodayYi || {};
    root.TodayYi.activityPool = list;
    return list;
  }
  root.TodayYi = root.TodayYi || {};
  root.TodayYi.mergeActivityPool = merge;
  // 若脚本顺序在后，DOMContentLoaded 前也可能已加载完种子
  if (root.TODAYYI_DRAW_PROMPTS) merge();
})(window);
