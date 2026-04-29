# Kata 安装指南

## 前置依赖

| 工具    | 最低版本 | 检查命令         | 安装方式             |
| ------- | -------- | ---------------- | -------------------- |
| Node.js | >= 22.0  | `node --version` | `nvm install 22`     |
| Bun     | 任意     | `bun --version`  | `npm install -g bun` |
| Git     | 任意     | `git --version`  | `brew install git`   |

## 安装步骤

```bash
# 1. 安装依赖
bun install

# 2. 创建环境配置（如不存在）
[ -f .env ] || cp .env.example .env
[ -f .env.envs ] || cp .env.envs.example .env.envs

# 3. 校验配置
kata-cli config

# 4. 运行测试（必须全绿）
bun test --cwd engine

# 5. （可选）UI 自动化需要时安装 Playwright
bunx playwright install
```

## 凭据配置

编辑 `.env`，配置以下场景所需变量：

| 场景          | 必需变量                                                            |
| ------------- | ------------------------------------------------------------------- |
| 蓝湖 PRD 导入 | `LANHU_COOKIE`                                                      |
| 禅道 Bug      | `ZENTAO_BASE_URL` / `ZENTAO_ACCOUNT` / `ZENTAO_PASSWORD`            |
| 消息通知      | `DINGTALK_WEBHOOK_URL` / `FEISHU_WEBHOOK_URL` / `WECOM_WEBHOOK_URL` |
| SMTP 邮件     | `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `SMTP_TO`   |

## 安装完成

回到 Claude Code 输入 `/using-kata` 查看功能菜单。
