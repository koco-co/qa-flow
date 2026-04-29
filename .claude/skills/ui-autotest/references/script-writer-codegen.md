# Script Writer — Codegen 规范

> Owner: ui-autotest · 引用方：script-case-agent.md（原 script-writer-agent）

## step 函数使用规范

`step(name, body, highlight?)` 是一个自定义 fixture，会在每步执行后自动截图并附加到测试报告。

### 参数说明

- `name`：步骤名称，格式 `"步骤N: {{step描述}} → {{expected描述}}"`
- `body`：异步函数，包含该步骤的操作和断言
- `highlight`（可选）：一个 Locator，截图时会对该元素加红框高亮

### 使用示例

```typescript
// 不需要高亮
await step("步骤1: 进入数据质量页面", async () => {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
});

// 带高亮：对断言的目标元素加红框
const heading = page.getByRole("heading", { name: "质量问题台账" });
await step(
  "步骤2: 验证页面标题 → 显示质量问题台账",
  async () => {
    await expect(heading).toBeVisible();
  },
  heading,
);

// 表格验证带高亮
const tableRows = page.locator("table tbody tr");
await step(
  "步骤3: 查看列表数据 → 表格有数据",
  async () => {
    await expect(tableRows.first()).toBeVisible();
    await expect(tableRows).not.toHaveCount(0);
  },
  tableRows.first(),
);
```

### highlight 使用原则

- 断言涉及**可见元素**时，传入该元素作为 `highlight`
- 断言为 URL 校验、非可视化验证时，不传 `highlight`
- 优先高亮断言的**主要目标元素**（如验证表格数据 → 高亮首行）

---

## 代码规范

### 基础结构

- 使用 `test.describe()` 包裹测试组，描述为 `{{suite_name}} - {{page}}`
- 使用 `test()` 定义单个测试，标题直接使用用例 `title`
- 测试回调**必须**解构 `{ page, step }`
- **禁止**在用例文件中硬编码 `test.use({ storageState: ... })`。登录态由 `playwright.config.ts` 全局按 `ACTIVE_ENV` 动态切换 session 文件路径
- step 函数使用规范参见上一章节

### 并发安全：`@serial` 标签判定（CRITICAL）

全量回归支持两阶段执行（`PW_TWO_PHASE=1`）：阶段 1 并发跑通用用例，阶段 2 串行跑标记 `@serial` 的用例。**写脚本时主动判定**并发安全性，对"并发不安全"用例必须加 `@serial` tag。

**必须加 `@serial` 的场景**：

| 场景                          | 触发断言/操作示例                                            |
| ----------------------------- | ------------------------------------------------------------ |
| 全局通知/Toast 计数断言       | `.ant-notification-notice` / `.ant-message` 的 `toHaveCount` |
| 共享列表导入/导出             | 文件上传后依赖后端去重/覆盖逻辑                              |
| 列表定位用 `filter.first`     | 并发数据污染同前缀行时易命中错误行                           |
| 下载/上传大文件、性能类测试   | 资源抢占导致超时                                             |
| 依赖全局状态/数据库快照的用例 | 例如"校验总条数=N"类断言                                     |

**写法**（Playwright tag 原生语法）：

```typescript
// 无其他选项
test(
  "验证导入失败时仅出现单个错误通知",
  { tag: "@serial" },
  async ({ page, step }) => {
    // ...
  },
);

// 已有 timeout 等选项，合并进同一对象
test(
  "验证大文件导入全流程",
  { timeout: 180000, tag: "@serial" },
  async ({ page, step }) => {
    // ...
  },
);
```

**不要滥用**：仅当存在上表列出的并发风险时才加。常规 CRUD 用 `uniqueName()` 做隔离即可并发，不需要 `@serial`。

### 定位器规则与 UI 模式

定位器优先级及常见 UI 模式参见 `.claude/skills/ui-autotest/references/playwright-patterns.md`，包含：

- 4 层定位器优先级
- 表单填写、列表搜索、弹窗确认、表格验证等代码模式
- 下拉框与日期选择

### 等待策略

- 网络请求完成：`await page.waitForLoadState('networkidle')`
- 元素出现：`await page.waitForSelector('.target', { state: 'visible' })`
- API 响应：`await page.waitForResponse(url => url.includes('/api/'))`
- 固定等待（最后手段，不超过 2000ms）：`await page.waitForTimeout(500)`

### 断言规范

- 元素可见：`await expect(locator).toBeVisible()`
- 文本内容：`await expect(locator).toContainText('期望文本')`
- 精确文本：`await expect(locator).toHaveText('精确文本')`
- 输入框值：`await expect(locator).toHaveValue('输入值')`
- 元素数量：`await expect(locator).toHaveCount(n)`
- 页面 URL：`await expect(page).toHaveURL(/pattern/)`
- 元素禁用：`await expect(locator).toBeDisabled()`

### 断言忠实原则（CRITICAL）

**步骤可以按实际 DOM 修正，预期（`expected` 列）必须严格忠实于用例原文。断言失败即潜在 Bug 信号，禁止放宽断言"凑通过"。**

完整规则（禁止模式、翻译表、DOM 差异处理）详见 `docs/architecture/references/assertion-fidelity.md`。写脚本前必读。
