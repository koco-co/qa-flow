# qa-flow v2.0 架构重构设计文档

> 日期：2026-04-05
> 分支：qa-flow-v2.0
> 状态：待实施

---

## 1. 项目定位

**可插拔 QA 测试平台**：通用核心框架 + 插件扩展。核心工作流与外部系统解耦，蓝湖/禅道等集成通过插件按需接入。

**目标受众**：QA 测试工程师。开源后其他团队可 fork 并通过插件对接自己的需求管理/Bug 追踪系统。

---

## 2. 技术栈

| 领域 | 选型 |
|------|------|
| 脚本语言 | TypeScript（ESM） |
| 运行时 | Node.js / npx tsx |
| XMind 生成 | xmind-generator（npm） |
| 格式化 + Lint | Biome |
| 测试框架 | Playwright（UI 自动化） |
| 模板引擎 | Handlebars（HTML 报告） |
| AI 框架 | Claude Code Skills（Anthropic 规范） |

---

## 3. 架构分层

```
┌─────────────────────────────────────────────────┐
│  用户层：自然语言 / 触发词 / slash command       │
├─────────────────────────────────────────────────┤
│  SKILL.md 层：触发路由 + 交互协议 + 节点编排     │  < 500 行
│  prompts/ 层：AI 指令模板（按需加载）            │  Level 3 渐进披露
├─────────────────────────────────────────────────┤
│  脚本层：TS 脚本处理确定性逻辑                   │  命令 + 参数
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │xmind-gen│  │archive-gen│  │state / sync   │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
├─────────────────────────────────────────────────┤
│  插件层：可选集成（蓝湖/禅道/IM通知/自定义）     │  .env 配置驱动
├─────────────────────────────────────────────────┤
│  数据层：workspace/（用户工作区）                │
└─────────────────────────────────────────────────┘
```

**核心原则**：
- SKILL.md 是"大脑"（< 500 行）：触发路由 + 交互协议 + 节点编排
- TS 脚本是"肌肉"：处理确定性逻辑（JSON 转换、文件操作、状态管理）
- SKILL.md 中直接写明命令 + 参数占位符，AI 不需要读脚本源码
- 每个节点间由 SKILL.md 控制交互式提问（带推荐选项 + 自由输入）

---

## 4. 项目结构

```
qa-flow/
├── CLAUDE.md                     # 极简版（< 30 行）：语言 + 功能索引 + 核心约束
├── README.md                     # 开源项目说明
├── LICENSE
├── .env.example                  # 统一配置模板
├── .env                          # 用户实际配置（gitignored）
├── package.json                  # 统一依赖
├── tsconfig.json
├── biome.json
├── preferences.md                # 用户偏好规则
│
├── .claude/
│   ├── settings.json             # hooks 配置
│   ├── skills/
│   │   ├── qa-flow/              # 主入口（菜单路由）
│   │   │   ├── SKILL.md
│   │   │   └── references/
│   │   ├── test-case-gen/        # 用例生成主流程（6 节点）
│   │   │   ├── SKILL.md
│   │   │   ├── prompts/
│   │   │   │   ├── enhance.md
│   │   │   │   ├── analyze.md    # 含 QA 专用头脑风暴
│   │   │   │   ├── writer.md
│   │   │   │   └── reviewer.md
│   │   │   └── references/
│   │   │       ├── test-case-rules.md
│   │   │       ├── intermediate-format.md
│   │   │       └── xmind-structure.md
│   │   ├── code-analysis/        # Bug/冲突分析
│   │   │   ├── SKILL.md
│   │   │   ├── prompts/
│   │   │   └── references/
│   │   ├── xmind-editor/         # XMind 局部编辑
│   │   │   └── SKILL.md
│   │   ├── ui-autotest/          # UI 自动化测试
│   │   │   ├── SKILL.md
│   │   │   ├── prompts/
│   │   │   └── scripts/
│   │   ├── setup/                # 环境初始化向导
│   │   │   ├── SKILL.md
│   │   │   ├── references/
│   │   │   └── scripts/
│   │   └── playwright-cli/       # 外部 skill（官方 Playwright CLI）
│   │
│   └── scripts/                  # 共享 TS 脚本
│       ├── lib/                  # 共享工具库
│       │   ├── frontmatter.ts
│       │   ├── paths.ts
│       │   └── env.ts
│       ├── xmind-gen.ts
│       ├── xmind-edit.ts
│       ├── archive-gen.ts
│       ├── prd-frontmatter.ts
│       ├── repo-sync.ts
│       ├── state.ts
│       ├── config.ts
│       ├── plugin-loader.ts
│       ├── history-convert.ts
│       ├── image-compress.ts
│       └── tsconfig.json
│
├── plugins/                      # 可插拔集成
│   ├── lanhu/
│   │   ├── plugin.json
│   │   ├── fetch.ts
│   │   └── README.md
│   ├── zentao/
│   │   ├── plugin.json
│   │   ├── fetch.ts
│   │   └── README.md
│   └── notify/                   # IM 通知插件（钉钉/飞书/企微/邮件）
│       ├── plugin.json
│       ├── send.ts
│       └── README.md
│
├── templates/                    # 输出模板
│   ├── archive.md.hbs
│   ├── bug-report.html.hbs
│   └── conflict-report.html.hbs
│
└── workspace/                    # 用户工作区（setup 创建，gitignored）
    ├── prds/
    ├── xmind/
    ├── archive/
    ├── issues/
    ├── history/
    ├── reports/
    ├── .repos/
    └── .temp/
```

---

## 5. Skill 清单

| Skill | 类型 | SKILL.md 行数上限 | 职责 |
|-------|------|-------------------|------|
| `qa-flow` | 自研 | < 100 | 主入口：菜单路由 + 快速引导 |
| `test-case-gen` | 自研 | < 500 | 用例生成主流程（6 节点编排） |
| `code-analysis` | 自研 | < 300 | Bug/冲突分析 + Hotfix 用例 |
| `xmind-editor` | 自研 | < 150 | XMind 局部编辑（5 个命令） |
| `ui-autotest` | 自研 | < 400 | UI 自动化测试编排 |
| `setup` | 自研 | < 300 | 环境初始化向导（5 步交互式） |
| `playwright-cli` | 外部 | - | 官方 Playwright CLI（ui-autotest 依赖） |

---

## 6. 核心工作流：test-case-gen（6 节点）

### 6.1 节点流转

```
用户触发
    │
┌───▼────┐
│ 1.init │  TS：输入解析 + 插件适配 + 环境检查 + 断点续传
└───┬────┘
    │ 交互点 A：确认解析结果和执行参数
┌───▼───────┐
│ 2.enhance │  AI：图片识别 + 页面要点 + 需求澄清；TS：图片压缩 + frontmatter
└───┬───────┘  插件钩子：源码同步（有 .repos 时自动注入）
    │ 交互点 B：确认增强摘要 + 健康度预检
┌───▼───────┐
│ 3.analyze │  AI：历史检索 + QA brainstorm + 测试点清单
└───┬───────┘
    │ 交互点 C（关键门禁）：确认/调整测试点清单
┌───▼───────┐
│ 4.write   │  并行 Sub-Agent：按模块拆分 Writer（含 BLOCKED 中转）
└───┬───────┘
┌───▼───────┐
│ 5.review  │  Sub-Agent：质量审查 + 自动修正（门禁 15%/40%）
└───┬───────┘
    │ 交互点 D：确认评审摘要
┌───▼───────┐
│ 6.output  │  TS：XMind 生成 + Archive MD + 清理；插件：IM 通知
└───┬───────┘
    │ 交互点 E：最终交付 + 后续选项
    ▼
  完成
```

### 6.2 节点命令映射

| 节点 | TS 脚本命令 | AI 任务（prompts/） |
|------|------------|---------------------|
| init | `npx tsx .claude/scripts/state.ts init --prd {{path}} --mode {{mode}}` | 无 |
| | `npx tsx .claude/scripts/plugin-loader.ts check --input {{url_or_path}}` | |
| enhance | `npx tsx .claude/scripts/image-compress.ts --dir {{images_dir}}` | 读 `prompts/enhance.md` |
| | `npx tsx .claude/scripts/prd-frontmatter.ts normalize --file {{prd}}` | 需求澄清问答 |
| analyze | `npx tsx .claude/scripts/archive-gen.ts search --query {{keywords}}` | 读 `prompts/analyze.md` |
| write | 无（纯 AI 任务） | 读 `prompts/writer.md` |
| review | 无（纯 AI 任务） | 读 `prompts/reviewer.md` |
| output | `npx tsx .claude/scripts/xmind-gen.ts --input {{json}} --output {{path}}` | 无 |
| | `npx tsx .claude/scripts/archive-gen.ts convert --input {{json}} --template templates/archive.md.hbs` | |
| | `npx tsx .claude/scripts/plugin-loader.ts notify --event case-generated --data '{{json}}'` | |

### 6.3 运行模式

| 模式 | 触发 | 行为差异 |
|------|------|----------|
| 普通 | 默认 | 全 6 节点 + 全部交互点 |
| 快速 | `--quick` | 跳过交互点 B/C，analyze 简化，review 1 轮 |
| 续传 | 自动检测 `.temp/.qa-state-*.json` | 从断点继续 |
| 模块重跑 | `重新生成 xxx 的「列表页」` | 仅 write → review → output（replace） |

### 6.4 交互点协议

每个交互点遵循统一格式：

```
[状态摘要]

选项：
  1. ✓ [推荐操作]（AI 推荐理由）
  2. [备选操作]
  3. [自定义] — 直接输入你的想法
```

### 6.5 BLOCKED 中转协议

Writer Sub-Agent 遇到 PRD 信息不足时：
1. 返回 `## BLOCKED` 标记 + 问题列表
2. 编排器逐条向用户提问（每次 1 个，含候选答案 + AI 推荐）
3. 收集答案后重启 Writer，注入已确认信息
4. 多个 Writer 同时 blocked 时，按队列依次处理

### 6.6 断点续传状态

```jsonc
// workspace/.temp/.qa-state-{prd-slug}.json
{
  "prd": "workspace/prds/202604/xxx.md",
  "mode": "normal",
  "current_node": "analyze",
  "completed_nodes": ["init", "enhance"],
  "node_outputs": {
    "init": { "prd_path": "...", "enhanced_path": "..." },
    "enhance": { "health_score": 85, "warnings": [] }
  },
  "writers": {},
  "created_at": "2026-04-05T10:00:00Z",
  "updated_at": "2026-04-05T10:30:00Z"
}
```

---

## 7. 插件系统

### 7.1 plugin.json 格式

```jsonc
{
  "name": "lanhu",
  "description": "蓝湖 PRD 导入插件",
  "version": "1.0.0",
  "env_required": ["LANHU_COOKIE"],
  "hooks": {
    "test-case-gen:init": "input-adapter"
  },
  "commands": {
    "fetch": "npx tsx plugins/lanhu/fetch.ts --url {{url}} --output {{output_dir}}"
  }
}
```

**notify 插件示例**：

```jsonc
{
  "name": "notify",
  "description": "IM 通知插件：钉钉/飞书/企微/邮件",
  "version": "1.0.0",
  "env_required_any": ["DINGTALK_WEBHOOK_URL", "FEISHU_WEBHOOK_URL", "WECOM_WEBHOOK_URL", "SMTP_HOST"],
  "hooks": {
    "*:output": "post-action"
  },
  "commands": {
    "send": "npx tsx plugins/notify/send.ts --event {{event}} --data '{{json}}'"
  }
}
```

> `env_required_any`：任意一个变量配置即激活（区别于 `env_required` 要求全部配置）

### 7.2 加载机制

1. `plugin-loader.ts` 扫描 `plugins/*/plugin.json`
2. 检查 `.env` 是否配置了 `env_required` 中的所有变量
3. 已配置 → active；未配置 → inactive（静默跳过）
4. SKILL.md 通过 `plugin-loader.ts resolve --url {{url}}` 获取匹配插件的执行命令

### 7.3 自定义插件

用户只需在 `plugins/` 下创建目录 + `plugin.json` + 脚本，框架自动发现。

---

## 8. 偏好规则系统

### 8.1 存储

项目根目录 `preferences.md`，Markdown 格式，按功能分类。

### 8.2 优先级

用户当前指令 > preferences.md > skill 内置规则（references/）

### 8.3 加载

每个 skill 执行前，SKILL.md 指令要求 AI 先读取 `preferences.md`。

### 8.4 写入流程

```
用户反馈修改 → AI 修改完成 → 用户验收通过
→ AI 提炼反馈为偏好规则 → 向用户确认是否写入
→ 用户确认 → 追加到 preferences.md 对应分类下
```

---

## 9. .env 统一配置

```bash
# 核心
WORKSPACE_DIR=workspace

# 源码仓库（逗号分隔 git URL）
SOURCE_REPOS=

# ── 插件配置（填了即启用） ──

# 蓝湖 PRD 导入
LANHU_COOKIE=

# 禅道 Bug 集成
ZENTAO_BASE_URL=
ZENTAO_ACCOUNT=
ZENTAO_PASSWORD=

# IM 通知（至少配一个通道即启用 notify 插件）
DINGTALK_WEBHOOK_URL=
DINGTALK_KEYWORD=qa-flow
FEISHU_WEBHOOK_URL=
WECOM_WEBHOOK_URL=
SMTP_HOST=
SMTP_TO=
```

---

## 10. setup 初始化流程

5 步交互式向导：

| 步骤 | 动作 | 命令 |
|------|------|------|
| 1 | 检测环境 | `npx tsx .claude/skills/setup/scripts/init-wizard.ts scan` |
| 2 | 配置工作区 | 创建 workspace/ 子目录 |
| 3 | 配置源码仓库 | `git clone {{url}} workspace/.repos/{{group}}/{{repo}}` |
| 4 | 配置插件 | 扫描 plugins/，引导填写 .env |
| 5 | 验证汇总 | `npx tsx .claude/skills/setup/scripts/init-wizard.ts verify` |

源码仓库自动分组：`http://gitlab.xxx/customItem/dt-center-assets.git` → `workspace/.repos/customItem/dt-center-assets/`

---

## 11. 共享脚本

| 脚本 | 职责 | 关键子命令 |
|------|------|-----------|
| `xmind-gen.ts` | JSON → XMind | `--input --output --mode create\|append\|replace` |
| `xmind-edit.ts` | XMind 局部编辑 | `search\|show\|patch\|add\|delete` |
| `archive-gen.ts` | JSON → Archive MD / 历史检索 | `convert --input --template` / `search --query` |
| `prd-frontmatter.ts` | PRD front-matter 处理 | `normalize --file` |
| `repo-sync.ts` | 源码仓库同步 | `--url --branch` |
| `state.ts` | 断点续传 | `init\|update\|resume\|clean` |
| `config.ts` | 配置加载 | 无子命令，输出合并后的 JSON |
| `plugin-loader.ts` | 插件管理 | `check\|resolve --url` |
| `history-convert.ts` | 历史用例转化 | `--path --module --detect --force` |
| `image-compress.ts` | 图片压缩 | `--dir --max-size 2000` |

脚本规范：
- 统一使用 commander 或 parseArgs 做 CLI
- 支持 `--help`、`--dry-run`、`--verbose`
- 结果输出 JSON 到 stdout，日志到 stderr
- 脚本间不互相调用，全部通过 SKILL.md 串联
- 共享工具函数放 `lib/`（frontmatter.ts, paths.ts, env.ts）

---

## 12. CLAUDE.md（极简版）

```markdown
# qa-flow

使用中文回复。

## 快速开始

输入 `/qa-flow` 查看功能菜单，首次使用请先执行 `/qa-flow init`。

## 功能索引

| 命令 | 功能 |
|------|------|
| `/qa-flow` | 功能菜单 |
| `/qa-flow init` | 环境初始化 |
| `/test-case-gen` | 生成测试用例 |
| `/code-analysis` | 分析报错/冲突 |
| `/xmind-editor` | 编辑 XMind 用例 |
| `/ui-autotest` | UI 自动化测试 |

## 核心约束

- workspace/.repos/ 下的源码仓库为只读，禁止 push/commit
- 用户偏好规则见 preferences.md，优先级高于 skill 内置规则
- 所有输出产物写入 workspace/ 目录，不污染框架代码
```

---

## 13. 实施优先级

| 优先级 | 内容 |
|--------|------|
| P0 | 项目骨架（tsconfig + biome + package.json + 目录结构） |
| P0 | 共享脚本层（xmind-gen, archive-gen, state, config, plugin-loader） |
| P0 | test-case-gen skill（6 节点核心工作流） |
| P1 | setup skill（初始化向导）+ qa-flow skill（入口路由）+ xmind-editor skill |
| P2 | code-analysis skill + plugins（lanhu, zentao） |
| P2 | ui-autotest skill |
| P3 | README.md + 开源准备 |

---

## 14. 设计约束与非目标

### 约束
- 所有 SKILL.md 遵循 Anthropic Agent Skills 规范（frontmatter + body < 500 行）
- 渐进式披露：Level 1（metadata）→ Level 2（body）→ Level 3（prompts/references/）
- 脚本 CLI 规范：--help / --dry-run / JSON stdout / 日志 stderr
- 交互点必须提供 AI 推荐选项 + 自由输入选项

### 非目标
- 不兼容 v1 数据结构（全新项目）
- 不支持非 Claude Code 的 AI Agent 平台（可后续扩展）
- 不内置特定公司的业务逻辑（通过插件实现）
- 不内置 IM 通知逻辑（通过 notify 插件实现）
