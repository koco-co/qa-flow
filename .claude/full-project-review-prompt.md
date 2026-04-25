# kata 项目全量审查 prompt

## 使用方式

在新窗口直接粘贴下文。AI 会逐区域审查，输出问题清单。

---

请对 `/Users/poco/Projects/kata/.claude/` 做全量审查。这是 QA 自动化平台 kata 的 AI 工作目录，包含 skills（技能）、agents（代理）、scripts（脚本）、references（引用文档）四大区域。

## 审查总纲

逐区域、逐文件检查以下维度：
1. **命名一致性** — 同类文件命名模式是否统一
2. **引用完整性** — 跨文件路径引用、agent 引用、技能引用是否可解析
3. **编号准确性** — 步骤编号、阶段编号是否无断裂/跳号/重复
4. **描述准确性** — agent/skill 的描述是否与实际行为一致
5. **结构合理性** — 目录层级是否合理，过薄/过厚文件是否需调整
6. **交叉引用** — skill 引用的 agent、reference、脚本是否真实存在

---

## 第一区域：skills（技能）

逐 skill 检查。每个 skill 的标准结构：
```
SKILL.md              ← 触发词 + 简介
workflow/main.md      ← 编排（步骤列表）
workflow/protocols.md ← 共享协议（可选）
workflow/step-N-*.md  ← 各步骤指令
workflow/gates/       ← 门控（可选）
```

### 1.1 test-case-gen（测试用例生成）

```
.claude/skills/test-case-gen/
├── SKILL.md
├── workflow/
│   ├── main.md       ← 8 步骤
│   ├── protocols.md
│   ├── 01-init.md
│   ├── 02-probe.md
│   ├── 03-discuss.md
│   ├── 04-analyze.md
│   ├── 05-write.md
│   ├── 06-review.md
│   ├── 07-format-check.md
│   ├── 08-output.md
│   └── gates/R1.md, R2.md, R3.md
└── references/       ← 10 份参考文档
```

检查要点：
- 步骤命名模式是 `NN-name.md`（两位数前缀），与其他 skill 是否对齐
- `main.md` 中的步骤 1-8 与文件名 01-08 是否一一对应
- `protocols.md` 中是否有步骤编号引用
- 各 step 文件开头的 header 格式是否统一
- gate R1/R2/R3 的检查项是否与实际步骤匹配
- references/ 下 10 份文档是否都在 `main.md` 或 `protocols.md` 中被引用
- 引用的 agent（`analyze-agent`, `writer-agent`, `reviewer-agent`, `format-checker-agent`）是否存在

### 1.2 ui-autotest（UI 自动化测试）

```
.claude/skills/ui-autotest/
├── SKILL.md
├── workflow/
│   ├── main.md
│   ├── protocols.md
│   ├── protocols-exception.md
│   ├── step-1-parse-and-scope.md
│   ├── step-1.5-resume.md       ← 命名风格不同于其他（.5 vs 整数）
│   ├── step-2-login.md
│   ├── step-3a-script-writer.md  ← 命名风格不同于其他（a/b/c vs 整数）
│   ├── step-3b-test-fix.md
│   ├── step-3c-convergence.md
│   ├── step-4-merge.md
│   ├── step-5-execute.md
│   ├── step-6-result-notify.md
│   └── gates/R1.md, R2.md
└── scripts/parse-cases.ts, merge-specs.ts, session-login.ts
```

检查要点：
- 步骤编号：1, 1.5, 2, 3a, 3b, 3c, 4, 5, 6 — 混合了整数、小数、字母三种子步骤格式，是否应统一
- step-3a/b/c 与 ui-autotest 主流的 `step-N-verb-noun.md` 模式不同（阶段式 header `# Subagent A · 阶段 N`）
- step-N 文件头格式：有的用 `# ui-autotest · step N — Name`，有的用 `# Subagent A · 阶段 N — Name`，是否应统一
- `main.md` 引用 `subagent-a-agent` 和 `subagent-b-agent` — 这两个 agent 是否存在
- `step-3c-convergence.md` 引用 `pattern-analyzer-agent` — 是否存在
- `step-6-result-notify.md` 引用 `bug-reporter-agent` — 是否存在
- scripts/ 下三个脚本（parse-cases.ts, merge-specs.ts, session-login.ts）在 steps 中的调用路径是否正确
- `protocols.md` 中的 `@parse-cases` 别名引用的是 `parse-cases.ts`，路径是否正确
- `protocols-exception.md` 是否被 `main.md` 引用
- gates/R1.md 和 R2.md 的 checklist 是否与当前 6 步结构匹配

### 1.3 case-format（用例格式转换）

```
.claude/skills/case-format/
├── SKILL.md
└── workflow/
    ├── edit.md
    ├── other2md.md
    ├── preference-writing.md
    ├── reverse-sync.md
    └── scenarios.md
```

检查要点：
- 此 skill 无 main.md 编排，5 个 workflow 文件平铺 — 与 test-case-gen/ui-autotest 结构不一致
- SKILL.md 中描述的触发模式（edit/reverse-sync/other2md）与 workflow 文件是否对应
- 各 workflow 文件是否引用了 agents 或其他 skills

### 1.4 daily-task（日常任务）

```
.claude/skills/daily-task/
├── SKILL.md
└── modes/
    ├── bug-report/README.md, backend.md, frontend.md, rendering.md, routing.md
    ├── conflict-report/README.md
    └── hotfix-case-gen/main.md, README.md, zentao-input.md
```

检查要点：
- 此 skill 完全不同于前三个的结构（无 workflow/ 目录，用 modes/ 替代）
- 各 mode 引用的 agent（`backend-bug-agent`, `frontend-bug-agent`, `conflict-agent`, `hotfix-case-agent`）是否存在
- bug-report 的 5 个文件（README + 4 个模式）是否都有效

### 1.5 其他 skills

playwright-cli, knowledge-keeper, using-kata 三个 skill：

- 每个的 SKILL.md 触发词和描述是否准确
- workflow/ 结构是否与同类保持一致
- 引用的文件、路径是否有效

### 1.6 命名模式对比

对所有 skills 的步骤文件命名做横向对比：

| Skill | 命名模式 | 示例 |
|-------|---------|------|
| test-case-gen | `NN-name.md` | `01-init.md` |
| ui-autotest | `step-N-name.md` | `step-1-parse-and-scope.md` |
| case-format | 无步骤编号 | `edit.md` |
| daily-task | 按 mode 分组 | `bug-report/README.md` |

- test-case-gen 用 `NN-` 前缀（两位数，01-08）
- ui-autotest 用 `step-N-` 前缀
- 两种模式是否应统一

---

## 第二区域：agents（代理定义）

`.claude/agents/` 下 14 个文件。每个的 frontmatter 结构：
```yaml
name: xxx
description: "..."
model: sonnet/haiku
tools: Read, Grep, Glob, Bash, Edit, Agent
```

### 2.1 agent 列表与关系

逐 agent 检查：

| Agent | 被谁引用 | 应检查 |
|-------|---------|--------|
| analyze-agent | test-case-gen | desc 是否准确 |
| writer-agent | test-case-gen | desc 是否准确 |
| reviewer-agent | test-case-gen | desc 是否准确 |
| format-checker-agent | test-case-gen | desc 是否准确 |
| subagent-a-agent | ui-autotest | desc 是否准确，tools 是否合理 |
| subagent-b-agent | ui-autotest | desc 是否准确，tools 是否合理 |
| pattern-analyzer-agent | ui-autotest step-3c | desc 是否准确 |
| bug-reporter-agent | ui-autotest step-6 | desc 是否准确 |
| backend-bug-agent | daily-task | desc 是否准确 |
| frontend-bug-agent | daily-task | desc 是否准确 |
| conflict-agent | daily-task | desc 是否准确 |
| hotfix-case-agent | daily-task | desc 是否准确 |
| source-facts-agent | 谁引用? | desc 中的步骤引用是否准确 |
| standardize-agent | 谁引用? | desc 是否准确 |

### 2.2 检查重点

- 每个 agent 的 `name` 是否与文件名一致
- `description` 中是否有硬编码的步骤号（如 source-facts-agent 的 "discuss 3.2.5 步骤"）
- `tools` 是否与 agent 的实际职责匹配（read-only vs 写文件 vs 派发 subagent）
- 各 agent 文件中是否有对特定 skill/step 的路径引用（如 `.claude/skills/...` 或 `.claude/references/...`）

---

## 第三区域：references（引用文档）

`.claude/references/` 下 11 个文件。

### 3.1 引用关系网

| 文件 | 被谁引用 | 引用是否正确 |
|------|---------|------------|
| assertion-fidelity.md | subagent-a-agent, subagent-b-agent | agent 名是否最新 |
| playwright-patterns.md | subagent-a-agent, subagent-b-agent | agent 名/路径是否最新 |
| playwright-shared-lib.md | subagent-a-agent | 路径是否正确 |
| skill-preamble.md | 各 skill? | 是否被引用 |
| error-handling-patterns.md | bug-reporter-agent | 路径是否正确 |
| test-case-standards.md | 谁引用? | — |
| path-conventions.md | 谁引用? | — |
| strategy-templates.md | 谁引用? | — |
| unicode-symbols.md | 谁引用? | — |
| env-vs-code.md | 谁引用? | — |

### 3.2 检查要点

- 每个 .md 文件中是否有对其他文件的 `.claude/xxx` 路径引用
- 所有路径引用解析后文件是否真实存在
- assertion-fidelity.md 中引用的 agent 名称是否为当前最新名

---

## 第四区域：scripts（脚本代码）

`.claude/scripts/` 目录，包含：
- 入口文件（kata-cli.ts, plan.ts, progress.ts, ...）
- lib/ 库文件
- lib/workflow/ 编排定义
- lib/orchestrator/ 编排引擎
- \_\_tests\_\_/ 测试

### 4.1 workflow 编排定义

```
.claude/scripts/lib/workflow/
├── test-case-gen.ts    ← test-case-gen skill 的程序化定义
└── ui-autotest.ts      ← ui-autotest skill 的程序化定义
```

检查要点：
- test-case-gen.ts 的步骤定义是否与 skills/test-case-gen/workflow/main.md 一致
- ui-autotest.ts 的步骤定义是否与 skills/ui-autotest/workflow/main.md 一致
- 两个文件中的 agentRef 是否指向存在的 agent

### 4.2 plan.ts

- 第 57 行 `WorkflowType = "test-case-gen" | "ui-autotest"` — 类型是否完整
- STEP_TEMPLATES 中两个 workflow 的步骤定义是否与最新的 workflow 编排一致
- 注意 `depends_on` 数组使用的是自动生成的 `step-N` ID（从索引自动生成）

### 4.3 库代码中的路径/引用

- `lib/paths.ts` 中的项目路径函数
- `lib/knowledge.ts` / `lib/knowledge-guard.ts` 中的知识库引用
- `lib/rules.ts` 中的规则加载引用
- 所有 `.ts` 文件中的 import 路径是否有效

---

## 第五区域：跨区域完整性检查

### 5.1 skill 间的交叉引用

- test-case-gen skill 的协议/流程是否引用 ui-autotest（或反之）
- daily-task skill 是否引用其他 skill
- playwright-cli 的 references/ 是否被其他 skill 引用

### 5.2 未使用的文件

- 是否有 agent 未被任何 skill 引用（如 standardize-agent, source-facts-agent）
- 是否有 reference 未被任何 agent 引用（如 unicode-symbols.md, env-vs-code.md）
- 文件存在但没有入链，是否正常

### 5.3 路径模式一致性

- 所有步骤文件引用路径：有的是 `workflow/step-N.md` 有的是 `.claude/skills/xxx/workflow/step-N.md`
- 两种格式分别在什么时候用? 是否统一?

---

## 输出格式

对每个发现的问题，按以下格式输出：

```
[区域/文件:行号] 类型 | 问题描述 | 建议修复
```

类型分类：
- **BUG** — 引用断裂、路径错误、agent 不存在等导致无法执行的
- **INCONSISTENCY** — 命名不一致、格式不统一、编号风格混用
- **OUTDATED** — 描述过时、步骤号错误、引用旧名
- **DESIGN** — 结构不合理、职责边界模糊

完成所有区域审查后，输出汇总表（按 BUG > INCONSISTENCY > OUTDATED > DESIGN 排序）。
