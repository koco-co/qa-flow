---
name: code-analysis-report
description: 测试工程师专用的代码分析报告工作流 Skill。当用户粘贴后端报错日志、curl 请求信息、Jenkins 合并冲突信息，或提到「帮我分析这个报错」「生成 bug 报告」「分析一下这个错误」「分析一下冲突」「看看这个异常」时，必须触发此 Skill。支持两种模式：(1) Bug 分析 → 生成 HTML 格式报告存入 reports/bugs/ 目录；(2) Jenkins 合并冲突分析 → 生成 HTML 报告存入 reports/conflicts/ 目录。所有模式在开始分析前必须确认代码分支并自动拉取。输出精美 HTML 格式，专为禅道富文本编辑器粘贴使用。
---

# Code Analysis Report Skill

本 Skill 面向**测试工程师**，将后端报错信息与 curl 请求快速转化为开发可直接阅读的精美 HTML 分析报告，同时支持 Jenkins 合并冲突分析。

> **与 test-case-generator 完全解耦**：本 Skill 是独立工具，不属于用例生成工作流的任何步骤。

---

## 一、模式识别（收到输入后首先执行）

| 模式                | 触发信号                                                              | 执行路径               |
| ------------------- | --------------------------------------------------------------------- | ---------------------- |
| **模式A：Bug 分析** | 包含报错日志（Exception / Error / stacktrace）或 curl 信息            | → 执行第二章           |
| **模式B：合并冲突** | 包含 `<<<<<<< HEAD` / `=======` / `>>>>>>>` 标记，或提到 Jenkins 冲突 | → 执行第三章           |
| **模式C：信息不足** | 描述模糊，缺少日志或冲突内容                                          | → 告知用户需补充的材料 |

---

## 二、Bug 分析模式（模式A）完整流程

### Step 1：从 curl 信息中提取上下文（优先执行）

**在确认分支之前**，先从用户提供的 curl 信息中提取以下字段，这些信息将直接写入报告头部：

| 提取目标     | 来源                                          | 说明                                                                            |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------- |
| 接口路径     | curl URL                                      | 提取 path 部分，去除域名和查询参数                                              |
| HTTP Method  | curl -X 参数                                  | GET / POST / PUT 等                                                             |
| **环境信息** | curl URL 中的完整 baseurl（包括主机名和协议） | 如 `http://shuzhan63-dfsyc-dev.k8s.dtstack.cn`，**不是** test/dev/prod 文本标签 |
| **租户信息** | Header（tenantId / X-Tenant-Id 等）或请求体   | 提取租户 ID 或租户名称                                                          |
| **项目信息** | URL 路径前缀 / Header（X-Project 等）或请求体 | 若无法识别则标注「未识别，请补充」                                              |
| 请求体       | curl -d / --data                              | 脱敏后保留结构                                                                  |

> **环境信息和租户信息是必填字段**，若 curl 中无法提取，必须在报告对应位置标注 `[未提供，请补充]` 并在分析完成后提示用户补充。
>
> **环境信息提取规则**（优先级从高到低）：
>
> 1. 从 curl URL 中提取完整的 baseurl（包括协议和主机名）
> 2. 若 curl 中有 `-H 'Host: xxx'` 则优先使用
> 3. 不得简化为 dev/test/prod 等别名，必须使用完整的环境地址

---

### Step 2：定位仓库 + 确认分支 + 自动拉取（不可跳过）

#### 2a. 自动定位仓库

根据报错堆栈中的 Java 包名或接口路径，自动定位对应的源码仓库：

| 报错特征                                             | 目标仓库                                    |
| ---------------------------------------------------- | ------------------------------------------- |
| `com.dtstack.center.assets` / `dt-center-assets`     | `repos/dt-insight-web/dt-center-assets/`    |
| `com.dtstack.center.metadata` / `dt-center-metadata` | `repos/dt-insight-web/dt-center-metadata/`  |
| `com.dtstack.dagschedulex` / `DAGScheduleX`          | `repos/dt-insight-plat/DAGScheduleX/`       |
| `com.dtstack.datasource` / `datasourcex`             | `repos/dt-insight-plat/datasourcex/`        |
| `com.dtstack.ide` / `dt-center-ide`                  | `repos/dt-insight-plat/dt-center-ide/`      |
| `com.dtstack.public.service` / `dt-public-service`   | `repos/dt-insight-plat/dt-public-service/`  |
| `com.dtstack.sql.parser` / `SQLParser`               | `repos/dt-insight-plat/SQLParser/`          |
| `com.dtstack.engine` / `engine-plugins`              | `repos/dt-insight-engine/engine-plugins/`   |
| 前端报错 / `dt-insight-studio`                       | `repos/dt-insight-front/dt-insight-studio/` |
| 定制项目（信永中和等）                               | `repos/CustomItem/<对应仓库>/`              |

> 若无法自动定位，向用户展示仓库列表，请求确认。

#### 2b. 确认分支并拉取

**情况1：用户已提供分支名**

```bash
cd <仓库绝对路径>
git fetch origin
git checkout <分支名>
git pull origin <分支名>
```

执行后输出：

```
[v] 仓库：<仓库路径>
[v] 已切换并更新至分支：<分支名>
    最新 commit：<hash> <message>
```

**情况2：用户未提供分支名**

```bash
cd <仓库绝对路径>
git remote -v
git branch --show-current
git log --oneline -1
```

输出确认信息：

```
[!] 开始分析前请确认代码分支：

  仓库路径：<path>
  仓库地址：<remote url>
  当前分支：<branch name>
  最新 commit：<hash> <message>

以上信息是否正确？如需切换分支请告知分支名称。
```

**等待用户明确确认后，才进入 Step 3。**

> **安全规则**：对 repos/ 下的仓库，只允许 `fetch`、`pull`、`checkout` 操作。严禁 `push`、`commit`、修改任何源码文件。详见 `.claude/rules/repo-safety.md`。

---

### Step 3：判断问题类型（环境问题 vs 代码问题）

快速扫描报错特征，详细判断规则见 → `references/env-vs-code-checklist.md`

**快速过滤（命中任意一条 → 优先判定为环境问题）：**

| 报错特征                                         | 可能原因                     |
| ------------------------------------------------ | ---------------------------- |
| `Connection refused` / `Connection timed out`    | DB / 中间件未启动或网络不通  |
| `Unable to acquire JDBC Connection`              | 连接池耗尽或数据库宕机       |
| `Could not resolve placeholder '${xxx}'`         | 配置文件缺失或环境变量未注入 |
| `SSL handshake failed` / `certificate expired`   | 证书过期或配置错误           |
| `Address already in use`                         | 端口冲突                     |
| `OutOfMemoryError: Java heap space`（偶发/规律） | JVM 内存不足                 |

- **判定为环境问题** → 报告「根本原因」标注「环境配置问题（非代码缺陷）」，提供运维排查步骤
- **两种特征都有** → 报告中并列两种可能，各给出验证方法

---

### Step 4：代码深度分析

1. **解析错误日志**：找到 `Caused by:` 链末端定位根本异常；提取第一个出现业务包名的堆栈帧
2. **定位源码**：根据堆栈帧找到文件和行号，阅读出错行前后 20 行，理解业务含义
3. **识别根本原因**：什么条件触发了异常？哪个假设被违反了？
4. **构造修复方案**：带行号的问题代码片段 + 可直接替换的修复代码片段 + 修改说明

---

### Step 5：生成 HTML 报告文件

报告样式规范见 → `references/bug-report-template.md`

**[强制要求] HTML 输出必须严格遵循报告模板：**

- 页面布局、颜色主题、字段命名、HTML 标签和内联样式 — 一律不可修改
- "测试环境"字段改名为"环境信息"，值必须使用 curl 中提取的完整 baseurl
- 全部使用内联 style，禁止 `<style>` 块和外部 CSS 类名
- 代码块使用 `<pre>` 标签，禁止 Markdown 代码围栏
- **严禁 Emoji 表情符号**（4 字节 Unicode），改用 `[BUG]`、`[!]`、`[v]`、`[x]`、`⚠️`、`×`、`✓`

**代码分支信息明确化：**

- 报告生成前必须在 Step 2 确认当前分支
- 在"相关 Commit"字段中完整填写：分支名、最新 commit hash 和 message

**文件存储：**

```bash
TODAY=$(date +%Y-%m-%d)
REPORT_DIR="<项目根>/reports/bugs/$TODAY"
mkdir -p "$REPORT_DIR"
# 文件名：Bug标题（去除特殊字符，空格转下划线）.html
```

**写入后必须刷新根目录快捷链接：**

```bash
cd .claude/scripts && node refresh-latest-link.mjs "<项目根>/reports/bugs/$TODAY/<文件名>.html" latest-bug-report.html
```

**写入完成后输出：**

```
[v] Bug 报告已生成：reports/bugs/{日期}/{文件名}.html
[v] 根目录快捷链接已刷新：latest-bug-report.html

使用方式：在禅道中打开 Bug 编辑页面，点击富文本编辑器工具栏中的「HTML 代码」按钮，
将文件内容粘贴进去，点击确认后保存即可看到格式化报告。

[!] 若保存后内容丢失：用文本编辑器打开 HTML 文件，搜索并删除所有 Emoji 表情符号，再重新粘贴。
```

---

## 三、合并冲突模式（模式B）

详细分析逻辑与 HTML 输出格式见 → `references/conflict-resolution.md`

**快速流程：**

1. 解析冲突标记，识别当前分支与来源分支各自的代码意图
2. 判断冲突类型：安全合并型 / 逻辑互斥型 / 重复修改型 / 依赖版本冲突 / 格式注释冲突
3. 输出 HTML 冲突报告，逻辑互斥型必须注明「需开发人工确认」

**存储路径：**`reports/conflicts/${yyyy-MM-dd}/<冲突描述>.html`

**写入后必须刷新根目录快捷链接：**

```bash
cd .claude/scripts && node refresh-latest-link.mjs "<项目根>/reports/conflicts/${yyyy-MM-dd}/<文件名>.html" latest-conflict-report.html
```

---

## 四、输出汇总

| 模式     | 文件格式          | 存储位置                          |
| -------- | ----------------- | --------------------------------- |
| Bug 分析 | `<Bug标题>.html`  | `reports/bugs/{yyyy-MM-dd}/`      |
| 合并冲突 | `<冲突描述>.html` | `reports/conflicts/{yyyy-MM-dd}/` |

---

## 五、参考文件

| 文件                                  | 说明                                 |
| ------------------------------------- | ------------------------------------ |
| `references/bug-report-template.md`   | Bug 报告完整 HTML 模板（含样式规范） |
| `references/env-vs-code-checklist.md` | 环境问题 vs 代码问题判断清单         |
| `references/conflict-resolution.md`   | 合并冲突分析与 HTML 输出格式规范     |

---

## 六、模板遵循检查清单（生成报告前必须核对）

| 检查项     | 要求                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------- |
| HTML 结构  | 严格按 `bug-report-template.md` 模板生成，不得修改任何 section 或字段                          |
| 环境信息   | 使用 curl baseurl（如 `http://shuzhan63-dfsyc-dev.k8s.dtstack.cn`），不能是 dev/test/prod 简称 |
| 分支信息   | 在 Step 2 确认分支，在页脚和"相关 Commit"字段明确填写分支名 + commit hash                      |
| 代码分支   | 报告中"代码分支"字段值 = Step 2 确认的分支名                                                   |
| Emoji 检查 | 确保不存在 4 字节 Emoji，只用 `[x]` `[v]` `⚠️` `×` `✓`                                         |
| 内联 style | 所有样式使用内联 style，不得出现 `<style>` 块或 CSS 类名                                       |
| 代码块格式 | 所有代码使用 `<pre>` 标签，不得用 Markdown 代码围栏                                            |
| 自定义修改 | 严禁对模板做创意性修改或调整                                                                   |

---

## 七、关联说明

| 项目       | 说明                                                           |
| ---------- | -------------------------------------------------------------- |
| 工作流关系 | **完全独立**，不属于 test-case-generator 的任何步骤            |
| 代码仓库   | 使用 `repos/` 下的源码仓库，详见 CLAUDE.md「源码仓库详细清单」 |
| 安全规则   | 只读访问，禁止 push/commit，详见 CLAUDE.md「源码仓库安全规则」 |
