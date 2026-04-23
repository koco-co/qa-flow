# ui-autotest · step 4 — 脚本生成（Sub-Agent 并发）

> 由 SKILL.md 路由后加载。共享工具库、脚本编码规范、Task schema 在 SKILL.md 前段定义，本文件不重复。

---

## 步骤 4：脚本生成（Sub-Agent 并发）

按 Task Schema 更新：将 `步骤 4` 标记为 `in_progress`，并为每条用例创建脚本生成子任务。

**💾 进度持久化 — 初始化**：

若不是从断点恢复（即步骤 1.5 未检测到进度文件），创建进度文件：

```bash
kata-cli ui-autotest-progress create \
  --project {{project}} \
  --suite "{{suite_name}}" \
  --env "{{env}}" \
  --archive "{{md_path}}" \
  --url "{{url}}" \
  --priorities "{{selected_priorities | join(',')}}" \
  --output-dir "workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/" \
  --cases '{{tasks_json}}'
```

其中 `tasks_json` 为 `{id: {title, priority}}` 格式的 JSON，从步骤 1 解析结果构造。

**4.0 源码分析（每次生成脚本前必做）**

在生成任何脚本之前，先阅读 `workspace/{{project}}/.repos/` 下的相关前端源码，梳理：

- **当前迭代需求与主流程的关系**：理解新增功能在现有系统中的位置
- **页面路由和菜单结构**：确认导航方式和路径（检查 `router/`、`routes/` 配置）
- **组件层次和表单结构**：了解页面实际的表单项、按钮文本、选择器结构
- **接口调用方式**：确认 API 路径（检查 service 层）

> 这一步的信息将直接指导脚本中选择器和导航方式的编写，避免盲猜。

**4.1 分发任务**

按 `selected_priorities` 过滤 `tasks`，最多 **5 个 sub-agent 并发**执行脚本生成。

每个 sub-agent 接收：

- 单条测试用例数据（`id`, `title`, `priority`, `page`, `steps`, `preconditions`）
- 目标 URL
- 派发 `script-writer-agent`（model: sonnet），每个 sub-agent 独立生成一条脚本
- **共享工具库清单**：`lib/playwright/index.ts` 的导出函数列表（agent 必须优先使用，禁止重复实现）
- 参考资料：playwright-cli skill 的 references（获取 API 用法）
- 步骤 4.0 中源码分析的关键发现（路由路径、组件结构、API 路径等）

**4.2 前置条件处理（6 步工作流）**

> **核心原则**：建表只看 CREATE TABLE 语句，不纠结数据库名称。数据库通过离线 API 操作。**禁止**生成单独的 `setup.spec.ts` 通过 UI 自动化建表。

当用例的 `preconditions` 包含 SQL 建表/数据准备时：

1. **分析建表语句**：从前置条件中提取 CREATE TABLE + INSERT 语句，忽略数据库名
2. **通过 API 建表**：在脚本的 `test.beforeAll` 中使用 `setupPreconditions`（来自 `assets-sql-sync` 插件），它会自动：查找离线项目 → 获取数据源 → 执行 DDL → 引入数据源 → 元数据同步
3. **数据源引入**：`setupPreconditions` 自动处理，无需额外操作
4. **判断是否涉及数据质量**：如果需求与数据质量模块相关（规则集、规则任务、质量报告等），需要额外创建资产项目（命名：`Story_{{prd_id}}`）
5. **数据源授权**：将测试数据源授权给资产项目
6. **验证可见性**：测试第一步验证数据质量模块能看到数据源/库/表

如果离线开发中没有项目或对接计算引擎太复杂，使用 AskUserQuestion 请求用户手动创建。

具体用法参见 `script-writer-agent` 的「前置条件处理」章节。

若用例同时包含多张表的 SQL，可将 SQL 文件放在 `workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/sql/` 目录下，脚本中通过 `readFileSync` 读取。

**4.3 输出格式**

每个 sub-agent 输出代码块，保存到：

```
workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts
```

代码块格式（import 路径须与 `script-writer-agent` 的 output_contract 一致）：

```typescript
// META: {"id":"t1","priority":"P0","title":"【P0】验证xxx"}
import { test, expect } from "../../fixtures/step-screenshot";
// ... Playwright test code
```

---

**💾 进度持久化 — 脚本生成完成**：

每条用例的 sub-agent 完成后，更新进度：

```bash
kata-cli ui-autotest-progress update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field generated --value true
kata-cli ui-autotest-progress update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field script_path --value "workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts"
```

断点恢复时，跳过 `generated === true` 的用例，只生成剩余的。

按 Task Schema 更新：所有 Sub-Agent 完成后，将 `步骤 4` 标记为 `completed`（subject: `步骤 4 — {{n}} 条脚本已生成`）。

**💾 进度持久化 — 步骤 4 完成**：

```bash
kata-cli ui-autotest-progress update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field current_step --value 5
```

