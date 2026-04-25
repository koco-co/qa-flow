# Subagent A · 阶段 1 — 脚本生成

> 本文件是 subagent A（`main.md` 步骤 3）内部三个阶段的第一个阶段。
> 当前 subagent 已收到全部上下文，按阶段顺序执行。

## 阶段 1：生成 Playwright 脚本

### 1.0 源码分析（每次生成前必做）

在生成任何脚本之前，先阅读 `workspace/{{project}}/.repos/` 下的相关前端源码：

- 当前迭代需求与主流程的关系
- 页面路由和菜单结构（检查 `router/` 或 `routes/` 配置）
- 组件层次和表单结构
- 接口调用方式（检查 service 层）

这一步的信息直接指导脚本中选择器和导航方式，避免盲猜。

### 1.1 逐条生成脚本

从步骤 1 解析结果中获取用例列表，逐条生成：

1. 取一条用例（id, title, priority, page, steps, preconditions）
2. 构建 `lib/playwright/` 共享函数清单（用 `Grep` 获取导出函数列表）
3. 生成 Playwright TypeScript 脚本文件
4. 写入 `.kata/{{project}}/ui-blocks/{{suite_slug}}/{{id}}.ts`

**输出规范：**

```typescript
// META: {"id":"t1","priority":"P0","title":"【P0】验证xxx"}
import { test, expect } from "../../fixtures/step-screenshot";
// ... Playwright test code
```

选择器优先级：`getByRole` > `getByText` > `getByTestId` > CSS（尽量避免纯 CSS 路径）。

**前置条件处理：** 当用例的 `preconditions` 包含 SQL 建表/数据准备时，在脚本的 `test.beforeAll` 中使用 `setupPreconditions`（来自 `dtstack-cli` 包），自动完成建表、数据源引入、元数据同步。

### 1.2 所有脚本生成完毕后

确认 `.kata/{{project}}/ui-blocks/{{suite_slug}}/` 下已生成全部脚本文件后，进入 **阶段 2**。
