# bug-report · rendering（HTML 渲染与通知）

> 由 SKILL.md 路由后加载。共享的输入校验、确认策略、契约定义在 SKILL.md 前段，本文件不重复。

---

## 1. 渲染 HTML 报告

将后端 / 前端 agent 返回的 JSON 数据写入 `workspace/{{project}}/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

可用模板（位于 `templates/` 目录）：

- `bug-report-zentao.html.hbs` — **默认**，禅道富文本编辑器兼容（全 inline style，table 布局，可直接粘贴到禅道）
- `bug-report-full.html.hbs` — 完整样式版，独立 HTML 查看，含 CSS 变量、渐变、flexbox 等高级样式
- `bug-report.html.hbs` — 旧版模板（保留兼容）

默认使用禅道兼容模板。用户可通过 `--template full` 参数切换为完整样式版。

若目录不存在则先创建：

```bash
mkdir -p workspace/{{project}}/reports/bugs/{{YYYYMMDD}}
```

---

## 2. 发送通知

```bash
kata-cli plugin-loader notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
```

---

## 3. 完成摘要（状态展示，无需确认）

```
Bug 分析完成

报告：{{report_path}}
根因：{{root_cause_summary}}
```

---

## 输出目录约定

| 类型                  | 目录                                           |
| --------------------- | ---------------------------------------------- |
| Bug 报告（后端/前端） | `workspace/{{project}}/reports/bugs/YYYYMMDD/` |
| 临时文件              | `workspace/{{project}}/.temp/`                 |
