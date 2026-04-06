# 前端 Bug 分析指令

> 本提示词由 code-analysis skill 在模式 C 时加载。
> 分析完成后，生成 HTML 报告所需的结构化数据（见「输出结构」一节）。

---

## 分析目标

将用户提供的前端报错（浏览器 Console 错误、React / Vue 运行时警告、网络请求失败、白屏日志等）转化为：

1. 清晰的报错定位和根因结论
2. 受影响的页面/组件范围
3. 结构化报告数据（用于渲染 HTML 报告）

---

## 错误类型识别

首先判断报错类型，决定后续分析重点：

| 错误类型 | 典型特征 | 分析重点 |
|----------|----------|----------|
| `TypeError` / `ReferenceError` | `Cannot read properties of undefined`、`is not a function` | 空值防护、变量声明 |
| `ChunkLoadError` | `Loading chunk X failed`、`Failed to fetch dynamically imported module` | CDN 路径、构建配置 |
| React 错误 | `Error: Minified React error #xxx`、`componentDidCatch` | 组件生命周期、props 类型 |
| Vue 警告 | `[Vue warn]: ...` | 响应式数据、生命周期钩子 |
| 网络错误 | `Failed to load resource`、CORS、401/403/500 | API 接口、跨域配置、权限 |
| 内存 / 性能 | `Maximum update depth exceeded`、内存溢出 | 循环更新、事件监听泄漏 |

---

## 分析步骤

### 第一步：提取报错基础信息

从控制台日志/错误栈中提取：

- **错误消息**：完整的 Error message
- **错误类型**：TypeError / ReferenceError / NetworkError 等
- **文件位置**：报错文件名和行号（通常在 sourcemap 映射前）
- **组件栈**（React/Vue）：错误发生时的组件调用链

---

### 第二步：四层分析

按以下顺序逐层分析，定位根因：

**第 1 层：组件层**

- 报错发生在哪个组件（页面/业务组件/公共组件）？
- 是否与 props 传入的数据类型不匹配？
- 是否在组件卸载后仍有异步操作（如 setState after unmount）？

**第 2 层：数据层**

- 报错是否由接口返回数据结构变化导致？
- 是否存在 `undefined` / `null` 的链式访问（如 `a.b.c` 而 `b` 为 undefined）？
- Store（Redux / Vuex / Pinia）中的状态是否被意外修改？

**第 3 层：环境层**

- 是否为特定浏览器（Safari / IE）或特定版本才出现？
- 是否为网络问题（CDN 资源加载失败、CORS 配置）？
- 是否为打包/构建配置问题（路径别名、代码分割）？

**第 4 层：框架层**

- 是否与框架版本升级相关？
- 是否违反了框架的生命周期约束？

---

### 第三步：源码定位（当 config.repos 非空且已同步源码时）

在 `.repos/` 前端仓库中查找报错文件和行号，分析：

```bash
# 在前端仓库中搜索报错组件
grep -r "ComponentName" .repos/xxx-frontend/src/ --include="*.tsx" --include="*.vue" -l
```

读取对应组件代码，分析报错上下文（±15 行）。

---

### 第四步：影响范围评估

- 受影响的页面路径（如 `/goods/list`、`/order/detail/:id`）
- 是否全局影响（所有用户）还是特定场景（特定数据、特定操作）
- 用户可见现象：白屏 / 功能不可用 / 仅控制台报错

---

### 第五步：修复建议

针对根因给出 2-3 条修复建议：

- 优先建议最小化、风险最低的方案（如空值防护）
- 说明是否需要同步修改后端接口或配置

---

## 输出结构

分析完成后，将以下 JSON 数据交给 SKILL.md 渲染 HTML 报告：

```json
{
  "title": "报告标题（如：GoodsList 组件访问 undefined.price 导致白屏）",
  "analysis_time": "YYYY-MM-DD HH:mm",
  "problem_type": "代码问题 | 环境问题 | 混合",
  "severity": "严重 | 一般 | 低",
  "summary": "一句话根因（≤80字）",
  "error_type": "TypeError | ReferenceError | ChunkLoadError | React error | Vue warn | NetworkError | Other",
  "error_message": "原始报错消息",
  "error_location": {
    "file": "报错文件路径",
    "line": 42,
    "column": 18,
    "component_stack": "组件调用链（React/Vue 特有）"
  },
  "layer_analysis": {
    "component_layer": "组件层分析结论",
    "data_layer": "数据层分析结论",
    "environment_layer": "环境层分析结论",
    "framework_layer": "框架层分析结论"
  },
  "code_location": {
    "file": "相对路径",
    "line": 42,
    "snippet": "相关代码片段",
    "analysis": "该处代码的问题描述"
  },
  "affected_pages": ["页面路径1", "页面路径2"],
  "root_cause": "根因详细描述",
  "fix_suggestions": [
    {
      "priority": 1,
      "location": "在哪里改",
      "action": "改什么",
      "reason": "为什么"
    }
  ]
}
```

若某字段信息不足，填 `null`，不要留空字符串占位。

---

## 注意事项

- `ChunkLoadError` 通常是 CDN 缓存问题或部署时旧资源被清除，不一定是代码 Bug，需区分说明。
- React Minified Error 需查阅 React 官方错误码对照表还原完整错误描述（常见错误码见下）：
  - `#185`：Invalid hook call（在非组件/函数内调用了 Hook）
  - `#301`：Cannot update a component from inside the function body of a different component
  - `#310`：Too many re-renders（无限循环更新）
- Vue warn 仅警告不一定阻断渲染，需判断是否影响功能。
