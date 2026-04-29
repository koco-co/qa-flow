# kata 全量审查规范 v1.0

> 审查目标：确认 `/Users/poco/Projects/kata` 中每个文件的存在价值、每行代码的正确性、每处配置的合理性。
> 审查方式：按维度派发独立 agent 并行审查，每个 agent 只负责 1-2 个维度，汇总后合并报告。

---

## 维度 A：文件级生存审查

### A1 — 根目录文件逐项审查

遍历根目录每个文件/目录，回答：它为什么存在？如果合并或删除，后果是什么？

| 路径                          | 检查重点                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `config/` 下所有 `.yaml` 文件 | 谁在使用？`branch_mappings.yaml` 是否被 engine 代码引用？`repo-profiles/` 是否仍有效？               |
| `plugins/`                    | `lanhu/` `zentao/` `notify/` — 每个插件是否有实际调用方？代码是否可运行？README 是否与实际行为一致？ |
| `templates/`                  | `GUIDE.md` + Handlebars 文件 — 哪些模板被 engine 引用？哪些是孤立的？                                |
| `tools/`                      | `dtstack-sdk/` — 是否被 engine 或任何 workspace 使用？                                               |
| `rules/`                      | 每个 `.md` 文件 — 是否被 `rule-loader` 引用？是否有重复内容？                                        |
| `scripts/`                    | `lint/*.ts` — 是否在 `package.json` scripts 中被调用？                                               |
| `assets/`                     | `diagrams/` 下的 SVG/PNG/drawio — 是否被 README 引用？                                               |
| `lib/`                        | `playwright/` — 是否被 Playwright config 使用？                                                      |

### A2 — engine/src 文件逐项审查

| 维度           | 检查方法                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| CLI 注册完整性 | 每个 `engine/src/cli/*.ts` 必须在 `cli/index.ts` 中有 `register*()` 调用               |
| CLI 注册完整性 | 每个 `engine/src/xxx.ts`（顶层文件）如果定义 CLI 命令，必须在 `cli/index.ts` 中 import |
| 孤立文件       | `engine/src/` 下未被任何其他文件 import 的文件 — 无用的死代码                          |
| 孤立导出       | 检查 `export function / export const` — 是否被至少一个其他文件引用                     |

### A3 — engine/tests 文件逐项审查

| 维度           | 检查方法                                                              |
| -------------- | --------------------------------------------------------------------- |
| 测试与源码对应 | 每个 `tests/xxx.test.ts` 应对应一个 `src/xxx.ts`（或 `src/xxx/*.ts`） |
| 孤立测试       | 没有对应源码的测试文件（如测试已被删除模块的夹具）                    |
| 空测试         | 仅有 `it.todo()` 或空 `describe` 块的测试文件                         |

### A4 — .claude/agents 文件逐项审查

| 维度                       | 检查方法                                                                   |
| -------------------------- | -------------------------------------------------------------------------- |
| 16 个 agent 的 owner_skill | 每个 agent 必须在 `.claude/skills/` 中有对应 skill 目录                    |
| 实际使用                   | 每个 agent 是否被至少一个 skill 的 SKILL.md 或 workflow.md 引用为 subagent |
| 孤立 agent                 | 没有被任何 skill 引用的 agent — 删除或补充引用                             |

### A5 — .claude/skills 文件逐项审查

| 维度           | 检查方法                                                          |
| -------------- | ----------------------------------------------------------------- |
| 4 文件契约     | 每个 skill 必须有 SKILL.md + workflow.md + rules.md + references/ |
| 引用完整性     | SKILL.md 和 workflow.md 中所有相对路径引用的文件必须存在          |
| reference 文件 | `references/` 下的每个文件 — 是否被 SKILL.md 或 workflow.md 引用  |

---

## 维度 B：路径与引用正确性

### B1 — v2→v3 路径升级（全代码库）

| 过时模式                  | 正确模式                           | 应检查的文件类型 |
| ------------------------- | ---------------------------------- | ---------------- |
| `prds/{yyyymm}/{slug}/`   | `features/{ym}-{slug}/`            | .md .ts          |
| `archive/{YYYYMM}/`       | `features/{ym}-{slug}/archive.md`  | .md .ts          |
| `xmind/{YYYYMM}/`         | `features/{ym}-{slug}/cases.xmind` | .md .ts          |
| `.claude/scripts/`        | `engine/`                          | .md .ts .json    |
| `__tests__/`              | `tests/`                           | .md .ts .json    |
| `sessions/`               | `workflow-state/`                  | .md              |
| `"kata v2.0"` / `"2.0.0"` | `"3.0.0"`                          | .ts .md .json    |

**必须跳过（故意保留的测试数据）：**

- `engine/tests/lint/fixtures/`
- `engine/tests/fixtures/`
- `docs/superpowers/specs/`
- `CHANGELOG.md`

### B2 — 硬编码路径（全代码库）

搜索 `/Users/poco/` 或任何形如 `/Users/` 的绝对路径。

**允许例外：**

- `engine/tests/lint/fixtures/lint-cases-bad/hardcode-abs.fixture.ts`（lint 测试主动构造）
- `engine/tests/hooks/pre-edit-guard.test.ts`（hook 测试需要真实路径）

### B3 — README/README-EN 双语文档一致性

逐段对比中文和英文版 README：

- 段落结构是否对齐
- 项目结构树是否一致（`features/` vs 旧 `prds/`）
- 版本号 badge 是否一致（`3.0.0-alpha.1`）
- 技能/Agent 数量是否一致

---

## 维度 C：代码与文案质量

### C1 — CLI 帮助文本

运行 `kata-cli --help`，逐条检查：

- 是否有混用中英文的问题（约 8 个命令用中文，其余用英文）
- 是否有包含内部阶段编号的描述（`P3-B leftover`、`P7.5 node:test→bun:test` 等）
- 措辞是否专业统一

### C2 — 注释/文档质量

- 是否有包含 "TODO", "FIXME", "HACK", "TEMP", "WORKAROUND" 的注释（需评估是否仍是待办）
- JSDoc 示例代码中的路径是否可以复制执行
- `engine/src/api.ts` 注释中的 "P2-P11" 等阶段引用是否过时

### C3 — 文案一致性

- 中文文档中的中英文混用比例是否合理
- 术语是否统一（如 "kata-cli" vs "kata CLI" vs "kata cli"）
- 标点符号是否一致

---

## 维度 D：配置与构建正确性

### D1 — TypeScript 配置

| 文件                   | 检查点                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| `tsconfig.json` (根)   | `paths` 别名是否指向存在的目录；`include` 是否包含实际存在的目录 |
| `engine/tsconfig.json` | `include` 是否合理（hooks 是否排除）                             |
| `tsconfig.base.json`   | 是否有意义                                                       |

### D2 — Biome 配置

- `experimentalScannerIgnores` 是否已替换为 `files.ignore`
- `include` 是否过大（拖入 workspace 或 node_modules）

### D3 — package.json 依赖

- `dependencies` 中的包是否被源码实际 import
- `devDependencies` 中的包是否被使用
- `@types/*` 是否在正确的分组中
- 是否有冗余依赖（prettier + biome 共存、tsx + bun 共存）

### D4 — .gitignore

- 是否覆盖所有不应提交的产物（`.temp/`、`node_modules/`、`.auth/`、日志文件）
- 是否有过时的 gitignore 条目指向已不存在的路径

---

## 维度 E：架构与设计一致性

### E1 — Skill 编排架构

验证 Anthropic Claude Code skills 最佳实践：

- 每个 SKILL.md 是否有 `allowed-tools`（仅 `playwright-cli` 有）
- trigger words 是否准确（不会误触发也不会漏触发）
- workflow 步骤是否标注 `executor: direct` 或 `executor: subagent`
- subagent 步骤是否指定 `agent:` 和 `model:`
- `gate:` 引用的文件是否存在

### E2 — CLI 架构

- 是否有两个注册模式混用（`addCommand()` flat vs `program.command("ns:cmd")` colon）
- 是否所有 CLI 文件都按统一规范注册
- `init-wizard.ts` 是否被任何入口加载

### E3 — 导出 API 表面

`engine/src/api.ts` 导出的函数：

- 是否都被实际使用者 import
- 是否足够覆盖公共需求

---

## 维度 F：残留与清理

### F1 — 文件系统垃圾

- `refactor-v3-*` 文件（根目录）
- `.DS_Store` 文件（所有目录）
- `.console.log` / `.log.json` 文件
- 空目录（无 `.gitkeep`、无文件）
- 损坏的符号链接

### F2 — Git 追踪垃圾

- 被 git 追踪但不应在仓库中的文件（如重构日志文件）
- 巨大的二进制文件

### F3 — 过时配置

- `settings.local.json` 中引用已删除路径的权限条目
- hooks 配置中引用已删除脚本的条目

---

## 维度 G：外部依赖与兼容性

### G1 — workspace/ 数据完整性

- `workspace/dataAssets/` 和 `workspace/xyzh/` 中是否有孤立的遗留目录
- `.temp/` 下是否有大量未清理的运行时产物
- `.repos/` 下克隆的仓库是否仍被使用

### G2 — Playwright 配置

- `playwright.config.ts` 和 `playwright.selftest.config.ts` 的关系
- 是否可以合并

---

## 输出要求

### 报告格式

每个维度输出独立报告，包含以下字段：

```json
{
  "dimension": "A1",
  "title": "根目录文件逐项审查",
  "findings": [
    {
      "severity": "CRITICAL | IMPORTANT | SUGGESTION",
      "file": "相对路径",
      "line": 123,
      "problem": "问题描述",
      "fix": "建议修复方式或删除理由"
    }
  ],
  "summary": {
    "checked": 42,
    "passed": 38,
    "issues": 4
  }
}
```

### 严重性定义

| 级别       | 含义                                          |
| ---------- | --------------------------------------------- |
| CRITICAL   | 运行时错误风险，subagent 执行失败，路径不存在 |
| IMPORTANT  | 维护负担，文档误导，配置不合理                |
| SUGGESTION | 代码整洁，风格统一，最佳实践                  |

### 汇总表

所有维度审查完成后，输出一张汇总表：

| 维度          | 文件数 | 通过 | 问题 | CRITICAL | IMPORTANT | SUGGESTION |
| ------------- | ------ | ---- | ---- | -------- | --------- | ---------- |
| A1 根目录文件 |        |      |      |          |           |            |
| A2 engine/src |        |      |      |          |           |            |
| ...           |        |      |      |          |           |            |
| **总计**      |        |      |      |          |           |            |
