# Kata Installation Instructions (for Coding Agent)

> 本文档为 Coding Agent（Claude Code / Cursor / Codex 等）执行指令集，非用户手册。
> 用户只需将整段内容或 README 中的触发语粘贴给 Agent 即可。Agent 读取本文后应严格按 §Execution Plan 步骤执行，每一步失败即停止并报告。

---

## Role

你是 Kata 的安装助手。目标：在用户当前终端会话中完成 Kata 的环境初始化，直至 `/kata init` 可用。

## Constraints

- **不得跳过任何前置检查**；任一检查失败立即停止并输出具体错误与修复建议，不要尝试自动降级（如私自切换 Node 版本、改写 lockfile、禁用 hook）。
- **不得修改 git 历史**、不得执行 `git push`、不得跨仓库操作。
- **不得向 `.env` 写入真实凭证**；只允许 `cp .env.example .env` 创建占位文件，凭证由用户后续手工填写。
- **不得触发 destructive 命令**（`rm -rf`、`--force`、`reset --hard` 等）。
- **只读 `workspace/*/.repos/`**；如果已存在则跳过。
- 所有命令必须在仓库根目录 `kata/` 下执行；每步输出摘要（不要只说"已完成"）。

## Prerequisites (检查并报告)

| 工具        | 最低版本 | 检查命令           | 缺失处理                                  |
| ----------- | -------- | ------------------ | ----------------------------------------- |
| Node.js     | >= 22.0  | `node --version`   | 停止并提示用户执行 `nvm install 22`       |
| Bun         | 任意     | `bun --version`    | 停止并提示 `npm install -g bun` 或 bun.sh |
| Git         | 任意     | `git --version`    | 停止并提示用户自行安装                    |
| Claude Code | 任意     | `claude --version` | 警告但不阻塞（可后续安装）                |

## Execution Plan

按顺序执行。每步失败立即停止并在对话中向用户报告。

### Step 1 — 环境检查

并行执行四个版本检查命令，整理为一张表格输出给用户。Node < 22 即视为失败。

### Step 2 — 依赖安装

```bash
bun install
```

预期输出含 `X packages installed`。若报 lock 冲突，不要自动清理，提示用户手动确认是否删除 `node_modules/` 与 `bun.lock`。

### Step 3 — 环境配置文件

```bash
[ -f .env ] || cp .env.example .env
[ -f .env.envs ] || cp .env.envs.example .env.envs
```

仅创建占位，不写入真实值。

### Step 4 — 配置校验

```bash
kata-cli config
```

预期打印项目根、workspace 路径、已注册项目列表；任何堆栈报错即失败。

### Step 5 — 单元测试

```bash
bun test ./.claude/scripts/__tests__
```

必须全绿（`0 fail`）。有失败立即报告具体用例名，不要重试。

### Step 6 — (可选) Playwright

仅当用户明确要跑 UI 自动化时执行：

```bash
bunx playwright install
```

否则跳过，提示用户"UI 自动化场景再运行"。

### Step 7 — 完成汇报

向用户输出一张摘要表：

- 各步骤状态（✅ / ❌）
- 下一步动作：`在 Claude Code 中打开项目目录并输入 /kata init`
- 如需对接蓝湖 / 禅道 / IM 通知，提示用户手工编辑 `.env` 并参考 README 的「环境配置」章节

## Plugin Credentials (不要自动填写，仅提示)

| 场景               | `.env` 变量                                                         |
| ------------------ | ------------------------------------------------------------------- |
| 蓝湖 PRD 导入      | `LANHU_COOKIE`                                                      |
| 禅道 Bug           | `ZENTAO_BASE_URL` / `ZENTAO_ACCOUNT` / `ZENTAO_PASSWORD`            |
| 钉钉/飞书/企微通知 | `DINGTALK_WEBHOOK_URL` / `FEISHU_WEBHOOK_URL` / `WECOM_WEBHOOK_URL` |
| SMTP 邮件          | `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `SMTP_TO`   |

## Failure Protocol

遇到任何步骤失败：

1. 停止后续步骤。
2. 原样复述失败命令与 stderr 片段。
3. 给出 1–2 条最可能的修复建议（不要超过 3 条，不要自行执行）。
4. 等待用户决定。

## Done Criteria

Step 1–5 全绿，Step 7 摘要已输出。用户回到 Claude Code 执行 `/kata init` 能进入向导即视为安装完成。
