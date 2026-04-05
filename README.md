# qa-flow

> AI 驱动的 QA 测试用例生成工作流，基于 Claude Code Skills 构建。

## 特性

- **6 节点工作流**：PRD → 增强（图片识别 + 需求澄清）→ 分析（头脑风暴）→ 并行生成（Writer Sub-Agent）→ 质量审查（Reviewer）→ 产物输出（XMind + Archive MD）
- **多 Agent 并行**：按模块拆分 Writer Sub-Agent，模块间并行生成用例，大型需求效率显著提升
- **插件化集成**：蓝湖 PRD 导入、禅道 Bug 集成、钉钉 / 飞书 / 企微 / 邮件通知，按需启用，不影响核心流程
- **交互式流程**：每个关键节点提供推荐选项 + 自由输入，支持 `--quick` 快速模式和断点续传
- **偏好学习**：用例编写、数据准备等用户反馈自动沉淀到 `preferences/` 目录，持续修正生成风格
- **多工具链**：测试用例生成 + Bug 日志分析 + XMind 局部编辑 + Playwright UI 自动化，覆盖 QA 日常场景

---

## 快速开始

### 前置条件

- **Node.js** >= 22
- **Claude Code CLI** — [安装指南](https://claude.com/claude-code)

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/qa-flow.git
cd qa-flow

# 2. 安装依赖
npm install

# 3. 安装 Playwright（UI 自动化功能需要）
npx skills add playwright-cli

# 4. 创建环境配置
cp .env.example .env
```

### 初始化

在 Claude Code 中输入：

```
/setup
```

5 步交互向导会自动完成：工作区创建、源码仓库配置、插件凭证配置和环境验证。

### 常用命令

```bash
# 为 Story 文档生成完整测试用例（XMind + Archive MD）
为 Story-20260322 生成测试用例

# 快速模式（跳过部分交互，适合重跑）
为 Story-20260322 --quick 生成测试用例

# 从蓝湖 URL 直接导入需求并生成用例
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=xxx&docId=xxx

# 直接粘贴报错日志进行 Bug 分析
帮我分析这个报错

# 局部修改已有 XMind 用例
修改用例 "验证导出仅导出当前筛选结果且文件命名符合规则"
```

---

## 功能详情

### 生成测试用例 (`/test-case-gen`)

将 PRD / Story 文档转化为结构化 XMind 和 Archive Markdown 测试用例。

**节点**：`init` → `enhance`（图片识别 + 需求澄清）→ `analyze`（头脑风暴）→ `write`（多 Agent 并行）→ `review`（质量阈值审查）→ `output`（XMind + MD + IM 通知）

```bash
# 普通模式（全节点 + 交互确认）
为 Story-20260322 生成测试用例

# 快速模式（跳过交互，1 轮 Review）
为 Story-20260322 --quick 生成测试用例

# 续传（自动检测断点）
继续 Story-20260322 的用例生成

# 模块重跑
重新生成 Story-20260322 的「列表页」模块用例
```

---

### 分析报错 (`/code-analysis`)

将报错日志、合并冲突或禅道 Bug 链接转化为结构化 HTML 报告或 Hotfix 测试用例。

**5 种模式**：后端 Bug（Java 堆栈）、前端 Bug（`TypeError`、`ChunkLoadError`）、合并冲突（`<<<<<<< HEAD`）、Hotfix 用例（禅道链接）、信息不足（输出补料清单）。

```bash
# 粘贴错误日志
帮我分析这个报错

# 禅道 Bug 链接直接触发 Hotfix 用例生成
http://zenpms.dtstack.cn/zentao/bug-view-138845.html
```

---

### 编辑用例 (`/xmind-editor`)

无需读取 PRD，直接在已有 XMind 文件上进行局部操作。修改完成后，用户反馈自动写入 `preferences/`。

**5 种操作**：

| 操作 | 示例 |
|------|------|
| 搜索用例 | `搜索用例 "导出"` |
| 查看用例 | `查看用例 "验证列表页默认加载"` |
| 修改用例 | `修改用例 "验证导出仅导出当前筛选结果且文件命名符合规则"` |
| 新增用例 | `新增用例 到 "规则列表页" 分组` |
| 删除用例 | `删除用例 "验证xxx"` |

```bash
# 修改现有用例步骤
修改用例 "验证导出仅导出当前筛选结果且文件命名符合规则"

# 新增用例到指定分组
新增用例 到 "规则列表页" 分组
```

---

### UI 自动化测试 (`/ui-autotest`)

将 Archive MD 测试用例转化为 Playwright TypeScript 脚本，按优先级并行执行，失败时自动生成 Bug 报告。

**依赖**：需提前安装 `playwright-cli` skill（`npx skills add playwright-cli`）。

```bash
# 冒烟测试（仅执行 P0 用例）
UI自动化测试 商品管理 https://your-app.example.com

# 完整测试（P0+P1+P2）
执行UI测试 cases/archive/202604/PRD-26-商品管理.md https://your-app.example.com

# e2e 回归
e2e回归 商品管理功能 https://staging.example.com
```

---

## 项目结构

```text
qa-flow/
├── .claude/
│   ├── config.json            # 模块、仓库、路径唯一权威来源
│   ├── rules/                 # 用例编写、归档格式、通知等规范
│   ├── scripts/               # 核心 TypeScript 脚本
│   │   ├── state.ts           # 断点续传状态管理
│   │   ├── xmind-gen.ts       # XMind 文件生成
│   │   ├── xmind-edit.ts      # XMind 局部编辑
│   │   ├── plugin-loader.ts   # 插件加载与调度
│   │   ├── repo-sync.ts       # 源码仓库同步
│   │   └── image-compress.ts  # 图片压缩
│   └── skills/
│       ├── qa-flow/           # 入口菜单路由
│       ├── setup/             # 环境初始化向导
│       ├── test-case-gen/     # 测试用例生成（核心）
│       ├── code-analysis/     # 报错 / 冲突分析
│       ├── xmind-editor/      # XMind 局部编辑
│       └── ui-autotest/       # Playwright UI 自动化
├── plugins/
│   ├── lanhu/                 # 蓝湖 PRD 导入插件
│   ├── zentao/                # 禅道 Bug 集成插件
│   └── notify/                # IM 通知插件
├── workspace/                 # 工作区（默认目录，可自定义）
│   ├── prds/                  # PRD / Story 文档
│   ├── xmind/                 # XMind 输出
│   ├── archive/               # 归档 Markdown
│   ├── issues/                # 线上问题用例
│   ├── history/               # 历史 CSV 原始资料
│   ├── reports/               # Bug / 冲突分析报告
│   └── .repos/                # 源码仓库（只读）
├── preferences/               # 用户偏好规则（自动写入）
├── templates/                 # Handlebars 报告模板
├── biome.json                 # 代码风格配置
├── tsconfig.json
├── .env.example               # 环境变量模板
└── package.json
```

---

## 插件系统

### 内置插件

| 插件 | 功能 | 启用条件 |
|------|------|----------|
| `lanhu` | 从蓝湖 URL 爬取需求文档和截图 | `.env` 中配置 `LANHU_COOKIE` |
| `zentao` | 读取禅道 Bug 详情和关联信息 | `.env` 中配置 `ZENTAO_BASE_URL` + 账号密码 |
| `notify` | 钉钉 / 飞书 / 企微 / 邮件通知 | `.env` 中配置任意一个通道的 Webhook 或 SMTP |

插件通过 Hook 机制接入工作流，不影响核心逻辑。

### 开发自定义插件

在 `plugins/<plugin-name>/` 目录下创建 `plugin.json`：

```json
{
  "name": "my-plugin",
  "description": "插件描述",
  "version": "1.0.0",
  "env_required": ["MY_PLUGIN_API_KEY"],
  "hooks": {
    "test-case-gen:init": "input-adapter"
  },
  "commands": {
    "fetch": "npx tsx plugins/my-plugin/fetch.ts --url {{url}} --output {{output_dir}}"
  },
  "url_patterns": ["example.com"]
}
```

`hooks` 字段定义插件接入的生命周期节点：

| Hook 键 | 时机 |
|---------|------|
| `test-case-gen:init` | 用例生成初始化阶段（输入适配） |
| `*:output` | 任意 Skill 产出后（如通知） |

---

## 脚本 CLI 参考

所有脚本位于 `.claude/scripts/`，使用 `npx tsx` 执行：

| 脚本 | 核心子命令 | 说明 |
|------|-----------|------|
| `state.ts` | `init` / `resume` | 断点状态初始化与续传 |
| `xmind-gen.ts` | `--input <json> --output <dir>` | 从 JSON 生成 XMind |
| `xmind-edit.ts` | `search` / `show` / `patch` / `delete` | XMind 用例增删改查 |
| `image-compress.ts` | `--dir <dir>` | 图片压缩（超 2000px 自动缩放） |
| `plugin-loader.ts` | `check` / `notify` | 插件检测与通知调度 |
| `repo-sync.ts` | `--url <url> --branch <branch>` | 源码仓库分支同步 |
| `archive-gen.ts` | `--input <xmind> --output <dir>` | XMind 转 Archive MD |

---

## 配置说明

复制 `.env.example` 为 `.env` 并填写对应值：

| 变量 | 必填 | 说明 |
|------|------|------|
| `WORKSPACE_DIR` | 否 | 工作区目录名，默认 `workspace` |
| `SOURCE_REPOS` | 否 | 源码仓库 Git URL（逗号分隔），留空则不启用代码分析源码定位 |
| `LANHU_COOKIE` | 否 | 蓝湖登录 Cookie，启用蓝湖插件 |
| `ZENTAO_BASE_URL` | 否 | 禅道系统地址（如 `http://zenpms.example.cn/zentao`） |
| `ZENTAO_ACCOUNT` | 否 | 禅道账号 |
| `ZENTAO_PASSWORD` | 否 | 禅道密码 |
| `DINGTALK_WEBHOOK_URL` | 否 | 钉钉群机器人 Webhook，启用钉钉通知 |
| `DINGTALK_KEYWORD` | 否 | 钉钉安全关键词，默认 `qa-flow` |
| `FEISHU_WEBHOOK_URL` | 否 | 飞书群机器人 Webhook，启用飞书通知 |
| `WECOM_WEBHOOK_URL` | 否 | 企业微信群机器人 Webhook，启用企微通知 |
| `SMTP_HOST` | 否 | 邮件服务器地址，启用邮件通知 |
| `SMTP_PORT` | 否 | 邮件服务器端口，默认 `587` |
| `SMTP_USER` | 否 | 邮件账号 |
| `SMTP_PASS` | 否 | 邮件密码 / 授权码 |
| `SMTP_FROM` | 否 | 发件人地址 |
| `SMTP_TO` | 否 | 收件人地址（逗号分隔多个） |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request。

### 开发流程

```bash
# 1. Fork 仓库并创建特性分支
git checkout -b feat/my-feature

# 2. 编写代码（遵循不可变数据原则，函数 < 50 行，文件 < 800 行）

# 3. 代码风格检查（使用 Biome）
npm run check

# 4. 自动修复风格问题
npm run check:fix

# 5. 运行测试
npm test

# 6. 提交 PR
```

### 提交规范

```
<type>: <description>

类型：feat / fix / refactor / docs / test / chore / perf / ci
```

### 测试

```bash
# 运行所有单元测试
npm test

# 监听模式
npm run test:watch
```

测试文件位于 `.claude/scripts/__tests__/`，覆盖率目标 80%+。

---

## License

[MIT](./LICENSE) © 2026 qa-flow contributors
