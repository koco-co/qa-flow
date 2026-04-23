# ui-autotest · step 9 — 启动 Allure 服务并发送通知

> 由 SKILL.md 路由后加载。执行时机：步骤 8 完成后。
> **必须由主 agent 亲自执行**（不派发 subagent），以便用 Bash `run_in_background` 启动常驻服务并读取 URL。

按 Task Schema 更新：将 `步骤 9` 标记为 `in_progress`。

## 9.1 启动 Allure 在线报告（后台、绑定所有网卡）

```bash
# 选一个较稳定的端口（如 7999）；若被占用可改成其他未占用端口
ALLURE_PORT=7999
npx allure open \
  workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report \
  --host 0.0.0.0 --port ${ALLURE_PORT}
```

- **必须使用** Bash 工具的 `run_in_background: true` 启动，进程常驻。
- 启动后用 `BashOutput` 读取 stdout，提取形如 `Server started at <http://...>` 的日志作为基础 URL。
- 若上一次 `/ui-autotest` 已占用该端口，先用 `KillShell` 终止旧 shell 再启动。

## 9.2 构造可直接访问的链接

- 获取本机局域网 IP（macOS）：`ipconfig getifaddr en0`（en0 为空则回退 `en1`）。
- 最终 URL：`http://<LAN_IP>:${ALLURE_PORT}/`
- 如环境设置了 `ALLURE_PUBLIC_BASE_URL`（可穿透/公网域名），优先使用该值并拼端口/路径。

## 9.3 发送钉钉通知（带链接）

```bash
kata-cli plugin-loader notify \
  --event ui-test-completed \
  --data '{
    "passed": {{passed}},
    "failed": {{failed}},
    "specFiles": ["{{spec_file}}"],
    "reportFile": "workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html",
    "reportURL": "http://{{lan_ip}}:{{allure_port}}/",
    "duration": "{{duration}}"
  }'
```

`reportURL` 会以 Markdown 链接形式出现在钉钉卡片 `🔗 在线查看` 行，点击即可直接访问。

按 Task Schema 更新：将 `步骤 9` 标记为 `completed`（subject: `步骤 9 — 通知已发送，Allure 服务端口 {{allure_port}}`）。
