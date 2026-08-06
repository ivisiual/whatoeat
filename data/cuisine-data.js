/*
 * 饭饭搭子 · 地方菜系资料种子
 *
 * GitHub Pages / 本地双击均可用：
 *   <script src="./data/cuisine-data.js"></script>
 *
 * 注意：
 * - recipes：已在 HowToCook 仓库找到对应开源菜谱，可用于「自己做」。
 * - discoveryDishes：菜系身份已由政府公开名单确认，但尚未找到许可清晰的 GitHub 菜谱；
 *   可用于外卖/食堂探索，不能伪装成已有开源食谱。
 * - 此文件不包含臆测热量。热量应在按份量核对后补入业务菜品库。
 */
(function (root) {
  "use strict";

  var HOWTOCOOK_REPO = "https://github.com/Anduin2017/HowToCook";
  var HOWTOCOOK_BLOB = HOWTOCOOK_REPO + "/blob/master/";

  function recipe(id, name, cuisineId, sourcePath, mealSlots) {
    return {
      id: id,
      name: name,
      cuisineIds: [cuisineId],
      mealSlots: mealSlots || ["lunch", "dinner"],
      supportedChannels: ["home_cook"],
      takeoutSearchTerm: name,
      source: {
        provider: "HowToCook",
        repository: HOWTOCOOK_REPO,
        path: sourcePath,
        url: HOWTOCOOK_BLOB + sourcePath,
        license: "Unlicense",
        verification: "recipe_path_checked"
      }
    };
  }

  root.FANFAN_CUISINE_DATA = {
    version: "2026-08-07",
    semantics: {
      multiSelect: "OR",
      defaultMode: "soft_preference",
      strictMode: "only_selected_cuisines",
      recipePolicy: "Only recipes with a checked source URL may show the GitHub recipe button."
    },
    cuisines: [
      { id: "cantonese", label: "粤菜", shortLabel: "粤", region: "广东", group: "popular" },
      { id: "jiangxi", label: "赣菜", shortLabel: "赣", region: "江西", group: "popular" },
      { id: "hunan", label: "湘菜", shortLabel: "湘", region: "湖南", group: "popular" },
      { id: "sichuan", label: "川菜", shortLabel: "川", region: "四川", group: "popular" },
      { id: "shandong", label: "鲁菜", shortLabel: "鲁", region: "山东", group: "classic" },
      { id: "fujian", label: "闽菜", shortLabel: "闽", region: "福建", group: "classic" },
      { id: "guangxi", label: "桂菜", shortLabel: "桂", region: "广西", group: "regional" },
      { id: "shaanxi", label: "陕西风味", shortLabel: "陕", region: "陕西", group: "regional" },
      { id: "hubei", label: "湖北风味", shortLabel: "鄂", region: "湖北", group: "regional" },
      { id: "jiangsu", label: "苏菜", shortLabel: "苏", region: "江苏", group: "classic" },
      { id: "zhejiang", label: "浙菜", shortLabel: "浙", region: "浙江", group: "classic" },
      { id: "anhui", label: "徽菜", shortLabel: "徽", region: "安徽", group: "classic" },
      { id: "guizhou", label: "黔菜", shortLabel: "黔", region: "贵州", group: "regional" },
      { id: "shanghai", label: "本帮菜", shortLabel: "沪", region: "上海", group: "regional" },
      { id: "northeast", label: "东北菜", shortLabel: "东北", region: "东北", group: "regional" },
      { id: "xinjiang", label: "新疆风味", shortLabel: "新", region: "新疆", group: "regional" }
    ],
    recipes: [
      recipe("yue-steamed-perch", "清蒸鲈鱼", "cantonese", "dishes/aquatic/清蒸鲈鱼/清蒸鲈鱼.md"),
      recipe("yue-blanched-shrimp", "白灼虾", "cantonese", "dishes/aquatic/白灼虾/白灼虾.md"),
      recipe("yue-garlic-shrimp", "蒜蓉虾", "cantonese", "dishes/aquatic/蒜蓉虾/蒜蓉虾.md"),
      recipe("yue-sweet-sour-pork", "咕噜肉", "cantonese", "dishes/meat_dish/咕噜肉.md"),
      recipe("yue-black-bean-ribs", "豉汁排骨", "cantonese", "dishes/meat_dish/豉汁排骨.md"),
      recipe("yue-ginger-scallion-chicken", "姜葱捞鸡", "cantonese", "dishes/meat_dish/姜葱捞鸡/姜葱捞鸡.md"),
      recipe("yue-lamb-pot", "枝竹羊腩煲", "cantonese", "dishes/meat_dish/枝竹羊腩煲/枝竹羊腩煲.md"),
      recipe("yue-choy-sum", "白灼菜心", "cantonese", "dishes/vegetable_dish/白灼菜心/白灼菜心.md"),
      recipe("yue-chow-fun", "炒河粉", "cantonese", "dishes/staple/炒河粉.md"),
      recipe("yue-century-egg-congee", "皮蛋瘦肉粥", "cantonese", "dishes/soup/皮蛋瘦肉粥.md", ["breakfast", "lunch", "dinner"]),

      recipe("xiang-farmhouse-bowl", "农家一碗香", "hunan", "dishes/meat_dish/农家一碗香/农家一碗香.md"),
      recipe("xiang-ginger-chicken", "姜炒鸡", "hunan", "dishes/meat_dish/姜炒鸡/姜炒鸡.md"),
      recipe("xiang-beef-stir-fry", "小炒黄牛肉", "hunan", "dishes/meat_dish/小炒黄牛肉/小炒黄牛肉.md"),
      recipe("xiang-braised-pork", "湖南家常红烧肉", "hunan", "dishes/meat_dish/湖南家常红烧肉/湖南家常红烧肉.md"),
      recipe("xiang-mifu-duck", "湘祁米夫鸭", "hunan", "dishes/meat_dish/湘祁米夫鸭/湘祁米夫鸭.md"),
      recipe("xiang-blood-duck", "血浆鸭", "hunan", "dishes/meat_dish/血浆鸭/血浆鸭.md"),
      recipe("xiang-hand-torn-cabbage", "手撕包菜", "hunan", "dishes/vegetable_dish/手撕包菜/手撕包菜.md"),

      recipe("chuan-boiled-fish", "水煮鱼", "sichuan", "dishes/aquatic/水煮鱼.md"),
      recipe("chuan-cold-rabbit", "冷吃兔", "sichuan", "dishes/meat_dish/冷吃兔.md"),
      recipe("chuan-boiled-pork", "水煮肉片", "sichuan", "dishes/meat_dish/水煮肉片.md"),
      recipe("chuan-yuxiang-pork", "鱼香肉丝", "sichuan", "dishes/meat_dish/鱼香肉丝.md"),
      recipe("chuan-saliva-chicken", "口水鸡", "sichuan", "dishes/meat_dish/口水鸡/口水鸡.md"),
      recipe("chuan-twice-cooked-pork", "回锅肉", "sichuan", "dishes/meat_dish/回锅肉/回锅肉.md"),
      recipe("chuan-boiled-beef", "水煮牛肉", "sichuan", "dishes/meat_dish/水煮牛肉/水煮牛肉.md"),

      recipe("lu-braised-carp", "红烧鲤鱼", "shandong", "dishes/aquatic/红烧鲤鱼.md"),
      recipe("lu-braised-prawns", "油焖大虾", "shandong", "dishes/aquatic/油焖大虾/油焖大虾.md"),
      recipe("lu-sweet-sour-carp", "糖醋鲤鱼", "shandong", "dishes/aquatic/糖醋鲤鱼/糖醋鲤鱼.md"),
      recipe("lu-scallion-sea-cucumber", "葱烧海参", "shandong", "dishes/aquatic/葱烧海参/葱烧海参.md"),
      recipe("lu-zibo-bbq", "淄博烧烤", "shandong", "dishes/meat_dish/淄博烧烤/淄博烧烤.md"),
      recipe("lu-candied-potato", "拔丝土豆", "shandong", "dishes/vegetable_dish/拔丝土豆/拔丝土豆.md"),

      recipe("min-clam-omelette", "蛏抱蛋", "fujian", "dishes/aquatic/蛏抱蛋/蛏抱蛋.md"),
      recipe("min-litchi-pork", "荔枝肉", "fujian", "dishes/meat_dish/荔枝肉/荔枝肉.md"),
      recipe("gui-yangshuo-beer-fish", "阳朔啤酒鱼", "guangxi", "dishes/aquatic/阳朔啤酒鱼/阳朔啤酒鱼.md"),
      recipe("gui-stuffed-pepper", "青椒酿", "guangxi", "dishes/meat_dish/青椒酿/青椒酿.md"),
      recipe("gui-luosi-rice-noodle", "螺蛳粉", "guangxi", "dishes/staple/螺蛳粉.md"),
      recipe("shanxi-youpo-noodle", "陕西油泼面", "shaanxi", "dishes/staple/陕西油泼面/陕西油泼面.md"),
      recipe("shanxi-liangpi", "凉皮", "shaanxi", "dishes/semi-finished/凉皮.md"),
      recipe("hubei-hot-dry-noodle", "热干面", "hubei", "dishes/staple/热干面.md", ["breakfast", "lunch", "dinner"])
    ],
    discoveryDishes: [
      { id: "gan-sanbei-chicken", name: "宁都三杯鸡", cuisineIds: ["jiangxi"] },
      { id: "gan-lotus-blood-duck", name: "莲花血鸭", cuisineIds: ["jiangxi"] },
      { id: "gan-four-star-moon", name: "四星望月", cuisineIds: ["jiangxi"] },
      { id: "gan-yugan-pepper-pork", name: "余干辣椒炒肉", cuisineIds: ["jiangxi"] },
      { id: "gan-jinggang-bamboo", name: "井冈烟笋", cuisineIds: ["jiangxi"] },
      { id: "gan-white-fish-head", name: "白浇雄鱼头", cuisineIds: ["jiangxi"] },
      { id: "gan-mandarin-fish-noodle", name: "鳜鱼煮粉", cuisineIds: ["jiangxi"] },
      { id: "gan-turtle-vermicelli", name: "甲鱼粉皮", cuisineIds: ["jiangxi"] },
      { id: "gan-artemisia-bacon", name: "藜蒿炒腊肉", cuisineIds: ["jiangxi"] },
      { id: "gan-taihe-black-chicken", name: "滋补泰和乌鸡", cuisineIds: ["jiangxi"] }
    ].map(function (dish) {
      dish.supportedChannels = ["takeout", "canteen"];
      dish.takeoutSearchTerm = dish.name;
      dish.source = {
        provider: "南昌市商务局",
        url: "https://swj.nc.gov.cn/ncsswj/zxzx/202102/9b4b78b8e1684e459234048f406edad8.shtml",
        verification: "regional_identity_verified_recipe_pending"
      };
      return dish;
    })
  };
})(window);
