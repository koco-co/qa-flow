# qa-flow v2.0 P1: setup + qa-flow + xmind-editor Skills

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 remaining core skills — the setup wizard for project initialization, the qa-flow entry point for menu routing, and the xmind-editor for case editing — completing the user-facing skill layer.

**Architecture:** Each skill is a SKILL.md (< 500 lines) with optional prompts/references/scripts. All skills use the shared TS scripts from P0 via explicit `npx tsx` commands.

**Tech Stack:** TypeScript ESM / Claude Code Skills (Anthropic spec) / commander CLI

**Prerequisite:** P0 plan complete (project skeleton, all 10 shared scripts, test-case-gen skill).

---

## File Structure

### New files to create

```
# setup skill
.claude/skills/setup/SKILL.md
.claude/skills/setup/scripts/init-wizard.ts
.claude/skills/setup/references/repo-setup.md

# qa-flow skill (entry point)
.claude/skills/qa-flow/SKILL.md
.claude/skills/qa-flow/references/quickstart.md

# xmind-editor skill
.claude/skills/xmind-editor/SKILL.md

# settings
.claude/settings.json
```

---

## Task 1: setup Skill — Init Wizard Script

**Files:**
- Create: `.claude/skills/setup/scripts/init-wizard.ts`

This is a TS CLI script with 2 subcommands used by the setup SKILL.md.

- [ ] **Step 1: Implement init-wizard.ts**

CLI via commander:

```
npx tsx .claude/skills/setup/scripts/init-wizard.ts scan
npx tsx .claude/skills/setup/scripts/init-wizard.ts verify
npx tsx .claude/skills/setup/scripts/init-wizard.ts --help
```

**`scan` subcommand:**
1. Check Node.js version (>= 22)
2. Check if `package.json` exists and deps are installed (`node_modules/`)
3. Check if `workspace/` directory exists
4. Check if `.env` exists (vs `.env.example`)
5. Scan `plugins/*/plugin.json` for available plugins
6. Check each plugin's active status (reuse logic from plugin-loader.ts, or just call it)
7. Check if `workspace/.repos/` has any cloned repos

Output JSON to stdout:
```json
{
  "node_version": "v22.0.0",
  "deps_installed": true,
  "workspace_exists": false,
  "env_configured": false,
  "plugins": [
    { "name": "lanhu", "active": false, "env_missing": ["LANHU_COOKIE"] },
    { "name": "notify", "active": true, "env_missing": [] }
  ],
  "repos": [],
  "issues": ["workspace/ 目录不存在", ".env 未配置"]
}
```

**`verify` subcommand:**
Same checks as `scan`, but formatted as a status table:
```json
{
  "checks": [
    { "name": "Node.js", "status": "pass", "detail": "v22.0.0" },
    { "name": "依赖安装", "status": "pass", "detail": "node_modules/ 存在" },
    { "name": "工作区", "status": "pass", "detail": "workspace/ 已创建" },
    { "name": ".env 配置", "status": "pass", "detail": "已配置" },
    { "name": "蓝湖插件", "status": "skip", "detail": "未配置 LANHU_COOKIE" },
    { "name": "IM 通知插件", "status": "pass", "detail": "钉钉已配置" }
  ],
  "all_pass": true
}
```

- [ ] **Step 2: Write basic tests**

Test `scan` returns valid JSON with required fields. Test `verify` returns checks array.

- [ ] **Step 3: Verify --help and commit**

```bash
npx tsx .claude/skills/setup/scripts/init-wizard.ts --help
git add .claude/skills/setup/scripts/ && git commit -m "feat: add init-wizard.ts (scan + verify)"
```

---

## Task 2: setup Skill — SKILL.md + References

**Files:**
- Create: `.claude/skills/setup/SKILL.md`, `.claude/skills/setup/references/repo-setup.md`

- [ ] **Step 1: Write setup SKILL.md (< 300 lines)**

Frontmatter:
```yaml
---
name: setup
description: "qa-flow 环境初始化向导。5 步交互式引导完成工作区创建、依赖安装、
  源码仓库配置、插件配置和环境验证。触发词：初始化、init、环境配置、setup。
  也由 /qa-flow init 路由调用。"
argument-hint: "[step-number]"
---
```

Body: 5-step interactive wizard. Each step has:
- Exact command to run
- Interactive checkpoint with recommended option
- What happens on skip

**Step 1: 检测环境**
```
npx tsx .claude/skills/setup/scripts/init-wizard.ts scan
```
Show scan results. If issues found, offer to fix.

**Step 2: 配置工作区**
Create `workspace/` subdirectories:
```bash
mkdir -p workspace/{prds,xmind,archive,issues,history,reports,.repos,.temp}
```
Checkpoint: 「工作区目录名？」选项: [✓ workspace] [自定义]

**Step 3: 配置源码仓库（可选）**
Ask if user needs source repos. If yes:
- User provides git URL(s)
- Parse URL via `parseGitUrl()` logic
- Execute: `npx tsx .claude/scripts/repo-sync.ts --url {{url}} --branch main --base-dir workspace/.repos`
- Reference `${CLAUDE_SKILL_DIR}/references/repo-setup.md` for detailed guide

Checkpoint: [添加仓库] [跳过]

**Step 4: 配置插件（可选）**
Scan plugins, for each inactive plugin with missing env vars:
- Show which env vars are needed
- Guide user to edit `.env`
- After user edits, re-check

Checkpoint: per-plugin [配置] [跳过]

**Step 5: 验证汇总**
```
npx tsx .claude/skills/setup/scripts/init-wizard.ts verify
```
Display status table. If all pass, show success. If issues remain, list them.

- [ ] **Step 2: Write repo-setup.md reference**

Guide for configuring source repositories:
- URL format: `http://gitlab.xxx/group/repo.git`
- Auto-grouping: URL → `workspace/.repos/{group}/{repo}/`
- Branch mapping
- Read-only rules (no push/commit)
- Multiple repos support

Target: ~60 lines.

- [ ] **Step 3: Verify line count and commit**

```bash
wc -l .claude/skills/setup/SKILL.md  # must be < 300
git add .claude/skills/setup/ && git commit -m "feat: add setup skill (5-step interactive init wizard)"
```

---

## Task 3: qa-flow Skill — Entry Point

**Files:**
- Create: `.claude/skills/qa-flow/SKILL.md`, `.claude/skills/qa-flow/references/quickstart.md`

- [ ] **Step 1: Write qa-flow SKILL.md (< 100 lines)**

This is the simplest skill — pure routing, no business logic.

Frontmatter:
```yaml
---
name: qa-flow
description: "QA 测试工作流入口。展示功能菜单并路由到对应 skill。
  触发词：qa-flow、功能菜单、帮助、help。
  /qa-flow init 路由到 setup skill。"
argument-hint: "[init | 功能编号 | 关键词]"
---
```

Body: Route based on `$ARGUMENTS`:

| 输入 | 路由 |
|------|------|
| 空 / help | 展示功能菜单 + 快速示例 |
| init / 0 | 提示用户执行 `/setup` |
| 1 / 生成用例 / test | 提示用户执行 `/test-case-gen` |
| 2 / 分析报错 / bug | 提示用户执行 `/code-analysis`（P2 skill，尚未实现则提示） |
| 3 / 编辑用例 / xmind | 提示用户执行 `/xmind-editor` |
| 4 / UI测试 / autotest | 提示用户执行 `/ui-autotest`（P2 skill，尚未实现则提示） |

Menu display format:
```
## qa-flow 功能菜单

| 编号 | 功能 | 命令 | 状态 |
|------|------|------|------|
| 0 | 环境初始化 | /setup | ✅ |
| 1 | 生成测试用例 | /test-case-gen | ✅ |
| 2 | 分析报错/冲突 | /code-analysis | 🚧 P2 |
| 3 | 编辑 XMind 用例 | /xmind-editor | ✅ |
| 4 | UI 自动化测试 | /ui-autotest | 🚧 P2 |

输入编号或功能名称选择，或直接使用对应命令。
```

- [ ] **Step 2: Write quickstart.md reference**

Quick examples for each function:
```markdown
# 快速示例

## 生成测试用例
为 xxx 生成测试用例
为 xxx --quick 生成测试用例

## 分析报错
帮我分析这个报错
http://zenpms.dtstack.cn/zentao/bug-view-138845.html

## 编辑用例
修改用例 "验证xxx"
新增用例 到 "列表页" 分组

## 环境初始化
/setup
```

Target: ~40 lines.

- [ ] **Step 3: Verify and commit**

```bash
wc -l .claude/skills/qa-flow/SKILL.md  # must be < 100
git add .claude/skills/qa-flow/ && git commit -m "feat: add qa-flow skill (entry point menu router)"
```

---

## Task 4: xmind-editor Skill

**Files:**
- Create: `.claude/skills/xmind-editor/SKILL.md`

- [ ] **Step 1: Write xmind-editor SKILL.md (< 150 lines)**

Frontmatter:
```yaml
---
name: xmind-editor
description: "XMind 测试用例局部编辑。无需 PRD，直接搜索、查看、修改、新增、
  删除已有 XMind 文件中的用例。触发词：修改用例、编辑用例、新增用例、
  更新步骤、删除用例。修改完成后触发偏好规则写入流程。"
argument-hint: "[操作] [用例标题或关键词]"
---
```

Body: 5 subcommands with exact `npx tsx` commands.

**前置加载**：
- 读取 `preferences/` 目录下所有 `.md` 文件

**搜索用例**
```
npx tsx .claude/scripts/xmind-edit.ts search "{{keyword}}" --dir workspace/xmind
```
展示匹配结果列表，让用户选择。

**查看用例**
```
npx tsx .claude/scripts/xmind-edit.ts show --file {{file}} --title "{{title}}"
```
展示完整用例内容（标题、优先级、前置条件、步骤），等待用户指令。

**修改用例**
1. 先 `show` 展示当前内容
2. 用户说明修改内容
3. AI 构造 `--case-json`
4. 执行：`npx tsx .claude/scripts/xmind-edit.ts patch --file {{file}} --title "{{title}}" --case-json '{{json}}'`
5. 展示修改前后对比
6. **触发偏好写入流程**：提炼反馈 → 确认 → 写入 preferences/ 对应文件

**新增用例**
1. 确认目标文件和父节点
2. AI 按 test-case-rules 生成 case-json
3. 执行：`npx tsx .claude/scripts/xmind-edit.ts add --file {{file}} --parent "{{parent}}" --case-json '{{json}}'`

**删除用例**
1. 先 `--dry-run` 预览
2. 用户确认后执行删除

**偏好写入流程**（修改/新增后触发）：
```
修改完成，用户验收通过
    ↓
AI 提炼反馈要点：
  「导出按钮的预期结果应包含文件命名规则和导出条数限制」
    ↓
向用户确认：是否写入 preferences/case-writing.md？
  选项：[✓ 写入] [调整后写入] [跳过]
    ↓
写入对应偏好文件
```

- [ ] **Step 2: Verify and commit**

```bash
wc -l .claude/skills/xmind-editor/SKILL.md  # must be < 150
git add .claude/skills/xmind-editor/ && git commit -m "feat: add xmind-editor skill (search, show, patch, add, delete + preference learning)"
```

---

## Task 5: Claude Code Settings

**Files:**
- Create: `.claude/settings.json`

- [ ] **Step 1: Write settings.json**

Minimal hooks configuration for v2.0:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0; cd \"$ROOT\"; git diff --quiet && git diff --cached --quiet || (git add -A && git commit -m \"chore: auto-commit session changes\") || true'"
          }
        ]
      }
    ]
  }
}
```

Only the Stop hook for auto-commit on session end. No notification hooks (notification is now a plugin).

- [ ] **Step 2: Commit**

```bash
git add .claude/settings.json && git commit -m "feat: add Claude Code settings (auto-commit on stop)"
```

---

## Task 6: Integration Verification

- [ ] **Step 1: Verify all skills exist and have valid frontmatter**

```bash
for skill in qa-flow test-case-gen setup xmind-editor; do
  echo "=== $skill ==="
  head -5 .claude/skills/$skill/SKILL.md
  wc -l .claude/skills/$skill/SKILL.md
done
```

- [ ] **Step 2: Verify init-wizard script works**

```bash
npx tsx .claude/skills/setup/scripts/init-wizard.ts --help
npx tsx .claude/skills/setup/scripts/init-wizard.ts scan
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests still pass (no regressions).

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "chore: P1 complete — setup, qa-flow, xmind-editor skills ready"
```

---

## Dependency Graph

```
Task 1 (init-wizard.ts)
    │
    ▼
Task 2 (setup SKILL.md) ─── depends on init-wizard.ts commands
    │
Task 3 (qa-flow SKILL.md) ─── independent
    │
Task 4 (xmind-editor SKILL.md) ─── independent
    │
Task 5 (settings.json) ─── independent
    │
    ▼
Task 6 (integration verification)
```

Tasks 2, 3, 4, 5 can run in parallel after Task 1.

---

## Next Plan

After this plan completes:
- **Plan 3**: P2/P3 — code-analysis skill + plugin implementations (lanhu/fetch.ts, zentao/fetch.ts, notify/send.ts) + ui-autotest skill + README.md
