# 后端 Bug 分析指令

> 本提示词由 code-analysis skill 在模式 A 时加载。
> 分析完成后，生成 HTML 报告所需的结构化数据（见「输出结构」一节）。

---

## 分析目标

将用户提供的后端报错日志（Java 异常堆栈、HTTP 错误响应、curl 请求信息等）转化为：

1. 清晰的根因结论
2. 可操作的修复建议
3. 结构化报告数据（用于渲染 HTML 报告）

---

## 分析步骤

### 第一步：提取基础信息

从报错内容中提取：

- **请求信息**（如有）：
  - HTTP 方法和 URL
  - 请求参数（Query / Body / Headers 中的关键字段）
  - 响应状态码
  - 响应体摘要（前 500 字符）
  - curl 命令（如用户提供）

- **异常信息**：
  - 异常类型（如 `NullPointerException`、`SQLException`）
  - 异常消息（Exception message）
  - 根因行（`Caused by:` 之后第一行）

- **环境信息**（如有）：
  - Java / JDK 版本
  - 框架版本（Spring Boot / Dubbo 等）
  - 部署环境（dev / test / prod）

---

### 第二步：解析堆栈

定位以下关键节点：

1. **入口帧**：第一个属于业务代码的 `at` 行（通常包含公司包名，如 `com.dtstack`）
2. **根因帧**：`Caused by:` 中最内层的 `at` 行
3. **调用链**：从入口帧到根因帧的调用路径

若堆栈中存在多个 `Caused by:`，从最内层往外逐层分析。

---

### 第三步：源码定位（当 config.repos 非空且已同步源码时）

在 `.repos/` 中定位根因帧对应的文件和行号：

```bash
# 示例：根因帧为 com.dtstack.engine.service.UserService.findById(UserService.java:156)
# 则在对应仓库中搜索 UserService.java，读取第 156 行上下文（±20 行）
```

分析：

- 该位置的代码逻辑是否存在缺陷
- 相关变量可能为 null / 越界 / 类型不匹配的原因
- 是否存在并发问题、事务边界问题

---

### 第四步：区分环境问题 vs 代码问题

参考 `${CLAUDE_SKILL_DIR}/references/env-vs-code.md` 中的判断清单。

得出结论：

- `环境问题`：问题根源在配置、网络、权限、资源，与业务代码逻辑无关
- `代码问题`：问题根源在业务代码逻辑，需要修改代码
- `混合`：同时存在环境和代码两方面问题

---

### 第五步：生成修复建议

针对根因给出 2-4 条可操作的修复建议，按优先级排序：

- 每条建议说明：「在哪里改」「改什么」「为什么这样改」
- 若有多种修复方案，标注各方案的优劣

---

## 输出结构

分析完成后，将以下 JSON 数据交给 SKILL.md 渲染 HTML 报告：

```json
{
  "title": "报告标题（一句话概括 Bug，如：UserService.findById 触发 NullPointerException）",
  "analysis_time": "YYYY-MM-DD HH:mm",
  "problem_type": "代码问题 | 环境问题 | 混合",
  "severity": "严重 | 一般 | 低",
  "severityClass": "critical | major | normal | low（与 severity 对应：严重→critical，一般→normal，低→low）",
  "summary": "一段话概述根因（≤80字）",
  "request_info": {
    "method": "GET | POST | ...",
    "url": "...",
    "params": "关键参数摘要",
    "status_code": 500,
    "response_preview": "响应体前200字"
  },
  "stack_trace": {
    "exception_type": "java.lang.NullPointerException",
    "exception_message": "...",
    "entry_frame": "com.dtstack.xxx.XxxService.method(XxxService.java:100)",
    "root_cause_frame": "com.dtstack.xxx.YyyRepository.find(YyyRepository.java:56)",
    "caused_by_chain": ["Caused by: ...", "Caused by: ..."]
  },
  "code_location": {
    "file": "相对路径（如 engine/service/UserService.java）",
    "line": 156,
    "snippet": "相关代码片段（5-10行）",
    "analysis": "该处代码的问题描述"
  },
  "root_cause": "根因详细描述（2-5句话）",
  "fix_suggestions": [
    {
      "priority": 1,
      "location": "在哪里改",
      "action": "改什么",
      "reason": "为什么"
    }
  ],
  "environment": {
    "java_version": "",
    "framework": "",
    "deploy_env": ""
  }
}
```

若某字段信息不足，填 `null`，不要留空字符串占位。

---

## 注意事项

- 如果堆栈中全是框架内部代码（Spring / Hibernate / Netty 等），不要直接将框架代码作为根因；继续向上追溯，找到触发框架报错的业务代码。
- SQL 异常需额外提取 SQL 语句（如在报错信息中出现）并分析语法/语义问题。
- 不要在报告中泄露数据库密码、AccessKey 等敏感字段，遇到时用 `[REDACTED]` 替换。
