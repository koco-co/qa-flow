# IM 通知插件

支持多渠道 IM 和邮件通知，在测试用例生成、代码分析等工作流完成时自动推送消息。

## 支持的通知渠道

| 渠道   | 环境变量               | 说明                         |
| ------ | ---------------------- | ---------------------------- |
| 钉钉   | `DINGTALK_WEBHOOK_URL` | 钉钉机器人 WebHook 地址     |
| 飞书   | `FEISHU_WEBHOOK_URL`   | 飞书机器人 WebHook 地址     |
| 企微   | `WECOM_WEBHOOK_URL`    | 企业微信机器人 WebHook 地址 |
| 邮件   | `SMTP_HOST`            | SMTP 服务器地址             |

## 环境配置

在项目根目录 `.env` 文件中至少配置一个通知渠道：

```env
# 钉钉（可选）
DINGTALK_WEBHOOK_URL="https://oapi.dingtalk.com/robot/send?access_token=xxx"

# 飞书（可选）
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

# 企微（可选）
WECOM_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"

# 邮件（可选）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASS="app-password"
SMTP_FROM="qa-flow@example.com"
SMTP_TO="team@example.com"
```

## 获取 WebHook 地址

### 钉钉

1. 打开钉钉工作台 → 机器人
2. 创建自定义机器人
3. 复制 WebHook URL

### 飞书

1. 打开飞书工作台 → 应用
2. 创建自定义机器人
3. 获取 WebHook 地址

### 企微

1. 登录企业微信管理后台
2. 找到机器人配置入口
3. 创建机器人并获取 WebHook Key

## 用法

通知会在以下事件自动触发：

- `case-generated`: 生成测试用例完成
- `bug-report`: Bug 分析报告生成完成
- `conflict-analyzed`: 冲突分析完成
- `hotfix-case-generated`: 线上问题用例转化完成
- `archive-converted`: 批量归档完成
- `ui-test-completed`: UI 自动化测试完成
- `workflow-failed`: 工作流异常中断

## 通知内容示例

```
✅ 用例生成完成

需求: Story-20260404
用例数: 42
耗时: 3m 22s
文件: cases/xmind/202604/商品管理.xmind
```

## 注意事项

- 至少配置一个通知渠道，否则工作流会告警
- SMTP 密码不要使用明文，建议使用应用专用密码
- 所有敏感信息存储在 `.env` 中，**不要提交到版本控制**
- 测试通知时使用 `--dry-run` 标志，不会真实发送
