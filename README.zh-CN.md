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

<!-- FULL_STACK_DOC_START -->
## 规划仓定位与边界

`cine-planning` 是电影/视频创作链的**规格基线仓库**，聚合 director、script、storyboard 三个角色的规划产物。它不是已发布插件，不包含 Codex/ZCode/Kimi 可安装 manifest，也不应出现在插件市场。

| 已确认事实 | 当前状态 | 证据 |
|---|---|---|
| 产品阶段 | `design_baseline_not_released` | `contracts.lock.json` |
| 公共契约 | `creative-production-workbench/production-package` v0.1.0 | lock 与角色规格 |
| 可安装插件 | 无 | 未提供三端 manifest |
| 运行时阻塞 | PartMe Studio 宿主尚未交付 | 角色设计文档与计划 |
| 规格事实源 | OpenSpec + 角色内 Superpowers specs/plans | `openspec/`、`*/docs/superpowers/` |

## 一眼看懂

```text
故事需求
  ├── Script：故事、场景与对白
  ├── Director：镜头意图与拍摄解释
  └── Storyboard：Shot / Panel / animatic 结构化交付
            │
            ▼
production-package 契约
            │
            ▼
PartMe Studio（待实现的任务发布与共享评审宿主）
```

## 角色边界

| 角色 | 负责 | 不负责 |
|---|---|---|
| Script | 故事结构、场景、对白、叙事连续性 | 镜头路线、付费生成编排 |
| Director | 镜头意图、表演与拍摄解释 | 改写已批准故事与对白 |
| Storyboard | Shot/Panel、构图、时长、animatic 输入 | 最终渲染、插件 CLI 直接启动 |

Studio 的规划约束保持不变：Studio 只通过 MCP 发布任务和维护共享项目/评审状态，不直接启动插件 CLI。

## 如何审查本仓

1. 先核对 `contracts.lock.json` 与三个角色引用的是同一契约版本；
2. 检查角色术语、Shot/Panel 字段和交付状态是否一致；
3. 运行 storyboard 已提供的 schema/animatic/check 工具；
4. 对照 OpenSpec 与 Superpowers 计划确认实现状态，不把规划任务标记为已交付；
5. 在真正提供三端 manifest、运行时和安装验证前，禁止添加市场安装命令。

## 成熟度与后续发布门禁

进入可安装阶段前至少需要：稳定插件 ID、三端 manifest、MCP 任务契约、共享状态/评审实现、权限与恢复测试、版本化 Release、市场固定 tag，以及 Codex/ZCode/Kimi 的干净环境加载证据。

## 安全与数据边界

规划材料不应嵌入真实演员资料、未授权素材、账户凭据或私有制作地址。外部生成、上传、付费与发布必须由未来运行时在明确审批点处理，规格文本不构成授权。

## 故障排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 找不到安装命令 | 当前是规划仓，不是插件 | 阅读角色规格，不要伪造安装步骤 |
| 三角色字段不一致 | 契约或术语漂移 | 以锁定 production-package 为基线统一 |
| 计划声称完成但无运行时 | 把设计接受误当发布 | 标记为规划完成，保留运行时和宿主门禁 |
| 市场误收录 | 忽略 planning-only 边界 | 移除市场条目并恢复发布门禁 |
<!-- FULL_STACK_DOC_END -->
