# 断言忠实原则（Assertion Fidelity）

> 所有 Playwright 脚本生成/修复 agent 必须遵守的共享规则。ui-autotest 链路的 `script-case-agent`（步骤 3）和 `regression-runner-agent`（步骤 5）引用本文件。

## 核心原则

**步骤（操作）可以根据实际 DOM 修正；预期（断言）必须严格忠实于 Archive MD 用例 `expected` 列原文。断言失败即潜在 Bug 信号，不得通过放宽断言来"凑通过"。**

自动化测试的目的是复现 Bug，不是把测试变绿。弱化断言会把缺陷悄悄吞掉。

---

## 禁止的断言模式（写脚本、修脚本都禁止）

### 1. 禁止用 `|` 枚举成功判定扩大范围

```typescript
// ❌ 用例预期「匹配成功」，却用正则兜底
await expect(result).toContainText(/匹配成功|符合正则|校验通过/);

// ✅ 严格按用例原文
await expect(result).toContainText("匹配成功");
```

### 2. 禁止用 `.locator("*").filter({ hasText })` 全局搜文本

祖先节点含关键字（如按钮名"正则匹配测试"本身带"正则"二字）就会误命中。

```typescript
// ❌ 弹窗内任意祖先含「正则」都能通过
modal.locator("*").filter({ hasText: /匹配成功/ });

// ✅ 精确定位到结果区域（message / alert / form-item-explain / 专用结果容器）
modal
  .locator(
    ".ant-message-notice, .ant-alert, .ant-form-item-explain, [class*=test-result]",
  )
  .filter({ hasText: "匹配成功" })
  .first();
```

### 3. 禁止用 `.toBeVisible()` 替代文本断言

控件原本就可见时，断言恒真。

```typescript
// ❌ 只验可见，不验内容
await expect(resultBox).toBeVisible();

// ✅ 同时断言存在 + 文本正确
await expect(resultBox).toBeVisible();
await expect(resultBox).toContainText("匹配成功");
```

### 4. 禁止用 `.*` / `.+` / 空正则兜底

```typescript
// ❌
await expect(result).toHaveText(/.+/);
await expect(page).toHaveTitle(/.*/);

// ✅ 用例说什么就断言什么
await expect(result).toHaveText("匹配成功");
```

### 5. 禁止用 try/catch、条件判断吞断言

```typescript
// ❌ 吞掉失败
try {
  await expect(result).toHaveText("匹配成功");
} catch {}

// ❌ 元素缺失时跳过断言
if (await result.isVisible()) await expect(result).toHaveText("匹配成功");

// ❌ 把失败断言反转语义
await expect(result).not.toBeVisible(); // 原本要求「显示匹配成功」
```

### 6. 禁止删除、`.skip()` 断言步骤

---

## 用例预期 → 断言 翻译规则

| 用例 `expected` 文本      | 断言写法                                              |
| ------------------------- | ----------------------------------------------------- |
| "显示匹配成功"            | `toContainText("匹配成功")` 禁止 `/匹配成功\|成功/`   |
| "显示匹配失败"            | `toContainText("匹配失败")` 禁止 `/匹配失败\|不符合/` |
| "按钮隐藏" / "控件不可见" | `toHaveCount(0)` 或 `not.toBeVisible()`               |
| "按钮禁用"                | `toBeDisabled()`                                      |
| "提示：{{原文}}"          | `toContainText("{{原文}}")`，多条提示就多条 `expect`  |
| "输入框值为 X"            | `toHaveValue("X")`                                    |
| "列表 N 条"               | `toHaveCount(N)`                                      |

---

## 合法的断言修复（仅 fixer 相关）

断言失败时，fixer 只允许以下三类修复，**不得**修改断言文本本身：

1. **定位器选错了元素**：页面预期文本确实存在，但原脚本定位到了错误节点 → 修正选择器到正确结果区域，断言文本保持原文
2. **时序问题**：结果异步渲染 → 加 `await expect(...).toBeVisible({ timeout })` 或等待 API 响应，断言文本保持原文
3. **前端文案同义变更**：如用例写"匹配成功"但最新前端实现改成"测试成功"，语义不变 → 在 `corrections` 中记 `reason_type="frontend"`，脚本断言同步更新为新词，返回 `FIXED`

其他情况（页面根本不显示预期文本、或显示相反结果）→ **不改脚本断言**，返回 `STILL_FAILING` + `corrections.reason_type="potential_bug"`。

---

## corrections schema（fixer 输出）

```json
{
  "corrections": [
    {
      "case_id": "t15",
      "field": "step.4.expected",
      "current": "显示匹配结果为「匹配成功」",
      "proposed": "实际页面显示：「校验结果：未匹配，含 6 位数字」",
      "reason_type": "potential_bug",
      "evidence": "DOM 节点 .match-result 文本为「未匹配」，与正则 ^\\d{6}$ 对 123456 的结果矛盾"
    }
  ]
}
```

`reason_type` 取值：

| 值              | 含义                                   | 主 agent 处理                        |
| --------------- | -------------------------------------- | ------------------------------------ |
| `frontend`      | 前端 DOM/文案变更，语义不变            | 自动写回 Archive MD                  |
| `logic`         | 需求逻辑变更（预期规则变了）           | 展示差异预览，用户确认后写回         |
| `potential_bug` | 页面实际表现与用例预期不符，可能是缺陷 | **不写回**，脚本保持原断言，上报用户 |

---

## 为什么要严格（背景）

2026-04-20 复盘：`【通用配置】json格式配置` 用例 t15「正则测试」转脚本后，AI 把步骤 4 断言写成 `modal.locator("*").filter({ hasText: /匹配成功|符合正则/ })`。弹窗里有"正则匹配测试"按钮本身含"正则"二字，`/符合正则/` 恒真。测试全绿，但实际该功能存在多个缺陷，用例并未检出。

本文件就是这次复盘沉淀的硬约束。
