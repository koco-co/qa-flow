# Phase 1 完备性审计

**Phase**: 7 · `create-project` / `knowledge-keeper` / `setup` 瘦身 完备性审计与收尾（roadmap §阶段 1 回填）
**Date**: 2026-04-19
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream**:
- Phase 0 信息架构（[`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md)）
- Phase 1 子目标 1 `knowledge-keeper`（[`2026-04-17-knowledge-keeper-design.md`](./2026-04-17-knowledge-keeper-design.md)）
- Phase 1 子目标 2 `create-project`（[`2026-04-18-create-project-skill-design.md`](./2026-04-18-create-project-skill-design.md)）
- Phase 5 横切基础设施（[`2026-04-19-cross-cutting-infrastructure-design.md`](./2026-04-19-cross-cutting-infrastructure-design.md) §11.1 CLI 迁移例外清单）
- Phase 6 命名迁移（[`2026-04-19-naming-readme-diagrams-design.md`](./2026-04-19-naming-readme-diagrams-design.md) §9.2.4 repair 触发时机决议）

---

## 1. Context

Phase 0-6 主轮次已全部 DONE，测试基线 **823 pass**。但 roadmap §阶段索引中，**Phase 1 仍标记为 ⏳ PENDING**：

```
| 1 | create-project skill + setup 瘦身 + knowledge-keeper 实施 | ⏳ PENDING | — | ... |
```

实际情况：Phase 1 的代码实施早在 Phase 0 / Phase 6 期间随其他阶段合流落地（最初在 2026-04-17/18 的 create-project-implementation plan 中完成），但从未显式跑过 "Phase 1 闭环验收"。

Phase 6 spec §10 曾明确指出：

> 阶段 1（`create-project` / `knowledge-keeper` 代码实施）仍标 ⏳ PENDING，若尚未单独推进，应作为 **Phase 7** 启动。

本 Phase 7 不引入新能力，**只做审计 + 少量打磨 + 状态对齐**，让主轮次（0-7 合并视为 0-6 + 1 的回填）画上完整句号。

### 1.1 现状盘点（Audit 初稿）

对 Phase 1 三个子目标做实施盘点，对照对应 spec 的 Success Criteria：

#### 1.1.1 子目标 1 — knowledge-keeper（spec: [`2026-04-17-knowledge-keeper-design.md`](./2026-04-17-knowledge-keeper-design.md) §9）

| 承诺项 | 现状 | 结论 |
|---|---|---|
| CLI `knowledge-keeper.ts` | ✅ 711 行，已迁 cli-runner | DONE |
| SKILL.md（场景 A/B/C 完整） | ✅ 181 行，置信度分流 + subagent 守则齐全 | DONE |
| 7 个 actions（read-core / read-module / read-pitfall / write / update / index / lint） | ✅ 全部实现 | DONE |
| W2 置信度分级（high 直写 / medium AskUser / low 强制升级） | ✅ `confidenceGate` 函数 + CLI action gate | DONE |
| R3 分层懒加载（核心 / 模块 / 坑） | ✅ CLI 提供三条读路径；其他 skill 集成延后（spec §7.5 自说明） | DONE |
| 向前兼容 Phase 0 骨架（自动补 frontmatter） | ✅ `autoFixFrontmatter` 函数 + `index` action 自动触发 | DONE |
| `paths.ts` knowledge helper | ✅ `knowledgeDir` / `knowledgePath` | DONE |
| 单元 + 集成测试 | ✅ `knowledge-keeper.test.ts` 630 行（31 test cases） + `lib/knowledge.test.ts` 558 行 | DONE |
| Smoke 验证（spec §8.3 六步） | ❌ 无归档记录，未跑过 | **GAP-S1** |

#### 1.1.2 子目标 2 — create-project（spec: [`2026-04-18-create-project-skill-design.md`](./2026-04-18-create-project-skill-design.md) §9）

| 承诺项 | 现状 | 结论 |
|---|---|---|
| CLI `create-project.ts` + `lib/create-project.ts` | ✅ 336 + 249 行，已迁 cli-runner | DONE |
| SKILL.md（场景 A/B/C） | ✅ 139 行，subagent 守则齐全 | DONE |
| 3 actions（scan / create / clone-repo） | ✅ 全部实现 | DONE |
| 幂等补齐 | ✅ `skeleton_complete + config_registered` 双重判断；`applyCreate` 保留已存在文件 | DONE |
| `templates/project-skeleton/` 骨架 | ✅ `knowledge/overview.md`、`knowledge/terms.md`、`rules/README.md` 三文件 + `{{project}}` 占位 | DONE |
| init-wizard.ts `clone` 子命令迁出 | ✅ `init-wizard.ts` 仅剩 `scan` + `verify` | DONE |
| 项目名校验 | ✅ `validateProjectName` + 17 个保留字 | DONE |
| 单元 + 集成测试 | ✅ `create-project.test.ts` 499 行（17 test cases） + `lib/create-project.test.ts` 330 行 | DONE |
| 创建后自动调 `knowledge-keeper index` | ✅ `applyCreate` 第 213 行 `spawnSync` | DONE |
| Smoke 验证（spec §8.3 六步 + phase 6 "新项目 history/" 验证） | ❌ 无归档记录 | **GAP-S2** |
| Phase 6 legacy `historys → history` 自动迁移 | ✅ `migrateLegacyHistorys` + create 时调用 | DONE（phase 6 附带） |

#### 1.1.3 子目标 3 — setup 瘦身（spec 未单列；散落在 create-project spec §3 Non-Goals 与 Phase 3.5 skill 重排中）

| 承诺项 | 现状 | 结论 |
|---|---|---|
| SKILL.md 步骤 2（项目管理）移除 | ✅ 现为 "路由到 create-project" 提示性步骤，不阻塞 | DONE |
| SKILL.md 步骤 4（源码仓库配置）剔除 | ✅ 项目级验证明确交给 `create-project scan` | DONE |
| init-wizard.ts 瘦身（仅保留 scan / verify） | ✅ 验证：grep 无 `clone` 子命令 | DONE |
| `/using-qa-flow init` → `/qa-flow init` 替换（Phase 3.5 skill 重排未覆盖到该文件） | ❌ init-wizard.ts 第 239 / 287 两处遗漏 | **GAP-D1** |

### 1.2 识别的 Gap 汇总

| ID | 严重度 | 类别 | 描述 | 处置 |
|---|---|---|---|---|
| GAP-S1 | 🟡 Low | 验证 | knowledge-keeper spec §8.3 承诺的 6 步 smoke 未归档 | Phase 7 Wave 1 执行 |
| GAP-S2 | 🟡 Low | 验证 | create-project spec §8.3 承诺的 6 步 smoke 未归档；phase 6 "新项目验证 history/" 亦未归档 | Phase 7 Wave 1 执行 |
| GAP-D1 | 🟡 Low | 文档 | `init-wizard.ts` 两处 `/using-qa-flow init` 文案陈旧（应为 `/qa-flow init`） | Phase 7 Wave 2 小补丁 |
| GAP-C1 | 🟢 OBS | 一致性 | `init-wizard.ts` 未迁 cli-runner（Phase 5 §11.1 迁移范围仅限 `.claude/scripts/` 顶层；但 setup 的 init-wizard 位于 `.claude/skills/setup/scripts/`，属 scope 外） | Phase 7 Wave 2 明确列入「已知例外」(归档决策)；**不迁移**（见 §3 Non-Goals） |
| GAP-R1 | 🔴 Must | 状态 | roadmap §阶段索引 Phase 1 仍 ⏳ PENDING | Phase 7 Wave 3 更新 |
| GAP-E1 | 🟢 Enhancement | 能力 | 无 `knowledge-keeper list` 命令列出 modules / pitfalls 名单（不是 spec 承诺） | Phase 7 不做；列 §9.3 backlog |
| GAP-B1 | 🟢 OBS | 行为 | `create --confirmed` 自动 migrate legacy historys；与 phase 6 §9.2.4 "仅显式触发" 决议轻微偏差，但幂等 + 有 warn 日志 | 不改；§9.2 记录决策保持 |

**结论**：Phase 1 代码实施 **完备度 ≥ 95%**，余下的都是收尾工作 — 跑 smoke、小文案补丁、状态对齐。

### 1.3 Phase 7 定位

- **不引入新能力**：W2/R3 契约、SKILL 交互、CLI 签名全部保留
- **Audit 优先**：把「隐式完成」→「显式验收 + 归档」
- **最小风险面**：触碰的代码仅 init-wizard.ts 小文案；主业务 CLI 代码一字不改

---

## 2. Goals

1. **G1 端到端 Smoke 验证**（GAP-S1 + GAP-S2）：
   - 跑一次 knowledge-keeper 全链路（read-core → dry-run write → confirmed write → lint → index）
   - 跑一次 create-project 全链路（scan 不存在项目 → create --confirmed → 幂等第二次 → lint → cleanup）
   - 附带 phase 6 验证点：新项目落盘后检查 `workspace/{proj}/history/`（单数）且无 `historys/`
   - 归档 smoke 输出到 `docs/refactor/plans/2026-04-19-phase7-audit.md`

2. **G2 文档小补丁**（GAP-D1）：
   - `.claude/skills/setup/scripts/init-wizard.ts` 第 239 / 287 两处 `/using-qa-flow init` → `/qa-flow init`
   - 无测试影响（这两处是 issues 文案）；新增 1 个单测断言 scan 输出的 issues 文案包含 `/qa-flow init`

3. **G3 一致性决议归档**（GAP-C1）：
   - `init-wizard.ts` 属 `.claude/skills/setup/scripts/`，非 Phase 5 迁移 scope
   - 本 phase 明确在 **§9.2 开放问题决议**（或本 spec 附录）记录「`init-wizard.ts` 不迁 cli-runner」决定，原因：
     a) Phase 5 §11.1 范围定义不含 skill 私有脚本
     b) 该脚本仅 2 个 action（scan/verify），无子命令嵌套收益
     c) 改造 ROI 低（≤ 20 行节省 vs 回归风险）

4. **G4 Audit 报告产出**（GAP-R1 的前置）：
   - 写 `docs/refactor/plans/2026-04-19-phase7-audit.md`，格式参考 phase 0 / create-project plan 范式
   - 包含：本 spec §1.1.1–§1.1.3 三表 + smoke 命令实际输出 + 结论 `phase 1 DONE ✅`

5. **G5 roadmap 状态对齐**（GAP-R1）：
   - `docs/refactor-roadmap.md` §阶段索引 Phase 1 行：⏳ PENDING → ✅ DONE
   - Spec 列加入本 spec 链接；「核心交付」列填：「create-project + knowledge-keeper + setup 瘦身代码落地（phase 0/6 合流），phase 7 补齐 smoke 验证与审计报告」

6. **G6 测试基线不回归**：
   - Phase 7 起点 **823 pass**，结束后 **≥ 823 pass**（预期 +1：init-wizard scan 文案断言）
   - 不破坏现有 CLI 契约（本 phase 仅改两行文案 + 新增一条 issues 字符串断言）

---

## 3. Non-Goals

- **改 knowledge-keeper / create-project CLI 签名或行为** → 实施已 DONE，不动
- **改 W2 置信度 / R3 懒加载契约** → phase 0 spec 定型
- **改 SKILL.md 交互流程** → 除 G2 的 2 处文案，其他保留
- **新增 `knowledge-keeper list` / `knowledge-keeper search` 能力**（GAP-E1）→ 入 §9.3 backlog；C3 若将来启动独立 phase
- **init-wizard.ts 迁 cli-runner**（GAP-C1）→ §9.2 归档决策「不做」
- **修改 `create --confirmed` 的 migrate legacy 触发时机**（GAP-B1）→ 保持当前实现，§9.2 记录决策
- **改 setup SKILL.md 步骤** → 已瘦身完毕，不再触动
- **补齐 `config.json repo_profiles` 交互式管理**（create-project spec §11 Out of Scope）→ 保留超 scope
- **为 phase 1 单独补「子目标 3 spec」** → 职责已在 create-project spec §3 Non-Goals + phase 3.5 spec 明示；不补

---

## 4. Architecture

Phase 7 代码面极窄；Architecture 章节主要描述 Smoke 验证编排与报告归档。

### 4.1 Smoke 验证设计

两条独立链路，每条都自洽（无外部依赖 / 用 temp fixture / `after` 清理）。

#### 4.1.1 knowledge-keeper Smoke（对应 spec §8.3）

```bash
# 前置：确保 dataAssets 已有 knowledge 骨架（phase 0 已建）

# Step 1: read-core 读取
bun run .claude/scripts/knowledge-keeper.ts read-core --project dataAssets \
  | jq '.overview.title, .terms | length'

# Step 2: dry-run write 预览（不落盘）
bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
  --type term --confidence high \
  --content '{"term":"PHASE7_SMOKE","zh":"阶段 7 烟雾","desc":"Phase 7 审计验证","alias":""}' \
  --dry-run \
  | jq '.dry_run, .after | length'

# Step 3: confirmed write（真写）
bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
  --type term --confidence high \
  --content '{"term":"PHASE7_SMOKE","zh":"阶段 7 烟雾","desc":"Phase 7 审计验证","alias":""}' \
  --confirmed

# Step 4: 验证写入
grep -q "PHASE7_SMOKE" workspace/dataAssets/knowledge/terms.md && echo PASS
grep -q "last-indexed" workspace/dataAssets/knowledge/_index.md && echo PASS

# Step 5: lint 健康检查
bun run .claude/scripts/knowledge-keeper.ts lint --project dataAssets

# Step 6: 清理
git checkout workspace/dataAssets/knowledge/
```

**验收点：**
- Step 1 返回 `overview.title` 非空
- Step 2 `dry_run=true`
- Step 3 exit 0
- Step 4 两条 grep 命中
- Step 5 exit 0 或 2（允许 warning）
- Step 6 `git status` 干净

#### 4.1.2 create-project Smoke（对应 spec §8.3 + phase 6 §7.2）

```bash
# 前置：确保无 smokeProj 残留
rm -rf workspace/smokeProj
cp config.json config.json.bak

# Step 1: scan 不存在项目
bun run .claude/scripts/create-project.ts scan --project smokeProj \
  | jq '.exists, .skeleton_complete'
# 期望：false, false

# Step 2: dry-run create
bun run .claude/scripts/create-project.ts create --project smokeProj --dry-run \
  | jq '.dry_run, .will_create.dirs | length'
# 期望：true, ≥ 13

# Step 3: confirmed create
bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed

# Step 4: 验证骨架（含 phase 6 命名）
test -d workspace/smokeProj/history && echo "PASS: history/ 单数"
test ! -d workspace/smokeProj/historys && echo "PASS: 无 historys/"
test -f workspace/smokeProj/knowledge/_index.md && echo "PASS: _index.md"
test -f workspace/smokeProj/rules/README.md && echo "PASS: rules/README.md"
jq '.projects.smokeProj' config.json

# Step 5: 幂等第二次 create
bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed \
  | jq '.skipped'
# 期望：true

# Step 6: lint 兼容性
bun run .claude/scripts/knowledge-keeper.ts lint --project smokeProj

# Step 7: 清理
rm -rf workspace/smokeProj
mv config.json.bak config.json
```

**验收点：**
- Step 1 `exists=false`
- Step 2 `dry_run=true` + `dirs.length ≥ 13`
- Step 3 exit 0
- Step 4 四条断言全 PASS
- Step 5 `skipped=true`
- Step 6 exit 0 或 2（warning 允许）
- Step 7 `git status` 干净

#### 4.1.3 Legacy historys 迁移 Smoke（phase 6 §7.2 遗留验证）

```bash
# 前置：模拟老项目
mkdir -p workspace/legacyProj/historys/v1
echo "legacy data" > workspace/legacyProj/historys/v1/demo.md
cp config.json config.json.bak

# Step 1: create --confirmed 触发迁移
bun run .claude/scripts/create-project.ts create --project legacyProj --confirmed 2>&1 \
  | grep -i "renamed legacy"
# 期望：见到 "renamed legacy directory: historys → history"

# Step 2: 验证
test -d workspace/legacyProj/history/v1 && echo "PASS"
test ! -d workspace/legacyProj/historys && echo "PASS"
cat workspace/legacyProj/history/v1/demo.md  # 期望："legacy data"

# Step 3: 清理
rm -rf workspace/legacyProj
mv config.json.bak config.json
```

### 4.2 init-wizard.ts 文档补丁

**改动范围**（2 行）：

```diff
-    issues.push("workspace/ directory not found — run: /using-qa-flow init");
+    issues.push("workspace/ directory not found — run: /qa-flow init");
```

```diff
-        : "workspace/ 不存在，请运行 /using-qa-flow init",
+        : "workspace/ 不存在，请运行 /qa-flow init",
```

**对应单测**：`.claude/skills/setup/__tests__/init-wizard.test.ts`（若不存在则新建；若已有则扩展 1 条断言）：

```typescript
test("scan reports /qa-flow init (not /using-qa-flow init) when workspace missing", () => {
  // spawn init-wizard scan 在一个无 workspace 的 temp 环境
  // 断言 issues[] 含字符串 "/qa-flow init"
  // 断言不含 "/using-qa-flow"
});
```

### 4.3 Audit 报告结构

`docs/refactor/plans/2026-04-19-phase7-audit.md`（新建）：

```markdown
# Phase 7 — Phase 1 完备性审计报告

## 1. 审计范围
子目标 1 knowledge-keeper / 子目标 2 create-project / 子目标 3 setup 瘦身

## 2. 承诺项对照表
（引用本 spec §1.1.1–§1.1.3 三张表）

## 3. Smoke 验证输出
### 3.1 knowledge-keeper（7 步）
（实际命令 stdout 归档）

### 3.2 create-project（7 步）
（实际命令 stdout 归档）

### 3.3 legacy historys 迁移（3 步）
（实际命令 stdout 归档）

## 4. 识别的 Gap 与处置
（引用本 spec §1.2 汇总 + Wave 2 补丁结果）

## 5. 结论
Phase 1 完备度：≥ 99%
剩余 enhancement：knowledge-keeper list 能力（入 backlog）
roadmap 状态：已更新为 ✅ DONE
测试基线：XXX pass
```

### 4.4 roadmap 更新

```diff
-| **1** | `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施 | ⏳ PENDING | — | 新 skill 创建、setup 移除项目管理步骤、knowledge-keeper 代码实施 |
+| **1** | `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施 | ✅ DONE | [`2026-04-17-knowledge-keeper-design.md`](refactor/specs/2026-04-17-knowledge-keeper-design.md) / [`2026-04-18-create-project-skill-design.md`](refactor/specs/2026-04-18-create-project-skill-design.md) / [`2026-04-19-phase1-completeness-audit-design.md`](refactor/specs/2026-04-19-phase1-completeness-audit-design.md) | 三子目标代码均已随 phase 0/6 合流落地；phase 7 补齐 smoke 验证与审计报告；init-wizard 文案修正；测试基线 823+ pass |
```

并在「阶段索引」后补一个「Phase 7」行：

```diff
+| **7** | Phase 1 完备性审计 | ✅ DONE | [`2026-04-19-phase1-completeness-audit-design.md`](refactor/specs/2026-04-19-phase1-completeness-audit-design.md) | Smoke 验证归档 + init-wizard 文案修正 + roadmap 状态对齐；整轮重构主干 0-7 闭环 |
```

---

## 5. Flow 示例

### 5.1 Wave 顺序

```
Wave 1: Smoke 验证（独立，只读产物）
  ├─ 跑 knowledge-keeper 7 步 → 归档输出
  ├─ 跑 create-project 7 步 → 归档输出
  ├─ 跑 legacy historys 3 步 → 归档输出
  └─ 写 docs/refactor/plans/2026-04-19-phase7-audit.md

Wave 2: init-wizard 文案补丁（小改）
  ├─ Edit 第 239 / 287 两行
  ├─ 扩展（或新建）init-wizard 单测
  └─ 全量 bun test 823 → 824 pass

Wave 3: roadmap 更新 + commit
  ├─ 改 docs/refactor-roadmap.md
  ├─ 原子 commit：spec / audit plan / init-wizard fix / roadmap 各独立
  └─ 生成 "下阶段 prompt" 或明示主轮次收尾

Wave 4（可选）: 生成主轮次 milestone summary
  └─ docs/refactor/README.md 或 milestone-0-7-summary.md（按需）
```

### 5.2 Commit 序列

```
commit 1: docs(phase7): spec for phase 1 completeness audit
  - docs/refactor/specs/2026-04-19-phase1-completeness-audit-design.md

commit 2: docs(phase7): phase 1 audit report with smoke outputs
  - docs/refactor/plans/2026-04-19-phase7-audit.md

commit 3: fix(setup): init-wizard now points to /qa-flow init (not /using-qa-flow init)
  - .claude/skills/setup/scripts/init-wizard.ts
  - .claude/skills/setup/__tests__/init-wizard.test.ts (new 或 extend)

commit 4: docs(roadmap): mark phase 1 DONE and record phase 7 completion
  - docs/refactor-roadmap.md
```

---

## 6. 实施步骤（拟 plan 时细化）

### Wave 1 — Smoke 验证与审计报告

1. **knowledge-keeper smoke**（§4.1.1 7 步）
   - 按顺序跑；归档每步 stdout 到 audit 报告 §3.1
   - 清理：`git checkout workspace/dataAssets/knowledge/`
2. **create-project smoke**（§4.1.2 7 步）
   - 使用 smokeProj（非 fixture-test，避免与单测冲突）
   - 归档到 audit 报告 §3.2
3. **legacy historys smoke**（§4.1.3 3 步）
   - 归档到 audit 报告 §3.3
4. **写 Audit 报告**
   - `docs/refactor/plans/2026-04-19-phase7-audit.md`
   - 结构见 §4.3

### Wave 2 — init-wizard 文档补丁

5. **Edit 两行文案**（init-wizard.ts:239 / 287）
6. **扩展单测**
   - 若 `.claude/skills/setup/__tests__/init-wizard.test.ts` 不存在 → 新建最小测试（1 test case）
   - 若已存在 → 追加 1 条断言 `issues` 含 `/qa-flow init` 且不含 `/using-qa-flow`
7. **全量测试**
   - `bun test ./.claude/scripts/__tests__` 823 pass
   - `bun test ./.claude/skills/setup/__tests__`（若新建）+1 pass
   - 合计 ≥ 824 pass

### Wave 3 — roadmap 与 commit

8. **更新 roadmap**
   - Phase 1 行 ⏳ → ✅
   - 新增 Phase 7 行
9. **Atomic commit**（序列见 §5.2）
10. **生成下阶段 prompt**
    - 见 §10（Phase 7 是主轮次收尾，下阶段为 backlog / milestone 切换，不预设 Phase 8）

---

## 7. 测试计划

### 7.1 单测基线

起点 **823 pass** → Phase 7 完成后 **≥ 824 pass**（+1: init-wizard 文案断言）

| 测试文件 | 覆盖点 | 变化 |
|---|---|---|
| 所有现有 43 个 test 文件 | 保持绿 | 无改动 |
| `.claude/skills/setup/__tests__/init-wizard.test.ts` | 新建 或 扩展 `/qa-flow init` 断言 | +1 test case |

### 7.2 端到端 Smoke（手动归档）

- knowledge-keeper 7 步（§4.1.1）
- create-project 7 步（§4.1.2）
- legacy historys 3 步（§4.1.3）
- 所有输出归档到 `docs/refactor/plans/2026-04-19-phase7-audit.md`

### 7.3 回归保护

- `bun test ./.claude/scripts/__tests__` 全绿
- `git status` 在 Wave 1 smoke 结束后干净（`git checkout` 清理）
- 三个 CLI 签名 / exit 码 / 输出 JSON 结构完全兼容（本 phase 只改文案）

---

## 8. 迁移策略

### 8.1 向后兼容

| 改动 | 影响面 | 缓解 |
|---|---|---|
| `init-wizard.ts` 文案 `/using-qa-flow init` → `/qa-flow init` | 用户终端可见文案 | 旧命令 `/using-qa-flow init` 已在 phase 3.5 skill 重排时作废，本改动只是清理遗漏 |

**无其他代码改动**。

### 8.2 文档同步

| 文件 | 改动 |
|---|---|
| `docs/refactor-roadmap.md` | Phase 1 ⏳ → ✅；新增 Phase 7 行 |
| `docs/refactor/plans/2026-04-19-phase7-audit.md` | 新建，审计报告 |
| `docs/refactor/specs/2026-04-19-phase1-completeness-audit-design.md` | 本 spec（新建） |
| `CLAUDE.md` | **不动**（本 phase 不改项目级契约） |
| `README.md` / `README-EN.md` | **不动**（phase 6 已同步到 phase 0-5 终态；phase 7 仅补审计，无终态变化） |

### 8.3 用户感知改动

- terminal 可见文案 2 处更正（`/qa-flow init`）
- 新增 1 份 audit 报告（`docs/refactor/plans/`）
- roadmap 状态对齐（Phase 1 ✅）

---

## 9. 风险与开放问题

### 9.1 风险

| 风险 | 缓解 |
|---|---|
| smoke 验证时污染 `workspace/dataAssets/` | 所有 write 操作后立即 `git checkout workspace/dataAssets/knowledge/` 回滚 |
| smoke 验证 create-project 时污染 `config.json` | 每次 smoke 前 `cp config.json config.json.bak`，结束后 `mv` 回滚 |
| smokeProj 与单测 fixture 命名冲突 | 选 `smokeProj`（单测用 `cp-fixture-test`），命名隔离 |
| legacy smoke 的 `legacyProj` 残留 | Step 3 强制 `rm -rf`；在 audit 报告中记录清理命令 |
| init-wizard 单测新建引入额外回归 | 只断言字符串匹配，逻辑改动为 0，风险极低 |
| roadmap 更新触发 `docs/` 其他链接失效 | 更新前 `grep -r "PENDING" docs/`，仅 phase 1 条目受影响 |

### 9.2 已决策开放问题

本 phase 审计过程中，以下问题已在 spec 中明示决策：

1. **`init-wizard.ts` 是否迁 cli-runner？** → **不迁**
   - 理由：Phase 5 §11.1 迁移范围仅含 `.claude/scripts/` 顶层；init-wizard 位于 skill 私有 scripts/ 目录，属 scope 外
   - 迁移成本 vs 收益低（20 行 boilerplate 替换 vs 回归风险）
   - 归档于本 spec §1.2 GAP-C1 与 §3 Non-Goals

2. **`create --confirmed` 的 legacy 自动迁移是否改为 "仅显式 repair"？** → **保持当前实现**
   - Phase 6 §9.2.4 决议原文：「仅显式触发（`/qa-flow init` → 修复项目）」
   - 实际 CLI 是任何 `create --confirmed` 都会幂等 migrate + warn 日志
   - 偏差评估：migrate 是幂等安全操作；"显式触发" 的语义由 SKILL.md 场景 B "补齐残缺项目" 承载，CLI 层宽松处理不会出问题
   - 若未来团队反映困惑 → 可追加 `--no-migrate` flag；本 phase 不做

3. **`knowledge-keeper` 是否补 `list` action？** → **不补，入 backlog**
   - 非 phase 0/1 spec 承诺
   - 当前通过 `read-core` JSON 的 `index.modules` / `index.pitfalls` 即可列举
   - 真需要独立 `list` 时走 C3 独立 phase（phase 7 建议中的 "knowledge-keeper search 升级" 合并考虑）

### 9.3 Backlog 记录（不本阶段做）

延续本次审计暴露的 enhancement 点，入 backlog 由将来决策是否单独开 phase：

- **B1 knowledge-keeper list/search 升级**：`list --type modules/pitfalls` 按 tags/updated 排序；`search --query` 全文 + 模糊（超出现有 `read-pitfall` 能力）
- **B2 create-project repo_profiles 交互式管理**：clone-repo 后自动询问是否写 repo_profiles；当前需用户手工编辑 config.json
- **B3 setup skill 项目级状态概览**：setup 步骤 4 增「各项目骨架完整性」只读汇总（调 `create-project scan` 多项目轮询）
- **B4 knowledge-keeper 跨项目引用**：某个项目的 overview 引用另一个项目的 terms；当前架构纯项目内
- **B5 init-wizard 迁 cli-runner**：一致性诉求出现时触发

---

## 10. 下阶段启动 prompt

Phase 7 完成后，整轮重构主干 **0 → 7（含 Phase 1 回填）** 全部 DONE。下一阶段选型由用户决定：

| 选项 | 描述 | 合适触发 |
|---|---|---|
| **收官** | 主轮次结束；qa-flow 进入稳态运维 | 当前已无明确技术债 |
| **Milestone v2** | 启动新一轮迭代（如 C4 多模型路由、C3 knowledge-keeper search 升级） | 用户有新业务目标 |
| **Backlog 提升** | 把 §9.3 B1-B5 中某项独立立项 | 具体痛点浮现 |
| **Phase 5 §9 延续补丁** | B1 logger 推广 / B2 agent XML 统一 / B3 util.parseArgs（phase 5 明标延后） | 新触发点（如日志聚合需求） |

### Phase 8（假设 Milestone v2）启动 prompt 骨架

```markdown
# Milestone v2 启动 prompt

## 主轮次总结（v1 收官）
- Phase 0 信息架构 ✅
- Phase 1 skill 实施（create-project / knowledge-keeper / setup 瘦身） ✅（phase 7 回填）
- Phase 2 PRD 讨论 ✅
- Phase 3 UI 自动化进化 ✅
- Phase 3.5 skill 重排 ✅
- Phase 4 MD 用例策略矩阵 ✅
- Phase 5 横切基础设施 ✅
- Phase 6 命名迁移 + README + 架构图 ✅
- Phase 7 Phase 1 完备性审计（主轮次收尾）✅
- 测试基线：824+ pass

## Milestone v2 Scope
（待用户定义）

## 首步
- 选定主题 → /gsd:discuss-phase 或直接起草 spec
```

---

## 11. 附录：现状数据

### 11.1 Phase 1 代码规模

| 文件 | 行数 | 备注 |
|---|---|---|
| `.claude/scripts/create-project.ts` | 336 | CLI |
| `.claude/scripts/lib/create-project.ts` | 249 | 纯函数 |
| `.claude/scripts/knowledge-keeper.ts` | 711 | CLI |
| `.claude/scripts/lib/knowledge.ts` | ~（未统计） | 纯函数（frontmatter/index/lint/searchPitfalls） |
| `.claude/skills/create-project/SKILL.md` | 139 | |
| `.claude/skills/knowledge-keeper/SKILL.md` | 181 | |
| `.claude/skills/setup/SKILL.md` | 183 | 已瘦身 |
| `.claude/skills/setup/scripts/init-wizard.ts` | 369 | 保留 scan/verify；文案待补丁 |
| `templates/project-skeleton/` | 3 文件 | overview / terms / rules README |
| `.claude/scripts/__tests__/create-project.test.ts` | 499 | 17 test cases |
| `.claude/scripts/__tests__/lib/create-project.test.ts` | 330 | |
| `.claude/scripts/__tests__/knowledge-keeper.test.ts` | 630 | 31 test cases |
| `.claude/scripts/__tests__/lib/knowledge.test.ts` | 558 | |

### 11.2 测试基线

```
bun test ./.claude/scripts/__tests__
823 pass / 0 fail / 43 files / 19.66s
```

### 11.3 关键文件验证

- ✅ `workspace/dataAssets/knowledge/_index.md` 含 `<!-- last-indexed: ... -->`
- ✅ `workspace/dataAssets/knowledge/overview.md` frontmatter 齐全
- ✅ `workspace/dataAssets/rules/README.md` 项目级规则指南
- ✅ `workspace/xyzh/knowledge/` 骨架同样完整
- ✅ `templates/project-skeleton/` 三文件含 `{{project}}` 占位
- ✅ `rule-loader.ts` 双层合并（global + project，project 覆盖）
- ❌ `init-wizard.ts:239/287` 含过时 `/using-qa-flow init`（本 phase 修复）

---

**请 review 本 spec；确认后启动 plan 撰写（`docs/refactor/plans/2026-04-19-phase7-implementation.md`），或直接按本 spec 的 Wave 1-3 执行。**

特别请用户就以下点给出倾向：

- **Q1** audit 报告命名：`docs/refactor/plans/2026-04-19-phase7-audit.md`（plans 目录）vs `docs/refactor/audits/2026-04-19-phase1-audit.md`（新建 audits/ 目录）？**建议 A**（避免目录碎片）
- **Q2** 是否需要生成 "Milestone v1 收官 summary 文档"（§10 可选 Wave 4）？**建议 B（按需后续）**，phase 7 本身不做；若做，可作为 phase 7 附带产物
- **Q3** init-wizard 单测是新建还是扩展？扫描到 `.claude/skills/setup/__tests__/` 是否已存在测试文件需 Wave 2 实施前确认
- **Q4** smoke 执行时是否同步写入「实际生成的 knowledge 条目」到 dataAssets？**建议回滚**（本 phase 纯验证，不污染生产 knowledge）
