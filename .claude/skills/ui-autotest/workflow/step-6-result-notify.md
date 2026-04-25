# ui-autotest · step 6 — 处理结果与通知

> 由 SKILL.md 路由后加载。执行时机：步骤 5（全量回归）完成后。
> Allure 报告路径、session 结构、通知事件在 SKILL.md 前段定义，本文件不重复。

按 Task Schema 更新：将 `步骤 6` 标记为 `in_progress`。

**输出模板中的变量说明：**

- `{{full_spec_path}}`：步骤 4 生成的 `full.spec.ts` 完整路径（如 `workspace/{{project}}/tests/202604/登录功能/full.spec.ts`）
- `{{YYYYMM}}`：当月年月（如 `202604`）
- `{{suite_name}}`：需求名称（如 `登录功能`）

## 6.1 全部通过

```
✅ {{需求名称}} UI 自动化测试完成

通过：{{passed}} / {{total}}
耗时：{{duration}}
报告：workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html

在线报告：{{report_url}}（已由常驻 allure 服务提供，可直接访问）
本地报告：workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html

验收命令（可直接复制运行）：
ACTIVE_ENV={{env}} QA_SUITE_NAME="{{suite_name}}" kata-cli run-tests-notify {{full_spec_path}} --project=chromium
```

## 6.2 存在失败

为每个失败的用例派发 `bug-reporter-agent`（model: haiku），输入：

- 失败的测试用例数据
- Playwright 错误信息
- 截图路径（`workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/` 下的截图）
- Console 错误日志

Bug 报告输出至：`workspace/{{project}}/reports/bugs/{{YYYYMM}}/ui-autotest-{{suite_name}}.html`

```
❌ {{需求名称}} UI 自动化测试完成（存在失败）

通过：{{passed}} / {{total}}
失败：{{failed}} 条
耗时：{{duration}}

失败用例：
{{#each failed_cases}}
- {{title}}（{{error_summary}}）
{{/each}}

Bug 报告：workspace/{{project}}/reports/bugs/{{YYYYMM}}/ui-autotest-{{suite_name}}.html

查看 Allure 报告（本地启动 http 服务并自动打开浏览器）：
npx allure open workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report

验收命令（可直接复制运行）：
ACTIVE_ENV={{env}} QA_SUITE_NAME="{{suite_name}}" kata-cli run-tests-notify {{full_spec_path}} --project=chromium
```

## 6.3 启动 Allure 在线报告

```bash
# 选一个较稳定的端口（如 7999）；若被占用可改成其他未占用端口
ALLURE_PORT=7999
npx allure open \
  workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report \
  --host 0.0.0.0 --port ${ALLURE_PORT}
```

- **必须使用** Bash 工具的 `run_in_background: true` 启动，进程常驻。
- 启动后用 `BashOutput` 读取 stdout，提取 `Server started at <http://...>` 日志。
- 若端口已被占用，先用 `KillShell` 终止旧 shell 再启动。

## 6.4 构造可访问链接

- 获取本机局域网 IP（macOS）：`ipconfig getifaddr en0`（en0 为空则回退 `en1`）
- 最终 URL：`http://<LAN_IP>:${ALLURE_PORT}/`
- 如环境设置了 `ALLURE_PUBLIC_BASE_URL`（可穿透/公网域名），优先使用

## 6.5 发送钉钉通知

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

`reportURL` 会以 Markdown 链接形式出现在钉钉卡片 `🔗 在线查看` 行。

---

按 Task Schema 更新：将 `步骤 6` 标记为 `completed`（subject: `步骤 6 — 结果已处理，通知已发送`）。
