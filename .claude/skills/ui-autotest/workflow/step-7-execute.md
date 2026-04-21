# ui-autotest · step 7 — 执行测试（全量回归）

> 由 SKILL.md 路由后加载。执行时机：步骤 6 完成后。

按 Task Schema 更新：将 `步骤 7` 标记为 `in_progress`。

> 此步骤为合并后的全量回归验证，因步骤 5 已逐条验证通过，此处预期全部通过。

根据执行范围选择 spec 文件：

```bash
# 冒烟测试
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bun run .claude/scripts/run-tests-notify.ts \
  workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts \
  --project=chromium

# 完整测试
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bun run .claude/scripts/run-tests-notify.ts \
  workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium
```

> **必须使用 `run-tests-notify.ts` 包装器**：直接调用 `bunx playwright test` 只会执行测试，**不会**刷新 Allure HTML 报告、**不会**发送钉钉通知。包装器会在测试结束后自动生成 `allure-report/` 并推送 IM 卡片。如需临时跳过通知，加 `SKIP_NOTIFY=1`；跳过报告生成加 `SKIP_ALLURE_GEN=1`。
>
> 报告输出至 `workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/`，含 `allure-results/`（原始数据）和 `allure-report/`（HTML 入口 `index.html`）两个子目录。

**并发执行（可选，加速全量回归）**：默认串行，用例多时可开启并发。

### 方案 A：纯并发（所有用例并行跑）

适用场景：所有用例都做好了数据隔离、无共享全局状态。

```bash
PW_FULLY_PARALLEL=1 PW_WORKERS=4 \
  ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bun run .claude/scripts/run-tests-notify.ts \
  workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium
```

### 方案 B：两阶段（推荐，兼顾速度与稳定性）

适用场景：存在少量"并发不安全"用例（依赖全局通知计数 / 共享列表导入导出 / 租户级状态等）。

工作流程：
1. 阶段 1：`--grep-invert=@serial` + `PW_FULLY_PARALLEL=1`，把通用用例并发跑完
2. 阶段 2：`--grep=@serial` + `PW_WORKERS=1`，把串行用例依次跑完
3. 两阶段共享一份 allure 输出，最后合并统计 + 发一次通知

```bash
PW_TWO_PHASE=1 PW_WORKERS=4 \
  ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bun run .claude/scripts/run-tests-notify.ts \
  workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium
```

- `PW_TWO_PHASE=1`：启用两阶段；与用户自带 `--grep` / `--grep-invert` 冲突（会报错退出）
- `PW_WORKERS=N`：阶段 1 并发度；阶段 2 自动强制为 1

### `@serial` 标签约定

给需要串行跑的测试打 `@serial` 标签，Playwright 原生 tag 语法：

```ts
test("【P1】验证导入失败时仅出现单个错误通知", { tag: "@serial" }, async ({ page, step }) => {
  // ...
});

// 已有 options 的用例：
test("xxx", { timeout: 180000, tag: "@serial" }, async ({ page, step }) => {
  // ...
});
```

**哪些用例该标 `@serial`？**

| 并发风险                  | 触发场景                                       |
| ------------------------- | ---------------------------------------------- |
| 全局通知/Toast 计数断言   | `.ant-notification-notice` 数量断言            |
| 共享列表导入/导出         | 后端去重/校验依赖全局状态                      |
| 列表定位用 `filter.first` | 并发数据污染同前缀行时易命中错误行             |
| 下载/上传大文件、性能测试 | 资源抢占导致超时                               |

并发跑出现失败后，先看失败分类 → 给涉及的文件加 `@serial` → 重跑验证。

### 数据冲突前置检查

开并发前确认：测试用 `uniqueName()` 生成隔离标识、前置数据（数据源/质量项目）已提前创建好可复用，避免多 worker 抢占同名资源。

记录执行开始时间，计算 `duration`。

---

按 Task Schema 更新：将 `步骤 7` 标记为 `completed`（subject: `步骤 7 — 回归完成，{{passed}}/{{total}} 通过`）。
