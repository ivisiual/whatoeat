/* 今日宜 · navigation */
(function (root) {
  "use strict";
  var TY = root.TodayYi = root.TodayYi || {};
  var u = TY.utils;
  if (!u) throw new Error("TodayYi.utils required");

  var LINKS = [
    { id: "home", href: "index.html", label: "今日宜" },
    { id: "eat", href: "eat.html", label: "宜吃饭" },
    { id: "create", href: "create.html", label: "宜创作" },
    { id: "study", href: "study.html", label: "宜学习" },
    { id: "relax", href: "relax.html", label: "宜娱乐" },
    { id: "profile", href: "profile.html", label: "我的" }
  ];

  function currentPageId() {
    var path = (location.pathname || "").replace(/\\/g, "/");
    var file = path.split("/").pop() || "index.html";
    if (!file || file === "") file = "index.html";
    if (file === "index.html") return "home";
    if (file.indexOf("eat") === 0) return "eat";
    if (file.indexOf("create") === 0) return "create";
    if (file.indexOf("study") === 0) return "study";
    if (file.indexOf("relax") === 0) return "relax";
    if (file.indexOf("profile") === 0) return "profile";
    return "home";
  }

  function renderNav(mountSel) {
    var mount = u.$(mountSel || "#appNav");
    if (!mount) return;
    var cur = currentPageId();
    var links = LINKS.map(function (l) {
      var curAttr = l.id === cur ? ' aria-current="page"' : "";
      return '<a href="' + l.href + '"' + curAttr + ">" + u.escapeHtml(l.label) + "</a>";
    }).join("");
    mount.innerHTML =
      '<a class="app-nav-brand" href="index.html">🌸 今日宜</a>' +
      '<nav class="app-nav-links" aria-label="主导航">' + links + "</nav>";
  }

  TY.navigation = {
    LINKS: LINKS,
    currentPageId: currentPageId,
    renderNav: renderNav
  };
})(window);
