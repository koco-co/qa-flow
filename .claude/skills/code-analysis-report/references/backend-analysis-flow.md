# 后端 Bug 分析流程（模式A）

适用场景：Java / 后端服务报错、curl 调用失败、包含 `Exception` / `Caused by` / `java.lang` 等后端异常堆栈的输入。

---

## Step 1：从 curl 信息中提取上下文（优先执行）

在确认分支之前，先从用户提供的 curl 中提取以下字段，这些信息将直接写入报告头部：

| 提取目标 | 来源 | 说明 |
| --- | --- | --- |
| 接口路径 | curl URL | 提取 path，去除域名和查询参数 |
| HTTP Method | curl `-X` 参数 | GET / POST / PUT 等 |
| 环境信息 | curl URL 中的完整 baseurl | 必须保留协议和主机名，不得简化成 `test/dev/prod` |
| 租户信息 | Header（tenantId / X-Tenant-Id 等）或请求体 | 无法识别时标注 `[未提供，请补充]` |
| 项目信息 | URL 前缀 / Header（X-Project 等）或请求体 | 无法识别时标注 `未识别，请补充` |
| 请求体 | curl `-d` / `--data` | 脱敏后保留结构 |

**环境信息提取优先级：**

1. curl URL 的完整 baseurl
2. `-H 'Host: xxx'`
3. 其他能唯一确定环境地址的线索

---

## Step 2：定位仓库 + 确认分支 + 自动拉取（不可跳过）

### 2a. 自动定位仓库

根据报错堆栈中的包名前缀、文件路径、接口路径或模块线索定位源码仓库：

| 报错特征 / 线索 | 定位方式 |
| --- | --- |
| 命中 `config.stackTrace` 的包名前缀、路径别名或关键字 | 使用配置中的 repo / path 映射直接定位 |
| 命中 `.repos/` 下仓库名、模块名或接口路径关键字 | 优先匹配最接近的源码仓库 |
| 无法自动定位 | 展示候选仓库列表，请求用户确认；若没有 `.repos/`，则跳过源码定位，仅基于日志分析 |

### 2b. 确认分支并拉取

**情况 1：用户已提供分支名**

```bash
cd <仓库绝对路径>
git fetch origin
git checkout <分支名>
git pull origin <分支名>
```

输出：

```text
[v] 仓库：<仓库路径>
[v] 已切换并更新至分支：<分支名>
    最新 commit：<hash> <message>
```

**情况 2：用户未提供分支名**

```bash
cd <仓库绝对路径>
git remote -v
git branch --show-current
git log --oneline -1
```

输出确认信息后，等待用户确认当前分支是否正确，再继续下一步。

---

## Step 3：判断问题类型（环境问题 vs 代码问题）

使用 `.claude/skills/code-analysis-report/references/env-vs-code-checklist.md` 快速过滤：

- 命中 `Connection refused` / `Connection timed out` / `Unable to acquire JDBC Connection` / `Could not resolve placeholder '${xxx}'` / `SSL handshake failed` / `Address already in use` / `OutOfMemoryError: Java heap space` 等特征时，优先标记为环境问题。
- 若同时存在环境特征和代码特征，在报告中并列两种可能，并分别给出验证方法。

---

## Step 4：代码深度分析

1. 解析错误日志，沿 `Caused by:` 链定位最终根因异常。
2. 提取第一个出现业务包名的堆栈帧，定位到源码文件和行号。
3. 阅读出错行前后 20 行，确认触发条件、被破坏的假设与业务语义。
4. 形成修复建议：给出带行号的问题代码片段、可直接替换的修复代码片段与修改说明。

---

## Step 5：生成报告

1. 将分析结果整理为 JSON，写入 `reports/bugs/{YYYY-MM-DD}/{BugTitle}.json`。
2. 参考 `.claude/skills/code-analysis-report/references/bug-report-template.md` 的后端 JSON Schema 补齐字段。
3. 执行渲染：

```bash
node .claude/skills/code-analysis-report/scripts/render-report.mjs \
  .claude/skills/code-analysis-report/templates/bug-report-backend.html \
  reports/bugs/{date}/{BugTitle}.json \
  reports/bugs/{date}/{BugTitle}.html
```

4. 刷新快捷链接：

```bash
node .claude/shared/scripts/refresh-latest-link.mjs \
  "reports/bugs/{date}/{BugTitle}.html" \
  "latest-bug-report.html"
```

---

## 输出前核对清单

- [ ] `severity` 已填写（P0/P1/P2/P3）
- [ ] `ENVIRONMENT_URL` 为完整 baseURL
- [ ] `BRANCH_NAME` 和 `COMMIT_HASH` 已从仓库读取
- [ ] `ROOT_CAUSE` 是自然语言，不是堆栈复制
- [ ] `PROBLEM_CODE` 中错误行包含 `// <-- 问题在这里`
- [ ] `FIX_CODE` 带 3-5 行上下文，可直接复制
- [ ] 敏感信息已替换为 `***`
