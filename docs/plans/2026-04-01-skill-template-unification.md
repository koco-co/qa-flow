# Skill Template Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 统一 qa-flow 的 skill 模板结构，重构 `prd-enhancer` 为“薄编排 + 外置细则”，将文档 frontmatter `status` 切换为中文兼容模式，并在不破坏整体 agent 编排节点的前提下完成一轮集成自审。

**Architecture:** 先引入一层共享的 frontmatter 状态映射，让脚本“读双语、写中文”，避免把中文状态改造散落到各个脚本里。然后按“先核心依赖、后文档骨架、再横向对齐、最后全链路回归”的顺序推进：先完成状态兼容层和测试，再重构 `prd-enhancer` 与相关 prompts，最后统一其它 skill 模板并做 `CLAUDE.md ↔ skills ↔ prompts ↔ references ↔ scripts` 的收尾审计。

**Tech Stack:** Markdown、Node.js ESM (`.mjs`)、ripgrep、现有 `.claude/tests/*` 脚本、Git。

---

### Task 1: 建立共享的 frontmatter 状态兼容层

**Files:**
- Create: `.claude/shared/scripts/frontmatter-status-utils.mjs`
- Modify: `.claude/shared/scripts/audit-md-frontmatter.mjs`
- Test: `.claude/tests/test-md-frontmatter-audit.mjs`

**Step 1: Write the failing test**

在 `.claude/tests/test-md-frontmatter-audit.mjs` 新增“中文状态合法”的 fixture 和断言，至少覆盖 2 类场景：

```js
writeFixture(
  chineseRequirementRelativePath,
  [
    "---",
    "prd_name: 中文状态需求",
    "product: data-assets",
    "create_at: 2026-03-05",
    "status: 已澄清",
    "---",
    requirementBody,
  ].join("\n"),
);

assert(
  !new RegExp(`${escapeRegExp(chineseRequirementRelativePath)}[\\s\\S]*status`, "m").test(dryRunResult.stdout),
  "中文 requirement status: 已澄清 不会被误报为非法",
  [dryRunResult.stdout],
);
```

再补一组 archive 状态断言，验证 `已归档` 也被视为合法值。

**Step 2: Run test to verify it fails**

Run: `node .claude/tests/test-md-frontmatter-audit.mjs`

Expected: FAIL，错误信息仍指向 `status 非 raw / elicited / formalized / enhanced` 或中文状态被误报。

**Step 3: Write minimal implementation**

新增共享状态工具文件，集中维护读写映射：

```js
export const REQUIREMENT_STATUS_READ_MAP = new Map([
  ["raw", "raw"],
  ["elicited", "elicited"],
  ["formalized", "formalized"],
  ["enhanced", "enhanced"],
  ["未开始", "raw"],
  ["已澄清", "elicited"],
  ["已形式化", "formalized"],
  ["已增强", "enhanced"],
]);

export const ARCHIVE_STATUS_READ_MAP = new Map([
  ["draft", "draft"],
  ["reviewed", "reviewed"],
  ["archived", "archived"],
  ["草稿", "draft"],
  ["已评审", "reviewed"],
  ["已归档", "archived"],
]);

export function normalizeRequirementStatus(value) {
  const key = String(value ?? "").trim();
  return REQUIREMENT_STATUS_READ_MAP.get(key) ?? "";
}

export function normalizeArchiveStatus(value) {
  const key = String(value ?? "").trim();
  return ARCHIVE_STATUS_READ_MAP.get(key) ?? "";
}

export function toRequirementDocumentStatus(value) {
  switch (normalizeRequirementStatus(value)) {
    case "raw": return "未开始";
    case "elicited": return "已澄清";
    case "formalized": return "已形式化";
    case "enhanced": return "已增强";
    default: return "";
  }
}

export function toArchiveDocumentStatus(value) {
  switch (normalizeArchiveStatus(value)) {
    case "draft": return "草稿";
    case "reviewed": return "已评审";
    case "archived": return "已归档";
    default: return "";
  }
}
```

在 `.claude/shared/scripts/audit-md-frontmatter.mjs`：

- 用 `normalizeRequirementStatus()` 替换 `VALID_REQUIREMENT_STATUSES.has(...)`
- 将推断值继续保留英文 canonical 值
- 仅在写回 frontmatter 时转成中文文档状态

**Step 4: Run test to verify it passes**

Run: `node .claude/tests/test-md-frontmatter-audit.mjs`

Expected: PASS，中文 requirement / archive 状态都不再被误报；旧英文 fixture 仍然可通过。

**Step 5: Commit**

```bash
git add .claude/shared/scripts/frontmatter-status-utils.mjs \
        .claude/shared/scripts/audit-md-frontmatter.mjs \
        .claude/tests/test-md-frontmatter-audit.mjs
git commit -m "feat: add frontmatter status compatibility layer"
```

### Task 2: 让 frontmatter 生成与回填脚本统一写入中文状态

**Files:**
- Modify: `.claude/skills/prd-enhancer/scripts/backfill-prd-frontmatter.mjs`
- Modify: `.claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs`
- Modify: `.claude/skills/archive-converter/scripts/json-to-archive-md.mjs`
- Modify: `.claude/shared/scripts/build-archive-index.mjs`
- Test: `.claude/tests/test-md-frontmatter-audit.mjs`
- Test: `.claude/tests/test-md-content-source-resolver.mjs`

**Step 1: Write the failing test**

把现有测试夹具和断言改成“新写中文、旧读英文”的期望。例如：

```js
assert(/(^|\n)status:\s*已形式化/.test(fixedRequirement), "requirement 已根据文件名推断中文 status");
assert(/(^|\n)status:\s*已澄清/.test(fixedElicitedRequirement), "已保留合法中文 requirement 状态");
```

如果决定让新生成的 archive 默认写 `已归档`，则同时补对应断言：

```js
assert(/(^|\n)status:\s*已归档/.test(fixedArchive), "archive 已写入中文归档状态");
```

**Step 2: Run test to verify it fails**

Run: `node .claude/tests/test-md-frontmatter-audit.mjs && node .claude/tests/test-md-content-source-resolver.mjs`

Expected: FAIL，因为现有脚本仍在输出 `raw` / `formalized` / `""` 等旧值。

**Step 3: Write minimal implementation**

在相关脚本中统一改为：

```js
import {
  normalizeRequirementStatus,
  normalizeArchiveStatus,
  toRequirementDocumentStatus,
  toArchiveDocumentStatus,
} from "../../../shared/scripts/frontmatter-status-utils.mjs";
```

关键实现要求：

- `.claude/skills/prd-enhancer/scripts/backfill-prd-frontmatter.mjs`
  - `inferStatus()` 继续返回 canonical 英文状态
  - 写回 frontmatter 时使用 `toRequirementDocumentStatus(inferStatus(...))`

- `.claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs`
  - 新写入 archive 文档时统一输出 `status: 已归档`
  - 读旧值时允许 `draft` / `reviewed` / `archived`

- `.claude/skills/archive-converter/scripts/json-to-archive-md.mjs`
  - 默认写入 `status: 已归档`

- `.claude/shared/scripts/build-archive-index.mjs`
  - 序列化索引前先 normalize，再写出统一展示值，避免索引里同一状态同时出现中英两套

**Step 4: Run test to verify it passes**

Run:

```bash
node .claude/tests/test-md-frontmatter-audit.mjs
node .claude/tests/test-md-content-source-resolver.mjs
```

Expected: PASS；修复后的 frontmatter 输出中文，旧英文 fixture 仍可被读取和归一化。

**Step 5: Commit**

```bash
git add .claude/skills/prd-enhancer/scripts/backfill-prd-frontmatter.mjs \
        .claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs \
        .claude/skills/archive-converter/scripts/json-to-archive-md.mjs \
        .claude/shared/scripts/build-archive-index.mjs \
        .claude/tests/test-md-frontmatter-audit.mjs \
        .claude/tests/test-md-content-source-resolver.mjs
git commit -m "feat: write chinese document statuses in frontmatter"
```

### Task 3: 重构 `prd-enhancer` 的主文件骨架并拆出引用文件

**Files:**
- Create: `.claude/skills/prd-enhancer/references/preflight-flow.md`
- Create: `.claude/skills/prd-enhancer/references/page-insight-format.md`
- Create: `.claude/skills/prd-enhancer/references/frontmatter-status-map.md`
- Modify: `.claude/skills/prd-enhancer/SKILL.md`
- Modify: `.claude/skills/prd-enhancer/references/prd-template.md`

**Step 1: Write the failing structural check**

Run:

```bash
rg "Step 0\\.3|Step 0\\.5|AI图片描述|需求澄清结果（AI 生成）" .claude/skills/prd-enhancer
```

Expected: MATCHES FOUND，确认旧编号和旧措辞仍存在。

**Step 2: Run check to verify it fails**

Run the same command above and record the matching files before editing.

Expected: FAIL（非零不是必须，关键是有命中结果）。

**Step 3: Write minimal implementation**

重构目标：

- `SKILL.md` 只保留：
  - 用途与触发词
  - 使用口径速查
  - 输入 / 输出契约
  - 新的 canonical 步骤总表
  - 执行约束
  - 完成定义
  - 引用索引

- `references/preflight-flow.md` 承载前置链路：

```md
1. 来源识别
2. 正式化门禁
3. 定位目标 PRD
4. 增量检测
5. 独立调用需求澄清
```

- `references/page-insight-format.md` 承载新格式：

```md
#### 图N 页面要点

- 页面类型：
- 区域构成：
- 关键操作：
- 列表信息：
- 检索条件：
- 输入项：
- 流程/状态：
- 识别限制：
```

- `references/frontmatter-status-map.md` 记录中英状态映射与“读双语、写中文”规则。

- `references/prd-template.md` 删除旧的 `AI图片描述` 规范块，改为引用 `page-insight-format.md`。

**Step 4: Run structural check to verify it passes**

Run:

```bash
rg "Step 0\\.3|Step 0\\.5|AI图片描述|需求澄清结果（AI 生成）" .claude/skills/prd-enhancer
```

Expected: 无命中。

再补一个存在性检查：

```bash
test -f .claude/skills/prd-enhancer/references/preflight-flow.md && \
test -f .claude/skills/prd-enhancer/references/page-insight-format.md && \
test -f .claude/skills/prd-enhancer/references/frontmatter-status-map.md
```

Expected: PASS。

**Step 5: Commit**

```bash
git add .claude/skills/prd-enhancer/SKILL.md \
        .claude/skills/prd-enhancer/references/preflight-flow.md \
        .claude/skills/prd-enhancer/references/page-insight-format.md \
        .claude/skills/prd-enhancer/references/frontmatter-status-map.md \
        .claude/skills/prd-enhancer/references/prd-template.md
git commit -m "refactor: modularize prd-enhancer skill docs"
```

### Task 4: 同步 `prd-enhancer` 邻接 prompts 与 orchestrator 口径

**Files:**
- Modify: `.claude/skills/prd-enhancer/prompts/prd-formalizer.md`
- Modify: `.claude/skills/test-case-generator/prompts/step-parse-input.md`
- Modify: `.claude/skills/test-case-generator/prompts/step-req-elicit.md`
- Modify: `.claude/skills/test-case-generator/prompts/step-prd-enhancer.md`
- Modify: `.claude/skills/test-case-generator/SKILL.md`

**Step 1: Write the failing structural check**

Run:

```bash
rg "需求澄清结果（AI 生成）|status: raw|status: elicited|status: formalized|status: enhanced" \
  .claude/skills/prd-enhancer/prompts/prd-formalizer.md \
  .claude/skills/test-case-generator/prompts/step-parse-input.md \
  .claude/skills/test-case-generator/prompts/step-req-elicit.md \
  .claude/skills/test-case-generator/prompts/step-prd-enhancer.md \
  .claude/skills/test-case-generator/SKILL.md
```

Expected: MATCHES FOUND。

**Step 2: Run check to verify it fails**

Run the command above once before editing.

Expected: 看到旧英文 frontmatter 示例和旧的“AI 生成”措辞。

**Step 3: Write minimal implementation**

按以下原则替换：

- 用户可见章节名：`需求澄清结果`
- PRD frontmatter 示例：

```yaml
status: 未开始
status: 已澄清
status: 已形式化
status: 已增强
```

- 不改动 `.qa-state.json`、execution log、writer/reviewer 的运行态英文值
- `step-prd-enhancer.md` 和 `test-case-generator/SKILL.md` 中的阶段描述同步改为“页面要点 / 页面信息提炼”等新口径

**Step 4: Run check to verify it passes**

Run the same `rg` command again.

Expected: 无命中；运行态相关英文状态仍保留在 `.qa-state.json` 说明里。

**Step 5: Commit**

```bash
git add .claude/skills/prd-enhancer/prompts/prd-formalizer.md \
        .claude/skills/test-case-generator/prompts/step-parse-input.md \
        .claude/skills/test-case-generator/prompts/step-req-elicit.md \
        .claude/skills/test-case-generator/prompts/step-prd-enhancer.md \
        .claude/skills/test-case-generator/SKILL.md
git commit -m "docs: align prd prompts with chinese status wording"
```

### Task 5: 精简 `using-qa-flow`，把初始化长说明拆出引用文件

**Files:**
- Create: `.claude/skills/using-qa-flow/references/init-wizard-flow.md`
- Create: `.claude/skills/using-qa-flow/references/config-questionnaire.md`
- Modify: `.claude/skills/using-qa-flow/SKILL.md`

**Step 1: Write the failing structural check**

Run:

```bash
test -f .claude/skills/using-qa-flow/references/init-wizard-flow.md; echo $?
test -f .claude/skills/using-qa-flow/references/config-questionnaire.md; echo $?
```

Expected: `1` / `1`，两个引用文件尚不存在。

**Step 2: Run check to verify it fails**

再执行：

```bash
rg "^### 0\\.[2-4]" .claude/skills/using-qa-flow/SKILL.md
```

Expected: 命中大段向导细则，证明主文件仍过厚。

**Step 3: Write minimal implementation**

拆分策略：

- `SKILL.md` 保留：
  - 功能菜单
  - 参数路由
  - Step 0 / Step 1-5 的概要说明
  - 每个长说明块改为“详情见 references/...”

- `references/init-wizard-flow.md` 放：
  - 0.1 扫描项目结构
  - 0.2 展示推断结果
  - 0.3 历史文件解析
  - 0.4 功能分组问答

- `references/config-questionnaire.md` 放：
  - 五大功能组问题模板
  - 默认值说明
  - 重新初始化和部分更新规则

**Step 4: Run check to verify it passes**

Run:

```bash
test -f .claude/skills/using-qa-flow/references/init-wizard-flow.md && \
test -f .claude/skills/using-qa-flow/references/config-questionnaire.md && \
rg "init-wizard-flow|config-questionnaire" .claude/skills/using-qa-flow/SKILL.md
```

Expected: PASS，且 `SKILL.md` 中可以看到引用而不再塞满长细则。

**Step 5: Commit**

```bash
git add .claude/skills/using-qa-flow/SKILL.md \
        .claude/skills/using-qa-flow/references/init-wizard-flow.md \
        .claude/skills/using-qa-flow/references/config-questionnaire.md
git commit -m "refactor: split using-qa-flow setup details"
```

### Task 6: 精简 `code-analysis-report` 并统一其它轻量 skill 骨架

**Files:**
- Create: `.claude/skills/code-analysis-report/references/backend-analysis-flow.md`
- Create: `.claude/skills/code-analysis-report/references/conflict-analysis-flow.md`
- Create: `.claude/skills/code-analysis-report/references/frontend-analysis-flow.md`
- Modify: `.claude/skills/code-analysis-report/SKILL.md`
- Modify: `.claude/skills/archive-converter/SKILL.md`
- Modify: `.claude/skills/xmind-converter/SKILL.md`
- Modify: `CLAUDE.md`

**Step 1: Write the failing structural check**

Run:

```bash
test -f .claude/skills/code-analysis-report/references/backend-analysis-flow.md; echo $?
rg "## 二、Bug 分析模式|## 三、合并冲突模式|## 四、第四章：前端报错分析模式" \
  .claude/skills/code-analysis-report/SKILL.md
```

Expected: 新引用文件不存在，且主文件中仍有大段模式细则。

**Step 2: Run check to verify it fails**

再运行：

```bash
rg "功能菜单 \\+ 环境初始化|完整用例生成流程|PRD 图片描述 \\+ 增强 \\+ 健康度预检" CLAUDE.md
```

Expected: 命中现有 skill 索引，用于后续手工对齐 description 口径。

**Step 3: Write minimal implementation**

实现目标：

- `code-analysis-report/SKILL.md`
  - 保留模式识别、输入 / 输出契约、步骤总表、完成定义
  - 将三种模式细则迁移到 3 个 `references/*.md`

- `archive-converter/SKILL.md` / `xmind-converter/SKILL.md`
  - 对齐统一骨架：输入 / 输出契约、canonical 步骤总表、完成定义、引用索引
  - `archive-converter` 文档示例改为中文 archive 状态

- `CLAUDE.md`
  - 同步 `prd-enhancer` 的中性化描述
  - 保持 skill 索引、触发词和工作流顺序不变

**Step 4: Run check to verify it passes**

Run:

```bash
test -f .claude/skills/code-analysis-report/references/backend-analysis-flow.md && \
test -f .claude/skills/code-analysis-report/references/conflict-analysis-flow.md && \
test -f .claude/skills/code-analysis-report/references/frontend-analysis-flow.md && \
rg "backend-analysis-flow|conflict-analysis-flow|frontend-analysis-flow" .claude/skills/code-analysis-report/SKILL.md
```

Expected: PASS。

再手工看一遍 `CLAUDE.md` 的 skill 索引是否仍与实际能力一致。

**Step 5: Commit**

```bash
git add .claude/skills/code-analysis-report/SKILL.md \
        .claude/skills/code-analysis-report/references/backend-analysis-flow.md \
        .claude/skills/code-analysis-report/references/conflict-analysis-flow.md \
        .claude/skills/code-analysis-report/references/frontend-analysis-flow.md \
        .claude/skills/archive-converter/SKILL.md \
        .claude/skills/xmind-converter/SKILL.md \
        CLAUDE.md
git commit -m "docs: unify skill skeletons across qa-flow"
```

### Task 7: 迁移 schema、规则文档与历史示例到新口径

**Files:**
- Modify: `.claude/shared/schemas/front-matter-schema.md`
- Modify: `.claude/skills/archive-converter/rules/archive-format.md`
- Modify: `cases/requirements/custom/xyzh/*.md`
- Test: `.claude/tests/test-md-semantic-enrichment.mjs`

**Step 1: Write the failing structural check**

Run:

```bash
rg "AI图片描述|需求澄清结果（AI 生成）|raw / elicited / formalized / enhanced|draft / reviewed / archived" \
  .claude/shared/schemas/front-matter-schema.md \
  .claude/skills/archive-converter/rules/archive-format.md \
  cases/requirements/custom/xyzh
```

Expected: MATCHES FOUND。

**Step 2: Run check to verify it fails**

再运行：

```bash
node .claude/tests/test-md-semantic-enrichment.mjs
```

Expected: 可能 FAIL，或至少需要根据新 schema / 新示例口径同步断言。

**Step 3: Write minimal implementation**

- `.claude/shared/schemas/front-matter-schema.md`
  - requirement 状态注释改为：`未开始 / 已澄清 / 已形式化 / 已增强`
  - archive 状态注释改为：`草稿 / 已评审 / 已归档`

- `.claude/skills/archive-converter/rules/archive-format.md`
  - 把状态说明和示例改成中文文档状态

- `cases/requirements/custom/xyzh/*.md`
  - 批量迁移 `AI图片描述` → `图N 页面要点`
  - 批量迁移 `需求澄清结果（AI 生成）` → `需求澄清结果`
  - 如示例 frontmatter 里存在旧英文 PRD 状态，改成中文

**Step 4: Run check to verify it passes**

Run:

```bash
node .claude/tests/test-md-semantic-enrichment.mjs && \
rg "AI图片描述|需求澄清结果（AI 生成）|raw / elicited / formalized / enhanced|draft / reviewed / archived" \
  .claude/shared/schemas/front-matter-schema.md \
  .claude/skills/archive-converter/rules/archive-format.md \
  cases/requirements/custom/xyzh
```

Expected: 测试 PASS，grep 无命中。

**Step 5: Commit**

```bash
git add .claude/shared/schemas/front-matter-schema.md \
        .claude/skills/archive-converter/rules/archive-format.md \
        cases/requirements/custom/xyzh
git commit -m "docs: migrate schemas and examples to neutral wording"
```

### Task 8: 执行全链路回归与集成自审 gate

**Files:**
- Review: `CLAUDE.md`
- Review: `.claude/skills/*/SKILL.md`
- Review: `.claude/skills/**/prompts/*.md`
- Review: `.claude/skills/**/references/*.md`
- Review: `.claude/shared/scripts/audit-md-frontmatter.mjs`
- Review: `.claude/shared/scripts/build-archive-index.mjs`

**Step 1: Write the failing audit checklist**

先把以下检查清单写到本任务执行备注里，并按“未验证”初始化：

```text
[ ] CLAUDE.md 的 skill 索引与各 skill description 一致
[ ] test-case-generator → prd-enhancer → xmind/archive 的顺序未改变
[ ] 所有新增 references 文件都被主文件引用
[ ] 无失效相对路径
[ ] 无遗留 AI 直出措辞
[ ] frontmatter 中文状态可写，旧英文状态可读
```

**Step 2: Run audit commands to surface remaining failures**

Run:

```bash
node .claude/shared/scripts/audit-md-frontmatter.mjs --dry-run
node .claude/tests/test-md-frontmatter-audit.mjs
node .claude/tests/test-md-content-source-resolver.mjs
node .claude/tests/test-md-semantic-enrichment.mjs
rg "AI图片描述|需求澄清结果（AI 生成）" .claude cases/requirements
rg "prd-enhancer|test-case-generator|archive-converter|xmind-converter|code-analysis-report|using-qa-flow" CLAUDE.md .claude/skills
```

Expected: 如果仍有遗漏，这一步应能直接暴露出来。

**Step 3: Fix any fallout immediately**

只修本轮引入或暴露的联动问题，例如：

- 新增的 references 文件未被 `SKILL.md` 引用
- `CLAUDE.md` 中的 skill 描述仍保留旧措辞
- `step-prd-enhancer.md` 仍引用旧阶段名
- 某个脚本写中文，但审计仍只认英文

**Step 4: Run the full audit again**

Run the exact same commands from Step 2.

Expected: 全部 PASS；grep 无遗留旧措辞；审计 dry-run 不再报 status 非法。

**Step 5: Commit**

```bash
git add CLAUDE.md .claude docs/plans
git commit -m "test: validate skill template unification flow"
```

