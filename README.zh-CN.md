# PartMe.AI Cine Planning

影视管线规划阶段三份规格的合并仓：**导演**（镜头拆解）、**编剧**（故事与对白）、**分镜**（分镜面板与镜头表）。目前为设计基线规格仓——尚无可安装的插件清单，运行时被 PartMe Studio 宿主阻塞。

三个角色共用同一份公共契约：[`creative-production-workbench/production-package`](https://github.com/partme-ai/creative-production-workbench) v0.1.0（`design_baseline_not_released`，钉在 `contracts.lock.json`）。

| 角色 | 目录 | 职责边界 | 额外内容 |
|---|---|---|---|
| 导演 | [`director/`](director/) | 解释如何拍；镜头意图，不改故事与对白 | — |
| 编剧 | [`script/`](script/) | 决定故事与对白；不生成镜头路线、不编排付费生成 | — |
| 分镜 | [`storyboard/`](storyboard/) | 具体化镜头与分镜；Shot/Panel 数据 | `schemas/shot_list.schema.json` + animatic/check 工具（`src/`、`bin/`）与契约用例 |

## 目录说明

- `contracts.lock.json` — 唯一的 workbench 契约锁（三旧仓逐字相同）
- `<角色>/AGENTS.md` — 分角色开发约定
- `<角色>/docs/superpowers/` — 规格（plugin-design）与实施计划
- `<角色>/assets/` — 封面/主视觉图

## 历史

由 `codex-director-plugin`、`codex-script-plugin`、`codex-storyboard-plugin` 合并（三仓均已归档）。内容逐字保留，仅调整目录布局。
