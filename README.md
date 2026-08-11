# 今日宜（whatoeat）

> 根据今天的状态，推荐一件值得做的小事

纯静态多页：无后端、无 npm build、GitHub Pages 可部署，双击 HTML 可运行。

## 进度

| 轮次 | 内容 | 状态 |
| --- | --- | --- |
| 第一轮 | 拆分单文件、饭饭搭子、导航 | ✅ |
| 第二轮 | 今日主签、统一推荐引擎、历史收藏 | ✅ |
| 第三轮 | 画画 100+、学习任务池+计时、娱乐 100+ | ✅ |
| 第四轮 | 拼豆 MVP：8×8/16×16、Canvas、统计、PNG 导出 | ✅ |
| **增强** | 拼豆点涂练习、色板、还原进度、更多图案 | ✅ |

## 页面一览

| 文件 | 功能 |
| --- | --- |
| `index.html` | 今日状态 · 主签 · 顺手建议 · 进度 |
| `eat.html` | 宜吃饭（饭饭搭子） |
| `create.html` | **宜画画** + **宜拼豆**（网格预览 / 导出 / 打卡） |
| `study.html` | 任务池 · 15/25/45 计时 · 专注记录 |
| `relax.html` | 轻松活动推荐 |
| `profile.html` | 完成历史与收藏 |

## 拼豆

- 原创图案：`data/bead-patterns.js`（8×8 / 16×16，约 18 张）
- **练习点涂**：选色后点击/拖动格子摆豆；底图浅影为图纸提示
- **只看图纸**模式：只读预览与导出对照
- 色板、橡皮、清空练习、一键填满图纸
- 进度：正确数 / 目标数、各色「需/已摆」
- 导出 PNG、完成打卡 → `todayyi_activity_history_v1`
- 手机端单列、触控友好

图案 `license: original`，仅供兴趣参考。

## 存储键

**今日宜**：`todayyi_profile_v1`、`todayyi_daily_plan_v1`、`todayyi_activity_history_v1`、`todayyi_favorites_v1`、`todayyi_study_tasks_v1`、`todayyi_focus_logs_v1` …

**饭饭搭子（不改名）**：`fanfan_settings_v3`、`fanfan_current_menu_v2`、`fanfan_calorie_logs_v1` …

## 自测

```bash
node _build_parts/selftest-r1.js
node _build_parts/selftest-r2.js
node _build_parts/selftest-r3.js
node _build_parts/selftest-r4.js
node _build_parts/selftest-cr.js   # CR 交互回归
```

要求：全部零失败。

## 部署

相对路径 + 根目录 `.nojekyll` → GitHub Pages branch `/ (root)`。

## 免责

热量为估算，不构成医疗建议。拼豆/画画为原创示意素材。
