# kata CLI 路径与命令约定

本约定适用于所有 SKILL.md、agent.md、workflow/*.md 中的 `bun run` 命令引用。

---

## 1. 路径分类

| 类型           | 路径前缀                            | 用途                                   |
| -------------- | ----------------------------------- | -------------------------------------- |
| **跨 skill 共享脚本** | `.claude/scripts/`                  | 多个 skill 都可能调用（如 `config.ts`、`rule-loader.ts`） |
| **skill 私有脚本**   | `.claude/skills/{skill}/scripts/`   | 仅该 skill 使用（如 `parse-cases.ts`）  |
| **共享库**      | `.claude/scripts/lib/`              | TypeScript 模块，被脚本 `import`，不直接 `bun run` |

---

## 2. 命令书写规则

### 2.1 始终从仓库根执行

所有 `bun run` 命令均假定 cwd = 仓库根目录，路径以 `.claude/...` 开头：

```bash
# ✓ 正确
kata-cli config --project {{project}}
bun run .claude/skills/ui-autotest/scripts/parse-cases.ts --file {{md_path}}

# ✗ 错误：相对路径，跨目录调用易出错
bun run config.ts
bun run ../scripts/config.ts
```

### 2.2 多项目场景必须显式 `--project {{project}}`

涉及 `workspace/{project}/` 的脚本必须传 `--project`，禁止依赖隐含默认值：

```bash
# ✓ 正确
kata-cli progress session-read --project {{project}} --session "$SESSION_ID"

# ✗ 错误：缺少 --project，会读到错误项目状态
kata-cli progress session-read --session "$SESSION_ID"
```

### 2.3 多环境场景在 SESSION_ID 中嵌入 `{{env}}`

统一进度引擎通过 `session_id = {workflow}/{slug}-{env}` 实现环境隔离。skill 提示词应推导 SESSION_ID 后统一使用：

```bash
SESSION_ID="ui-autotest/${SUITE_SLUG}-${ACTIVE_ENV:-default}"
kata-cli progress session-summary --project {{project}} --session "$SESSION_ID"
```

---

## 3. 占位符约定

| 占位符                  | 含义                              | 替换来源                          |
| ----------------------- | --------------------------------- | --------------------------------- |
| `{{project}}`           | 项目目录名（如 `dataAssets`）     | `config.json` projects 字段       |
| `{{PROJECT_PRODUCT_NAME}}` | 项目产品名（如「数据资产平台」） | `config.json` `projects.{name}.title` |
| `{{env}}`               | 环境标识（如 `ltqcdev`、`ci63`）  | `ACTIVE_ENV` 或用户输入           |
| `{{suite_name}}`        | 测试套件名（如 `登录功能`）       | Archive MD 解析得到               |
| `{{md_path}}`           | Archive MD 完整路径               | 用户输入或自动定位                |
| `{{YYYYMM}}`            | 当月年月（如 `202604`）           | 系统日期                          |

**禁止**在 SKILL/agent/workflow 文件中硬编码具体项目名（如 `dataAssets`）或产品名（如 `数据资产平台`）。示例数据可保留具体值，但需配合「以下为示例」注释。

---

## 4. 命令别名

对于使用频率高、参数固定的命令，在 SKILL.md「命令别名」段定义短别名（如 ui-autotest 的 `@progress:create`）。workflow 文件中可直接用别名引用，避免重复书写完整命令。

别名命名规则：`@{namespace}:{action}`，如 `@progress:create`、`@parse-cases`、`@merge-specs`。

---

## 5. 检查清单

新增/修改 SKILL/agent/workflow 文件时，自查：

- [ ] 所有 `bun run` 路径以 `.claude/scripts/` 或 `.claude/skills/{skill}/scripts/` 开头
- [ ] 涉及 `workspace/` 的命令显式传 `--project {{project}}`
- [ ] 涉及环境隔离的命令显式传 `--env {{env}}`
- [ ] 文档中的项目名/产品名使用占位符或加「示例」注释
- [ ] 命令在仓库根目录可直接复制执行（无需 `cd`）
