# ui-autotest — Workflow

- [Step 0: Pre-flight](#step-0)
- [Step 1: Parse and initialize](#step-1)
- [Step 2: Login](#step-2)
- [Step 3: Case processing](#step-3)
- [Step 4: Merge](#step-4)
- [Step 5: Execute](#step-5)
- [Step 6: Result & notify](#step-6)

参考材料：目录规范见 `references/directory-layout.md`，Task schema 见 `references/task-schema.md`，协议见 `references/protocols.md`。

---

## <a id="step-0"></a>Step 0: Pre-flight

Executor: direct (main agent)

**在执行任何步骤之前，先做环境检查和续传检测。**

### 0a. 目录结构检查

```bash
kata-cli features:lint-tests --project {{project}} --feature {{feature}} --exit-code
```

- 严重违规（L9 内联 spec、L10 旧 sql/ 目录、L11 MANUAL-TRIAGE.md）→ 报告用户，询问是否继续
- 轻微违规（L3 缺 README、L4 超限等）→ 警告但继续

### 0b. 续传检测

```bash
STATE_FILE="workspace/{{project}}/features/{{feature}}/tests/.task-state.json"
if [ -f "$STATE_FILE" ]; then
  TOTAL=$(bun -e "const s=require('fs').readFileSync('$STATE_FILE','utf-8');const j=JSON.parse(s);console.log(j.stats.total,j.stats.completed,j.stats.failed,j.stats.pending,j.meta.updated_at)")
  read -r TOTAL C FAILED PENDING UPDATED <<<"$TOTAL"
  echo "状态: 共${TOTAL}任务 | ✅${C}完成 ❌${FAILED}失败 ⏳${PENDING}待处理 | $UPDATED"
else
  echo "无 .task-state.json，全新流程"
fi
```

- 不存在 → 全新
- `workflow_status=completed` → 问是否重新执行
- `workflow_status=in_progress/interrupted` → 展示进度，选续传或重来

### 0c. 注册命令别名

```bash
alias parse-cases="bun run engine/src/ui-autotest/parse-cases.ts"
alias merge-specs="bun run engine/src/ui-autotest/merge-specs.ts"
alias lint-tests="kata-cli features:lint-tests"
```

### 0d. 创建主任务

```bash
TaskCreate subject="T0: 环境检查" description="Pre-flight 检查"
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

**硬规则**（直接执行）：kata-cli lint、读取 .task-state.json
**需确认**：init-tests、parse-cases --output、创建 cases/ 文件
**需预览后确认**：删除/覆盖已有文件、修改 git 管理的文件

**完成 Step 0**：

```bash
TaskUpdate taskId="T0" status=completed
```

---

## <a id="step-1"></a>Step 1: Parse and initialize

Executor: direct (main agent)

进入 Step 1 说明是全新执行（续传已在 Step 0b 处理）。直接解析 archive 生成 `.task-state.json`：

```bash
kata-cli features:init-tests --project {{project}} --feature {{feature}}
bun run engine/src/ui-autotest/parse-cases.ts \
  --file workspace/{{project}}/features/{{feature}}/archive.md \
  --project {{project}}
```

已有脚本保留不动（parse-cases 不覆盖已有文件）。

**完成 Step 1**：

```bash
TaskUpdate taskId="T1" status=completed
```

---

## <a id="step-2"></a>Step 2: Login

Executor: direct (main agent)

```bash
TaskUpdate taskId="T2" status=in_progress
bun run engine/src/ui-autotest/session-login.ts --project {{project}} --url {{url}} --output .auth/{{project}}/session-{{env}}.json
TaskUpdate taskId="T2" status=completed
```

---

## <a id="step-3a"></a>Step 3a: 读取站点知识

Executor: direct (main agent)

在派发 script-case-agent 之前收集当前特性的站点知识：

1. 读取 `.task-state.json`，提取所有任务的 `page` 字段
2. 解析 URL → hostname
3. 对每个唯一 hostname 调用 `load-site-knowledge`：

```bash
bun run engine/src/ui-autotest/load-site-knowledge.ts --domain {{hostname}} --project {{project}}
```

4. 将知识摘要注入到 script-case-agent 的 prompt（`site_knowledge` 参数）
5. 非 URL 的 page 字段跳过

**完成 Step 3a**：

```bash
TaskUpdate taskId="T3a" status=completed
```

---

## <a id="step-3"></a>Step 3: Case processing

Executor: subagent (agent: script-case-agent, model: sonnet)

每个 case 由一个 script-case-agent 全生命周期处理（写+修一条龙）。

1. 读取 `.task-state.json`，统计 pending 任务数
2. 一次派发 **3 个并行** script-case-agent（可调），每个领一个 pending 任务
3. agent 执行：生成脚本 → playwright test → 修复 → 更新状态
4. 轮询等待全部完成，还有 pending 则继续派发下一批
5. 全部完成后做收敛分析（3+ 同类型失败 → 改进共享 helper）

### 站点知识贡献

收集 agent 返回的 `suggested_site_knowledge`，按 domain+content 去重合并：

- `high` → 直接写入
- `medium`/`low` → 汇总展示给用户，确认后写入

```bash
echo '{{suggestions_json}}' | bun run engine/src/ui-autotest/merge-site-knowledge.ts --input - --project {{project}} --confirm
```

### Gate R1

生成后执行 [R1 review](#gate-r1)。

**完成 Step 3**：

```bash
TaskUpdate taskId="T3" status=completed
```

---

## <a id="step-4"></a>Step 4: Merge

Executor: direct (main agent)

合并 case 脚本为 smoke.spec.ts + full.spec.ts：

```bash
bun run engine/src/ui-autotest/merge-specs.ts \
  --input workspace/{{project}}/features/{{feature}}/tests/cases \
  --output workspace/{{project}}/features/{{feature}}/tests/runners
```

### Readiness Gate

进入 Step 5 前检查是否所有 task 均已完结。未完结的派 agent 处理，不跳过。

```bash
STATS=$(bun run engine/src/ui-autotest/task-state-cli.ts stats {{tests_dir}})
PENDING=$(echo "$STATS" | bun -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(s.pending)")
IN_PROGRESS=$(echo "$STATS" | bun -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(s.in_progress)")
FAILED=$(echo "$STATS" | bun -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(s.failed)")
```

- `pending=0, in_progress=0, failed=0` → 进入 Step 5
- 否则 → 列出未完结的 task，派 script-case-agent 处理

**完成 Step 4**：

```bash
TaskUpdate taskId="T4" status=completed
```

---

## <a id="step-5"></a>Step 5: Execute

Executor: subagent (agent: regression-runner-agent, model: haiku)

```bash
TaskUpdate taskId="T5" status=in_progress
```

Regression-runner-agent 执行合并后的 spec 文件并修复失败：

```bash
bun test --cwd workspace/{{project}}/features/{{feature}}/tests/runners
```

**完成 Step 5**：

```bash
TaskUpdate taskId="T5" status=completed
```

---

## <a id="step-6"></a>Step 6: Result & notify

Executor: direct (main agent) + bug-reporter-agent per failed case

1. 记录 flaky 数据：

```bash
bun run engine/src/ui-autotest/task-state-cli.ts record-flaky {{tests_dir}} {{task_id}} pass|fail --duration {{ms}}
bun run engine/src/ui-autotest/task-state-cli.ts flaky {{tests_dir}}
```

Flaky 任务（pass_rate < 70% 且 >= 5 runs）标记 `⚠ FLKY`，不生成 Bug 报告。

2. Generate execution summary
3. pass rate >= 80% → success; < 80% → dispatch bug-reporter-agent per failure
4. Apply [R2 review](#gate-r2)

**完成 Step 6**：

```bash
TaskUpdate taskId="T6" status=completed
```

---

## <a id="gate-r1"></a>Gate R1: Script generation review

- [ ] Selectors are reasonable (prefer `text`/`role`, avoid fragile CSS)
- [ ] Assertions match Archive MD expectations
- [ ] Test isolation is maintained (no shared mutable state)
- [ ] Error messages are descriptive

---

## <a id="gate-r2"></a>Gate R2: Post-execution review

- [ ] Test pass rate >= threshold (default 80%)
- [ ] Severe failures auto-converted to Bug report
- [ ] Flaky tests documented with retry counts
