# Phase 7 — Phase 1 完备性审计 实施 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 回填 roadmap §阶段 1 未闭环的验收工作：跑通 knowledge-keeper / create-project 两条 smoke 链路 + legacy historys 迁移 smoke、归档审计报告、修正 `init-wizard.ts` 两处过时文案并补单测、更新 roadmap 将 Phase 1 标为 ✅ DONE 并新增 Phase 7 行。

**Architecture:** 纯验证 + 小文案 patch + 状态对齐。不改 create-project / knowledge-keeper / setup 任一 CLI 行为；仅改 init-wizard.ts 两行文案 + 新增最小单测。

**Tech Stack:** Bun + existing CLI scripts + `node:test`（新单测沿用仓库既有范式）

**Spec:** [`../specs/2026-04-19-phase1-completeness-audit-design.md`](../specs/2026-04-19-phase1-completeness-audit-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

**Baseline:** Phase 7 起点 **823 pass**；结束后 **≥ 824 pass**（预期 +1 init-wizard 单测）。

---

## 关键现状确认（实施前须核对）

| 事实 | 核对命令 |
|---|---|
| Phase 1 代码已全部落地 | `ls .claude/scripts/create-project.ts .claude/scripts/knowledge-keeper.ts .claude/skills/create-project/SKILL.md .claude/skills/knowledge-keeper/SKILL.md templates/project-skeleton/` |
| setup SKILL.md 已瘦身（步骤 2 仅剩路由提示，步骤 4 项目级校验已剔除） | `grep -n "项目骨架与源码仓库由 create-project 接管" .claude/skills/setup/SKILL.md` |
| init-wizard.ts 仅保留 scan + verify | `grep -n "^\.command" .claude/skills/setup/scripts/init-wizard.ts` |
| `.claude/skills/setup/__tests__/` 不存在 | `ls .claude/skills/setup/__tests__/ 2>&1` — Task 5 需新建 |
| init-wizard.ts 有两处 `/using-qa-flow init` | `grep -n "using-qa-flow" .claude/skills/setup/scripts/init-wizard.ts` |
| 基线 823 pass | `bun test ./.claude/scripts/__tests__ 2>&1 \| tail -3` |

**若以上任一核对失败，先在对话中向用户报告差异，不得继续实施。**

---

## 文件布局

| 文件 | 动作 | 职责 |
|---|---|---|
| `docs/refactor/plans/2026-04-19-phase7-audit.md` | Create | 审计报告：三张 gap 表 + smoke 实际输出 + 结论 |
| `.claude/skills/setup/scripts/init-wizard.ts` | Edit | 第 239 / 287 两处 `/using-qa-flow init` → `/qa-flow init` |
| `.claude/skills/setup/__tests__/init-wizard.test.ts` | Create | 最小单测（≥ 1 test case）断言 scan issues 含 `/qa-flow init` |
| `docs/refactor-roadmap.md` | Edit | Phase 1 ⏳ → ✅；阶段索引末尾新增 Phase 7 行 |

**不改动的文件（本 phase 守则）：**
- `.claude/scripts/create-project.ts` / `.claude/scripts/lib/create-project.ts`
- `.claude/scripts/knowledge-keeper.ts` / `.claude/scripts/lib/knowledge.ts`
- `.claude/skills/create-project/SKILL.md` / `.claude/skills/knowledge-keeper/SKILL.md` / `.claude/skills/setup/SKILL.md`
- `templates/project-skeleton/**`
- `rules/**` / `workspace/**/rules/**` / `workspace/**/knowledge/**`（smoke 临时写入需回滚）
- `CLAUDE.md` / `README.md` / `README-EN.md`

---

## 共享约束（跨 Task 一致性）

- **cwd**：`/Users/poco/Projects/qa-flow`
- **workspace 只读**：`workspace/{project}/.repos/` 永不 push/commit；smoke 临时写入的 workspace/dataAssets/knowledge/ 结束立刻 `git checkout` 回滚
- **config.json 备份协议**：涉及 `config.json` 修改的 smoke 必须 `cp config.json config.json.bak` → smoke 结束 `mv config.json.bak config.json`
- **禁硬编码**：smoke 命令用相对路径；单测用 `repoRoot()`
- **副作用清理铁律**：每个 smoke 步骤后验证 `git status` 干净（允许 `config.json` 暂存后立即回滚）
- **主 agent 禁自行调试**：若 smoke / 单测失败 → 派发 sub-agent（Task subagent 或 Explore）定位；主 agent 不亲自调试
- **无 Co-Authored-By；无 push**
- **commit 粒度**：每 Task 完成独立 atomic commit（见 §Commit 序列）

---

## Task 1: 跑 knowledge-keeper smoke 并收集输出

- [ ] 1.1 **前置备份**：`cp config.json config.json.bak.phase7-kk`（保险）
- [ ] 1.2 **Step 1 read-core**：
  ```bash
  bun run .claude/scripts/knowledge-keeper.ts read-core --project dataAssets \
    | jq '{ title: .overview.title, terms_count: (.terms | length) }'
  ```
  记录输出到 Task 4 的 audit 报告 §3.1。
- [ ] 1.3 **Step 2 dry-run write**：
  ```bash
  bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
    --type term --confidence high \
    --content '{"term":"PHASE7_SMOKE","zh":"阶段 7 烟雾","desc":"Phase 7 审计验证","alias":""}' \
    --dry-run
  ```
  断言：返回 JSON 含 `"dry_run": true`。
- [ ] 1.4 **Step 3 confirmed write**：
  ```bash
  bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
    --type term --confidence high \
    --content '{"term":"PHASE7_SMOKE","zh":"阶段 7 烟雾","desc":"Phase 7 审计验证","alias":""}' \
    --confirmed
  ```
  断言：exit 0。
- [ ] 1.5 **Step 4 验证写入**：
  ```bash
  grep -q "PHASE7_SMOKE" workspace/dataAssets/knowledge/terms.md && echo OK_terms
  grep -q "last-indexed" workspace/dataAssets/knowledge/_index.md && echo OK_index
  ```
  两条都必须输出 `OK_*`。
- [ ] 1.6 **Step 5 lint**：
  ```bash
  bun run .claude/scripts/knowledge-keeper.ts lint --project dataAssets
  ```
  exit code 应为 0 或 2（2 = 只有 warnings，符合现状）。
- [ ] 1.7 **Step 6 回滚 workspace**：
  ```bash
  git checkout workspace/dataAssets/knowledge/
  git status workspace/dataAssets/knowledge/  # 必须干净
  ```
- [ ] 1.8 **Step 7 清理备份**：`rm -f config.json.bak.phase7-kk`
- [ ] 1.9 **归档输出**：所有命令的 stdout + exit code 原样收集，用于 Task 4

**验收**：步骤 1-7 全部通过；`git status` 在 workspace/dataAssets/ 下无未提交改动。

---

## Task 2: 跑 create-project smoke 并收集输出

- [ ] 2.1 **前置清理**：
  ```bash
  rm -rf workspace/smokeProj
  cp config.json config.json.bak.phase7-cp
  ```
- [ ] 2.2 **Step 1 scan 不存在项目**：
  ```bash
  bun run .claude/scripts/create-project.ts scan --project smokeProj \
    | jq '{ exists, skeleton_complete, missing_dirs: (.missing_dirs | length) }'
  ```
  断言：`exists=false, skeleton_complete=false, missing_dirs ≥ 13`。
- [ ] 2.3 **Step 2 dry-run create**：
  ```bash
  bun run .claude/scripts/create-project.ts create --project smokeProj --dry-run \
    | jq '{ dry_run, dirs_count: (.will_create.dirs | length), will_register, will_call_index }'
  ```
  断言：`dry_run=true, will_register=true, will_call_index=true`。
- [ ] 2.4 **Step 3 confirmed create**：
  ```bash
  bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed
  ```
  exit 0；输出含 `index_generated: true`。
- [ ] 2.5 **Step 4 骨架验证（含 phase 6 命名）**：
  ```bash
  test -d workspace/smokeProj/history && echo OK_history_singular
  test ! -d workspace/smokeProj/historys && echo OK_no_historys_plural
  test -f workspace/smokeProj/knowledge/_index.md && echo OK_index_md
  test -f workspace/smokeProj/rules/README.md && echo OK_rules_readme
  test -f workspace/smokeProj/knowledge/overview.md && echo OK_overview
  jq '.projects.smokeProj' config.json  # 不能是 null
  ```
  6 条都必须输出 `OK_*` 或非 null。
- [ ] 2.6 **Step 5 幂等第二次 create**：
  ```bash
  bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed \
    | jq '.skipped'
  ```
  断言：返回 `true`。
- [ ] 2.7 **Step 6 lint 新项目**：
  ```bash
  bun run .claude/scripts/knowledge-keeper.ts lint --project smokeProj
  ```
  exit 0 或 2 均通过（空骨架 tags=[] 会产生 warning）。
- [ ] 2.8 **Step 7 清理**：
  ```bash
  rm -rf workspace/smokeProj
  mv config.json.bak.phase7-cp config.json
  git status config.json workspace/  # 必须干净
  ```
- [ ] 2.9 **归档输出**：所有命令 stdout + exit 用于 Task 4 audit §3.2

**验收**：步骤 1-7 全部通过；`workspace/smokeProj/` 与 `config.json` 改动无残留。

---

## Task 3: 跑 legacy historys 迁移 smoke

- [ ] 3.1 **前置构造老项目**：
  ```bash
  mkdir -p workspace/legacyProj/historys/v1
  echo "legacy data" > workspace/legacyProj/historys/v1/demo.md
  cp config.json config.json.bak.phase7-legacy
  ```
- [ ] 3.2 **Step 1 create --confirmed 触发迁移**：
  ```bash
  bun run .claude/scripts/create-project.ts create --project legacyProj --confirmed 2>&1 \
    | tee /tmp/phase7-legacy-smoke.log
  grep -i "renamed legacy" /tmp/phase7-legacy-smoke.log
  ```
  断言：stderr / log 含 `renamed legacy directory: historys → history`。
- [ ] 3.3 **Step 2 验证迁移**：
  ```bash
  test -d workspace/legacyProj/history/v1 && echo OK_new_dir
  test ! -d workspace/legacyProj/historys && echo OK_old_dir_gone
  cat workspace/legacyProj/history/v1/demo.md  # 必须输出 "legacy data"
  ```
- [ ] 3.4 **Step 3 清理**：
  ```bash
  rm -rf workspace/legacyProj
  mv config.json.bak.phase7-legacy config.json
  rm -f /tmp/phase7-legacy-smoke.log
  git status workspace/ config.json  # 必须干净
  ```
- [ ] 3.5 **归档输出**：用于 Task 4 audit §3.3

**验收**：legacy data 成功从 `historys/v1/demo.md` 迁移到 `history/v1/demo.md` 且内容一字不差。

---

## Task 4: 撰写审计报告 `docs/refactor/plans/2026-04-19-phase7-audit.md`

- [ ] 4.1 **新建文件** `docs/refactor/plans/2026-04-19-phase7-audit.md`，结构：

   ```markdown
   # Phase 7 — Phase 1 完备性审计报告

   **执行日期**：YYYY-MM-DD
   **Spec**：[`../specs/2026-04-19-phase1-completeness-audit-design.md`](../specs/2026-04-19-phase1-completeness-audit-design.md)
   **Roadmap**：[`../../refactor-roadmap.md`](../../refactor-roadmap.md)
   **起点基线**：823 pass
   **终点基线**：XXX pass

   ## 1. 审计范围
   - 子目标 1：knowledge-keeper
   - 子目标 2：create-project
   - 子目标 3：setup 瘦身

   ## 2. 承诺项对照表
   ### 2.1 knowledge-keeper（引 spec §1.1.1）
   （复制 spec 表）

   ### 2.2 create-project（引 spec §1.1.2）

   ### 2.3 setup 瘦身（引 spec §1.1.3）

   ## 3. Smoke 验证输出
   ### 3.1 knowledge-keeper（Task 1）
   （粘 stdout 输出，code block 格式）

   ### 3.2 create-project（Task 2）

   ### 3.3 legacy historys 迁移（Task 3）

   ## 4. 识别的 Gap 与处置
   （引 spec §1.2 表 + 本 phase Wave 2 修复结果）

   ## 5. 结论
   - Phase 1 完备度：≥ 99%
   - 剩余 enhancement：§9.3 backlog（B1-B5）
   - roadmap 状态：已更新为 ✅ DONE
   - 测试基线：XXX pass（+1 from 823）
   ```

- [ ] 4.2 **填充 §3** 的三节，每节带实际 stdout（从 Task 1-3 归档数据）
- [ ] 4.3 **填充 §2** 三张表（从 spec §1.1 复制，对实际情况做核对标记）
- [ ] 4.4 **填充 §4** 七个 Gap 的处置结论（S1/S2 → Wave 1 已跑；D1 → Wave 2 已修；C1/B1 → §9.2 决策；R1 → Wave 3 更新；E1 → backlog）
- [ ] 4.5 **§5 结论** 填入最终基线数字（Task 7 完成后回填）

**验收**：文件存在、结构完整、§3 含 Task 1-3 的实际命令 stdout；§5 的 "终点基线" 先留 `XXX`，Task 7 完成后回填。

---

## Task 5: 修正 init-wizard.ts 文案 + 新建单测

- [ ] 5.1 **Edit** `.claude/skills/setup/scripts/init-wizard.ts` 第 239 行：
   ```
   -    issues.push("workspace/ directory not found — run: /using-qa-flow init");
   +    issues.push("workspace/ directory not found — run: /qa-flow init");
   ```
- [ ] 5.2 **Edit** 同文件第 287 行：
   ```
   -        : "workspace/ 不存在，请运行 /using-qa-flow init",
   +        : "workspace/ 不存在，请运行 /qa-flow init",
   ```
- [ ] 5.3 **核对无其它遗漏**：`grep -n "using-qa-flow" .claude/skills/setup/scripts/init-wizard.ts` 应无输出
- [ ] 5.4 **新建测试文件** `.claude/skills/setup/__tests__/init-wizard.test.ts`：

   ```typescript
   import { test } from "node:test";
   import assert from "node:assert/strict";
   import { spawnSync } from "node:child_process";
   import { mkdtempSync, rmSync } from "node:fs";
   import { tmpdir } from "node:os";
   import { join, resolve } from "node:path";

   const repoRoot = resolve(import.meta.dirname, "../../../..");
   const scriptPath = resolve(repoRoot, ".claude/skills/setup/scripts/init-wizard.ts");

   test("scan issues reference /qa-flow init (not /using-qa-flow init)", () => {
     const isolatedHome = mkdtempSync(join(tmpdir(), "phase7-wizard-"));
     try {
       const result = spawnSync(
         "bun",
         ["run", scriptPath, "scan"],
         {
           cwd: isolatedHome,  // 在无 workspace/ 的隔离目录下跑，触发 issues
           env: { ...process.env, HOME: isolatedHome },
           encoding: "utf8",
         },
       );
       assert.equal(result.status, 0);
       const parsed = JSON.parse(result.stdout) as { issues: string[] };
       const joined = parsed.issues.join("\n");
       assert.match(joined, /\/qa-flow init/);
       assert.doesNotMatch(joined, /\/using-qa-flow init/);
     } finally {
       rmSync(isolatedHome, { recursive: true, force: true });
     }
   });
   ```

   **注意**：init-wizard.ts 用 `repoRoot()` 推导到真实仓库根，不受 cwd 影响；所以单测改为直接读 `ScanResult.issues` 里**任意**提示：断言在有 `node_modules` / `workspace/` / `.env` 的正常仓库里，issues 里**不出现** `/using-qa-flow`。若实际运行的仓库 workspace/ 存在（当前确实存在），`issues` 可能为空数组 — 此时断言调整为：
   ```typescript
   assert.doesNotMatch(joined, /\/using-qa-flow init/);
   // issues 可能为空，但只要没有 /using-qa-flow 就视为通过
   ```

   **若测试因 issues 空无法验证 `/qa-flow init` 存在**，改为**读源文件断言**的备用写法：
   ```typescript
   import { readFileSync } from "node:fs";
   test("init-wizard source no longer references /using-qa-flow init", () => {
     const src = readFileSync(scriptPath, "utf8");
     assert.doesNotMatch(src, /\/using-qa-flow init/);
     assert.match(src, /\/qa-flow init/);
   });
   ```
   这个备用写法更稳定，推荐直接采用。实施时**优先选备用写法**（源码级断言），执行路径断言若复杂就跳过。

- [ ] 5.5 **跑单测**：
   ```bash
   bun test .claude/skills/setup/__tests__/init-wizard.test.ts
   ```
   应为 1 pass。
- [ ] 5.6 **跑全量测试**（确保既有 823 无回归）：
   ```bash
   bun test ./.claude/scripts/__tests__ 2>&1 | tail -3
   ```
   仍为 823 pass。
- [ ] 5.7 **合计**：823（原）+ 1（新增）= 824 pass

**验收**：init-wizard.ts 无 `/using-qa-flow`；新单测通过；整体 ≥ 824 pass。

---

## Task 6: 更新 `docs/refactor-roadmap.md`

- [ ] 6.1 **Edit** Phase 1 行：
   ```
   -| **1** | `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施 | ⏳ PENDING | — | 新 skill 创建、setup 移除项目管理步骤、knowledge-keeper 代码实施 |
   +| **1** | `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施 | ✅ DONE | [`2026-04-17-knowledge-keeper-design.md`](refactor/specs/2026-04-17-knowledge-keeper-design.md) / [`2026-04-18-create-project-skill-design.md`](refactor/specs/2026-04-18-create-project-skill-design.md) / [`2026-04-19-phase1-completeness-audit-design.md`](refactor/specs/2026-04-19-phase1-completeness-audit-design.md) | 三子目标代码随 phase 0/6 合流落地；phase 7 补齐 smoke 验证与审计报告；init-wizard 文案修正；测试基线 824 pass |
   ```
- [ ] 6.2 **在阶段索引末尾新增 Phase 7 行**（Phase 6 之后）：
   ```
   | **7** | Phase 1 完备性审计 | ✅ DONE | [`2026-04-19-phase1-completeness-audit-design.md`](refactor/specs/2026-04-19-phase1-completeness-audit-design.md) | Smoke 验证归档（3 链路）+ init-wizard 文案修正 + roadmap 状态对齐；整轮重构主干 0-7 闭环；824 pass |
   ```
- [ ] 6.3 **更新顶部「最后更新」日期**：`最后更新：2026-04-19（phase 7 完成）`
- [ ] 6.4 **核对**：`grep "PENDING" docs/refactor-roadmap.md` 应无输出

**验收**：Phase 1 标 ✅；Phase 7 行存在；roadmap 顶部日期已更新；无遗留 PENDING。

---

## Task 7: 回填 audit 报告 + 最终验证 + commit 序列

- [ ] 7.1 **回填 audit §5**：将 Task 5 实际测试基线（824）填入 `docs/refactor/plans/2026-04-19-phase7-audit.md` §5
- [ ] 7.2 **最终全量测试**：
   ```bash
   bun test ./.claude/scripts/__tests__ 2>&1 | tail -3
   bun test .claude/skills/setup/__tests__/ 2>&1 | tail -3
   ```
   前者 823 pass；后者 1 pass。
- [ ] 7.3 **`git status` 核对**：本 phase 应有且仅有以下新增/修改文件：
   - `docs/refactor/specs/2026-04-19-phase1-completeness-audit-design.md`（已在 Phase 7 启动前提交可跳过；若未提交则本轮包含）
   - `docs/refactor/plans/2026-04-19-phase7-implementation.md`（本 plan；同上）
   - `docs/refactor/plans/2026-04-19-phase7-audit.md`（新建）
   - `.claude/skills/setup/scripts/init-wizard.ts`（两行文案）
   - `.claude/skills/setup/__tests__/init-wizard.test.ts`（新建）
   - `docs/refactor-roadmap.md`（Phase 1 + Phase 7 行）

- [ ] 7.4 **Commit 序列（atomic，逐 commit）**：

   ```bash
   # commit 1 (若 spec/plan 尚未 commit)
   git add docs/refactor/specs/2026-04-19-phase1-completeness-audit-design.md \
           docs/refactor/plans/2026-04-19-phase7-implementation.md
   git commit -m "docs(phase7): spec + plan for phase 1 completeness audit"

   # commit 2
   git add docs/refactor/plans/2026-04-19-phase7-audit.md
   git commit -m "docs(phase7): phase 1 audit report with smoke outputs"

   # commit 3
   git add .claude/skills/setup/scripts/init-wizard.ts \
           .claude/skills/setup/__tests__/init-wizard.test.ts
   git commit -m "fix(setup): init-wizard points to /qa-flow init (not /using-qa-flow init)"

   # commit 4
   git add docs/refactor-roadmap.md
   git commit -m "docs(roadmap): mark phase 1 DONE and record phase 7 completion"
   ```

- [ ] 7.5 **完成通知**：向用户汇报：
   - 4 个 commit 已完成
   - 测试基线 824 pass
   - roadmap 主轮次（Phase 0-7）闭环
   - 询问下阶段选型（收官 / Milestone v2 / Backlog B1-B5 / Phase 5 §9 延续补丁）

**验收**：所有 commit 原子独立；`git log --oneline -4` 可见 4 条 phase 7 commit；`git status` 干净；`bun test` 全绿。

---

## 风险与回滚策略

| 风险 | 触发条件 | 回滚 |
|---|---|---|
| smoke 污染 workspace/dataAssets/knowledge/ | Task 1 写入成功但回滚前出错 | `git checkout workspace/dataAssets/knowledge/` |
| smokeProj 残留 | Task 2 中途失败 | `rm -rf workspace/smokeProj` + `mv config.json.bak.phase7-cp config.json` |
| legacyProj 残留 | Task 3 中途失败 | `rm -rf workspace/legacyProj` + `mv config.json.bak.phase7-legacy config.json` |
| init-wizard 单测无法在当前仓库验证（issues 空） | Task 5.4 执行路径断言失效 | 采用 Task 5.4 备用写法（源码级断言） |
| config.json 备份文件 `.bak.phase7-*` 遗漏清理 | 任务中途中断 | 结束前 `ls config.json.bak.* 2>/dev/null` 核对；若有则 `mv` 最晚的回原名 |

---

## 完成后的 roadmap 态

```
| # | 目标 | 状态 |
|---|---|---|
| 0 | 信息架构 + rules 迁移 | ✅ |
| 1 | create-project + knowledge-keeper + setup 瘦身 | ✅ (phase 7 回填) |
| 2 | PRD 需求讨论 | ✅ |
| 3 | UI 自动化进化 | ✅ |
| 3.5 | skill 重排 | ✅ |
| 4 | MD 用例策略矩阵 | ✅ |
| 5 | 横切基础设施 | ✅ |
| 6 | 命名迁移 + README + 架构图 | ✅ |
| 7 | Phase 1 完备性审计 | ✅ |
```

整轮重构主干闭环。下一步由用户决定（Milestone v2 / 收官 / backlog 提升）。
