# discuss 节点增强 + skills 架构重组 — 设计文档

> 2026-04-24 · 作者：koco-co（brainstorming 输出）

## 目的与动机

两个改造本质上强耦合，打包在一个 spec：

1. **discuss 节点增强**：现有 `test-case-gen` 的需求讨论阶段只做 6 维度自检，产出的 plan.md 仍可能带「待澄清项」流向 transform/analyze/write，最终出现「虚无的测试点」。需要把需求讨论做深做透，严守"带着疑问不进下一阶段"的边界。
2. **skills 架构重组**：当前 11 个 skills 职责分散、部分重合（kata/create-project/setup 三件套；bug-report/conflict-report/hotfix-case-gen 三件套）。同时 `test-case-gen` 的 `workflow/main.md` 已达 709 行违反按需加载理念。借 discuss 改造顺手收敛。

两者耦合点：discuss 改造会进一步胀大 `test-case-gen/workflow/main.md`，必须先拆文件 + 梳理节点编号才能承载改造；而文件拆分又自然带出 skill 级的职责边界审视。

## 非目标

- 不改 `kata-cli` 子命令的外部契约（`discuss init/read/complete` 等命令名保持）
- 不动 `knowledge-keeper` / `ui-autotest` / `playwright-cli` 三个 skill
- 不改 XMind / Archive MD 的 A/B 产物契约
- 不保留任何老 slash 命令别名（硬切）

---

## Part 1 — discuss 节点增强

### 1.1 节点重塑结构

```
节点 3: discuss — 主 agent 主持需求讨论（重塑版，原节点 1.5）

3.1 plan.md 初始化/恢复（不变）
3.2 源码引用许可（新增，原 transform 2.2 前移）
    ├─ repo-profile match
    ├─ AskUserQuestion 允许/拒绝同步
    ├─ 允许 → repo-sync + plan.md frontmatter.repo_consent 记录 SHA
    └─ 记录后后续节点不再重复问
3.3 需求摘要（§1 扩展为 4 子节：背景 / 痛点 / 目标 / 成功标准）
    ├─ 主 agent 综合 PRD + knowledge + 源码推导初稿
    └─ AskUserQuestion 逐子节点确认
3.4 全局层扫描（新增 4 维度）
    ├─ 数据源（先读 knowledge/overview.md 默认假设）
    ├─ 历史数据影响
    ├─ 测试范围
    └─ PRD 合理性审查（逻辑悖论 / 优化建议）
3.5 功能层扫描（原 6 维度，不变）
    ├─ 字段定义 / 交互逻辑 / 导航路径
    ├─ 状态流转 / 权限控制 / 异常处理
    └─ 结合 references/ambiguity-patterns.md 做模糊语扫描
3.6 逐条澄清（新问答格式：3 选项）
    ├─ 选项 1：AI 推荐值
    ├─ 选项 2：暂定—留给产品确认（→ severity=pending_for_pm，写 §6）
    └─ Other：用户输入框（AskUserQuestion 自动提供）
3.7 知识沉淀（不变，knowledge-keeper write）
3.8 自审闭环（新增）
    ├─ 主 agent 过 5 项自审清单
    ├─ 调 kata-cli discuss validate --require-zero-blocking
    └─ 有未答 blocking → 回 3.6；pending 允许带过
3.9 complete + 交接模式弹窗（新增）
    ├─ AskUserQuestion: Current-Session-Driven / New-Session-Driven
    ├─ 有 pending_for_pm ≠ 0 时标红警告
    ├─ Current → 继续进入节点 4 transform
    └─ New → 输出交接 prompt，结束当前会话
3.10 strategy_id 传递（不变）
```

### 1.2 plan.md 结构变化

```markdown
---
plan_version: 2
status: discussing | ready | obsolete
resume_anchor: summary | global-scan | functional-scan | clarify | self-review
blocking_count: 0
pending_count: 3                        # 新增
auto_defaulted_count: 5
handoff_mode: null                      # 新增（complete 时填 current|new）
repo_consent:                           # 新增（源码许可前移）
  repos:
    - path: workspace/.../studio
      branch: master
      sha: abc123
  granted_at: 2026-04-24T10:01:00Z
created_at: ...
updated_at: ...
knowledge_dropped: [...]
---

## §1 需求摘要（4 子节）
<!-- summary:begin -->
### 背景
### 痛点
### 目标
### 成功标准
<!-- summary:end -->

## §2 自检维度统计（10 维度，按 §3 location 自动渲染）
### 全局层（4）
| 维度 | 条数 | blocking | pending | defaulted |
|---|---|---|---|---|
### 功能层（6）
| 维度 | ... |

## §3 澄清问答清单（JSON fence）
每条：{ id, dimension, location, question, severity, recommended_option, user_answer, source_ref }
severity 枚举扩展：blocking_unknown | defaultable_unknown | pending_for_pm | invalid_input

## §4 自动默认记录（不变）
## §5 知识沉淀（不变）

## §6 待定清单（pending_for_pm，新增）
<!-- pending:begin -->
- [ ] **[数据源]** Q3: 是否支持 Kafka 数据源？
  - AI 推荐: 否（基于 knowledge/overview.md 默认仅 spark thrift 2.x）
  - 请产品打勾确认或补充说明。
<!-- pending:end -->

## §7 下游 hints（原 §6，编号顺延）
```

### 1.3 CLI 变更

| CLI 命令 | 变更 |
|---|---|
| `kata-cli discuss init` | 模板扩展 §1 4 子节 + §6 空占位 + frontmatter 新字段 |
| `kata-cli discuss read` | 返回值新增 `pending_count`、`handoff_mode` |
| `kata-cli discuss append-clarify` | 支持 `severity=pending_for_pm`；写入 §3 + §6 双链 |
| `kata-cli discuss validate` | **新增**。参数 `--require-zero-blocking`（硬）、`--require-zero-pending`（可选）；退出码非 0 表示不通过 |
| `kata-cli discuss complete` | 新增参数 `--handoff-mode current\|new`；写入 frontmatter.handoff_mode |
| `kata-cli repo-profile match` / `repo-sync` | 调用入口前移至 discuss，无 API 变化 |

### 1.4 下游节点改动

| 节点 | 改动 |
|---|---|
| **4 transform** | 启动前调 `discuss validate --require-zero-blocking --require-zero-pending`；原 transform 2.2 的源码许可步骤降级为「仅写回 profile 二道确认」（同步许可已在节点 3.2 拿到）；task prompt 新增 plan.md §1 / §6 |
| **5 enhance** | 移除「需求歧义标注」职责（由 discuss pending/blocking 替代） |
| **6 analyze** | 启动前调 `discuss validate --require-zero-blocking --require-zero-pending`；历史检索保留作「补齐参考」；生成的测试点强制带 `source_ref` 字段（指向 plan.md 锚点或 PRD 小节） |
| **7 write** | 启动前调 `discuss validate --require-zero-blocking --require-zero-pending`；`writer-context-builder` 不再传历史用例；每条用例强制继承 `source_ref`；Writer `<blocked_envelope>` 协议保留，但阻断时**回射到 discuss**（见 1.4.1） |
| **8 review** | 新增 `source_ref` 存在性校验：锚点不可解析 → 视为严重问题 |
| **9 format-check** | 不变 |
| **10 output** | 不变 |

#### 1.4.1 Writer 阻断回射机制（新）

Writer Sub-Agent 输出 `<blocked_envelope status="needs_confirmation">` 时，主 agent 不现场问用户，而是：

1. **映射**：把 envelope 的每个 item 转为 `discuss append-clarify` payload，`severity=blocking_unknown`，`location` 标注「writer-回射：{module}」
2. **落盘**：调 `kata-cli discuss append-clarify` 写入 plan.md §3（也意味着 plan.md.status 重置为 `discussing`）
3. **回到节点 3.6**：逐条 AskUserQuestion 澄清（3 选项格式不变）
4. **再次 3.8 自审 + 3.9 complete**：重新走自审门禁，complete 后 status=ready
5. **重启 writer**：回到节点 7 write 派发该模块 Writer，注入 `<confirmed_context>`

这样漏掉的维度会沉淀回 plan.md，下次同类需求讨论阶段就能提前识别。

#### 1.4.2 pending 的出入口语义（消除歧义）

| 边界 | 允许带 pending? | 约束依据 |
|---|---|---|
| 节点 3.9 complete 出口 | ✅ 允许 | discuss 内部允许待产品确认 |
| 节点 4/6/7 启动入口 | ❌ 不允许 | `discuss validate --require-zero-pending` 硬拦截 |

也就是说：完成 discuss ≠ 可以直接跑用例生成。产品把 §6 打勾回写后，必须再跑一次 `discuss append-clarify`（把 pending 转为 blocking + user_answer）+ `discuss complete`，才能放行下游。

### 1.5 新增 references

- `references/10-dimensions-checklist.md` — 10 维度完整定义 + 每维度典型提问模板
- `references/ambiguity-patterns.md` — 模糊语信号表（「仅支持 X」「如果 X 则 Y」「支持 A、B（未说 C）」「默认值（未说来源）」等 10+ 模式 + few-shot 示例）
- `references/source-refs-schema.md` — source_ref 锚点语法（`plan#q3-数据源` / `prd#section-2.1.3` / `knowledge#overview.数据源默认`）

### 1.6 rules 更新

`rules/prd-discussion.md` 覆盖：
- 10 维度自检清单（替代原 6 维度）
- 3 选项提问格式（覆盖原「最多 4 候选项」）
- 自审 5 项清单
- 模糊检测引用 ambiguity-patterns.md

### 1.7 quick 模式兼容

`--quick` 下：
- 自检维度从 10 压缩到 6（跳过全局层 4 维度，仍做功能层 6 维度）
- 自审闭环保留
- 下游门禁（`discuss validate`）保留
- 「0 疑问进入下一阶段」是快慢模式都遵守的红线

---

## Part 2 — skills 架构重组

### 2.1 重组前后对比

```
重组前（11 个）              重组后（7 个）
─────────────             ─────────────
kata             ┐
create-project   ├─ 合并 → using-kata
setup            ┘（setup 删，靠 INSTALL.md）

bug-report       ┐
conflict-report  ├─ 合并 → daily-task
hotfix-case-gen  ┘

test-case-gen    ─── 简化 ─→ test-case-gen（仅 primary workflow）

xmind-editor     ─── 扩展 ─→ case-format（吸纳 reverse-sync + other2md）

ui-autotest / playwright-cli / knowledge-keeper    不变
```

### 2.2 新目录结构

```
.claude/skills/
├── using-kata/
│   ├── SKILL.md
│   ├── workflow/
│   │   ├── menu.md
│   │   └── create-project.md
│   └── references/
│       ├── skeleton-template/
│       └── mode-routing.md
├── daily-task/
│   ├── SKILL.md
│   ├── modes/
│   │   ├── bug-report.md
│   │   ├── conflict-report.md
│   │   └── hotfix-case-gen.md
│   └── references/
│       ├── bug-templates/
│       ├── conflict-templates/
│       └── ...
├── test-case-gen/
│   ├── SKILL.md
│   ├── workflow/
│   │   ├── main.md               # 80-120 行：路由 + 任务表 + 共享协议索引
│   │   ├── 01-init.md
│   │   ├── 02-probe.md
│   │   ├── 03-discuss.md         # 约 200-250 行（改造重点）
│   │   ├── 04-transform.md
│   │   ├── 05-enhance.md
│   │   ├── 06-analyze.md
│   │   ├── 07-write.md
│   │   ├── 08-review.md
│   │   ├── 09-format-check.md
│   │   └── 10-output.md
│   └── references/
│       ├── 10-dimensions-checklist.md    # 新增
│       ├── ambiguity-patterns.md         # 新增
│       ├── source-refs-schema.md         # 新增
│       ├── discuss-protocol.md           # 精简为硬约束
│       ├── prd-template.md
│       ├── test-case-rules.md
│       ├── xmind-structure.md
│       ├── intermediate-format.md
│       └── xmind-gen.ts
├── case-format/                  # 原 xmind-editor 改名
│   ├── SKILL.md
│   ├── workflow/
│   │   ├── edit.md               # 原 xmind-editor 主流程
│   │   ├── reverse-sync.md       # 从 test-case-gen 迁入
│   │   └── other2md.md           # 从 test-case-gen/standardize.md 改名迁入
│   └── references/...
├── ui-autotest/                  # 不变
├── playwright-cli/               # 不变
└── knowledge-keeper/             # 不变
```

### 2.3 节点编号迁移（test-case-gen 内部）

```
旧编号 → 新编号         备注
─────────────────────
1       → 1   init      CLI --task 参数不变
1.75    → 2   probe
1.5     → 3   discuss   ← Part 1 重点改造
2       → 4   transform
3       → 5   enhance
4       → 6   analyze
5       → 7   write
6       → 8   review
6.5     → 9   format-check
7       → 10  output
```

`resume_anchor` 语义值保持（如 `discuss-completed`），不以编号表示。

### 2.4 每个节点文件的标准结构（约束）

```markdown
# 节点 {n}: {name} — {一句话目标}

## 前置条件
- 上游节点完成：...
- 必须读取：...
- 必须校验（含 discuss validate 等硬门禁）：...

## 步骤
{n}.1 ...
{n}.2 ...

## 产出
- 状态更新：progress task-update --task {name} --payload '{...}'
- 文件变化：{paths}

## 交互点
- AskUserQuestion 的全部用法集中此处

## 异常分支
- {error_type} → 回退到哪 / 要求用户做什么
```

文件长度约束：50-150 行，超出即信号应再拆或抽 reference。

### 2.5 main.md 新结构（骨架）

```markdown
# test-case-gen primary workflow

## 节点映射表
| # | 名称 | 文件 | 默认超时 | 可跳过条件 |
|---|---|---|---|---|
| 1 | init | workflow/01-init.md | 30s | - |
| 2 | probe | workflow/02-probe.md | 2min | 断点恢复 |
| 3 | discuss | workflow/03-discuss.md | 15min | plan.status=ready 且 zero-pending |
| 4 | transform | workflow/04-transform.md | 5min | - |
| 5 | enhance | workflow/05-enhance.md | 3min | --quick |
| 6 | analyze | workflow/06-analyze.md | 5min | - |
| 7 | write | workflow/07-write.md | 10min | - |
| 8 | review | workflow/08-review.md | 3min | --quick |
| 9 | format-check | workflow/09-format-check.md | 5min | - |
| 10 | output | workflow/10-output.md | 1min | - |

## 任务可视化
（TaskCreate 10 任务的映射）

## 共享协议
- Writer 阻断中转协议 → §X
- 断点续传 → §Y
- 异常处理 → §Z

## 加载规则
主 agent 按映射表 `文件` 字段动态 Read；同会话已读无需重复读。
```

### 2.6 触发词策略

- **自然语言触发词**写进新 skill description（Claude 用于模式识别）：
  - `daily-task` description 保留：Java 堆栈、TypeError、Exception、`<<<<<<< HEAD`、merge conflict、hotfix、禅道 Bug、bug-view- 等
  - `case-format` description 保留：XMind 编辑、反向同步、标准化 xmind、标准化 csv 等
  - `using-kata` description 保留：功能菜单、创建项目、项目初始化等
- **老 slash 命令全部废弃**，不建别名：
  - `/bug-report` / `/conflict-report` / `/hotfix-case-gen` / `/kata` / `/kata init` / `/xmind-editor` → 直接删
- **新 slash 命令**：`/using-kata`、`/test-case-gen`、`/case-format`、`/daily-task`、`/ui-autotest`

### 2.7 CLAUDE.md 更新

```markdown
| 命令               | 功能                                      |
| ------------------ | ----------------------------------------- |
| `/using-kata`      | 功能菜单 + 项目创建                       |
| `/test-case-gen`   | 生成测试用例（PRD → 用例）                |
| `/case-format`     | XMind 编辑 / XMind↔Archive 同步 / 格式转换 |
| `/daily-task`      | bug / conflict / hotfix 三模式            |
| `/ui-autotest`     | UI 自动化测试                             |
```

---

## Part 3 — 信息源职责明确（spec 级约定）

在 `skills` 内不同阶段，四类信息源各担其职：

| 信息源 | 位置 | 需求讨论阶段（节点 3） | 用例编写阶段（节点 6/7） |
|---|---|---|---|
| **knowledge** | `workspace/{p}/knowledge/` | 产品定位、主流程、术语、项目默认假设（数据源/权限等） — 作为全局层 4 维度自检的**默认值来源** | 间接（通过 analyze-agent 读 overview.md 做领域校准） |
| **PRD** | `workspace/{p}/prds/{YYYYMM}/` | **主要需求来源**，驱动功能层 6 维度自检 | 已增强 PRD（节点 5 产出）作为 analyze/write 的核心输入 |
| **源码** | `workspace/{p}/.repos/` | **字段校验（前端）/ 交互逻辑（后端）的事实依据**，模糊检测的证据来源 | analyze/write 的字段名 / 按钮名 / 路由等具体事实来源 |
| **历史用例** | `workspace/{p}/archive/` | **完全不参与**（格式规范已在 rules/ 固化） | 仅 analyze 作「补齐参考」发现 PRD 没提但历史重复出现的边界；write 不再传入 |

---

## Part 4 — 风险与迁移代价

| 风险 | 影响 | 缓解 |
|---|---|---|
| skill description 合并后过长，触发精度下降 | Claude 错误路由 daily-task | 关键词明确标注所属模式；3-5 条样例 prompt 测触发 |
| 全仓库搜旧 slash 引用 | 文档 / CI / memory 便签可能失效 | 全仓 grep 老命令 → 批量替换；CI 可选加禁旧 slash 规则 |
| `setup` skill 一删，环境检查断层 | 新用户环境问题排查缺失 | **先审 INSTALL.md 是否真覆盖 config/plugin-loader 检查**，不覆盖则先补 INSTALL.md |
| 节点编号改动影响 progress / state 恢复 | 断点续传失效 | `resume_anchor` 用语义值（`discuss-completed`），不用编号；搜代码确认无硬编码 `node-1.5` |
| discuss 新增 repo_consent 使 plan.md 语义变重 | 讨论一半用户切仓库，状态不一致 | repo_consent 可被「discuss reset」清除；切仓库时强制 reset |
| source_ref 硬约束失败率 | analyze/write 频繁被 review 打回 | 先做 source_ref 规范（source-refs-schema.md），在 analyze-agent 的 system prompt 中明确约定；review 按严重度分级 |

---

## Part 5 — 实施阶段建议（交付 writing-plans 参考）

建议分 3 个 phase，每个 phase 可独立交付、独立测试：

**Phase A：skills 架构重组（不改讨论逻辑）**
- 拆 test-case-gen/main.md → workflow/01-init.md … 10-output.md（保持行为不变）
- 合并 using-kata / daily-task
- 重命名 xmind-editor → case-format，迁入 reverse-sync + other2md
- 删 setup、老 slash 命令、老 skills 目录
- 更新 CLAUDE.md + memory + docs 中的 slash 引用
- **出口**：所有老工作流行为等价跑通（回归 1 轮 PRD→用例）

**Phase B：discuss 节点改造（不改下游）**
- `kata-cli discuss` CLI 扩展（init 模板 / append-clarify severity / validate / complete --handoff-mode）
- 新增 references/10-dimensions-checklist.md / ambiguity-patterns.md / source-refs-schema.md
- 重写 rules/prd-discussion.md
- 重写 workflow/03-discuss.md（源码许可前移 / 10 维度 / 3 选项 / 自审 / 交接弹窗 / pending_for_pm）
- **出口**：单独跑 discuss 节点可产出带 pending 的 plan.md，complete 后返回交接 prompt
- **风险窗口**：Phase B 结束后下游节点尚未加 validate 门禁；若 Phase C 未紧随发布，带 pending 的 plan.md 可能误入 transform。建议 Phase B/C 打包发布，或在 Phase B 出口加一条临时横幅提示「下游门禁未启用，请手动确认 0 pending 后再跑 transform」

**Phase C：下游门禁 + source_ref 硬约束**
- transform/analyze/write 三节点启动前调 `discuss validate`
- transform 节点 2.2 源码许可降级
- enhance 移除歧义标注职责
- analyze/write 的 source_ref 强制
- review 的 source_ref 存在性校验
- Writer `<blocked_envelope>` 回射到 `discuss append-clarify`
- **出口**：带 pending 的 plan.md 无法跳 transform；source_ref 缺失无法过 review

每个 phase 结束回归一次 `--quick` 跑通。Phase A 可以与 Phase B/C 独立合并；Phase B/C 强耦合不宜拆单独合并。

---

## 附录：决策记录

本 spec 经过 brainstorming 逐条澄清，关键决策点：

| 决策 | 选择 |
|---|---|
| 自检维度 | 10 维度（现有 6 + 新增 4） |
| 摘要 §1 结构 | 扩展为 4 子节（背景/痛点/目标/成功标准） |
| 待定落盘 | plan.md §6 pending_for_pm（Markdown checkbox） |
| 提问格式 | 3 选项：AI 推荐 + 暂定—留给产品确认 + Other |
| 自审方式 | 主 agent 本体 + `discuss validate` CLI |
| 交接模式 | 始终弹窗 Current/New；有待定标红 |
| 历史用例 | discuss 全量剔除；analyze 作「补齐参考」；write 剔除 |
| 下游门禁 | transform/analyze/write 启动前都调 `discuss validate` |
| 模糊检测 | skill few-shot + `references/ambiguity-patterns.md` |
| 项目默认假设 | 存入 `knowledge/overview.md` |
| quick 兼容 | 保留自审/门禁，维度压缩到 6 |
| 源码许可位置 | 前移到 discuss 开头 |
| source_ref 强制度 | 硬约束：必填 + review 校验 |
| Writer 阻断协议 | 保留，回射到 discuss append-clarify |
| skills 重组 | 11 → 7，合并 using-kata / daily-task / case-format |
| 文件拆分 | test-case-gen/workflow/ 下按节点 10 个文件 |
| 节点编号 | 连续 1-10 |
| 老 slash 命令 | 全部废弃，不建别名 |
| other2md 归属 | xmind-editor → case-format |
