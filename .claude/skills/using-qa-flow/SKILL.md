---
name: using-qa-flow
description: qa-flow 使用指南与环境初始化。/using-qa-flow 展示功能菜单，/using-qa-flow init 执行 5 步环境初始化。替代旧的 /start 指令。
argument-hint: "[init | 功能编号或关键词]"
---

# qa-flow

欢迎使用！本工作空间支持以下功能：

## 功能菜单

| 编号  | 功能             | 说明                                                                     |
| ----- | ---------------- | ------------------------------------------------------------------------ |
| **1** | 生成测试用例     | 根据 PRD 文档或蓝湖 URL 自动生成 XMind 测试用例（支持普通/快速/续传模式） |
| **2** | 增强 PRD 文档    | 为 PRD 补充图片描述、格式规范化、健康度预检                              |
| **3** | 分析代码报错     | 粘贴报错日志，定位问题根因并生成 HTML 报告（支持前端/后端/冲突分析）     |
| **4** | 转换历史用例     | 将 CSV/XMind 历史用例转为 Markdown 归档格式                              |
| **5** | XMind 转换       | 将 JSON 数据转换为 XMind 文件                                            |
| **0** | 项目配置 + 环境初始化 | 首次使用时执行：项目结构推断、config.json 生成、CLAUDE.md 创建 + 环境初始化 |

---

根据用户输入的 `$ARGUMENTS` 进行路由：

如果 `$ARGUMENTS` 为空（用户直接输入 `/using-qa-flow`）：

- 展示上方功能菜单
- 展示下方快速示例
- 等待用户选择

如果 `$ARGUMENTS` 包含 `init` 或 `初始化` 或 `0`：

- 先执行下方「Step 0: 项目配置向导」
- Step 0 完成后，询问用户是否继续执行「环境初始化（Step 1-5）」

如果 `$ARGUMENTS` 包含 `1` 或 `用例` 或 `test`：

- 引导用户提供模块和版本，例如：`为 ${module_key} v${version} 生成测试用例`
- 可补充一个具体示例：`例如：为 orders v2.0 生成测试用例`
- 如需快速模式，推荐写法：`为 ${module_key} v${version} --quick 生成测试用例`
- 说明：`--quick` 会跳过 Step 3（Brainstorming）、Step 4（Checklist 预览）、Step 5（用户确认）
- 或直接提供蓝湖 URL，例如：`生成测试用例 https://lanhuapp.com/web/#/item/project/product?...`（自动从文档标题提取版本号）
- 如果用户还没有 PRD 文件，提示将 PRD 放到 `cases/requirements/${module_key}/v{version}/` 对应目录下（非版本化模块则省略版本层）
- 如检测到 `.qa-state.json`，提示可直接说：`继续 ${module_key} v${version} 的用例生成`
- 如需只重跑某个页面/模块，提示可说：`重新生成 ${module_key} v${version} 的「${page}」模块用例`

如果 `$ARGUMENTS` 包含 `2` 或 `PRD` 或 `增强`：

- 引导用户提供 PRD 文件路径，例如：`帮我增强这个 PRD：cases/requirements/orders/v2.0/商品管理需求.md`

如果 `$ARGUMENTS` 包含 `3` 或 `报错` 或 `bug` 或 `分析`：

- 引导用户粘贴报错日志和 curl 信息
- 提示格式：`帮我分析这个报错` + 粘贴日志内容
- 建议同时补充：`curl` 请求、当前分支（若已知）

如果 `$ARGUMENTS` 包含 `4` 或 `转换` 或 `归档` 或 `archive`：

- 引导用户选择：`转化所有历史用例` 或 `转化 ${module_key} 的历史用例` 或 `检查哪些历史用例还没转化`
- 可补充一个具体示例：`例如：转化 orders 的历史用例`

如果 `$ARGUMENTS` 包含 `5` 或 `xmind`：

- 引导用户提供 JSON 文件路径，例如：`将 cases/requirements/orders/v2.0/temp/cases.json 转换为 XMind`

---

## Step 0: 项目配置向导（首次使用必须完成）

仅在 `$ARGUMENTS` 包含 `init` / `初始化` / `0` 时执行。此步骤生成 `config.json` 和 `CLAUDE.md`，是所有其他 Skill 正常工作的前提。主文档只保留流程总览，详细向导编排见 [references/init-wizard-flow.md](references/init-wizard-flow.md)，功能组问答模板与默认值规则见 [references/config-questionnaire.md](references/config-questionnaire.md)。

### 0.1 扫描项目结构

- 执行 `node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command scan`，读取 `modules[]`、`signals`、历史文件和已有配置状态。
- 若需要回填已有配置默认值，可额外执行 `node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command load-existing`。
- 空白项目直接转入问答模式；已有配置时先按重新初始化 / 部分更新规则分流。
- 详情见 [references/init-wizard-flow.md](references/init-wizard-flow.md) 与 [references/config-questionnaire.md](references/config-questionnaire.md)。

### 0.2 展示推断结果（D-03）

- 将模块推断结果、`.repos/`、历史文件、PRD 版本号、图片目录等信号整理成摘要给用户确认。
- 若用户否定推断，需要支持逐项修正并重新展示。
- 详情见 [references/init-wizard-flow.md](references/init-wizard-flow.md)。

### 0.3 历史文件解析（D-05 / D-06 / D-07）

- 对检测到或用户追加的历史文件调用 `parse-file`，确认模块英文 key 与是否版本化。
- 合并目录扫描与历史文件结果，冲突项逐条确认。
- 详情见 [references/init-wizard-flow.md](references/init-wizard-flow.md)。

### 0.4 功能分组问答（D-08 / D-09）

- 按功能分组采集配置字段，只对需要更新的组发问，其他字段沿用现有值。
- 问题模板、默认值说明、re-init / 部分更新规则见 [references/config-questionnaire.md](references/config-questionnaire.md)。
- 向导执行顺序与展示格式见 [references/init-wizard-flow.md](references/init-wizard-flow.md)。

### 0.5 写入文件

- 用户确认后，先构建完整 config 对象，并执行 `write` 子命令写入 `.claude/config.json`：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command write \
  --config-json '{完整JSON}' \
  --root-dir .
```

- 如用户选择同时更新 `CLAUDE.md`，先渲染模板：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command render-template \
  --template-path .claude/skills/using-qa-flow/templates/CLAUDE.md.template \
  --replacements '{"{{PROJECT_NAME}}":"{displayName}","{{MODULE_KEY_EXAMPLE}}":"{firstModuleKey}","{{CASES_ROOT}}":"{casesRoot}"}'
```

- 再将上一步输出作为 `--claude-md` 传给 `write`；re-init 场景必须先询问是否覆盖，不能默认写入：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command write \
  --config-json '{完整JSON}' \
  --claude-md '{render-template 输出的完整内容}' \
  --root-dir .
```

- 完成后给出写入结果，并询问是否继续执行环境初始化（Step 1-5）。

## 环境初始化（Step 1-5）

> 前提：Step 0（项目配置向导）已完成。如未完成，请先执行 `/using-qa-flow init`。

仅在 `$ARGUMENTS` 包含 `init` / `初始化` / `0` 时执行。每步均支持跳过；主文档保留最小可执行命令，细化说明继续放在 references / prompts。

### Step 1：Python 环境

```bash
# 优先使用 uv
which uv && uv venv .venv && echo "✅ uv venv 创建成功" \
  || python3 -m venv .venv && echo "✅ python3 venv 创建成功"
```

- 目标：确保后续 Python 依赖安装有独立运行环境。

### Step 2：lanhu-mcp 依赖安装

```bash
# 激活虚拟环境后安装
source .venv/bin/activate && pip install -r tools/lanhu-mcp/requirements.txt
```

- 若 `tools/lanhu-mcp/requirements.txt` 缺失，跳过并提示用户补齐工具目录。

### Step 3：脚本运行环境（Node.js）

```bash
cd .claude/skills/xmind-converter/scripts && npm install
node json-to-xmind.mjs --help
```

- 安装完成后，必须通过 `--help` 验证脚本可用。

### Step 4：源码仓库配置

```bash
ls -la .repos/ 2>/dev/null || echo "（.repos/ 目录为空或不存在）"
mkdir -p .repos && cat > .repos/source-map.yaml <<YAML
# 由 using-qa-flow init 自动生成（暂无仓库配置）
repos: []
initialized_at: "$(date +%F)"
YAML
```

- 按 `prompts/source-repo-setup.md` 执行交互式问答，将 `repos: []` 补全为真实仓库映射并生成/更新 `.repos/source-map.yaml`。
- `.repos/source-map.yaml` 仅作为本地仓库清单与初始化回显使用；`sync-source-repos.mjs` 实际以 `.claude/config.json` 的 `repos` 与 `branchMapping` 为准。
- 当任一 Skill 需要 `.repos/` 上下文但映射文件缺失时，应自动触发此步骤。

### Step 5：验证并输出状态汇总

```bash
# Python 环境
python3 --version
# Node.js
node --version
# 脚本可用性
node .claude/skills/xmind-converter/scripts/json-to-xmind.mjs --help 2>&1 | head -3
# 源码仓库
cat .repos/source-map.yaml 2>/dev/null || echo "（未配置源码仓库）"
```

- 汇总 Python、Node.js、xmind-converter 脚本和 `.repos/source-map.yaml` 的状态。
- 验证通过后，提示用户可以继续使用测试用例生成、PRD 增强等核心功能。

<!-- DTStack 用户示例：为 data-assets v6.4.10 生成测试用例 -->
<!-- DTStack 用户示例：帮我增强这个 PRD：cases/requirements/custom/xyzh/数据质量-质量问题台账.md -->

---

## 快速示例

```
# 生成测试用例（最常用）
为 ${module_key} v${version} 生成测试用例
为 ${module_key} v${version} --quick 生成测试用例
例如：为 orders v2.0 生成测试用例
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

# 增强 PRD
帮我增强这个 PRD：cases/requirements/orders/v2.0/商品管理需求.md

# 分析报错
帮我分析这个报错
（然后粘贴报错日志 + curl 信息；若知道分支也一并提供）

# 转化历史用例
转化所有历史用例
检查哪些历史用例还没转化

# 环境初始化（首次使用）
/using-qa-flow init
```

> 提示：你也可以直接用自然语言描述需求，系统会自动匹配对应功能。
> 验收建议：测试用例流优先打开 `latest-prd-enhanced.md` / `latest-output.xmind`；代码分析流优先打开 `latest-bug-report.html` / `latest-conflict-report.html`。
