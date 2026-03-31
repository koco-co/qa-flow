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

仅在 `$ARGUMENTS` 包含 `init` / `初始化` / `0` 时执行。此步骤生成 `config.json` 和 `CLAUDE.md`，是所有其他 Skill 正常工作的前提。

### 0.1 扫描项目结构

执行目录扫描：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command scan
```

解析返回的 JSON 结果。

**Re-init 检测（D-14）：** 如果 `signals.existingConfig` 不为 null，说明已有 config.json。

必要时也可以单独读取当前配置作为回填默认值：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command load-existing
```

- 询问用户：「检测到已有项目配置。请选择：(1) 完整重新配置 (2) 只更新部分配置」
- 选择 (2) 时，展示五个功能组让用户勾选要重新配置的组（D-15）：
  - ① 基础信息（项目名、显示名、用例根目录）
  - ② 模块配置
  - ③ 源码仓库
  - ④ 集成工具
  - ⑤ 快捷方式和目录
- 未勾选的组保持现有值不变
- 如果选择 (1)，执行完整的 0.1 ~ 0.5 流程

**新项目流程：** 如果 `signals.existingConfig` 为 null，直接进入推断展示。

### 0.2 展示推断结果（D-03）

将 `modules[]` 数组格式化为 Markdown 表格展示：

```text
### 📋 项目结构推断结果

| 模块 key | 是否版本化 | 路径 | 推断来源 |
|----------|-----------|------|----------|
| {key}    | {versioned ? '✅ 是' : '❌ 否'} | {paths.xmind || 'cases/xmind/' + key + '/'} | {inferredFrom} |
```

同时展示检测到的信号摘要：

- `.repos/` 目录: {hasReposDir ? '已检测到 → 建议配置源码仓库' : '未检测到'}
- 历史文件: {historyFiles.length} 个 ({historyFiles.map(f => f.path).join(', ')})
- PRD 版本号: {prdVersionPatterns.join(', ') || '无'}
- 图片目录: {hasImages ? '已检测到' : '未检测到'}

如果 `modules` 为空且 `historyFiles` 也为空（完全空白项目）：

- 提示：「未检测到现有结构，将通过问答方式引导你配置项目。」
- 直接跳到 0.4 全量问答

**用户确认：** 询问「以上推断是否正确？(y/n)」

- 如果 n：逐项询问修正（D-04）——对每个模块询问 key 是否正确、versioned 是否正确，用户输入新值后更新，重新展示表格直到用户确认

### 0.3 历史文件解析（D-05 / D-06 / D-07）

**自动检测部分：** 如果 `signals.historyFiles` 非空：

- 对每个历史文件调用：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command parse-file --path {filePath}
```

- 展示解析结果：「从 {filename} 检测到模块候选名：{candidates.join(', ')}」
- 对每个候选名，询问用户确认（D-06）：「检测到模块名 "{candidate}"，请确认或输入正确的英文 key：」
- 用户输入后，还需确认该模块是否版本化

**主动追问部分：** 完成自动检测后，追问（D-05）：「还有其他历史文件要导入吗？如有请提供文件路径，没有请回复 n」

- 如果用户提供路径，继续调用 `parse-file` 解析

**合并展示（D-07）：** 将目录扫描推断结果 + 历史文件解析结果分别展示：

```text
### 来自目录扫描的模块：
| 模块 key | 是否版本化 | 来源 |
...

### 来自历史文件的新增模块：
| 模块 key | 是否版本化 | 来源文件 |
...

### 冲突项（同名模块，不同来源）：
| 模块 key | 目录扫描结果 | 历史文件结果 | 请选择保留哪个 |
...
```

用户逐项决定冲突项后，合并为最终模块列表。

### 0.4 功能分组问答（D-08 / D-09）

按五个功能组逐一询问所有配置字段：

**① 基础信息**

```text
### ① 基础信息
请提供以下信息：
- 项目英文标识（project.name）：（用于内部标识，如 my-project）
- 项目显示名（displayName）：（用于展示，如「我的项目」）
- 用例根目录（casesRoot）：（默认 cases/）
```

**② 模块配置**

```text
### ② 模块配置
以下是当前确认的模块列表（来自扫描 + 历史文件解析）：
{展示模块表格}

需要添加新模块吗？(y/n)
如果 y：询问模块 key、是否版本化、中文名（可选）

对每个模块最终确认 versioned 状态。
```

**③ 源码仓库**

```text
### ③ 源码仓库配置
{如果 signals.hasReposDir: '检测到 .repos/ 目录，建议配置源码仓库。'}

是否需要配置源码仓库分析能力？(y/n)
如果 y：
- 询问仓库名和本地路径（可多次添加）
- 是否配置分支映射文件？（默认路径 .claude/repo-branch-mapping.yaml）
- 是否配置 stackTrace 分析？（Java 包名等）
如果 n：repos = {}, branchMapping = null, stackTrace = {}
```

**④ 集成工具**

```text
### ④ 集成工具
是否需要配置蓝湖 MCP 集成？(y/n)
如果 y：逐一确认各字段（展示默认值，用户可直接回车接受）
- runtimePath（默认 tools/lanhu-mcp/）
- envFile（默认 tools/lanhu-mcp/.env）
- ...其余字段展示默认值
如果 n：使用默认 lanhuMcp 配置
```

**⑤ 最终确认写入（D-10）**

```text
### ⑤ 确认写入

以下是将要写入的配置摘要：

**基础信息**
- 项目标识：{project.name}
- 显示名：{displayName}
- 用例根目录：{casesRoot}

**模块配置（{moduleCount} 个）**
{模块列表}

**源码仓库**
{repos 摘要或「未配置」}

**集成工具**
{lanhuMcp 摘要}

确认写入吗？(y/n)
```

不展示完整 JSON（D-10），只展示纯文字分组摘要。

### 0.5 写入文件

用户确认后：

1. **构建 config JSON** —— 将所有收集到的字段组装为完整 config 对象（脚本端调用 `buildConfigObject`）
2. **写入 config.json：**

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command write --config-json '{完整JSON}' --root-dir .
```

3. **生成 CLAUDE.md** —— 询问用户是否同时更新 CLAUDE.md（re-init 时 D-16 要求必须询问，不默认覆盖）：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command render-template \
  --template-path .claude/skills/using-qa-flow/templates/CLAUDE.md.template \
  --replacements '{"{{PROJECT_NAME}}": "{displayName}", "{{MODULE_KEY_EXAMPLE}}": "{firstModuleKey}", "{{CASES_ROOT}}": "{casesRoot}"}'
```

然后将渲染结果作为 `--claude-md` 参数传给 `write` 命令，或者分两步：先 `render-template` 获取内容，再 `write`。

4. **完成提示：**

```text
✅ 项目配置完成！
- config.json 已写入 .claude/config.json
- CLAUDE.md 已写入项目根目录（如已选择生成）

是否继续执行环境初始化（Step 1-5）？
```

## 环境初始化（Step 1-5）

> 前提：Step 0（项目配置向导）已完成。如未完成，请先执行 `/using-qa-flow init`。

仅在 `$ARGUMENTS` 包含 `init` / `初始化` / `0` 时执行。每步均支持跳过。

### Step 1：Python 环境

检测并创建虚拟环境：

```bash
# 优先使用 uv
which uv && uv venv .venv && echo "✅ uv venv 创建成功" \
  || python3 -m venv .venv && echo "✅ python3 venv 创建成功"
```

### Step 2：lanhu-mcp 依赖安装

```bash
# 激活虚拟环境后安装
source .venv/bin/activate && pip install -r tools/lanhu-mcp/requirements.txt
```

若 `tools/lanhu-mcp/requirements.txt` 不存在，跳过并提示：
`tools/lanhu-mcp/ 目录未找到，请确认 lanhu-mcp 工具已放置在 tools/ 目录下。`

### Step 3：脚本运行环境（Node.js）

```bash
cd .claude/skills/xmind-converter/scripts && npm install
```

验证：`node .claude/skills/xmind-converter/scripts/json-to-xmind.mjs --help`

### Step 4：源码仓库配置

按照 `prompts/source-repo-setup.md` 执行交互式问答，生成 `.repos/source-map.yaml`。

**自动触发条件**：当任何 Skill 需要 `.repos/` 上下文但 `.repos/source-map.yaml` 缺失时，自动触发此步骤。

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

输出格式：

```
✅ Python 3.x.x
✅ Node.js vxx.x.x
✅ xmind-converter 脚本可用
✅ .repos/source-map.yaml 已生成（N 个仓库）

初始化完成。现在可以使用以下功能：
- 为 ${module_key} v${version} 生成测试用例（例如：为 orders v2.0 生成测试用例）
- 帮我增强这个 PRD：cases/requirements/orders/v2.0/商品管理需求.md
```

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
