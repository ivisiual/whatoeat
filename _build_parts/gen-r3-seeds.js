/** Generate Round 3 activity seeds (>=100 draw, >=100 leisure) */
const fs = require("fs");
const path = require("path");
const outDir = path.join(__dirname, "..", "data");

function a(base, o) {
  return Object.assign(
    {
      social: ["solo"],
      budgetMax: 0,
      materials: ["paper", "pen"],
      difficulty: 1,
      source: null,
      license: "original",
      steps: [],
      tags: [],
      moods: ["create", "relax"],
      energy: ["low", "medium"],
      places: ["home", "office"],
      duration: 15
    },
    base,
    o
  );
}

const subjects = [
  ["雨天便利店", "scene"], ["窗台橘猫", "animal"], ["理想早餐盘", "food"], ["巴掌小星球", "fantasy"],
  ["桌面静物", "still"], ["心情天气", "mood"], ["地铁一角", "city"], ["歪脖子绿植", "plant"],
  ["深夜小吃摊", "food"], ["未来明信片", "letter"], ["涂鸦九宫格", "pattern"], ["宠物超人", "animal"],
  ["一杯热可可", "food"], ["旧书店橱窗", "scene"], ["月亮上的帐篷", "fantasy"], ["洗衣店霓虹", "city"],
  ["一只穿靴的鹅", "animal"], ["冰箱里的秘密", "food"], ["阳台番茄", "plant"], ["折纸小船", "object"],
  ["公交站牌", "city"], ["宿舍夜灯", "scene"], ["海浪和贝壳", "nature"], ["竹林小径", "nature"],
  ["复古收音机", "object"], ["云端图书馆", "fantasy"], ["街角花店", "scene"], ["熊猫吃竹", "animal"],
  ["热气腾腾的火锅", "food"], ["星星灯串", "object"], ["河边骑行", "scene"], ["糖葫芦摊", "food"],
  ["猫头鹰邮差", "animal"], ["水晶球城市", "fantasy"], ["被窝读书角", "scene"], ["柠檬水摊", "food"],
  ["滑雪的企鹅", "animal"], ["屋顶花园", "plant"], ["老式打字机", "object"], ["银河火车站", "fantasy"],
  ["菜市场清晨", "scene"], ["拉面碗特写", "food"], ["沙漠仙人掌", "plant"], ["风筝线轴", "object"],
  ["雪夜路灯", "scene"], ["寿司传送带", "food"], ["热带鱼缸", "animal"], ["积木城堡", "object"],
  ["咖啡馆角落", "scene"], ["草莓蛋糕塔", "food"], ["樱花树下", "nature"], ["机器人浇花", "fantasy"],
  ["便利贴墙", "object"], ["夜市串串", "food"], ["蜗牛旅行", "animal"], ["泡泡雨", "fantasy"],
  ["书店猫爬架", "animal"], ["煎饼果子", "food"], ["梯田云海", "nature"], ["太空咖啡馆", "fantasy"],
  ["窗边吉他", "object"], ["饺子派对", "food"], ["狐狸邮局", "animal"], ["蘑菇小村", "fantasy"],
  ["天桥行人", "city"], ["冰粉碗", "food"], ["多肉拼盘", "plant"], ["蒸汽火车", "object"],
  ["胡同口", "scene"], ["蛋黄酥", "food"], ["鲸鱼与岛屿", "fantasy"], ["蜡笔盒", "object"],
  ["公园长椅", "scene"], ["关东煮", "food"], ["刺猬背包", "animal"], ["彩虹隧道", "fantasy"],
  ["天台晾衣", "scene"], ["汤圆碗", "food"], ["蒲公英", "nature"], ["纸飞机机场", "fantasy"],
  ["文具店货架", "scene"], ["烧烤签", "food"], ["考拉午睡", "animal"], ["糖果星球", "fantasy"],
  ["雨伞森林", "scene"], ["包子蒸笼", "food"], ["向日葵田", "nature"], ["幽灵面包店", "fantasy"],
  ["阳台晾被", "scene"], ["冰淇淋车", "food"], ["蜜蜂采蜜", "animal"], ["月亮秋千", "fantasy"],
  ["社区花园", "plant"], ["章鱼烧", "food"], ["骆驼背包客", "animal"], ["云朵沙发", "fantasy"],
  ["教室黑板", "scene"], ["奶茶店", "food"], ["金鱼祈愿", "animal"], ["星尘实验室", "fantasy"],
  ["自行车篓", "object"], ["麻辣烫", "food"], ["树懒吊床", "animal"], ["漂浮书店", "fantasy"],
  ["夜班便利店员", "scene"], ["蛋烘糕", "food"], ["飞天小猪", "fantasy"], ["旧相机", "object"]
];

const styles = [
  { tags: ["three-colors"], desc: "只用三种颜色", step: "选定三种颜色" },
  { tags: ["simple"], desc: "用最少的线完成", step: "先画大轮廓" },
  { tags: ["cute"], desc: "所有形状尽量圆一点", step: "从大圆开始" },
  { tags: ["silhouette"], desc: "只画深色剪影", step: "涂满主体剪影" },
  { tags: ["pixel"], desc: "用小方格拼出外形", step: "先画网格" },
  { tags: ["oneline"], desc: "尽量不断笔", step: "找起点落笔" }
];
const durs = [8, 10, 12, 15, 18, 20, 25];
const energies = [["low"], ["low", "medium"], ["medium"], ["medium", "high"]];
const placeSets = [["home"], ["home", "office"], ["home", "office"], ["home"]];

const draws = [];
for (let si = 0; si < subjects.length; si++) {
  const [titleBase, tag] = subjects[si];
  const style = styles[si % styles.length];
  draws.push(
    a(
      { category: "draw" },
      {
        id: "draw-" + String(si + 1).padStart(3, "0") + "-" + style.tags[0],
        title: "画" + titleBase,
        description: style.desc + " · " + titleBase,
        firstStep: style.step + "，再画" + titleBase + "的主体",
        duration: durs[si % durs.length],
        energy: energies[si % energies.length],
        places: placeSets[si % placeSets.length],
        moods: si % 3 === 0 ? ["create"] : si % 3 === 1 ? ["create", "relax"] : ["relax", "create"],
        tags: [tag].concat(style.tags),
        difficulty: (si % 3) + 1,
        steps: [style.step, "画出" + titleBase + "的主要形状", "加一个小细节或文字"],
        completionText: "完成一张关于「" + titleBase + "」的小画即可"
      }
    )
  );
}

const leisureTemplates = [
  ["伸展", "body", 5, ["low"], ["home", "office"], "站起来转转肩", "做完一组伸展"],
  ["热饮仪式", "mindful", 10, ["low"], ["home", "office"], "去接一杯热水", "喝到第一口"],
  ["短走一圈", "walk", 15, ["medium", "high"], ["home", "office", "outdoor"], "穿鞋出门或绕楼", "走完一圈"],
  ["听完整首歌", "music", 5, ["low"], ["home", "office"], "选一首歌播放", "听完结尾"],
  ["光影三连拍", "photo", 10, ["low", "medium"], ["home", "office", "outdoor"], "找一处光线", "拍满三张"],
  ["清一个角落", "tidy", 12, ["low", "medium"], ["home", "office"], "指定 50cm 范围", "收拾完毕"],
  ["望窗三分钟", "mindful", 5, ["low"], ["home", "office"], "走到窗边", "静静看满三分钟"],
  ["小游戏一局", "game", 15, ["low", "medium"], ["home"], "打开一个短局游戏", "结束一局"],
  ["语音问候", "social", 5, ["low", "medium"], ["home", "office"], "想一个朋友名字", "发出语音"],
  ["简单小食", "food", 20, ["medium"], ["home"], "打开冰箱看一眼", "吃到一口"],
  ["云朵编故事", "imagine", 8, ["low"], ["home", "outdoor"], "抬头找一个形状", "编完三句"],
  ["温水重启", "reset", 5, ["low"], ["home", "office"], "走到洗手台", "认真洗一分钟"],
  ["写三件小事", "journal", 8, ["low"], ["home", "office"], "打开备忘录", "列出三件"],
  ["换个坐姿", "body", 3, ["low"], ["office"], "站起来再坐下", "调整好姿势"],
  ["整理相册", "photo", 10, ["low"], ["home"], "打开手机相册", "挑出三张"],
  ["深呼吸方盒", "mindful", 5, ["low"], ["home", "office"], "吸气四秒", "做满四轮"],
  ["给绿植浇水", "plant", 8, ["low"], ["home"], "检查土壤干湿", "浇完一盆"],
  ["叠三件衣服", "tidy", 8, ["low", "medium"], ["home"], "拿起衣服", "叠好放好"],
  ["读一首短诗", "read", 8, ["low"], ["home", "office"], "打开任意诗歌", "读完一首"],
  ["楼下买水", "walk", 12, ["medium"], ["home", "office", "outdoor"], "下楼或去便利店", "带回一瓶水"]
];
const leisureMods = [
  "慢慢地", "认真地", "不看手机地", "带着微笑", "像仪式一样", "轻轻松松", "只专注当下", "给自己的",
  "偷偷奖励", "周末版", "工作日版", "两分钟加强", "温柔版", "元气版", "安静版", "可爱版"
];
const leisures = [];
let li = 0;
for (let t = 0; t < leisureTemplates.length; t++) {
  for (let m = 0; m < 5; m++) {
    const [base, tag, dur, energy, places, first, done] = leisureTemplates[t];
    const mod = leisureMods[(t + m) % leisureMods.length];
    leisures.push(
      a(
        {
          category: "leisure",
          materials:
            tag === "food"
              ? ["kitchen"]
              : tag === "journal" || tag === "read"
                ? ["paper", "pen"]
                : ["none"],
          budgetMax: tag === "food" ? 15 : 0
        },
        {
          id: "leisure-" + String(li + 1).padStart(3, "0"),
          title: mod + base,
          description: base + " · " + mod + "完成一次就好",
          firstStep: first,
          duration: dur + (m % 3) * 2,
          energy,
          places,
          social: tag === "social" ? ["social"] : ["solo"],
          moods: tag === "walk" || tag === "body" ? ["relax", "explore"] : ["relax"],
          tags: [tag, "seed"],
          difficulty: 1,
          steps: [first, "做到一半不放弃", done],
          completionText: done
        }
      )
    );
    li++;
  }
}

const studyTopics = [
  "复习笔记", "番茄钟专注", "读一小节", "卡片复习", "概念复述", "整理学习清单", "写三行大纲",
  "外语磨耳朵", "做一道练习题", "迷你思维导图", "整理错题", "背 5 个术语", "看教学短视频记要点",
  "默写公式", "整理文献摘要", "代码小练习", "写今日学习日志", "回顾昨日笔记", "划重点三句",
  "对照答案订正", "预习下一节标题", "听播客记两个点", "整理桌面学习区", "设定下周目标一句",
  "用自己的话写定义", "画流程图", "检查作业清单", "限时阅读两页", "口头报告一分钟",
  "整理收藏夹学习链接", "翻译一段短文", "刷五道基础题", "整理实验步骤", "背诵一小段",
  "写问题清单", "复习闪卡一轮", "总结本章三要点", "练手速打字五分钟", "整理术语表",
  "对照大纲查缺"
];
const studies = studyTopics.map((title, i) =>
  a(
    {
      category: "study",
      materials: i % 4 === 0 ? ["paper", "pen"] : ["none"]
    },
    {
      id: "study-" + String(i + 1).padStart(3, "0"),
      title,
      description: "专注完成：" + title,
      firstStep: "准备好材料，设定计时",
      duration: [10, 15, 20, 25, 30, 45][i % 6],
      energy: i % 2 === 0 ? ["medium", "high"] : ["low", "medium"],
      places: ["home", "office"],
      moods: ["focus"],
      tags: ["study", "action"],
      difficulty: (i % 3) + 1,
      steps: ["开始计时", title, "写下收获一句"],
      completionText: "完成该动作并记下收获"
    }
  )
);

function dump(filename, varName, arr) {
  const body = arr.map((o) => "  " + JSON.stringify(o)).join(",\n");
  const js =
    "/* auto-generated Round 3 seed — original text, license: original */\n" +
    "(function (root) {\n  \"use strict\";\n  root." +
    varName +
    " = [\n" +
    body +
    "\n  ];\n})(window);\n";
  fs.writeFileSync(path.join(outDir, filename), js, "utf8");
  console.log(filename, arr.length);
}

dump("draw-prompts.js", "TODAYYI_DRAW_PROMPTS", draws);
dump("leisure-activities.js", "TODAYYI_LEISURE_ACTIVITIES", leisures);
dump("study-actions.js", "TODAYYI_STUDY_ACTIONS", studies);
console.log("OK");
