# QAFlow 安装指南

零摩擦的复制 → 粘贴 → AI 自主安装流程。本文档可整段复制给 Claude Code,由 AI 自动完成。

---

## 1. 前置检查

| 工具         | 最低版本 | 检查命令          | 缺失时执行                                |
| ------------ | -------- | ----------------- | ----------------------------------------- |
| Node.js      | >= 22.0  | `node --version`  | `nvm install 22 && nvm use 22`            |
| Bun          | 任意     | `bun --version`   | `npm install -g bun`(或参考 https://bun.sh) |
| Claude Code  | 最新     | `claude --version`| 参考 https://claude.com/claude-code        |
| Git          | 任意     | `git --version`   | macOS: `brew install git`                 |

---

## 2. 4 步安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/qa-flow.git
cd qa-flow

# 2. 安装依赖(成功后会输出 "X packages installed")
bun install

# 3. 创建环境配置(凭证后续按需填写)
cp .env.example .env
cp .env.envs.example .env.envs   # 多环境时使用

# 4. 安装 Playwright skill(UI 自动化必需,其他场景可跳过)
bunx skills add playwright-cli
```

---

## 3. 验证安装

```bash
# 输出配置摘要,任何报错说明环境异常
bun run .claude/scripts/config.ts

# 运行单元测试,全绿表示框架完整
bun test ./.claude/scripts/__tests__
```

预期输出:
- `config.ts` 打印项目根、workspace 路径、已注册项目列表
- `bun test` 显示 `XX pass | 0 fail`

---

## 4. 在 Claude Code 中初始化

打开 Claude Code 进入项目目录,输入:

```
/qa-flow init
```

向导自动完成 4 步:环境检测 → 项目管理路由 → 插件配置 → 验证汇总。

完成后即可使用 `/test-case-gen`、`/ui-autotest`、`/bug-report` 等指令。

---

## 5. 按需配置插件(可选)

| 场景                | 必填 .env 变量                                     | 缺失时影响                |
| ------------------- | -------------------------------------------------- | ------------------------- |
| 蓝湖 PRD 导入       | `LANHU_COOKIE`                                     | 蓝湖 URL 输入立即报错     |
| 禅道 Bug 链接       | `ZENTAO_BASE_URL`、`ZENTAO_ACCOUNT`、`ZENTAO_PASSWORD` | hotfix-case-gen 无法抓取  |
| 钉钉/飞书/企业微信通知 | `DINGTALK_WEBHOOK_URL` 等                          | 跳过通知,流程不阻塞       |
| SMTP 邮件通知       | `SMTP_HOST`、`SMTP_USER` 等                        | 跳过通知,流程不阻塞       |

获取蓝湖 Cookie 见 `tools/lanhu-mcp/GET-COOKIE-TUTORIAL.md`。

---

## 6. 常见问题

**`bun: command not found`** — 参考 https://bun.sh 安装,或执行 `npm install -g bun`。

**`Node version too old`** — 安装 nvm 后执行 `nvm install 22 && nvm use 22`。

**`bun install` 报 lock 冲突** — 删除 `node_modules/` 与 `bun.lock` 后重新执行。

**`/qa-flow init` 找不到** — 确认在项目根目录打开 Claude Code,且 `.claude/skills/` 目录存在。

**Playwright 浏览器未安装** — 执行 `bunx playwright install`(仅 UI 自动化场景)。

---

## 7. 给 Coding Agent 的安装指令(整段复制)

```text
请按以下步骤为我安装 qa-flow:

1. 验证 Node.js >= 22 与 Bun 已安装
2. cd 到项目根目录,执行 `bun install`
3. 复制 `.env.example` 为 `.env`,复制 `.env.envs.example` 为 `.env.envs`
4. 执行 `bun run .claude/scripts/config.ts` 验证配置可加载
5. 执行 `bun test ./.claude/scripts/__tests__` 验证全部通过
6. 输出"安装完成"并提示我下一步在 Claude Code 中输入 `/qa-flow init`

如果任何步骤失败,请停下来告诉我具体错误,不要尝试自动修复。
```
