/** Generate original bead patterns for Round 4 */
const fs = require("fs");
const path = require("path");

const PALETTE = {
  0: null,
  1: "#FF6B57", // tomato
  2: "#FFC857", // yolk
  3: "#87B974", // avocado
  4: "#6E9EFF", // sky
  5: "#C48BDB", // purple
  6: "#FFFFFF", // white
  7: "#3D2B22", // ink
  8: "#F5A9C0", // pink
  9: "#A67C68"  // caramel
};

function empty(n) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}
function set(g, r, c, v) {
  if (r >= 0 && c >= 0 && r < g.length && c < g.length) g[r][c] = v;
}
function fillRect(g, r0, c0, h, w, v) {
  for (let r = r0; r < r0 + h; r++)
    for (let c = c0; c < c0 + w; c++) set(g, r, c, v);
}
function stats(pattern) {
  const counts = {};
  let beads = 0;
  for (const row of pattern) {
    for (const cell of row) {
      if (cell && cell !== 0) {
        beads++;
        counts[cell] = (counts[cell] || 0) + 1;
      }
    }
  }
  return {
    colorCount: Object.keys(counts).length,
    estimatedBeads: beads,
    colorCounts: counts
  };
}
function meta(o, pattern) {
  const s = stats(pattern);
  const size = pattern.length;
  return Object.assign(
    {
      category: "beads",
      energy: ["low", "medium"],
      places: ["home"],
      social: ["solo"],
      budgetMax: 30,
      materials: ["beads", "pegboard"],
      moods: ["create", "relax"],
      steps: ["对照网格摆豆", "检查缺色", "烫纸定型（可选）", "拍照或导出 PNG"],
      completionText: "按图摆完整幅即可",
      firstStep: "准备 " + size + "×" + size + " 拼豆板，按色号取豆",
      source: null,
      license: "original",
      gridSize: size,
      colorCount: s.colorCount,
      estimatedBeads: s.estimatedBeads,
      colorCounts: s.colorCounts,
      pattern: pattern,
      palette: Object.assign({}, PALETTE)
    },
    o
  );
}

// --- 8x8 patterns ---
function heart8() {
  const g = empty(8);
  const p = [
    "01100110",
    "11111111",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
    "00000000"
  ];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) if (p[r][c] === "1") g[r][c] = 1;
  return g;
}
function star8() {
  const g = empty(8);
  const p = [
    "00011000",
    "00111100",
    "01111110",
    "11111111",
    "00111100",
    "01100110",
    "11000011",
    "00000000"
  ];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) if (p[r][c] === "1") g[r][c] = 2;
  return g;
}
function smile8() {
  const g = empty(8);
  fillRect(g, 1, 1, 6, 6, 2);
  set(g, 2, 2, 7); set(g, 2, 5, 7);
  set(g, 4, 2, 7); set(g, 5, 3, 7); set(g, 5, 4, 7); set(g, 4, 5, 7);
  return g;
}
function tree8() {
  const g = empty(8);
  fillRect(g, 0, 3, 1, 2, 3);
  fillRect(g, 1, 2, 2, 4, 3);
  fillRect(g, 3, 1, 2, 6, 3);
  fillRect(g, 5, 3, 3, 2, 9);
  return g;
}
function fish8() {
  const g = empty(8);
  fillRect(g, 3, 1, 2, 5, 4);
  set(g, 2, 3, 4); set(g, 5, 3, 4);
  set(g, 3, 6, 4); set(g, 4, 6, 4); set(g, 2, 7, 4); set(g, 5, 7, 4);
  set(g, 3, 2, 7);
  return g;
}
function mush8() {
  const g = empty(8);
  fillRect(g, 1, 2, 3, 4, 1);
  set(g, 1, 1, 1); set(g, 1, 6, 1);
  fillRect(g, 2, 3, 1, 1, 6);
  fillRect(g, 4, 3, 3, 2, 6);
  return g;
}
function moon8() {
  const g = empty(8);
  fillRect(g, 1, 2, 6, 4, 2);
  fillRect(g, 2, 3, 4, 3, 0);
  set(g, 1, 5, 2); set(g, 6, 5, 2);
  return g;
}
function cat8() {
  const g = empty(8);
  // ears
  set(g, 1, 1, 7); set(g, 1, 6, 7); set(g, 2, 1, 7); set(g, 2, 2, 7); set(g, 2, 5, 7); set(g, 2, 6, 7);
  fillRect(g, 3, 1, 4, 6, 9);
  set(g, 4, 2, 7); set(g, 4, 5, 7);
  set(g, 6, 3, 7); set(g, 6, 4, 7);
  return g;
}

// --- 16x16 ---
function heart16() {
  const g = empty(16);
  const rows = [
    "0000110000110000",
    "0001111001111000",
    "0011111111111100",
    "0111111111111110",
    "0111111111111110",
    "1111111111111111",
    "1111111111111111",
    "1111111111111111",
    "0111111111111110",
    "0111111111111110",
    "0011111111111100",
    "0001111111111000",
    "0000111111110000",
    "0000011111100000",
    "0000001111000000",
    "0000000110000000"
  ];
  for (let r = 0; r < 16; r++)
    for (let c = 0; c < 16; c++) if (rows[r][c] === "1") g[r][c] = 1;
  // highlight
  set(g, 3, 4, 8); set(g, 3, 5, 8);
  return g;
}
function house16() {
  const g = empty(16);
  // roof
  for (let i = 0; i < 8; i++) fillRect(g, 2 + i, 7 - i, 1, 2 + i * 2, 1);
  // body
  fillRect(g, 9, 3, 6, 10, 2);
  // door
  fillRect(g, 11, 7, 4, 2, 9);
  // windows
  fillRect(g, 10, 4, 2, 2, 4);
  fillRect(g, 10, 10, 2, 2, 4);
  // chimney
  fillRect(g, 3, 11, 4, 2, 7);
  return g;
}
function flower16() {
  const g = empty(16);
  // petals
  const centers = [[4, 8], [8, 4], [8, 12], [12, 8], [5, 5], [5, 11], [11, 5], [11, 11]];
  centers.forEach(([r, c]) => fillRect(g, r - 1, c - 1, 3, 3, 8));
  // center
  fillRect(g, 7, 7, 3, 3, 2);
  // stem
  fillRect(g, 10, 7, 5, 2, 3);
  // leaf
  fillRect(g, 12, 5, 2, 2, 3);
  return g;
}
function cloudSun16() {
  const g = empty(16);
  // sun
  fillRect(g, 1, 10, 5, 5, 2);
  // cloud
  fillRect(g, 6, 2, 4, 10, 6);
  fillRect(g, 5, 4, 2, 6, 6);
  fillRect(g, 9, 3, 2, 8, 4);
  return g;
}
function cup16() {
  const g = empty(16);
  // cup body
  fillRect(g, 5, 4, 8, 8, 6);
  fillRect(g, 6, 5, 6, 6, 4);
  // handle
  set(g, 7, 12, 6); set(g, 8, 13, 6); set(g, 9, 13, 6); set(g, 10, 12, 6);
  // steam
  set(g, 2, 6, 4); set(g, 3, 7, 4); set(g, 2, 9, 4); set(g, 3, 10, 4);
  // saucer
  fillRect(g, 13, 3, 1, 10, 9);
  return g;
}
function face16() {
  const g = empty(16);
  fillRect(g, 2, 2, 12, 12, 2);
  // eyes
  fillRect(g, 5, 5, 2, 2, 7);
  fillRect(g, 5, 9, 2, 2, 7);
  // blush
  set(g, 8, 4, 8); set(g, 8, 11, 8);
  // smile
  fillRect(g, 10, 5, 1, 6, 7);
  set(g, 9, 4, 7); set(g, 9, 11, 7);
  return g;
}
function cherry8() {
  const g = empty(8);
  set(g, 1, 3, 3); set(g, 2, 3, 3); set(g, 2, 4, 3);
  fillRect(g, 3, 1, 3, 3, 1);
  fillRect(g, 4, 4, 3, 3, 1);
  return g;
}
function bow8() {
  const g = empty(8);
  fillRect(g, 2, 0, 4, 3, 5);
  fillRect(g, 2, 5, 4, 3, 5);
  fillRect(g, 3, 3, 2, 2, 8);
  return g;
}
function ice16() {
  const g = empty(16);
  // cone
  for (let i = 0; i < 6; i++) fillRect(g, 9 + i, 6 - Math.floor(i / 2), 1, 4 + (i < 3 ? 0 : -1), 9);
  fillRect(g, 9, 5, 1, 6, 9);
  fillRect(g, 10, 5, 2, 6, 9);
  fillRect(g, 12, 6, 2, 4, 9);
  fillRect(g, 14, 7, 1, 2, 9);
  // scoops
  fillRect(g, 3, 4, 5, 8, 8);
  fillRect(g, 2, 5, 2, 6, 1);
  fillRect(g, 5, 5, 3, 6, 2);
  return g;
}
function ghost16() {
  const g = empty(16);
  fillRect(g, 3, 4, 9, 8, 6);
  fillRect(g, 2, 5, 2, 6, 6);
  // eyes
  fillRect(g, 5, 6, 2, 2, 7);
  fillRect(g, 5, 9, 2, 2, 7);
  // wavy bottom
  set(g, 12, 4, 6); set(g, 12, 5, 6); set(g, 13, 5, 6);
  set(g, 12, 7, 6); set(g, 13, 7, 6); set(g, 12, 8, 6);
  set(g, 12, 10, 6); set(g, 13, 10, 6); set(g, 12, 11, 6);
  return g;
}

const patterns = [
  meta({
    id: "bead-heart-8",
    title: "小爱心（8×8）",
    description: "入门红色爱心，2 色即可",
    duration: 20,
    difficulty: 1,
    tags: ["beginner", "8x8", "heart"]
  }, heart8()),
  meta({
    id: "bead-star-8",
    title: "小星星（8×8）",
    description: "一颗亮晶晶的黄星",
    duration: 20,
    difficulty: 1,
    tags: ["beginner", "8x8", "star"]
  }, star8()),
  meta({
    id: "bead-smile-8",
    title: "笑脸（8×8）",
    description: "圆形笑脸，适合热手",
    duration: 25,
    difficulty: 1,
    tags: ["beginner", "8x8", "face"]
  }, smile8()),
  meta({
    id: "bead-tree-8",
    title: "小树（8×8）",
    description: "树冠 + 树干两色",
    duration: 25,
    difficulty: 1,
    tags: ["beginner", "8x8", "nature"]
  }, tree8()),
  meta({
    id: "bead-fish-8",
    title: "小鱼（8×8）",
    description: "侧游的小鱼轮廓",
    duration: 25,
    difficulty: 2,
    tags: ["8x8", "animal"]
  }, fish8()),
  meta({
    id: "bead-mush-8",
    title: "蘑菇（8×8）",
    description: "经典红伞白柄",
    duration: 25,
    difficulty: 2,
    tags: ["8x8", "cute"]
  }, mush8()),
  meta({
    id: "bead-moon-8",
    title: "弯月（8×8）",
    description: "一弯黄色月亮",
    duration: 20,
    difficulty: 1,
    tags: ["8x8", "night"]
  }, moon8()),
  meta({
    id: "bead-cat-8",
    title: "猫头（8×8）",
    description: "简笔猫头，带耳朵",
    duration: 30,
    difficulty: 2,
    tags: ["8x8", "animal", "cute"]
  }, cat8()),
  meta({
    id: "bead-heart-16",
    title: "大爱心（16×16）",
    description: "更圆润的爱心，带高光",
    duration: 45,
    difficulty: 2,
    tags: ["16x16", "heart"]
  }, heart16()),
  meta({
    id: "bead-house-16",
    title: "小屋（16×16）",
    description: "屋顶、门窗与烟囱",
    duration: 50,
    difficulty: 3,
    tags: ["16x16", "scene"]
  }, house16()),
  meta({
    id: "bead-flower-16",
    title: "小花（16×16）",
    description: "花瓣环绕 + 茎叶",
    duration: 45,
    difficulty: 2,
    tags: ["16x16", "nature"]
  }, flower16()),
  meta({
    id: "bead-cloud-sun-16",
    title: "云朵与太阳（16×16）",
    description: "天气主题双元素",
    duration: 40,
    difficulty: 2,
    tags: ["16x16", "weather"]
  }, cloudSun16()),
  meta({
    id: "bead-cup-16",
    title: "热饮杯（16×16）",
    description: "杯子、把手与蒸汽",
    duration: 45,
    difficulty: 2,
    tags: ["16x16", "object"]
  }, cup16()),
  meta({
    id: "bead-face-16",
    title: "圆脸微笑（16×16）",
    description: "更大的笑脸，带腮红",
    duration: 40,
    difficulty: 2,
    tags: ["16x16", "face", "cute"]
  }, face16()),
  meta({
    id: "bead-cherry-8",
    title: "双樱桃（8×8）",
    description: "两颗小樱桃和叶柄",
    duration: 20,
    difficulty: 1,
    tags: ["8x8", "food", "beginner"]
  }, cherry8()),
  meta({
    id: "bead-bow-8",
    title: "蝴蝶结（8×8）",
    description: "对称小蝴蝶结",
    duration: 20,
    difficulty: 1,
    tags: ["8x8", "cute", "beginner"]
  }, bow8()),
  meta({
    id: "bead-ice-16",
    title: "甜筒冰淇淋（16×16）",
    description: "双球甜筒，配色活泼",
    duration: 50,
    difficulty: 3,
    tags: ["16x16", "food"]
  }, ice16()),
  meta({
    id: "bead-ghost-16",
    title: "小幽灵（16×16）",
    description: "圆滚滚幽灵，适合入门 16 格",
    duration: 40,
    difficulty: 2,
    tags: ["16x16", "cute", "fantasy"]
  }, ghost16())
];

const body = patterns.map((p) => "  " + JSON.stringify(p)).join(",\n");
const js =
  "/* 今日宜 · 拼豆原创图案（Round 4）license: original */\n" +
  "(function (root) {\n  \"use strict\";\n  root.TODAYYI_BEAD_PATTERNS = [\n" +
  body +
  "\n  ];\n  root.TODAYYI_BEAD_PALETTE_DEFAULT = " +
  JSON.stringify(PALETTE) +
  ";\n})(window);\n";

fs.writeFileSync(path.join(__dirname, "..", "data", "bead-patterns.js"), js, "utf8");
console.log("patterns", patterns.length);
patterns.forEach((p) => console.log(p.id, p.gridSize, "beads", p.estimatedBeads, "colors", p.colorCount));
