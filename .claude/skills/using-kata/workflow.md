# using-kata — Workflow

This skill exposes 2 main workflows:

- [Menu & routing](#workflow-menu) — user-facing feature menu
- [Create project](#workflow-create-project) — initialize or repair a project

See [quickstart.md](references/quickstart.md) for the quick-start guide.

---

## <a id="workflow-menu"></a>Workflow: Menu & Routing

### Routing logic

<routing>
  <first_run_policy>
    首次使用、无项目时，引导用户按仓库根目录的 INSTALL.md 完成安装。
  </first_run_policy>
</routing>

根据用户输入的参数进行菜单路由（按使用频率排序）：

- 空输入或 `help` → 显示功能菜单（若无项目则提示按 INSTALL.md 完成安装）
- `1` 或 生成用例相关关键词 → 生成测试用例（`test-case-gen`）
- `2` 或 ui / autotest / 自动化 相关关键词 → UI 自动化测试（`ui-autotest`）
- `3` 或 修改 / xmind / 编辑 / 标准化 / 归档 / 反向同步 相关关键词 → 用例格式中枢（`case-format`）
- `4` 或 禅道 Bug 链接 / `hotfix` / `线上 bug 验证` → 生成 Hotfix 用例（`daily-task` hotfix 模式）
- `5` 或 `报错` / `异常` / `Exception` / `TypeError` / `Console 错误` → Bug 报告生成（`daily-task` bug 模式）
- `6` 或 `冲突` / `merge conflict` / `<<<<<<< HEAD` → 合并冲突分析（`daily-task` conflict 模式）
- `7` 或 切换项目 相关关键词 → 切换项目
- `8` 或 创建项目 / 新建项目 / 补齐项目 / 项目初始化 / `create` → 创建项目（`using-kata` create 模式）
- 用户直接提供 `.xmind` 或 `.csv` 文件路径 → 自动路由到 `case-format`（标准化归档）
- 用户粘贴禅道 Bug URL（含 `bug-view-`）→ 自动路由到 `daily-task` hotfix 模式

### Project selection

仅在已有项目后执行：

1. 扫描 `workspace/` 下的项目目录
2. 若只有 1 个项目，自动选中
3. 若有多个项目，提示用户选择
4. 将选中项目记为 `{{project}}`

### Feature menu

```
当前项目: {{project}}
```

| 编号 | 功能             | 触发命令                                        | 状态 |
| ---- | ---------------- | ----------------------------------------------- | ---- |
| 1    | 生成测试用例     | `/using-kata 1` 或 `为 <需求名称> 生成测试用例` | 可用 |
| 2    | UI 自动化测试    | `/using-kata 2` 或 `UI自动化测试`               | 可用 |
| 3    | 用例格式中枢     | `/using-kata 3` 或 `修改用例 "验证xxx"`          | 可用 |
| 4    | 生成 Hotfix 用例 | `/using-kata 4` 或 粘贴禅道 Bug 链接            | 可用 |
| 5    | 分析 Bug 报告    | `/using-kata 5` 或 `帮我分析这个报错`           | 可用 |
| 6    | 分析合并冲突     | `/using-kata 6` 或 `分析冲突`                   | 可用 |
| 7    | 切换项目         | `/using-kata 7` 或 `切换项目`                   | 可用 |
| 8    | 创建/补齐项目    | `/using-kata 8` 或 `创建项目`                   | 可用 |

### Quick examples

See [quickstart.md](references/quickstart.md) for detailed examples.

```
为 商品管理需求 生成测试用例
修改用例 "验证导出仅导出当前筛选结果"
帮我分析这个报错
{{ZENTAO_BASE_URL}}/zentao/bug-view-138845.html   # 自动触发 Hotfix 用例生成
生成测试用例 https://lanhuapp.com/web/#/item/project/...
标准化归档 workspace/{{project}}/history/旧用例.xmind
```

---

## <a id="workflow-create-project"></a>Workflow: Create Project

[Full content from create-project workflow.](workflow.md#workflow-create-project#note)

> **Note**: `create-project` has its own detailed sub-workflow. The original full content from `workflow/create-project/README.md` would be inlined here. For pre-flight load, scenario descriptions (A-G), subagent rules, and error handling, refer to the `create-project` sub-workflow.

The create-project workflow covers:

### Pre-flight

Load global rules:

```bash
kata-cli rule-loader load
```

### Scenario A: New project (primary flow)

A1-A7 covering: collect name, CLI scan, diff review, confirmed create, repository setup, summary.

### Scenario B: Repair incomplete project

B1-B4: detect incomplete skeleton and fill missing directories/files.

### Scenario C: Read-only status

C1: query project structure without modifying anything.

### Subagent rules

- Subagents **must NOT** directly invoke `create` / `clone-repo` (write operations)
- Subagents may freely invoke `scan` (read-only safe)
- If a subagent identifies a need to create a project, it marks it in the return report
