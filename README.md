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

<!-- FULL_STACK_DOC_START -->
## Planning-repository position and boundaries

`cine-planning` is the **specification baseline repository** for the film/video creation chain. It combines director, script, and storyboard planning artifacts. It is not a released plugin, has no installable Codex/ZCode/Kimi manifests, and must not be listed in a plugin marketplace.

| Confirmed fact | Current state | Evidence |
|---|---|---|
| Product phase | `design_baseline_not_released` | `contracts.lock.json` |
| Shared contract | `creative-production-workbench/production-package` v0.1.0 | Lock and role specifications |
| Installable plugin | None | No three-host manifests |
| Runtime blocker | PartMe Studio host is not delivered | Role design documents and plans |
| Specification source | OpenSpec plus role-level Superpowers specs/plans | `openspec/`, `*/docs/superpowers/` |

## At a glance

```text
story request
  ├── Script: story, scene, and dialogue
  ├── Director: shot intent and production interpretation
  └── Storyboard: structured Shot / Panel / animatic delivery
            │
            ▼
production-package contract
            │
            ▼
PartMe Studio (future task publication and shared review host)
```

## Role boundaries

| Role | Owns | Does not own |
|---|---|---|
| Script | Story structure, scenes, dialogue, narrative continuity | Shot routing or paid-generation orchestration |
| Director | Shot intent, performance, production interpretation | Rewriting an approved story or dialogue |
| Storyboard | Shot/Panel structure, composition, duration, animatic inputs | Final rendering or directly launching plugin CLIs |

The Studio constraint remains explicit: Studio publishes tasks through MCP and owns shared project/review state; it does not directly launch plugin CLIs.

## How to review this repository

1. Confirm that `contracts.lock.json` and all three roles reference the same contract version.
2. Check role terminology, Shot/Panel fields, and delivery states for consistency.
3. Run the storyboard schema, animatic, and check tools that are actually present.
4. Compare OpenSpec and Superpowers plans with implementation evidence; do not report planning tasks as delivered runtime.
5. Do not add marketplace installation commands until three-host manifests, runtime code, and installation evidence exist.

## Maturity and release gates

An installable release requires a stable plugin ID, three-host manifests, an MCP task contract, shared state/review implementation, permission and recovery tests, a versioned Release, an immutable marketplace tag, and clean-environment loading evidence for Codex, ZCode, and Kimi.

## Security and data boundaries

Planning artifacts must not embed real performer data, unlicensed assets, account credentials, or private production endpoints. External generation, upload, payment, and publishing need explicit runtime approval gates; specification text is not authorization.

## Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| No installation command | This is a planning repository, not a plugin | Read the role specifications; do not invent installation steps |
| Fields differ across roles | Contract or terminology drift | Reconcile against the locked production-package contract |
| A plan says complete but no runtime exists | Design acceptance was confused with release | Mark planning complete while retaining runtime and host gates |
| Marketplace includes this repository | Planning-only boundary was ignored | Remove the marketplace entry and restore release gates |
<!-- FULL_STACK_DOC_END -->
