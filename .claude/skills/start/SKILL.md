---
name: start
description: 快速开始引导，展示工作空间功能菜单。输入 /start 查看所有可用功能。
disable-model-invocation: true
argument-hint: "[功能编号或关键词]"
---

# qa-flow

欢迎使用！本工作空间支持以下功能：

## 功能菜单

| 编号  | 功能             | 说明                                                           |
| ----- | ---------------- | -------------------------------------------------------------- |
| **1** | 🧪 生成测试用例  | 根据 PRD 文档或蓝湖 URL 自动生成 XMind 测试用例（支持普通/快速/续传模式） |
| **2** | 📝 增强 PRD 文档 | 为 PRD 补充图片描述、格式规范化、健康度预检                    |
| **3** | 🐛 分析代码报错  | 粘贴报错日志，定位问题根因并生成 HTML 报告                     |
| **4** | 📦 转换历史用例  | 将 CSV/XMind 历史用例转为 Markdown 归档格式                    |
| **5** | 🔄 XMind 转换    | 将 JSON 数据转换为 XMind 文件                                  |

---

根据用户输入的 `$ARGUMENTS` 进行路由：

如果 `$ARGUMENTS` 为空（用户直接输入 `/start`）：

- 展示上方功能菜单
- 展示下方快速示例
- 等待用户选择

如果 `$ARGUMENTS` 包含 `1` 或 `用例` 或 `test`：

- 引导用户提供 Story 路径，例如：`为 Story-20260322 快速生成测试用例`
- 或直接提供蓝湖 URL，例如：`生成测试用例 https://lanhuapp.com/web/#/item/project/product?...`
- 如果用户还没有 PRD 文件，提示将 PRD 放到 `cases/requirements/` 对应目录下

如果 `$ARGUMENTS` 包含 `2` 或 `PRD` 或 `增强`：

- 引导用户提供 PRD 文件路径，例如：`帮我增强这个 PRD：cases/requirements/xyzh/Story-20260322/PRD-26-xxx.md`

如果 `$ARGUMENTS` 包含 `3` 或 `报错` 或 `bug` 或 `分析`：

- 引导用户粘贴报错日志和 curl 信息
- 提示格式：`帮我分析这个报错` + 粘贴日志内容

如果 `$ARGUMENTS` 包含 `4` 或 `转换` 或 `归档` 或 `archive`：

- 引导用户选择：`转化所有历史用例` 或 `转化离线开发的历史用例` 或 `检查哪些历史用例还没转化`

如果 `$ARGUMENTS` 包含 `5` 或 `xmind`：

- 引导用户提供 JSON 文件路径，例如：`将 cases/requirements/xyzh/Story-20260322/temp/cases.json 转换为 XMind`

---

## 快速示例

```
# 生成测试用例（最常用）
为 Story-20260322 快速生成测试用例
根据需求文档: Story-20260322 中的 PRD-26 生成测试用例
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

# 增强 PRD
帮我增强这个 PRD：cases/requirements/xyzh/Story-20260322/PRD-26-xxx.md

# 分析报错
帮我分析这个报错
（然后粘贴报错日志 + curl 信息）

# 转化历史用例
转化所有历史用例
检查哪些历史用例还没转化
```

> 💡 提示：你也可以直接用自然语言描述需求，系统会自动匹配对应功能。
> 💡 生成完成后，优先让用户从根目录快捷链接验收：`latest-output.xmind`、`latest-prd-enhanced.md`、`latest-bug-report.html`、`latest-conflict-report.html`。
