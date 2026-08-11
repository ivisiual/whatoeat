const fs = require("fs");
const h = fs.readFileSync("E:/github/260807/whatoeat/index.html", "utf8");
const checks = [
  ["cuisine script", h.includes("data/cuisine-data.js")],
  ["dishes script", h.includes("data/dishes-data.js")],
  ["no absolute /data", !h.includes('src="/data/')],
  ["preset weekday", h.includes("工作日通勤")],
  ["settings v3", h.includes("fanfan_settings_v3")],
  ["legacy v2", h.includes("fanfan_settings_v2")],
  ["eat set button", h.includes("今天就吃这套")],
  ["safe-area", h.includes("safe-area-inset-bottom")],
  ["reduced motion", h.includes("prefers-reduced-motion")],
  ["nojekyll", fs.existsSync("E:/github/260807/whatoeat/.nojekyll")],
  ["channelsAllowed", h.includes("channelsAllowed")],
  ["selected channel not [0] only", h.includes("selectedChannel")]
];
let fail = 0;
checks.forEach(([n, ok]) => {
  console.log(ok ? "OK" : "FAIL", n);
  if (!ok) fail++;
});
console.log("bytes", h.length);
process.exit(fail ? 1 : 0);
