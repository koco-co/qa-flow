# Subagent A · 阶段 2 — 逐条自测与修复

> 本文件是 subagent A（`main.md` 步骤 3）内部三个阶段的第二个阶段。
> 阶段 1（脚本生成）已完成，产物在 `.kata/{{project}}/ui-blocks/{{suite_slug}}/` 下。

## 阶段 2：逐条执行 + 修复（最多 3 轮）

### 2.0 前置条件准备

若用例有 SQL 前置条件（建表/引入/同步），在 `test.beforeAll` 中通过 `setupPreconditions` 处理，确保执行前数据环境就绪。

### 2.1 逐条执行验证

对 `.kata/{{project}}/ui-blocks/{{suite_slug}}/` 中的每个代码块，逐条执行：

```bash
ACTIVE_ENV={{env}} QA_PROJECT={{project}} bunx playwright test .kata/{{project}}/ui-blocks/{{suite_slug}}/{{id}}.ts --project=chromium --timeout=30000
```

### 2.2 失败处理（最多 3 轮）

**2.2.1 错误分类**

从 Playwright stderr 提取错误类型：

| 模式 | error_type |
|------|------------|
| `Timeout \d+ms exceeded` | timeout |
| `locator\..*resolved to \d+ elements?\|waiting for locator` | locator |
| `expect\(.*\)\.(toHave\|toBe\|toContain\|toMatch)` | assertion |
| 以上均不匹配 | unknown |

**2.2.2 修复循环**

对每条失败脚本：

1. 读取源码 + 错误输出 + DOM snapshot
2. 修复选择器或逻辑
3. 重新执行
4. 通过 → 标记通过，进入下一条
5. 仍失败且轮次 < 3 → 回到步骤 1
6. 3 轮仍失败 → 标记为最终失败，记录错误摘要

**2.2.3 NEED_USER_INPUT 处理**

修复过程中遇到无法确定性判断的场景（DOM 与描述不符、断言文本歧义、流程步骤缺失）：

- **机械修正**（选择器漂移、函数签名变化）→ 直接修，继续
- **涉及 Archive MD 内容的修改**（字段名、预期文本、流程步骤）→ 记入 `NEED_USER_INPUT` 列表，最终在 subagent 交付报告中一并返回主 agent

**2.2.4 断言红线**

断言文本必须严格对齐 Archive MD `expected` 列原文。禁止：
- 扩大正则匹配范围
- 用 `toBeVisible()` 替代文本断言
- 用 `filter(Boolean)` 绕过空数组
- 用 try/catch 吞断言失败

### 2.3 前置条件准备与收敛判断

**2.3.1 逐条执行**（逻辑同 2.1，复用阶段 2 的轮次计数）

每条用例执行前，若前置条件已就绪则跳过准备；否则先执行前置条件 SQL/API。

**2.3.2 失败数达到阈值时触发收敛**

当前累计失败用例数 ≥ `convergence_threshold(默认 5)` 且收敛尚未完成时，进入 **阶段 3（收敛）**。收敛完成后回到 2.2 继续修复剩余失败用例，所有 fixer 的 `helpers_locked=true`。

### 2.4 全部完成后汇总

- 通过数 / 失败数 / 修复轮次统计
- 3 轮仍失败的用例清单 + 错误摘要
- `NEED_USER_INPUT` 列表（返回主 agent 由 review gate R1 处理）

进入 **阶段 3** 或 **提交交付物**。
