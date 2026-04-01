# Bug 报告 — AI 输出规范

## 核心规范

- HTML 模板位于 `templates/bug-report-backend.html`（后端）和 `templates/bug-report-frontend.html`（前端）
- AI 只需输出 JSON 数据文件，由脚本 `scripts/render-report.mjs` 渲染为 HTML
- 生成命令：`node .claude/skills/code-analysis-report/scripts/render-report.mjs <template> <data.json> <output.html>`

---

## 严重程度

| 级别 | `severity` 值 | 场景 |
|------|--------------|------|
| P0 致命 | `"P0"` | 核心功能完全不可用、数据丢失 |
| P1 严重 | `"P1"` | 主要功能异常，影响业务流程 |
| P2 一般 | `"P2"` | 功能异常但有变通方案 |
| P3 轻微 | `"P3"` | 轻微问题，不影响主流程 |

---

## 后端 Bug JSON Schema

AI 分析完成后，输出以下 JSON 结构到 `reports/bugs/{YYYY-MM-DD}/{BugTitle}.json`：

```json
{
  "severity": "P1",
  "BUG_TITLE": "一句话描述 Bug（如：提交订单时 NullPointerException 导致 500）",
  "EXCEPTION_TYPE": "NullPointerException",
  "CLASS_NAME": "OrderService",
  "LINE_NUMBER": "142",
  "MODULE_NAME": "订单管理",
  "HTTP_METHOD": "POST",
  "API_PATH": "/api/v1/orders",
  "BRANCH_NAME": "release/v2.1",
  "COMMIT_HASH": "a3f8c1d2",
  "ENVIRONMENT_URL": "https://test.example.com",
  "TENANT_INFO": "tenant-demo",
  "PROJECT_INFO": "project-123",
  "ISSUE_TYPE": "代码缺陷",
  "ROOT_CAUSE": "用 2-3 句话解释根本原因（面向非技术人员）",
  "CALL_CHAIN": "<span style='...'>OrderController.createOrder()</span> → ...",
  "PROBLEM_FILE": "service/OrderService.java",
  "PROBLEM_METHOD": "createOrder()",
  "PROBLEM_LINE": "142",
  "PROBLEM_CODE": "User user = userMap.get(userId);\nuser.getName(); // <-- 问题在这里",
  "CODE_COMPARISON": false,
  "CORRECT_METHOD": "修复后方法名",
  "CORRECT_CODE": "正确代码片段",
  "PROBLEM_METHOD_LABEL": "问题代码",
  "PROBLEM_CODE_COMPARE": "问题代码片段",
  "FIX_NAME": "修复方案：增加 null 检查",
  "FIX_FILE": "service/OrderService.java",
  "FIX_CODE": "完整修复代码（含前后 3-5 行上下文）",
  "FIX_POINTS": "<li>在调用 user.getName() 前增加 null 判断</li>",
  "CURL_COMMAND": "curl -X POST https://test.example.com/api/v1/orders ...",
  "REPRO_STEPS": "<li>登录系统</li><li>进入订单页面</li><li>点击提交</li>",
  "ACTUAL_RESULT": "系统返回 500 Internal Server Error",
  "EXPECTED_RESULT": "订单创建成功，返回 200 和订单 ID",
  "KEY_EXCEPTION": "java.lang.NullPointerException: Cannot invoke getName() on null",
  "FULL_LOG": "完整错误日志（多行）",
  "IMPACT_ITEMS": "<li>OrderService.createOrder() — 核心创建方法</li>",
  "VERIFICATION_ROWS": "<tr><td>正常提交（含用户信息）</td><td>返回 200</td></tr>",
  "DATETIME": "2026-04-01 14:30"
}
```

> `CODE_COMPARISON` 为 `true` 时渲染代码对比区块，`false` 时隐藏该区块。

---

## 前端错误 JSON Schema

```json
{
  "severity": "P2",
  "ERROR_TYPE": "TypeError: Cannot read properties of null",
  "FRAMEWORK": "Vue 3",
  "COMPONENT_PATH": "src/views/order/OrderList.vue",
  "BRANCH_NAME": "release/v2.1",
  "BROWSER_ENV": "Chrome 120 / Node 18.x",
  "FRAMEWORK_VERSION": "Vue 3.4.0",
  "NODE_VERSION": "18.19.0",
  "ISSUE_TYPE": "代码缺陷",
  "COMPONENT_STACK": "<div style='font-family:monospace'>组件调用链 HTML 内容</div>",
  "ROOT_CAUSE_ANALYSIS": "<p>根本原因说明 HTML</p>",
  "FIX_SUGGESTIONS": "<ul><li>修复建议1</li></ul>",
  "DATETIME": "2026-04-01 14:30"
}
```

---

## 区块使用说明

| 区块 | 必填 | 对应 JSON 字段 |
| ---- | ---- | -------------- |
| 基本信息 | 是 | MODULE_NAME, HTTP_METHOD, API_PATH, BRANCH_NAME, COMMIT_HASH |
| 环境与上下文 | 是 | ENVIRONMENT_URL, TENANT_INFO, PROJECT_INFO, ISSUE_TYPE |
| 根因分析 | 是 | ROOT_CAUSE, CALL_CHAIN |
| 问题代码定位 | 是 | PROBLEM_FILE, PROBLEM_METHOD, PROBLEM_LINE, PROBLEM_CODE |
| 代码对比 | 否 | CODE_COMPARISON=true 时显示 |
| 修复建议 | 是 | FIX_NAME, FIX_FILE, FIX_CODE, FIX_POINTS |
| 影响范围 | 是 | IMPACT_ITEMS |
| 复现步骤 | 是 | CURL_COMMAND, REPRO_STEPS, ACTUAL_RESULT, EXPECTED_RESULT |
| 错误日志 | 是 | KEY_EXCEPTION, FULL_LOG |
| 测试验证 | 是 | VERIFICATION_ROWS |

---

## 生成规则

1. `ROOT_CAUSE` 必须用自然语言描述，非技术人员可读（非堆栈信息）
2. `PROBLEM_CODE` 中错误行末尾必须添加注释 `// <-- 问题在这里`
3. `FIX_CODE` 必须是可直接复制粘贴的完整代码段（含 3-5 行上下文）
4. `CURL_COMMAND` 原样保留，不脱敏
5. 密码、token 等敏感信息替换为 `***`
6. AI 免责声明已固化在 HTML 模板中，JSON 中无需提供
