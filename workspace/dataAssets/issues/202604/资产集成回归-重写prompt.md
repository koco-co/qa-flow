# 资产-集成测试用例 主流程回归 — 执行 Prompt

## 目标

对 `tests/e2e/202604/资产-集成测试用例/smoke.spec.ts` 进行完整的主流程回归, 确保 42 个 Playwright E2E 测试用例全部通过, 并输出合格的 HTML 测试报告.

## 目标环境

- **平台地址**: `http://172.16.124.78` (CI78 环境)
- **活跃环境变量**: `QA_ACTIVE_ENV=ci78`
- **离线项目**: `env_rebuild_test`
- **数据源类型**: Doris 2.x (Meta 数据源, 通过离线开发引入)
- **登录态**: 通过 `.env` 中的 `QA_COOKIE_CI78` 注入, 如过期需先通过浏览器登录后更新

## 核心要求

### 1. 前置条件: 平台历史数据准备

测试用例依赖平台中的真实数据. `beforeAll` 中通过 `setupPreconditions()` API 自动建表并同步到数据资产:

```typescript
import { setupPreconditions } from '../../helpers/preconditions'

await setupPreconditions(page, {
  datasourceType: 'Doris',
  tables: [
    { name: 'test_table', sql: SQL_BASE },
    { name: 'doris_test', sql: SQL_QUALITY },
    { name: 'wwz_001', sql: SQL_LINEAGE },
    { name: 'active_users', sql: SQL_ACTIVE },
  ],
  projectName: 'env_rebuild_test',
  syncTimeout: 180,
})
```

**注意事项:**
- DDL API 仅支持单条 SQL, `batch.ts` 中已实现自动拆分（`splitStatements`）
- DDL API 仅接受 `CREATE TABLE` 和 `DROP TABLE`, `INSERT INTO` 走同一接口但失败不阻塞
- 如果 `beforeAll` 前置条件失败, 测试仍会继续执行（基于已有数据运行）, 但需要确保平台中已有对应表和数据
- 如果 CI78 环境中 `env_rebuild_test` 项目下没有 Doris 数据源, 需要先在离线开发中手动绑定

### 2. 截图: 每步独立 + 红框标注

**当前问题**: 报告中每个用例的截图都是重复的（同一个页面状态）, 原因是 `step()` 中的操作和截图时机不对 — 操作还没改变页面状态就截图了, 或者多个步骤截的都是同一个最终状态.

**修复要求:**

每个 `step()` 的截图必须反映**该步骤执行后的页面状态**, 不能和其他步骤的截图相同. 具体做法:

```typescript
await step('步骤1: 点击数据地图菜单 → 数据地图页面加载', async () => {
  await goToDataAssets(page, '/metaDataCenter')
  // 等待页面特征元素出现后再结束 step（此时 fixture 自动截图）
  await expect(page.locator('[class*="data-map"]')).toBeVisible({ timeout: 10000 })
})

// 步骤2 操作改变了页面（比如搜索）, 截图自然不同
await step('步骤2: 搜索 test_table → 搜索结果展示', async () => {
  const input = page.locator('input[placeholder*="搜索"]')
  await input.fill('test_table')
  await input.press('Enter')
  await expect(page.getByText('test_table')).toBeVisible({ timeout: 10000 })
}, page.getByText('test_table').first())  // ← 红框标注搜索结果
```

**红框标注规则:**
- `step()` 的第三个参数 `highlight` 是一个 `Locator`, 截图前会对该元素加 `outline: 3px solid red`
- **必须传入 highlight**: 当预期结果是某个具体元素可见/文本正确时, 将该元素作为 highlight 参数
- **不传 highlight 的场景**: 仅当步骤是纯导航/等待, 没有明确的目标元素时

**示例 — 正确 vs 错误:**

```typescript
// ✅ 正确: highlight 指向校验目标
const card = page.getByText('已接入数据源').first()
await step('步骤2: 查看统计卡片 → 已接入数据源可见', async () => {
  await expect(card).toBeVisible()
}, card)

// ❌ 错误: 没有 highlight, 截图无标注
await step('步骤2: 查看统计卡片 → 已接入数据源可见', async () => {
  await expect(card).toBeVisible()
})

// ❌ 错误: step 内没有等待, 截图时页面可能还没变化
await step('步骤1: 搜索 test_table → 结果展示', async () => {
  await input.fill('test_table')
  await input.press('Enter')
  // 缺少 await expect(...).toBeVisible() → 截图可能是空搜索框
})
```

### 3. MD 用例反向补全

源 MD 用例: `workspace/archive/202604/资产-集成测试用例.md`

MD 中的用例描述普遍简陋:
- 前置条件只写"存在 xxx 表", 没有 SQL 脚本
- 操作步骤模糊, 缺少具体的 UI 路径
- 预期结果写"验证成功", 没有具体校验点

**处理方式:**
1. 根据用例标题、步骤描述和预期, **推测合理的校验点**
2. 基于实际页面 DOM 结构编写精确的 Playwright 断言
3. 将推测的校验点**反向补充到 MD 用例**, 包括:
   - 前置条件: 数据源类型、依赖表名、SQL 文件引用
   - 操作步骤: 具体的 UI 操作路径（点击哪里、输入什么）
   - 预期结果: 具体的元素可见性、文本内容、数量校验
4. **仅在确实发现 bug 时才报告 bug**, 不要因为定位器不准确就认为是 bug — 优先调整定位器

### 4. 动态调整定位器

平台是 Ant Design 组件库, 常见模式:
- 表格: `.ant-table`, `.ant-table-row`
- 弹窗: `.ant-modal`, `.ant-modal-title`
- 消息: `.ant-message`, 用 `expectAntMessage(page, /成功/)` 校验
- 下拉: `.ant-select`, 用 `selectAntOption()` 操作
- 菜单: 用 `navigateViaMenu(page, ['一级菜单', '二级菜单'])` 导航

**当定位器失败时:**
1. 使用 `page.screenshot()` 或浏览器 DevTools 查看实际 DOM
2. 调整选择器（优先用 `getByText`, `getByRole`, 其次用 CSS class）
3. **不要盲目重试同一个选择器** — 分析页面结构后修改

### 5. Review 机制

- **SubAgent 完成编写后**: SubAgent 自行运行测试, 确认通过率
- **主 Agent 二次检查**: 
  1. 查看测试运行结果（passed/failed 数量）
  2. 检查 HTML 报告中的截图是否每步不同且有红框标注
  3. 确认 MD 用例已补全
  4. 确认无遗漏的测试用例

## 验收标准

### 必须达成（Hard Gate）

| # | 标准 | 验证方法 |
|---|------|---------|
| 1 | **42 个用例全部 PASS**（或明确标注为已知 bug 并提供 bug 描述） | `npx playwright test` 输出 0 failed |
| 2 | **HTML 报告已生成** | 文件存在于 `workspace/reports/playwright/202604/资产-集成测试用例/` |
| 3 | **每个步骤截图独立** | 报告中同一用例的不同步骤截图内容不同 |
| 4 | **关键元素红框标注** | 预期明确的步骤, 截图中有红色边框高亮目标元素 |
| 5 | **MD 用例已补全** | `workspace/archive/202604/资产-集成测试用例.md` 中每个用例都有具体的前置条件、操作步骤和预期结果 |
| 6 | **平台历史数据存在** | `beforeAll` 中 `setupPreconditions` 执行成功, 或平台中已有对应表和同步数据 |

### 加分项（Soft Gate）

| # | 标准 |
|---|------|
| 1 | 发现真实 bug 并在 `workspace/reports/bugs/` 生成 bug 报告 |
| 2 | 测试数据清理（创建的临时标准、词根等在 afterAll/afterEach 中删除） |
| 3 | 用例间无依赖, 可独立运行 |

## 文件清单

| 文件 | 用途 |
|------|------|
| `tests/e2e/202604/资产-集成测试用例/smoke.spec.ts` | 主测试脚本（需修改） |
| `tests/e2e/202604/资产-集成测试用例/sql/*.sql` | 4 个 Doris 建表 SQL |
| `tests/e2e/fixtures/step-screenshot.ts` | step + 截图 fixture（已有红框能力, 需正确使用） |
| `tests/e2e/helpers/test-setup.ts` | URL 构建、Cookie 注入、Ant Design helpers |
| `tests/e2e/helpers/preconditions.ts` | `setupPreconditions` 导出 |
| `plugins/assets-sql-sync/src/` | 平台 API 封装（Batch DDL、资产引入、元数据同步） |
| `workspace/archive/202604/资产-集成测试用例.md` | MD 源用例（需反向补全） |
| `.env` | 环境配置（cookie、baseUrl） |

## 执行命令

```bash
# 运行测试并生成 HTML 报告
QA_SUITE_NAME="资产-集成测试用例" npx playwright test "tests/e2e/202604/资产-集成测试用例/smoke.spec.ts"

# 查看报告
npx monocart show-report workspace/reports/playwright/202604/资产-集成测试用例/资产-集成测试用例.html
```

## 工作流程

```
1. 检查 .env 中 cookie 是否有效（浏览器访问 http://172.16.124.78 验证）
2. 阅读 MD 源用例, 理解 42 个测试覆盖的业务模块
3. 阅读 smoke.spec.ts, 理解当前实现
4. 逐个用例修改:
   a. 确保 step() 内有 await expect() 等待页面变化
   b. 给每个有明确预期的 step 传入 highlight 参数
   c. 推测并补充校验点
5. 运行测试, 检查失败用例
6. 对失败用例:
   - 截图分析实际 DOM → 调整定位器 → 重试
   - 确认是真实 bug → 记录 bug 描述
7. 全部通过后, 检查 HTML 报告截图质量
8. 反向补全 MD 用例
9. 提交代码
```
