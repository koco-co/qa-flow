---
name: create-project
description: "创建新项目或补齐残缺项目骨架。初始化 workspace/{project}/ 完整子目录结构，注册 config.json，可选配置源码仓库。触发词：创建项目、新建项目、create-project、补齐项目、项目初始化。"
argument-hint: "[项目名]"
---

# create-project

## 前置加载

加载全局规则（project 未知，不加载项目级规则）：

```bash
kata-cli rule-loader load
```

## 场景 A：新建项目（主流程）

### A1. 收集项目名

- 优先从 argument-hint 取
- 否则 AskUserQuestion："请输入项目名称（英文短名，允许 camelCase 如 `dataAssets` 或 kebab-case 如 `data-assets`）"
- 规则提示：`^[A-Za-z][A-Za-z0-9-]*$`，长度 2-32，不可用系统保留字（workspace/knowledge/rules/prds/...）

### A2. CLI scan 预校验

```bash
kata-cli create-project scan --project {{name}}
```

分支：

- `valid_name=false` → 展示 `name_error`，回 A1
- `exists=true` + `skeleton_complete=true` + `config_registered=true` → 跳到 B3
- 其他 → 进 A3

### A3. 展示 diff 表 + AskUserQuestion

展示 markdown 表：

```
目标项目：{{name}}
状态：{{exists ? "已存在，将补齐" : "全新创建"}}

将创建的目录（{{missing_dirs.length}} 个）：
- {{missing_dirs.map(d => "workspace/" + name + "/" + d).join("\n- ")}}

将创建的文件（{{missing_files.length + missing_gitkeeps.length}} 个）：
- {{missing_files.concat(missing_gitkeeps).join("\n- ")}}

将注册 config.json：{{config_registered ? "已注册，跳过" : "是"}}
将调用 knowledge-keeper index：是
```

AskUserQuestion：[确认创建] [调整名称] [取消]

### A4. CLI create --confirmed

```bash
kata-cli create-project create --project {{name}} --confirmed
```

展示 JSON 的 markdown 摘要（`created_dirs`、`created_files`、`registered_config`、`index_path`）。

### A5. AskUserQuestion 源码仓库

```
是否配置源码仓库？（可跳过，后续需要时再加）
选项：[配置仓库] [跳过]
```

### A6. clone-repo 循环

每次 AskUserQuestion：

```
请输入 Git URL：
分支（默认 main）：
```

```bash
kata-cli create-project clone-repo \
  --project {{name}} --url {{url}} [--branch {{branch}}]
```

AskUserQuestion：[继续添加] [完成]

### A7. 摘要 + 下一步

```
✓ 项目 {{name}} 已创建
✓ {{created_dirs.length}} 个子目录、{{created_files.length}} 个模板文件、{{repo_count}} 个仓库
✓ config.json 已注册
✓ knowledge/_index.md 已生成

下一步：
- 生成测试用例：/test-case-gen（选择项目 {{name}}）
- 编辑业务知识：/knowledge-keeper（选择项目 {{name}}）
- 追加源码仓库：/create-project clone-repo --project {{name}} --url ...
```

## 场景 B：补齐残缺项目

### B1. 识别意图

- 用户直接传入已存在的项目名
- 或 A2 scan 检测到 `exists=true` + `skeleton_complete=false`

### B2. CLI scan（同 A2）

### B3. 无差异

```
✓ 项目 {{name}} 结构完整，无需补齐
```

### B4. 有差异 → 复用 A3 + A4

## 场景 C：仅查看状态（只读）

触发词："查看项目 xxx 状态"、"列出所有项目"

```bash
kata-cli create-project scan --project {{name}}
```

多项目列表：扫描 `workspace/` 所有非隐藏子目录，对每个跑 scan 汇总。

## 异常处理

- scan exit 1（非法项目名）→ 回 A1 重新输入
- create exit 2（有可补齐项且未 `--confirmed`）→ 回 A3 走确认流程
- create exit 1（落盘或 knowledge-keeper 失败）→ 展示 stderr，引导用户重跑（幂等无副作用）
- clone-repo exit 1 → 检查 URL 和网络，或清理已存在路径后重试

## Subagent 调用守则

- subagent **禁止**直接调 `create` / `clone-repo`（写操作）
- subagent 可自由调 `scan`（只读安全）
- subagent 发现需创建项目时，在返回报告标注：`建议创建项目：{{name}}`
- 主 agent 收到后由本 skill 统一处理
