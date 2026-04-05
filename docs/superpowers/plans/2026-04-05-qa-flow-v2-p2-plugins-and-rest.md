# qa-flow v2.0 P2/P3: code-analysis + Plugins + ui-autotest + README

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining features — code-analysis skill for bug/conflict analysis, 3 plugin implementations (lanhu, zentao, notify), ui-autotest skill for Playwright automation, and README.md for open-source readiness.

**Architecture:** Plugins are standalone TS scripts activated by `.env` configuration. Skills follow the same pattern as P0/P1 (SKILL.md < 500 lines, explicit commands, interactive checkpoints).

**Tech Stack:** TypeScript ESM / commander / node-fetch (for HTTP) / JSZip / Playwright / nodemailer

**Prerequisite:** P0 + P1 complete (all shared scripts, 4 skills, 197 tests passing).

---

## File Structure

### New files to create

```
# Plugins
plugins/lanhu/fetch.ts
plugins/zentao/fetch.ts
plugins/notify/send.ts

# code-analysis skill
.claude/skills/code-analysis/SKILL.md
.claude/skills/code-analysis/prompts/backend-bug.md
.claude/skills/code-analysis/prompts/frontend-bug.md
.claude/skills/code-analysis/prompts/conflict.md
.claude/skills/code-analysis/prompts/hotfix-case.md
.claude/skills/code-analysis/references/env-vs-code.md
templates/bug-report.html.hbs
templates/conflict-report.html.hbs

# ui-autotest skill
.claude/skills/ui-autotest/SKILL.md
.claude/skills/ui-autotest/prompts/script-writer.md
.claude/skills/ui-autotest/prompts/bug-reporter.md
.claude/skills/ui-autotest/scripts/parse-cases.ts
.claude/skills/ui-autotest/scripts/merge-specs.ts
.claude/skills/ui-autotest/scripts/session-login.ts

# Project docs
README.md
```

---

## Task 1: notify Plugin Implementation

**Files:**
- Create: `plugins/notify/send.ts`

- [ ] **Step 1: Implement send.ts**

CLI via commander:
```
npx tsx plugins/notify/send.ts --event case-generated --data '{"count":42,"file":"test.xmind"}'
npx tsx plugins/notify/send.ts --event workflow-failed --data '{"step":"writer","reason":"error"}'
npx tsx plugins/notify/send.ts --dry-run --event case-generated --data '{...}'
npx tsx plugins/notify/send.ts --help
```

Supports 4 channels (all optional, enabled by .env):

**钉钉** (DINGTALK_WEBHOOK_URL):
- POST to webhook URL with `msgtype: "markdown"`
- If `DINGTALK_KEYWORD` set, prepend to title
- If `DINGTALK_SIGN_SECRET` set, compute HMAC-SHA256 signature

**飞书** (FEISHU_WEBHOOK_URL):
- POST with `msg_type: "post"`, `content.post.zh_cn`

**企微** (WECOM_WEBHOOK_URL):
- POST with `msgtype: "markdown"`

**邮件** (SMTP_HOST + SMTP_USER + SMTP_PASS + SMTP_TO):
- Use nodemailer transport

Message formatting per event type:
- `case-generated`: "✅ 用例生成完成 | {count} 条 | {file}"
- `bug-report`: "🐛 Bug 分析报告 | {summary}"
- `ui-test-completed`: "🧪 UI 测试完成 | 通过 {passed} | 失败 {failed}"
- `workflow-failed`: "❌ 工作流异常 | 步骤: {step} | 原因: {reason}"
- Default: "📢 qa-flow 通知 | {event}"

Each channel sends independently. Failures logged to stderr, don't block other channels.
`--dry-run`: format message and log to stderr without sending.

Output JSON: `{ "sent": ["dingtalk", "email"], "failed": [], "skipped": ["feishu", "wecom"] }`

- [ ] **Step 2: Write tests**

Test message formatting logic (no actual HTTP calls). Test `--dry-run` outputs formatted message. Test channel detection from env vars.

- [ ] **Step 3: Commit**

```bash
git add plugins/notify/ .claude/scripts/__tests__/notify-plugin.test.ts && git commit -m "feat: implement notify plugin (dingtalk, feishu, wecom, email)"
```

---

## Task 2: lanhu Plugin Implementation

**Files:**
- Create: `plugins/lanhu/fetch.ts`

- [ ] **Step 1: Implement fetch.ts**

CLI:
```
npx tsx plugins/lanhu/fetch.ts --url "https://lanhuapp.com/web/#/item/..." --output workspace/.temp/lanhu-import
npx tsx plugins/lanhu/fetch.ts --help
```

Logic:
1. Load `LANHU_COOKIE` from .env via `initEnv()`
2. Parse lanhu URL to extract project/page parameters
3. Fetch page content via HTTP GET with cookie header
4. Extract: page title, text descriptions, image URLs
5. Download images to `{output}/images/`
6. Generate a raw PRD markdown file at `{output}/raw-prd.md`:
   - Front-matter: source URL, fetch date
   - Body: page title + text content + image references
7. Compress images > 2000px via image-compress.ts

Output JSON: `{ "prd_path": "...", "images": 3, "title": "需求标题" }`

Note: This is a best-effort crawler. Lanhu's page structure may change. The script should handle errors gracefully and output partial results when possible.

- [ ] **Step 2: Write basic tests**

Test URL parsing. Test output directory creation. Skip actual HTTP calls in tests.

- [ ] **Step 3: Commit**

```bash
git add plugins/lanhu/ .claude/scripts/__tests__/lanhu-plugin.test.ts && git commit -m "feat: implement lanhu plugin (PRD content + image fetcher)"
```

---

## Task 3: zentao Plugin Implementation

**Files:**
- Create: `plugins/zentao/fetch.ts`

- [ ] **Step 1: Implement fetch.ts**

CLI:
```
npx tsx plugins/zentao/fetch.ts --bug-id 138845 --output workspace/.temp/zentao
npx tsx plugins/zentao/fetch.ts --help
```

Logic:
1. Load ZENTAO_BASE_URL, ZENTAO_ACCOUNT, ZENTAO_PASSWORD from .env
2. Login to zentao via API: POST `{base}/zentao/user-login.json` with account/password
3. Fetch bug detail: GET `{base}/zentao/bug-view-{bugId}.json` with session cookie
4. Extract: title, steps to reproduce, severity, assignee, fix branch, affected module
5. Parse fix branch pattern: `hotfix_{version}_{bugId}` or custom pattern
6. Write bug info to `{output}/bug-{bugId}.json`

Output JSON: `{ "bug_id": 138845, "title": "...", "fix_branch": "hotfix_6.4.10_138845", "severity": "major", "output_path": "..." }`

Graceful degradation: if zentao API is unreachable, output `{ "error": "...", "partial": true }` with whatever info was extracted from the URL itself.

- [ ] **Step 2: Write tests**

Test bug ID extraction from URL. Test output file structure. Mock HTTP responses.

- [ ] **Step 3: Commit**

```bash
git add plugins/zentao/ .claude/scripts/__tests__/zentao-plugin.test.ts && git commit -m "feat: implement zentao plugin (bug info + fix branch fetcher)"
```

---

## Task 4: code-analysis Skill

**Files:**
- Create: `.claude/skills/code-analysis/SKILL.md`, `prompts/*.md`, `references/*.md`, `templates/*.html.hbs`

- [ ] **Step 1: Write code-analysis SKILL.md (< 300 lines)**

```yaml
---
name: code-analysis
description: "代码分析报告。将报错日志、合并冲突、禅道 Bug 链接转化为结构化 HTML 报告或 Hotfix 测试用例。触发词：帮我分析这个报错、分析冲突、看看这个异常、生成 bug 报告。禅道链接直接触发 Hotfix 用例生成。"
argument-hint: "[报错日志 | 禅道链接 | 冲突代码]"
---
```

Body: Mode detection → route to prompts.

| 模式 | 触发信号 | Prompt | 输出 |
|------|----------|--------|------|
| A: 后端 Bug | Java stack trace, Exception | backend-bug.md | HTML 报告 |
| B: 合并冲突 | <<<<<<< HEAD markers | conflict.md | HTML 报告 |
| C: 前端 Bug | TypeError, React error | frontend-bug.md | HTML 报告 |
| D: 信息不足 | 模糊描述 | — | 补料清单 |
| E: Hotfix 用例 | 禅道 URL | hotfix-case.md | Markdown 用例 |

Mode E highest priority: zentao URL → immediately trigger, no menu.

For A/B/C: AI reads prompt, analyzes code/logs, generates report data, renders HTML via:
```
npx tsx .claude/scripts/archive-gen.ts convert --input {{report_json}} --template templates/bug-report.html.hbs --output workspace/reports/bugs/{{date}}/{{title}}.html
```

For E: fetch bug info via plugin → sync repo → analyze code changes → generate test case markdown.

Notify at end:
```
npx tsx .claude/scripts/plugin-loader.ts notify --event bug-report --data '{{json}}'
```

- [ ] **Step 2: Write 4 prompt files**

Each prompt (~100-150 lines) instructs AI on analysis methodology:
- `backend-bug.md`: Extract stack trace → locate in source → root cause → fix suggestion
- `frontend-bug.md`: Identify error type → component trace → 4-layer analysis
- `conflict.md`: Parse conflict blocks → classify → merge suggestions
- `hotfix-case.md`: Analyze git diff → generate single test case in archive format

- [ ] **Step 3: Write references/env-vs-code.md**

Checklist for distinguishing environment issues vs code bugs (~40 lines).

- [ ] **Step 4: Write HTML report templates**

`templates/bug-report.html.hbs`: Standalone HTML with embedded CSS. Sections: summary, stack trace, root cause analysis, code references, fix suggestions, environment info.

`templates/conflict-report.html.hbs`: Conflict blocks, classification, merge recommendations, files affected.

Both templates should produce readable, self-contained HTML that can be opened in a browser or shared via IM.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/code-analysis/ templates/bug-report.html.hbs templates/conflict-report.html.hbs && git commit -m "feat: add code-analysis skill (bug/conflict/hotfix analysis)"
```

---

## Task 5: ui-autotest Skill

**Files:**
- Create: `.claude/skills/ui-autotest/SKILL.md`, `prompts/*.md`, `scripts/*.ts`

- [ ] **Step 1: Write ui-autotest SKILL.md (< 400 lines)**

```yaml
---
name: ui-autotest
description: "UI 自动化测试。将 Archive MD 测试用例转化为 Playwright TypeScript 脚本，执行验证，失败时生成 Bug 报告。触发词：UI自动化测试、自动化回归、执行UI测试、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---
```

Body: Workflow steps:
1. Read archive MD → parse cases via `parse-cases.ts`
2. Interactive: confirm target URL + branches + execution mode
3. Session login via `session-login.ts`
4. Dispatch script-writer sub-agents (read prompts/script-writer.md)
5. Merge generated code blocks via `merge-specs.ts` → smoke.spec.ts + full.spec.ts
6. Execute Playwright tests
7. Failed cases → bug-reporter sub-agent (read prompts/bug-reporter.md)
8. Notify

- [ ] **Step 2: Write prompts**

`prompts/script-writer.md` (~200 lines): Instruct AI to generate Playwright TypeScript test code for each case. Reference playwright-cli skill for API usage. Use page.locator(), expect(), test.describe() patterns.

`prompts/bug-reporter.md` (~100 lines): Generate HTML bug report for failed test cases with screenshots, network requests, console errors.

- [ ] **Step 3: Write utility scripts**

`scripts/parse-cases.ts`: Parse archive MD into test task queue JSON.
```
npx tsx .claude/skills/ui-autotest/scripts/parse-cases.ts --file workspace/archive/202604/xxx.md
```
Output: `{ "tasks": [{ "title": "...", "priority": "P0", "steps": [...], "page": "..." }] }`

`scripts/merge-specs.ts`: Merge code blocks from sub-agents into spec files.
```
npx tsx .claude/skills/ui-autotest/scripts/merge-specs.ts --input workspace/.temp/ui-blocks/ --output tests/e2e/202604/xxx/
```
Output: `{ "smoke_spec": "...", "full_spec": "...", "case_count": { "smoke": 5, "full": 20 } }`

`scripts/session-login.ts`: Manage Playwright session state (cookies/localStorage).
```
npx tsx .claude/skills/ui-autotest/scripts/session-login.ts --url https://xxx.dtstack.cn --output .auth/session.json
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/ui-autotest/ && git commit -m "feat: add ui-autotest skill (Playwright test generation + execution)"
```

---

## Task 6: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

Standard open-source README structure (in Chinese):

```markdown
# qa-flow

AI 驱动的 QA 测试用例生成工作流，基于 Claude Code Skills 构建。

## 特性
- 6 节点工作流、多 Agent 并行、插件化集成、交互式流程、偏好学习、独立工具链

## 快速开始
### 安装
### 初始化
### 使用示例

## 项目结构
(directory tree)

## Skills 索引
(table of all skills with trigger words)

## 插件开发
(plugin.json format + development guide)

## 脚本 CLI 参考
(table of all scripts with commands)

## 配置说明
(.env variables reference)

## 贡献指南
(PR workflow, code standards, biome)

## License
MIT
```

Target: ~200-300 lines, comprehensive but not verbose.

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: add comprehensive README.md for open-source release"
```

---

## Task 7: Final Integration Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

- [ ] **Step 2: Verify all skills**

```bash
for skill in qa-flow test-case-gen setup xmind-editor code-analysis ui-autotest; do
  echo "=== $skill ==="
  head -4 .claude/skills/$skill/SKILL.md
  wc -l .claude/skills/$skill/SKILL.md
done
```

- [ ] **Step 3: Verify all plugins**

```bash
for plugin in lanhu zentao notify; do
  echo "=== $plugin ==="
  npx tsx plugins/$plugin/*.ts --help 2>&1 | head -1
done
```

- [ ] **Step 4: Verify project structure matches spec**

Compare actual directory tree against spec Section 4.

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: qa-flow v2.0 complete — all skills, plugins, scripts, and docs ready

6 skills | 3 plugins | 10 shared scripts | 1 init wizard
Full test coverage | Biome clean | README complete
Ready for open-source release."
```

---

## Dependency Graph

```
Task 1 (notify plugin) ─── independent
Task 2 (lanhu plugin) ──── independent
Task 3 (zentao plugin) ─── independent
    │
    ▼
Task 4 (code-analysis skill) ── depends on zentao plugin for Mode E
    │
Task 5 (ui-autotest skill) ─── independent
    │
    ▼
Task 6 (README) ── after all features complete
    │
    ▼
Task 7 (final verification)
```

Tasks 1, 2, 3, 5 can run in parallel.
Task 4 depends on Task 3 (zentao).
Task 6 after all feature tasks.
