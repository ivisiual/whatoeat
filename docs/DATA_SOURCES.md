# 菜系资料与使用边界

更新日期：2026-08-07

## 1. GitHub Pages 兼容性

GitHub Pages 是静态站点托管，可以发布仓库中的 HTML、CSS、JavaScript 和其他静态资源。项目页部署在 `用户名.github.io/仓库名/` 下，因此运行时引用必须使用相对路径：

```html
<script src="./data/cuisine-data.js"></script>
```

不要写 `/data/cuisine-data.js`，它会指向域名根目录；也不建议初版用 `fetch("./data/x.json")`，因为用户直接双击 `index.html` 时浏览器可能阻止 `file://` 下的请求。普通 `<script src>` 同时兼容 GitHub Pages 和本地预览。

项目根目录放置 `.nojekyll`，让 Pages 直接按静态文件发布。`docs/` 中的 Markdown 不会影响首页，除非用户主动访问其 URL。

官方说明：

- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [About GitHub Pages and Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll)

## 2. 开源菜谱主来源

主来源为 [Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook)。本次核查到仓库 `dishes/` 下共有 369 个 Markdown 菜谱文件；`data/cuisine-data.js` 只收录了已经逐项检查到文件路径的地方菜种子。

该仓库的 [LICENSE](https://github.com/Anduin2017/HowToCook/blob/master/LICENSE) 为 Unlicense，声明作品进入公有领域并允许复制、修改、发布和商业/非商业使用。产品中仍建议保留来源链接，方便用户看原菜谱，也方便未来审计数据。

每条已核查菜谱包含：

- `source.repository`
- `source.path`
- `source.url`
- `source.license`
- `source.verification`

不要把第三方食谱全文复制进本站。初版只保存结构化标签和原始链接即可。

## 3. 江西菜处理方式

HowToCook 当前未检索到足够明确的赣菜覆盖。为了先支持真实用户的“想吃江西菜”诉求，本项目采用双层验证：

- 菜系身份：使用南昌市商务局公开的赣菜“十大名菜”名单。
- 开源食谱：必须另行找到许可清晰、路径可访问的 GitHub 菜谱后，才能显示“看做法”。

官方名单来源：[十大赣菜、十大名小吃重磅出炉](https://swj.nc.gov.cn/ncsswj/zxzx/202102/9b4b78b8e1684e459234048f406edad8.shtml)。名单包括宁都三杯鸡、莲花血鸭、四星望月、余干辣椒炒肉、井冈烟笋、白浇雄鱼头、鳜鱼煮粉、甲鱼粉皮、藜蒿炒腊肉、滋补泰和乌鸡。

这些菜目前放在 `discoveryDishes`：可用于外卖/食堂搜索词和菜系探索，但 `source.verification` 明确标记为 `regional_identity_verified_recipe_pending`。没有 GitHub 菜谱 URL 时，UI 必须隐藏“看做法”按钮。

## 4. 数据质量规则

1. 菜系、过敏原、素食属性不能仅根据菜名猜测。
2. 成分不确定的“套餐、拼盘、自选、麻辣烫”默认不进入蛋奶素白名单。
3. 热量是按份量变化的估算值，必须包含 `portionLabel`、`min`、`max` 和 `default`；没有核对份量时保持空值。
4. “外卖可点”“食堂常见”是渠道可用性，不等于存在开源菜谱；两者分开建模。
5. 菜系默认是软偏好。严格模式候选不足时提示用户，不得偷偷换成别的菜系。
6. 每次扩充数据时记录 `verifiedAt` 和来源；链接失效后降级为“搜索该菜”，不要打开 404。

## 5. 建议目录

```text
whatoeat/
├─ index.html
├─ .nojekyll
├─ data/
│  └─ cuisine-data.js       # 页面可直接加载的运行时种子
├─ docs/
│  ├─ DATA_SOURCES.md       # 来源、许可和数据边界
│  └─ FILTER_AND_PRESET_V2.md
└─ README.md
```

后续如果数据量超过约 300 道，再考虑构建脚本把源 JSON 编译为 JS；当前规模没必要引入 Node、后端或数据库。
