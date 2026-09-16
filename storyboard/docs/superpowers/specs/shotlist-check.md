# ShotList 声明式契约与 check 编译器

日期：2026-09-16。状态：草案工具（bin/storyboard + 12 项测试），不是可安装插件；无 SKILL.md、无 MCP 配置（遵守 AGENTS.md 发行边界）。
上游借鉴：Hypit 语义时间概念（Moment / Selection / 词级锚定），与 video-factory 的 edit-decision-1.1.0 语义词汇同构；仅借鉴概念，未复制代码或模块（AGENTS.md：不复制其他插件内部模块）。

## 1. 职责与定位

落实 plugin-design.md P01（契约锁定）与连续性检查职责：把 ShotList 作为**可校验的声明式源**，在任何素材请求、生产包交付之前暴露领域错误。对应实施计划的"三级执行协议"第一步：`check`（本编译器，免费、确定性）先于宿主路由与下游生产。

- 输入：`schemas/shot_list.schema.json` 形状的 ShotList JSON。
- 输出：结构化问题清单（code/severity/path/message）+ 摘要；`accepted` = 无 error 级问题（warning 不阻塞）。
- 出口：`animatic` 命令把通过的 ShotList 编译为 **edit-decision-1.1.0 草稿文档**，交宿主路由到 video-factory 校验与渲染。

## 2. 契约要点

- 语义词汇与 edit-decision-1.1.0 同构：`speech.words`（词级时间，表述在时间线时钟）、`moments`（命名语义点）、`selections`（命名语义区间）、shot 级 `anchor`（`moment:x` / `selection:x:start|end` / `speech:start|end` / `tick:n` + `offsetTicks`）。
- 实体登记制：characters / props / assets 是唯一实体表，shot 只持引用（`char:*` / `prop:*` / `A*`）——同名道具候选即 `DUPLICATE_ENTITY`，杜绝"多个候选误认为复制实体"。
- 素材状态真实性：`path` 与 `sha256` 必须成对出现（`IMAGE_IMPERSONATED`）；已绑定但缺哈希 = `IMAGE_MISSING`；`authorized:false` 被引用 = `UNAUTHORIZED_GENERATION`。
- 有理帧率 `fps:{numerator,denominator}`，animatic 一 tick = 一帧。
- 锚定策略：全锚定或全字面，混合拒绝（时间线定位策略不定义）。

## 3. 门清单（check）

| code | severity | 覆盖 spec §4 行为测试 |
|---|---|---|
| SHAPE / DUPLICATE_ID | error | 未知字段、坏 id 形状、重复 id（字段/引用反例） |
| DANGLING_CHARACTER / _PROP / _ASSET | error | 悬空角色/素材引用 |
| DUPLICATE_ENTITY | warning | 多个道具候选误认为复制实体 |
| DIRECTION_JUMP | warning | 人物方向跳变（同角色连续左右翻转，center 中断链） |
| DURATION_DRIFT | error | duration 累计漂移（重排不改变合计） |
| IMAGE_IMPERSONATED / IMAGE_MISSING / UNAUTHORIZED_GENERATION | error | 原图缺失冒充已生成、未授权图片生成 |
| SPEECH_ORDER / WORD_REFERENCE / ANCHOR_REFERENCE | error | 语义引用完整性 |
| DIALOGUE_TOO_LONG | warning | 对白长度（发音单位估算 vs 镜头容量，中文按汉字、英文按音节组，默认 4.5 u/s ±15%） |

另有 `diff`（重排改变 ID：moved/added/removed/changed，ID 永不重编号）与 `upstream`（上游 revision 变化 → 依赖 stale）。

## 4. 编译桥与边界

`compileAnimatic`：逐镜取已绑定（kind=board、authorized、有 path+sha256）的面板资产 → clip（`S001→C001`），锚定镜头透传 anchor，字面镜头按累计 `plannedDurationTicks` 回填 `timelineInTicks`；无板资产镜头跳过并报告。发射前对锚点做本地解析预检，未解析的锚点在源头失败。

边界（spec §5）：插件互不调用内部代码——本插件只**发射文档**，接收方拥有 schema 校验与渲染。已做一次性跨仓验证：正例编译产物通过 video-factory `edit-decision.schema.json` 校验，并经其 `resolveEditDecision` 解析为无缝时间线 `[0,150,210,300]`；该验证因跨仓路径不入本仓测试。

## 5. 已知边界与后续

- schema 与 `contracts.lock.json`（production-package 0.1.0，design_baseline_not_released）的对齐待工作台 D02 落地后固定。
- 服装连续性（wardrobe）当前是登记字段，未做跨镜门（需要每镜服装状态数据）。
- 对白估算速率可配置；后续接真实 `measure` 能力（配音模型相关）后替换。
- 运行：`bin/storyboard check|diff|upstream|animatic`；测试 `node --test tests/shotlist.test.mjs`（12 项）。
