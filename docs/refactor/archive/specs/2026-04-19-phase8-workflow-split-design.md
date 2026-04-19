# Phase 8 — test-case-gen / ui-autotest workflow 目录拆分

**Phase**: 8 · `test-case-gen` / `ui-autotest` SKILL.md 拆 `workflow/` 目录（Phase 0/4 roadmap 承诺回填 + Anthropic 最佳实践对齐）
**Date**: 2026-04-19
**Status**: Draft — for immediate execution
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

---

## 1. Context

### 1.1 漏账溯源

`docs/refactor-roadmap.md:41` Phase 0 §Skill 全景白纸黑字写着：

> `test-case-gen` | Skill 不拆，**内部 workflow 拆子模块（main / standardize / reverse-sync）**

Phase 4 spec §Non-Goals 再次明示：

> 「拆 test-case-gen skill → 所有改动在**内部 workflow**」

但实际落地只做了**逻辑层**拆分（`strategy-router.ts` + init 节点三分支路由）；**文件层**的 `workflow/` 目录始终未建立。1056 行全部挤在单个 SKILL.md。

Phase 7 审计 scope 限于 Phase 1 三子目标，未扫描 Phase 0 §Skill 全景的承诺。故本 gap 跨越 Phase 3.5 / 4 / 7 三阶段错位。

### 1.2 Anthropic 最佳实践差距

对照 skill-creator skill：

| 指标 | test-case-gen | ui-autotest |
|---|---|---|
| SKILL.md 行数 | **1056** | **920** |
| Anthropic 推荐上限 | 500 | 500 |
| 超限比例 | 2.1x | 1.84x |
| progressive disclosure | ❌ 有 `references/` 但非 workflow 拆分 | ❌ 无 `references/` |

**后果**：每次触发 skill，这 900+ 行整个进入 context；实际只用其中一个分支 / 若干步骤，浪费 60-70% token。

---

## 2. Goals

1. **G1 回填 roadmap Phase 0 承诺**：建立 `test-case-gen/workflow/` 目录，按 scenario 分卷
2. **G2 ui-autotest 附带打磨**：按痛点 step 拆 `workflow/`，达到 Anthropic 500 行上限
3. **G3 零语义改动**：仅搬家 + 结构化，提示词措辞保留（硬约束风格、交互点、契约不动）
4. **G4 测试不回归**：bun test 保持 824 pass（本 phase 不改 .claude/scripts/）
5. **G5 SKILL.md 体积达标**：两个文件都 < 500 行

---

## 3. Non-Goals

- **改提示词措辞** → 留 Phase 9 / Milestone v2（Phase 7 审计 §Medium 建议）
- **改 workflow 语义、交互点数量、契约字段** → 保持与 Phase 2/3/4 对齐
- **统一两个 skill 的 workflow 目录结构** → 两 skill 本质不同，各选最优方案
- **新增能力** → 不引入 S5 以外的分支、不改 probe/router/convergence 算法
- **迁移 `references/`** → `test-case-gen/references/` 保持不动（它们是上下文引用，不是 workflow 文件）

---

## 4. Architecture

### 4.1 test-case-gen → 方案 2（scenario 分卷）

```
.claude/skills/test-case-gen/
├── SKILL.md                        # ~350 行：触发 + 路由 + 共享约束 + 共享协议
├── references/                     # 保持不动
│   ├── clarify-protocol.md
│   ├── discuss-protocol.md
│   ├── intermediate-format.md
│   ├── prd-template.md
│   ├── test-case-rules.md
│   ├── xmind-gen.ts
│   └── xmind-structure.md
└── workflow/                       # 新增
    ├── main.md                     # ~500 行：primary 10 节点全流程
    ├── standardize.md              # ~90 行：XMind/CSV 标准化
    └── reverse-sync.md             # ~60 行：XMind → Archive MD
```

**SKILL.md 保留内容**（共享 / 路由层）：
- Frontmatter
- 偏好预加载 / precedence / artifact_contract / role / inputs / workflow XML / output_contract / error_handling
- 项目选择
- 运行模式
- 任务可视化（Task 工具）
- **路由分发**：根据输入类型选择 workflow 文件并让 Claude 读取
- Writer 阻断中转协议（所有 workflow 共享）
- 断点续传说明（共享）
- 异常处理（共享）

**workflow/main.md 内容**：节点 1（init）→ 节点 1.75（probe）→ 节点 1.5（discuss）→ 节点 2（transform）→ 节点 3（enhance）→ 节点 4（analyze）→ 节点 5（write）→ 节点 6（review）→ 节点 6.5（format-check）→ 节点 7（output）

**workflow/standardize.md 内容**：S1 parse → S2 standardize → S3 review → S4 output

**workflow/reverse-sync.md 内容**：RS1 confirm → RS2 parse → RS3 locate → RS4 convert → RS5 report

### 4.2 ui-autotest → 方案 1（step 分卷）

```
.claude/skills/ui-autotest/
├── SKILL.md                        # ~480 行：触发 + 约定 + 步骤 0-3 / 6 / 7 / 9 + 异常处理
├── scripts/                        # 保持不动
└── workflow/                       # 新增
    ├── step-4-script-writer.md     # ~102 行：Sub-Agent 并发脚本生成
    ├── step-5-test-fix.md          # ~163 行：逐条自测与修复
    ├── step-5.5-convergence.md     # ~117 行：共性收敛（最大痛点）
    └── step-8-result-processing.md # ~56 行：处理测试结果
```

**SKILL.md 保留内容**（触发 + 约定 + 短步骤）：
- Frontmatter / role / inputs / workflow XML / confirmation_policy / output_contract / error_handling / artifact_contract
- 约定（共性收敛阈值 / Task Schema / 命令别名 / 脚本编码规范 / 共享工具库）
- 前置说明 / 项目选择 / 读取配置
- 步骤 0（偏好预加载，12 行）
- 步骤 1（解析输入，52 行）
- 步骤 1.5（断点续传，51 行）
- 步骤 2（执行范围确认，35 行）
- 步骤 3（登录态准备，27 行）
- **步骤 4 摘要（5 行，详情 → workflow/step-4-script-writer.md）**
- **步骤 5 摘要（5 行，详情 → workflow/step-5-test-fix.md）**
- **步骤 5.5 摘要（5 行，详情 → workflow/step-5.5-convergence.md）**
- 步骤 6（合并脚本，40 行）
- 步骤 7（执行测试，34 行）
- **步骤 8 摘要（5 行，详情 → workflow/step-8-result-processing.md）**
- 步骤 9（发送通知，20 行）
- 异常处理（16 行）
- 输出目录约定（剩余）

**估算**：920 - 102 - 163 - 117 - 56 + 4×5（摘要替换）= 502 行；**再从步骤 1（52 行）拆出 workflow/step-1-parse-input.md**（50 行）→ SKILL.md = ~457 行。

### 4.3 路由机制

**test-case-gen SKILL.md** 加入一段清晰的路由指引：

```markdown
## 流程路由（根据输入类型选择 workflow）

执行到此处时，根据 `init` 节点识别的场景加载对应 workflow：

| 输入类型 | 场景 | 读取文件 |
|---|---|---|
| PRD 路径 / 蓝湖 URL / 模块重跑指令 | `primary` | `workflow/main.md` |
| `.xmind` / `.csv` 文件 | `standardize` | `workflow/standardize.md` |
| "同步 xmind" / "反向同步" 指令 | `reverse_sync` | `workflow/reverse-sync.md` |

确认场景后，**Read** 对应 workflow 文件并按其指引继续执行。
Writer 阻断协议、断点续传、异常处理在本 SKILL.md 后半段定义，所有 workflow 共享。
```

**ui-autotest SKILL.md** 在超长步骤处加一行 Read 提示：

```markdown
## 步骤 4：脚本生成（Sub-Agent 并发）

按照 `workflow/step-4-script-writer.md` 执行。该文件定义 sub-agent 并发契约、输入输出格式、脚本写入路径。
```

---

## 5. 实施步骤

### Wave 1 — test-case-gen 拆分

1. 读 SKILL.md 全文，按 §4.1 切点切出三块内容
2. 创建 `workflow/main.md`（粘贴节点 1 到节点 7）
3. 创建 `workflow/standardize.md`（粘贴 156-246 行内容）
4. 创建 `workflow/reverse-sync.md`（粘贴 247-305 行内容）
5. 覆写 SKILL.md：保留共享头 + 共享尾 + 新增路由段
6. 验证行数：< 400

### Wave 2 — ui-autotest 拆分

7. 读 SKILL.md 全文，按 §4.2 切点切出 5 个痛点步骤
8. 创建 `workflow/step-4-script-writer.md`
9. 创建 `workflow/step-5-test-fix.md`
10. 创建 `workflow/step-5.5-convergence.md`
11. 创建 `workflow/step-8-result-processing.md`
12. 创建 `workflow/step-1-parse-input.md`
13. 覆写 SKILL.md：保留共享头 + 共享尾 + 短步骤保留 + 长步骤摘要 + Read 提示
14. 验证行数：< 500

### Wave 3 — 验证 + 归档

15. 跑 `bun test ./.claude/scripts/__tests__ && bun test ./.claude/skills/setup/__tests__` → 824 pass
16. 核对 `grep -n "^##" .claude/skills/test-case-gen/SKILL.md` / `ui-autotest/SKILL.md` 章节编号不错乱
17. 核对 `wc -l` 双 skill 都 < 500
18. 更新 `docs/refactor-roadmap.md`：新增 Phase 8 行（✅ DONE）
19. Atomic commits：
    - `docs(phase8): spec for test-case-gen / ui-autotest workflow split`
    - `refactor(test-case-gen): split SKILL.md into workflow/ scenario files`
    - `refactor(ui-autotest): split SKILL.md into workflow/ step files`
    - `docs(roadmap): record phase 8 completion`

---

## 6. 测试计划

| 类型 | 覆盖点 | 预期 |
|---|---|---|
| 单测 | 824 pass | 不回归（本 phase 不改 scripts/） |
| 结构核对 | 两 skill SKILL.md 行数 | 均 < 500 |
| 内容核对 | 搬家后章节编号连贯（grep `^##`）| 连贯 |
| 路由核对 | SKILL.md 路由指引清晰可执行 | 人工 review |

**不做端到端 smoke**：workflow 搬家后真实跑一次 test-case-gen 需要完整 PRD + 真实执行（耗时 30-60min），不在本 phase scope。下次触发时自然验证。

---

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 搬家过程中遗漏段落 | 切点严格按行号对齐；搬家后对比原文件 diff 核对 |
| 路由指引不清导致 Claude 加载错 workflow | 在 SKILL.md 路由段用明确表格 + 输入类型判断规则 |
| 交互点 / XML envelope 散落在多文件破坏契约 | 测 `<clarify_envelope>` / `<blocked_envelope>` / `<confirmed_context>` 保持原位 |
| SKILL.md 短步骤摘要过于精简导致语义丢失 | 步骤摘要保留「目标 + workflow 文件路径 + 关键产物」三项 |
| workflow/ 目录被 Claude 误认作 scripts/ | workflow/ 只存 .md；不放 .ts |

---

## 8. 下阶段展望

Phase 8 完成后，Phase 7 审计中识别的剩余问题：

- **Medium**：5 个 skill 硬约束风格（ui-autotest / test-case-gen / bug-report / hotfix-case-gen / conflict-report 共 ~42 处 `必须 / 禁止`）→ 留 Phase 9 或 Milestone v2
- **Low**：description 字段 skip 场景缺失 → 按需触发
- **backlog**：B1-B5 不变

本 phase 是 **Milestone v1 主轮次最后一块拼图**，结束后整个 Phase 0-8 闭环。
