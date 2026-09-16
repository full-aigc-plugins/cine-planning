# PartMe.AI Cine Planning

Consolidated planning-stage specs for the film/video pipeline: **director** (shot breakdown), **script** (story & dialogue), and **storyboard** (panels & shot lists). These are design-baseline spec repositories — no installable plugin manifests yet; runtime is blocked on the PartMe Studio host.

All three roles share one public contract: [`creative-production-workbench/production-package`](https://github.com/partme-ai/creative-production-workbench) v0.1.0 (`design_baseline_not_released`, pinned in `contracts.lock.json`).

| Role | Directory | Scope | Extra |
|---|---|---|---|
| Director | [`director/`](director/) | 解释如何拍；镜头意图，不改故事与对白 | — |
| Script | [`script/`](script/) | 故事与对白；不生成镜头路线、不编排付费生成 | — |
| Storyboard | [`storyboard/`](storyboard/) | 具体化镜头与分镜；Shot/Panel 数据 | `schemas/shot_list.schema.json` + animatic/check 工具（`src/`、`bin/`）与契约用例 |

## Layout

- `contracts.lock.json` — the single pinned workbench contract (verbatim from all three former repos)
- `<role>/AGENTS.md` — per-role development conventions
- `<role>/docs/superpowers/` — spec (plugin-design) and implementation plan
- `<role>/assets/` — cover/hero images

## History

Merged from `codex-director-plugin`, `codex-script-plugin`, and `codex-storyboard-plugin` (all archived). Content is verbatim; only the layout changed.
