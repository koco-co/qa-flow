# Playwright 编码最佳实践

Playwright 自动化测试脚本的标准化编码模式和规范。

## 1. 共享工具库（lib/playwright/）

### 1.1 分层架构

```
lib/playwright/              ← 跨项目共享层（通用 Ant Design 交互）
  ├── ant-interactions.ts    ← Select / Message / Modal / Drawer / Popconfirm / Table / Form / Tabs / Checkbox & Radio / Dropdown
  ├── navigation.ts          ← navigateViaMenu
  ├── utils.ts               ← uniqueName, todayStr
  └── index.ts               ← 统一导出（完整清单见此文件）

workspace/{project}/tests/helpers/   ← 项目专属层（业务逻辑、API 调用）
  └── test-setup.ts                  ← 环境配置、Cookie 注入、URL 构建、项目特有操作

workspace/{project}/tests/{YYYYMM}/{suite}/  ← 套件专属层
  └── xxx-helpers.ts                          ← 当前需求特有的复合操作
```

### 1.2 函数归属判断标准

| 归属                                | 判断条件                                                  | 示例                                                                         |
| ----------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **共享层** `lib/playwright/`        | 只依赖 Ant Design 组件结构，不涉及任何业务 API 或项目 URL | `selectAntOption`, `confirmPopconfirm`, `waitForTableLoaded`, `switchAntTab` |
| **项目层** `helpers/test-setup.ts`  | 涉及项目特有的 URL 构建、API 端点、环境变量               | `buildDataAssetsUrl`, `applyRuntimeCookies`, `syncMetadata`                  |
| **套件层** `{suite}/xxx-helpers.ts` | 涉及特定需求的业务流程组合                                | `saveRuleSet`, `configureRangeEnumRule`                                      |

### 1.3 使用方式

**新项目/新套件编写脚本时，必须先检查共享库中是否已有可用函数：**

```typescript
// 优先从共享库 import（通过项目 helpers re-export 或直接引用）
import { selectAntOption, expectAntMessage } from "../../helpers/test-setup";

// 或直接从共享库引用（新项目推荐）
import {
  selectAntOption,
  expectAntMessage,
} from "../../../../lib/playwright/index";
```

### 1.4 新增函数规则

- **禁止在 spec 文件中内联定义**已存在于共享库的函数
- 新写的通用函数如果**不依赖任何业务逻辑**，应直接加到 `lib/playwright/` 对应模块
- 新写的函数如果**依赖项目特有配置**，放到 `workspace/{project}/tests/helpers/`
- 新写的函数如果**仅当前套件使用**，放到套件目录的 `xxx-helpers.ts`

### 1.5 lib/playwright vs site-knowledge 决策树

```
发现交互模式
  ├── 跨站点通用？且不依赖具体业务 URL？
  │   └── 是 → lib/playwright/（封装为共享函数）
  ├── 仅当前站点有效？
  │   └── 是 → knowledge/sites/（记录为知识文档，由 merge-site-knowledge 写入）
  └── 不确定？
      └── 先 knowledge/sites/，后续出现第二个站点时再提炼
```

### 1.6 站点知识参考

站点操作知识存储在 `workspace/{project}/knowledge/sites/{hostname}/`，包含以下文件：

| 文件           | 内容                             |
| -------------- | -------------------------------- |
| `selectors.md` | 稳定 selector、role、data-testid |
| `traps.md`     | 交互陷阱、不稳定的选择器         |
| `api.md`       | 后端 API 端点、请求参数          |
| `overview.md`  | 站点概况、URL 模式、登录方式     |

在 `script-case-agent` 生成脚本前，主 agent 会通过 Step 3a 自动读取相关站点知识并注入到 prompt 中。

---

## 2. 定位器优先级

优先级从高到低，选择时遵循此顺序：

### 2.1 第一优先级：语义化定位器

使用 Playwright 的内置语义化定位器，最具可读性和可维护性：

- `page.getByRole('button', { name: '新增' })` — 按角色和名称
- `page.getByLabel('商品名称')` — 表单标签
- `page.getByPlaceholder('请输入商品名称')` — 占位符文本
- `page.getByText('确认')` — 精确文本匹配

### 2.2 第二优先级：测试 ID

当语义化定位器无法确定时，使用测试 ID（元素中的 `data-testid` 属性）：

```typescript
page.getByTestId("search-btn");
page.getByTestId("user-profile-avatar");
```

### 2.3 第三优先级：CSS 选择器

仅在前两种方式无法使用时采用 CSS 选择器：

```typescript
page.locator(".ant-btn-primary");
page.locator("table tbody tr").first();
```

### 2.4 无法确定时的处理

当无法通过源码或 DOM 确定选择器时：

```typescript
// TODO: 需通过 playwright-cli snapshot 获取实际选择器
page.locator("text={{按钮文本}}");
```

## 3. step() 函数规范

`step(name, body, highlight?)` 是一个自定义 fixture，会在每步执行后自动截图并附加到测试报告。

### 3.1 参数说明

- `name`：步骤名称，格式 `"步骤N: {{step描述}} → {{expected描述}}"`
- `body`：异步函数，包含该步骤的操作和断言
- `highlight`（可选）：一个 Locator，截图时会对该元素加红框高亮

### 3.2 使用示例

基础使用（无高亮）：

```typescript
await step("步骤1: 进入数据质量页面", async () => {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
});
```

带高亮（断言的目标元素）：

```typescript
const heading = page.getByRole("heading", { name: "质量问题台账" });
await step(
  "步骤2: 验证页面标题 → 显示质量问题台账",
  async () => {
    await expect(heading).toBeVisible();
  },
  heading,
);
```

### 3.3 highlight 使用原则

- 断言涉及**可见元素**时，传入该元素作为 `highlight`
- 断言为 URL 校验、非可视化验证时，**不传** `highlight`
- 优先高亮断言的**主要目标元素**（如验证表格 → 高亮首行）

## 4. 高频错误场景 UI 模式

### 4.1 表单填写与提交

```typescript
await step("步骤1: 填写表单 → 成功提交", async () => {
  // 填写文本输入框
  await page.getByLabel("商品名称").fill("2026春季新款运动鞋");

  // 选择下拉框
  await page.getByLabel("商品分类").selectOption("运动鞋");

  // 点击提交按钮
  await page.getByRole("button", { name: "提交" }).click();

  // 等待提交完成和响应消息
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("保存成功")).toBeVisible({ timeout: 5000 });
});
```

### 4.2 表格数据验证

```typescript
await step(
  "步骤2: 查看列表数据 → 表格有数据",
  async () => {
    // 等待表格加载
    const tableRows = page.locator("table tbody tr");
    await expect(tableRows.first()).toBeVisible();

    // 验证表格有数据
    await expect(tableRows).not.toHaveCount(0);

    // 验证首行的特定列值
    const firstRow = tableRows.first();
    await expect(firstRow.locator("td").nth(0)).toContainText("期望值");
  },
  tableRows.first(),
);
```

## 5. 等待策略

选择合适的等待方式，避免不必要的延迟：

### 5.1 页面导航后

```typescript
await page.goto(url);
await page.waitForLoadState("networkidle"); // 等待网络空闲
```

### 5.2 表单提交或删除操作后

```typescript
await page.getByRole("button", { name: "提交" }).click();
await page.waitForLoadState("networkidle");
// 或等待特定消息出现
await expect(page.getByText("操作成功")).toBeVisible({ timeout: 5000 });
```

### 5.3 弹窗出现与关闭

```typescript
// 等待弹窗出现
await expect(page.getByRole("dialog")).toBeVisible();

// 点击确认
await page.getByRole("button", { name: "确认" }).click();

// 等待弹窗关闭
await expect(page.getByRole("dialog")).not.toBeVisible();
```

### 5.4 其他策略

- **等待特定元素可见**：`await page.waitForSelector('.target', { state: 'visible' })`
- **等待 API 响应**：`await page.waitForResponse(url => url.includes('/api/'))`
- **固定等待（最后手段）**：`await page.waitForTimeout(500)` — 仅在其他方式无法工作时使用，不超过 2000ms

## 6. Meta 注释格式

每个 Playwright 脚本的文件头部必须包含 META 注释：

```typescript
// META: {"id":"t1","priority":"P0","title":"【P0】验证xxx"}
import { test, expect } from "../../fixtures/step-screenshot";

// storageState 由 playwright.config.ts 根据 ACTIVE_ENV 全局设置，无需在此指定

test.describe("功能名称 - 页面名", () => {
  test("【P0】验证xxx", async ({ page, step }) => {
    // 步骤内容
  });
});
```

### 6.1 META 字段说明

- `id`：测试用例 ID（如 `t1`, `t2`）
- `priority`：优先级（`P0`, `P1`, `P2`）
- `title`：完整的测试标题，包含优先级前缀

## 7. 完整脚本模板

```typescript
// META: {"id":"t1","priority":"P0","title":"【P0】验证xxx"}
import { test, expect } from "../../fixtures/step-screenshot";

// storageState 由 playwright.config.ts 根据 ACTIVE_ENV 全局设置，无需在此指定

test.describe("功能名称 - 页面名", () => {
  test("【P0】验证xxx", async ({ page, step }) => {
    // 步骤1：进入页面
    await step("步骤1: 进入页面 → 页面正常加载", async () => {
      await page.goto("https://xxx.dtstack.cn/path");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading")).toBeVisible();
    });

    // 步骤2：执行操作
    await step(
      "步骤2: 填写表单 → 成功提交",
      async () => {
        await page.getByLabel("字段名").fill("输入值");
        const submitBtn = page.getByRole("button", { name: "提交" });
        await submitBtn.click();
        await expect(page.getByText("成功")).toBeVisible({ timeout: 5000 });
      },
      submitBtn,
    );
  });
});
```

---

## 参考

- 步骤 3 Case Processing（写+修一条龙）：`.claude/agents/script-case-agent.md`
- 步骤 3-3 Convergence（共性收敛）：`.claude/agents/convergence-agent.md`
- UI 自动化测试 Skill：`.claude/skills/ui-autotest/SKILL.md`
- 步骤 5 Regression Runner（全量回归执行）：`.claude/agents/regression-runner-agent.md`
