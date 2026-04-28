# P6 Sub-Agent Splits + Naming Refactor Report

> **Status**: Complete · **Date**: 2026-04-28

## §10.2 Sub-Agent 拆分

| 旧 agent | 新 agent(s) | 行数变化 |
|---------|------------|---------|
| subagent-a-agent (336) | script-writer-agent (336) + script-fixer-agent (~130) + convergence-agent (~70) | 1 拆 3，script-writer 尚未收敛 |
| source-facts-agent (203) | source-scanner-agent (~130) + 主 agent vision | 删 1 增 1，图像识别还回主 agent |
| subagent-b-agent (155) | regression-runner-agent (155) | 仅改名 |
| writer-agent (437) | writer-agent (296) + 2 references | 抽出 ~140 行到 references/ |

## §10.4 命名规范

- `subagent-[a-z]` 模式 0 残留（agents:audit 验证 ✅）
- N1 / A1 lint 已上线，CI exit-code 接入

## Tooling Shipped

| Tool | Location | Tests |
|------|----------|-------|
| agent-shape.ts | `engine/src/lint/agent-shape.ts` | 4 (TDD) |
| agent-naming.ts | `engine/src/lint/agent-naming.ts` | 2 (TDD) |
| agents:audit | `engine/src/cli/agents-audit.ts` | smoke via baseline |
| npm scripts | `lint:agents` + `lint:paths` | `package.json` |

## Agent File Inventory

旧 4 文件 → 新 6 文件：

```
# 删除
.claude/agents/subagent-a-agent.md       (337 行, git rm)
.claude/agents/subagent-b-agent.md       (155 行, renamed)
.claude/agents/source-facts-agent.md     (203 行, git rm)

# 新增 / 改名
.claude/agents/script-writer-agent.md    (336 行, from subagent-a)
.claude/agents/script-fixer-agent.md     (~130 行, new)
.claude/agents/convergence-agent.md      (~70 行, new)
.claude/agents/regression-runner-agent.md (155 行, from subagent-b)
.claude/agents/source-scanner-agent.md   (~130 行, from source-facts)
.claude/agents/writer-agent.md           (296 行, shrunk from 437)
```

## Final Test Counts

- engine: **168 pass** (162 baseline + 6 new TDD)
- agents:audit: scanned=16 violations=1 (script-writer-agent A1-warn 336>300, non-blocking)
- paths:audit --exit-code: 0
- N1 violations: **0** (all subagent-* naming eliminated)

## Known Followups

- script-writer-agent A1 warn (336 lines) — convergence to ≤300; blocked by needing agent split stability first
- writer-agent further shrink to ≤200 (spec ultimate goal §7.1)
- §10.4 N2 / N3 (function naming, path function centralization) deferred to P7+
- LOW-1: 180 fail engine baseline still unstable; candidate for P7 stabilization
