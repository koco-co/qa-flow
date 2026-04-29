# ui-autotest — Workflow

## Steps overview

- [Step 0: Pre-flight](#step-0)
- [Step 1: Parse and initialize](#step-1)
- [Step 2: Login](#step-2)
- [Step 3: Case processing](#step-3)
- [Step 4: Merge](#step-4)
- [Step 5: Execute](#step-5)
- [Step 6: Result & notify](#step-6)

## Protocols

- [Standard protocol](#protocols)
- [Exception handling](#protocols-exception)

## Gates

- [R1 — Script generation review](#gate-r1)
- [R2 — Post-execution review](#gate-r2)

---

## <a id="step-0"></a>Step 0: Pre-flight

Executor: direct (main agent)

**在执行任何步骤之前，先做环境检查和续传检测。**

### 0a. 目录结构检查

```bash
kata-cli features:lint-tests --project {{project}} --feature {{feature}} --exit-code
```

- 如果发现有**严重违规**（L9 内联 spec、L10 旧 sql/ 目录、L11 MANUAL-TRIAGE.md）：
  - 向用户报告违规详情
  - 询问是否继续（可能产生冲突）或先修复旧结构
- 如果仅是轻微违规（L3 缺 README、L4 超限等），警告但继续

### 0b. 续传检测

检查 `.task-state.json` 是否存在：

```bash
STATE_FILE="workspace/{{project}}/features/{{feature}}/tests/.task-state.json"
if [ -f "$STATE_FILE" ]; then
  echo "检测到 .task-state.json，正在读取状态..."
  TOTAL=$(bun -e "const s=require('fs').readFileSync('$STATE_FILE','utf-8');const j=JSON.parse(s);console.log(j.stats.total,j.stats.completed,j.stats.failed,j.stats.pending,j.meta.updated_at)")
  read -r TOTAL C FAILED PENDING UPDATED <<<"$TOTAL"
  echo "状态: 共${TOTAL}任务 | ✅${C}完成 ❌${FAILED}失败 ⏳${PENDING}待处理"
  echo "上次更新: $UPDATED"
else
  echo "无 .task-state.json，全新流程"
fi
```

- 文件不存在 → 全新流程
- 文件存在且 `workflow_status=completed` → 提示"上次已完成"，问是否重新执行
- 文件存在且 `workflow_status=in_progress/interrupted` → 展示进度摘要：

```
检测到未完成任务 (上次中断于 2026-04-29T10:23:00)
  ✅ 已完成: 8/20
  ❌ 已失败: 2/20 (t05, t12)
  ⏳ 待处理: 10/20
  选项: 1. 续传  2. 重新解析
```

选择续传 → 跳至 Step 1.5；选择重新解析 → 进入 Step 1。

### 0c. 注册命令别名

```bash
# @parse-cases
alias parse-cases="bun run engine/src/ui-autotest/parse-cases.ts"

# @merge-specs
alias merge-specs="bun run engine/src/ui-autotest/merge-specs.ts"

# @lint-tests
alias lint-tests="kata-cli features:lint-tests"
```

在后续步骤中使用这些别名调用对应脚本。

### 0d. 创建主任务

```bash
# 创建 8 个主任务并设置依赖关系
TaskCreate subject="T0: 环境检查" description="Pre-flight 检查：目录结构 lint + 续传检测"
TaskCreate subject="T1: 解析输入与确认范围" description="解析 Archive MD，确认测试范围" addBlockedBy=["T0"]
TaskCreate subject="T2: 登录态准备" description="执行浏览器登录，保存 session" addBlockedBy=["T1"]
TaskCreate subject="T3a: 读取站点知识" description="查询 knowledge/sites/ 获取站点操作知识" addBlockedBy=["T2"]
TaskCreate subject="T3: 生成并验证脚本" description="并行 script-case-agent 生成→自测→修复" addBlockedBy=["T3a"]
TaskCreate subject="T4: 合并脚本" description="合并 cases/ 到 runners/" addBlockedBy=["T3"]
TaskCreate subject="T5: 执行测试" description="运行回归测试套件" addBlockedBy=["T4"]
TaskCreate subject="T6: 处理结果与通知" description="生成报告，失败用例转 Bug" addBlockedBy=["T5"]
TaskUpdate taskId="T0" status=in_progress
```

### 0e. 确认副作用的操作策略

**硬规则**（不需要用户确认，直接执行）：

- `kata-cli features:lint-tests --exit-code` — 只读检查
- 读取 `.task-state.json` — 只读

**需要先确认再执行**：

- `kata-cli features:init-tests` — 创建目录和文件
- `parse-cases --output` — 写入 `.task-state.json`
- 创建 `tests/cases/` 下的脚本文件 — 新文件生成

**必须展示变更预览后确认**：

- 删除或覆盖已有文件
- 修改 git 管理的文件

**完成 Step 0**：

```bash
TaskUpdate taskId="T0" status=completed
```

---

## <a id="step-1"></a>Step 1: Parse and initialize

Executor: direct (main agent)

Parse the user's Archive MD input and confirm the test scope.

1. Parse user input: Archive MD file path, feature name, or test scenario description
2. Confirm scope with user:
   - Which feature/module to test
   - Priority levels to include (P0/P1/P2)
   - Smoke test only or full regression
3. 更新当前步骤状态：
   ```
   TaskUpdate taskId="T1" status=in_progress
   ```
4. Initialize tests directory skeleton:
   ```bash
   kata-cli features:init-tests --project {{project}} --feature {{feature}}
   ```
5. 解析 Archive MD → 输出 `.task-state.json`：
   ```bash
   bun run engine/src/ui-autotest/parse-cases.ts \
     --file workspace/{{project}}/features/{{feature}}/archive.md \
     --project {{project}}
   ```
6. 展示范围摘要：
   ```
   [parse-cases] 全新 | project=dataAssets feature=202604-xxx tasks=16
     P0: 5 | P1: 8 | P2: 3
   ```

### 输出

- `.task-state.json`：`workspace/{{project}}/features/{{feature}}/tests/.task-state.json`
- 所有任务初始状态为 `pending`，`phase=writing`

**完成 Step 1**：

```bash
TaskUpdate taskId="T1" status=completed
```

---

## <a id="step-2"></a>Step 2: Login

Executor: direct (main agent)

**进入步骤**：

```bash
TaskUpdate taskId="T2" status=in_progress
```

Perform browser session login for the target environment.

```bash
bun run engine/src/ui-autotest/session-login.ts --project {{project}} --url {{url}} --output .auth/{{project}}/session-{{env}}.json
```

The script creates an authenticated session state file for subsequent test runs.

**完成 Step 2**：

```bash
TaskUpdate taskId="T2" status=completed
```

---

## <a id="step-3a"></a>Step 3a: 读取站点知识

Executor: direct (main agent)

**进入步骤**：

```bash
TaskUpdate taskId="T3a" status=in_progress
```

**在派发 script-case-agent 之前，先收集当前特性的站点知识。**

1. 读取 `.task-state.json`，提取所有任务的 `page` 字段
2. 从 `page` 字段解析 URL → hostname（如 `https://dataassets.dtstack.com/login` → `dataassets.dtstack.com`）
3. 对每个唯一 hostname，调用 `load-site-knowledge`：

```bash
bun run engine/src/ui-autotest/load-site-knowledge.ts \
  --domain {{hostname}} \
  --project {{project}}
```

4. 将读取到的知识摘要（markdown）暂存，准备注入到 script-case-agent 的 prompt
5. 如果某个 `page` 字段不是合法 URL（如纯描述文字），跳过该任务

**输出**：

每获取到一个站点的知识，在 prompt 中用 `site_knowledge` 参数传递给 script-case-agent：

```
site_knowledge: |
  ## selectors
  - 列表容器: [data-testid="issue-list"]
  - 创建按钮: a[href$="/new"]

  ## traps
  - 不要用 .Box 类选择器，会被 CSS module 重写
```

**完成 Step 3a**：

```bash
TaskUpdate taskId="T3a" status=completed
```

---

## <a id="step-3"></a>Step 3: Case processing

Executor: subagent (agent: script-case-agent, model: sonnet)

**进入步骤**：

```bash
TaskUpdate taskId="T3" status=in_progress
```

**核心变化：每个 case 由一个 script-case-agent 全生命周期处理（写+修一条龙）。**

### 流程

1. 主 agent 读取 `.task-state.json`，统计 `pending` 任务数
2. 按以下规则派发 `script-case-agent`：
   - 一次派发 **3 个并行 agent**（可并发数由用户指定）
   - 每个 agent 领取一个 `status=pending` 的任务
   - agent 执行：生成脚本 → playwright test → 修复 → 更新状态文件
3. 主 agent 轮询等待所有 agent 完成
4. 检查 `.task-state.json` 中是否还有 `pending` 任务：
   - 有 → 回到步骤 2，派发下一批
   - 无 → 进入步骤 5（收敛分析）

### 并发控制

```
默认并行数: 3
调整方式: 用户在派发前指定 "并发 N 个"
```

### 超时处理

- 单个 agent 超过 5 分钟未返回 → 标记为 `STILL_FAILING`，继续下一批
- 连续 3 个 agent `NEED_USER_INPUT` → 暂停询问用户

### 动态子任务管理

每批派发时创建子任务：

```
TaskCreate subject="T3-batch-1: 处理 t01, t02, t03"
```

### 步骤 3c: 收敛分析（轻量）

在**所有 case 处理完毕后**，主 agent 自行扫描 `.task-state.json` 中失败的 case：

1. 过滤出 `status=failed` 且 `fix_result.fix_status=STILL_FAILING` 的任务
2. 按错误类型分组
3. 如果有 3+ case 同类型失败 → 可考虑改进共享 helper

也可以派发 `convergence-agent` 做深度分析（可选）。

### 步骤 3d: 站点知识贡献

在所有 case 处理完毕并完成收敛分析后，主 agent 收集 script-case-agent 返回的站点知识建议：

1. 收集所有 agent 返回结果中的 `suggested_site_knowledge` 字段
2. 按 `domain` + `content` 去重合并
3. 按置信度分流：
   - `high` → 直接写入，调用 merge-site-knowledge
   - `medium`/`low` → 汇总为报告展示给用户，询问是否写入
4. 如果用户确认了 medium/low 条目，加上 `--confirm` 调用：

```bash
echo '{{suggestions_json}}' | bun run engine/src/ui-autotest/merge-site-knowledge.ts \
  --input - \
  --project {{project}} \
  --confirm
```

5. 更新 `knowledge/{project}/sites/_index.md`（可选）。

### 产出物

- `.task-state.json` 中所有任务状态已更新
- `tests/cases/t{id}-{slug}.ts` 文件已生成

### Gate R1

生成后执行 [R1 review](#gate-r1)。

### 步骤 3e: 通过率检查（Gate）

**在进入 Step 4 之前，先判断是否值得跑全量回归。**

```bash
# 统计通过率
TOTAL=$(bun -e "const s=require('fs').readFileSync('$STATE_FILE','utf-8');const j=JSON.parse(s);console.log(j.stats.completed+'/'+j.stats.total)")
RATIO=$(bun -e "const s=require('fs').readFileSync('$STATE_FILE','utf-8');const j=JSON.parse(s);console.log((j.stats.completed/j.stats.total*100).toFixed(0))")
echo "Case 验证通过率: ${RATIO}% (${TOTAL})"
```

- `通过率 >= 80%` → 自动进入 Step 4（正常全量回归）
- `通过率 < 80%` → 询问用户：

  ```
  Case 验证通过率仅 45%（9/20），全量回归会重新执行所有案例，包括已失败的 11 个。
  选项：1. 只合并已通过的 case 执行（跳过已知失败）
        2. 仍然全量执行
        3. 跳过回归，直接出报告
  ```

**选项 1 的实现**（只执行已验证通过的 case）：

```bash
# 将失败的 case 移出 cases/ 目录，step 4 merge 时就不会包含它们
mkdir -p _failing
for f in $(bun -e "const s=require('fs').readFileSync('$STATE_FILE','utf-8');const j=JSON.parse(s);j.tasks.filter(t=>t.status!=='completed').forEach(t=>console.log(t.script_path||'tests/cases/'+t.id+'-*.ts'))"); do
  [ -f "$f" ] && mv "$f" _failing/
done
# 正常 merge（只含已通过的 case）
bun run engine/src/ui-autotest/merge-specs.ts \
  --input workspace/{{project}}/features/{{feature}}/tests/cases \
  --output workspace/{{project}}/features/{{feature}}/tests/runners
# 恢复失败的 case（merge 完成后移回）
mv _failing/* tests/cases/ 2>/dev/null; rmdir _failing 2>/dev/null || true
```

已知失败的 case 不执行，报告中注明：

```
✅ 通过: 9
⏭️ 已知失败（未执行）: 11
```

**完成 Step 3**：

```bash
TaskUpdate taskId="T3" status=completed
```

---

## <a id="step-4"></a>Step 4: Merge

Executor: direct (main agent)

**进入步骤**：

```bash
TaskUpdate taskId="T4" status=in_progress
```

Merge generated case scripts into consolidated spec files (smoke + full).

```bash
bun run engine/src/ui-autotest/merge-specs.ts \
  --input workspace/{{project}}/features/{{feature}}/tests/cases \
  --output workspace/{{project}}/features/{{feature}}/tests/runners
```

The merge script:

- Reads all `cases/` files with valid META headers
- Generates `smoke.spec.ts` (P0 only) and `full.spec.ts` (all priorities)
- Validates TypeScript compilation (optional `--compile-check`)

**完成 Step 4**：

```bash
TaskUpdate taskId="T4" status=completed
```

---

## <a id="step-5"></a>Step 5: Execute

Executor: subagent (agent: regression-runner-agent, model: haiku)

**进入步骤**：

```bash
TaskUpdate taskId="T5" status=in_progress
```

Dispatch `regression-runner-agent` to run the merged spec files and fix any remaining failures.

**动态子任务管理**：

- 每个测试文件开始执行时：`TaskCreate subject="T5-{N}: 执行 {filename}" activeForm="执行 {filename}..."`
- 执行完成时：`TaskUpdate subject="T5-{N}: 执行 {filename} — PASS/FAIL ({pass}/{total})" status=completed`

**执行流程**（在 subagent 中运行）：

```bash
bun test --cwd workspace/{{project}}/features/{{feature}}/tests/runners
```

Report results: pass/fail/error counts per spec file.

**完成 Step 5**（subagent 返回后主 agent 标记）：

```bash
TaskUpdate taskId="T5" status=completed
```

---

## <a id="step-6"></a>Step 6: Result & notify

Executor: direct (main agent) + subagent (agent: bug-reporter-agent, model: haiku) per failed case

**进入步骤**：

```bash
TaskUpdate taskId="T6" status=in_progress
```

Summarize execution results and notify the user.

**动态子任务管理**：

- 每个失败用例开始生成 Bug 报告时：`TaskCreate subject="T6-{N}: Bug 报告 {filename}" activeForm="生成 Bug 报告..."`
- 生成完成时：`TaskUpdate subject="T6-{N}: Bug 报告 {filename} — 已生成" status=completed`

**处理流程**：

1. 记录 flaky 数据：对每个执行的 case，调用 `task-state-cli record-flaky` 记录本次执行结果

   ```bash
   bun run engine/src/ui-autotest/task-state-cli.ts record-flaky \
     {{tests_dir}} {{task_id}} pass|fail \
     --duration {{ms}} --error "{{error_if_fail}}"
   ```

2. 检查 flaky 任务：`getFlakyTasks` 自动识别 pass_rate < 70% 且运行 >= 5 次的用例

   ```bash
   bun run engine/src/ui-autotest/task-state-cli.ts flaky {{tests_dir}}
   # 输出: [{"taskId":"t01","passRate":0.3,"totalRuns":10,"consecutiveFailures":4}]
   ```

3. 对 flaky 任务，在最终报告中标记为 `⚠ FLKY`，不触发 Bug 报告

4. Generate execution summary (pass rate, failures list)

5. If pass rate >= 80%: success notification

6. If pass rate < 80%: dispatch `bug-reporter-agent` (model: haiku) per failed case, passing test case info + error + screenshot path. Agent returns bug report JSON.

7. Apply [R2 review](#gate-r2)

**完成 Step 6**：

```bash
TaskUpdate taskId="T6" status=completed
```

---

## <a id="protocols"></a>Protocols: Standard

### Confirmation policy

- Read-only operations (parse, scope, status check) → no confirmation needed
- Stateful operations (login session, file writes, git operations) → confirm before execution
- Destructive operations (delete, overwrite, clean) → explicit confirmation with impact preview

### Command aliases

| Alias          | Command                                                            |
| -------------- | ------------------------------------------------------------------ |
| `@parse-cases` | `bun run engine/src/ui-autotest/parse-cases.ts --file {{md_path}}` |
| `@merge-specs` | `bun run engine/src/ui-autotest/merge-specs.ts ...`                |

### Directory layout

所有步骤必须遵守以下目录规范（`tests/` 根目录由 Step 1 的 `kata-cli features:init-tests` 创建）：

```
features/{ym}-{slug}/tests/
├── .task-state.json                  ← 任务状态文件（自动管理）
├── README.md                          ← 套件说明
│
├── runners/                           ← Playwright runner 装配
│   ├── full.spec.ts                   ←   全量
│   ├── smoke.spec.ts                  ←   冒烟（核心 P0）
│   └── retry-failed.spec.ts           ←   失败重跑
│
├── cases/                             ← 用例脚本本体
│   ├── README.md                      ←   编号 → 场景映射表
│   │   - case 数 < 15：cases/ 直接平铺，命名 `t{编号}-{slug}.ts`
│   │   - case 数 ≥ 15：必须按 PRD 模块分子目录
│   ├── {module}/                      ←   ≥15 case 时按 PRD 模块分组
│   │   ├── t01-{slug}.ts
│   │   └── t02-{slug}.ts
│   └── ...
│
├── helpers/                           ← PRD 私有 helper（按职责拆）
│   ├── README.md
│   ├── {domain-1}.ts
│   └── ...
│
├── data/                              ← 测试数据 / fixtures
│   ├── README.md
│   ├── seed.sql
│   ├── *.ts                           ← 命名禁止 _v1/_v2 变体
│   └── storage-state.json
│
├── unit/                              ← helpers 单元测试（可选）
│   └── *.test.ts
│
└── .debug/                            ← 调试遗物（gitignore，CI 不跑）
    └── *-repro.spec.ts
```

### Task schema

使用 Claude 原生 Task 工具（TaskCreate/TaskUpdate）实现动态进度追踪。

#### 主任务（Step 0 创建）

| Subject                | Description                            | 依赖          |
| ---------------------- | -------------------------------------- | ------------- |
| T0: 环境检查           | Pre-flight 检查：目录结构 lint + 续传  | —             |
| T1: 解析输入与确认范围 | 解析 Archive MD，确认测试范围          | blockedBy T0  |
| T2: 登录态准备         | 执行浏览器登录，保存 session           | blockedBy T1  |
| T3a: 读取站点知识      | 查询 knowledge/sites/ 获取站点操作知识 | blockedBy T2  |
| T3: 生成并验证脚本     | 并行 script-case-agent 生成→自测→修复  | blockedBy T3a |
| T4: 合并脚本           | 合并 cases/ 到 runners/                | blockedBy T3  |
| T5: 执行测试           | 运行回归测试套件                       | blockedBy T4  |
| T6: 处理结果与通知     | 生成报告，失败用例转 Bug               | blockedBy T5  |

#### 动态子任务（按需创建）

**Step 3 — 脚本处理子任务**：

- 每批派发时：`TaskCreate subject="T3-batch-{N}: 处理 {task_ids}"`
- 完成时：`TaskUpdate status=completed`

**Step 5 — 测试执行子任务**：

- 开始执行时：`TaskCreate subject="T5-{N}: 执行 {filename}" activeForm="执行 {filename}..."`
- 执行完成时：`TaskUpdate subject="T5-{N}: 执行 {filename} — PASS/FAIL ({pass}/{total})" status=completed`

**Step 6 — Bug 报告子任务**：

- 开始生成时：`TaskCreate subject="T6-{N}: Bug 报告 {filename}" activeForm="生成 Bug 报告..."`
- 生成完成时：`TaskUpdate subject="T6-{N}: Bug 报告 {filename} — 已生成" status=completed`

#### 状态更新规范

- 进入步骤：`TaskUpdate status=in_progress`
- 完成步骤：`TaskUpdate status=completed`，subject 追加结果指标
- 失败：保持 `in_progress`，description 中记录错误详情

---

## <a id="protocols-exception"></a>Protocols: Exception handling

| Situation                           | Response                                            |
| ----------------------------------- | --------------------------------------------------- |
| Session login fails                 | Retry with new credentials; ask user if env changes |
| Test compilation error              | Caught in Step 3 case agent fix loop                |
| Flaky tests (intermittent failures) | Retry 3x; report as flaky if inconsistent           |
| Missing Archive MD                  | Ask user for file path or fallback to manual input  |
| Subagent timeout                    | Skip case, continue with remaining tasks            |
| Lint violation (severe)             | Report to user, ask whether to proceed              |

---

## <a id="gate-r1"></a>Gate R1: Script generation review

Checklist:

- [ ] Selectors are reasonable (prefer `text`/`role`, avoid fragile CSS paths)
- [ ] Assertions match Archive MD expectations
- [ ] Test isolation is maintained (no shared mutable state)
- [ ] Error messages are descriptive

---

## <a id="gate-r2"></a>Gate R2: Post-execution review

Checklist:

- [ ] Test pass rate >= threshold (default 80%)
- [ ] Severe failures auto-converted to Bug report
- [ ] Flaky tests documented with retry counts
