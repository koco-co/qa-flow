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
| **3** | 分析代码报错     | 粘贴报错日志，定位问题根因并生成 HTML 报告                               |
| **4** | 转换历史用例     | 将 CSV/XMind 历史用例转为 Markdown 归档格式                              |
| **5** | XMind 转换       | 将 JSON 数据转换为 XMind 文件                                            |
| **0** | 环境初始化       | 首次使用时执行：Python 环境、依赖安装、源码仓库配置                      |

---

根据用户输入的 `$ARGUMENTS` 进行路由：

如果 `$ARGUMENTS` 为空（用户直接输入 `/using-qa-flow`）：

- 展示上方功能菜单
- 展示下方快速示例
- 等待用户选择

如果 `$ARGUMENTS` 包含 `init` 或 `初始化` 或 `0`：

- 执行下方「环境初始化（5 步流程）」

如果 `$ARGUMENTS` 包含 `1` 或 `用例` 或 `test`：

- 引导用户提供模块和版本，例如：`为 data-assets v6.4.10 生成测试用例`（DTStack）或 `为 xyzh 生成测试用例`（XYZH）
- 如需快速模式，推荐写法：`为 data-assets v6.4.10 --quick 生成测试用例`
- 说明：`--quick` 会跳过 Step 3（Brainstorming）、Step 4（Checklist 预览）、Step 5（用户确认）
- 或直接提供蓝湖 URL，例如：`生成测试用例 https://lanhuapp.com/web/#/item/project/product?...`（自动从文档标题提取版本号）
- 如果用户还没有 PRD 文件，提示将 PRD 放到 `cases/requirements/<module>/v{version}/` 对应目录下
- 如检测到 `.qa-state.json`，提示可直接说：`继续 data-assets v6.4.10 的用例生成`
- 如需只重跑某个页面/模块，提示可说：`重新生成 data-assets v6.4.10 的「列表页」模块用例`

如果 `$ARGUMENTS` 包含 `2` 或 `PRD` 或 `增强`：

- 引导用户提供 PRD 文件路径，例如：`帮我增强这个 PRD：cases/requirements/custom/xyzh/数据质量-质量问题台账.md`

如果 `$ARGUMENTS` 包含 `3` 或 `报错` 或 `bug` 或 `分析`：

- 引导用户粘贴报错日志和 curl 信息
- 提示格式：`帮我分析这个报错` + 粘贴日志内容
- 建议同时补充：`curl` 请求、当前分支（若已知）

如果 `$ARGUMENTS` 包含 `4` 或 `转换` 或 `归档` 或 `archive`：

- 引导用户选择：`转化所有历史用例` 或 `转化离线开发的历史用例` 或 `检查哪些历史用例还没转化`

如果 `$ARGUMENTS` 包含 `5` 或 `xmind`：

- 引导用户提供 JSON 文件路径，例如：`将 cases/requirements/custom/xyzh/temp/cases.json 转换为 XMind`

---

## 环境初始化（5 步流程）

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
- 为 data-assets v6.4.10 生成测试用例（DTStack）/ 为 xyzh 生成测试用例（XYZH）
- 帮我增强这个 PRD：<路径>
```

---

## 快速示例

```
# 生成测试用例（最常用）
为 data-assets v6.4.10 生成测试用例
为 data-assets v6.4.10 --quick 生成测试用例
为 xyzh 生成测试用例
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

# 增强 PRD
帮我增强这个 PRD：cases/requirements/custom/xyzh/数据质量-质量问题台账.md

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
