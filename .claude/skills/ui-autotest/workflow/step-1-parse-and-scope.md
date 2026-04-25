# ui-autotest · step 1 — 解析输入与确认范围

> 由 SKILL.md 路由后加载。共享协议（确认策略、命令别名、Task schema 等）见 `protocols.md`。

按 Task Schema 更新：创建 6 个主流程任务，将 `步骤 1` 标记为 `in_progress`。

## 1.0 规则预加载

```bash
kata-cli rule-loader load --project {{project}} > .kata/{{project}}/rules-merged.json
```

后续步骤通过此 JSON 传递规则给 sub-agent，不再各自读 `rules/` 目录。

## 1.1 参数提取

从用户输入中提取：

- `md_path`：Archive MD 文件路径（支持功能名模糊匹配 → 在 `workspace/{{project}}/archive/` 下搜索）
- `url`：目标测试 URL（如 `https://www.bing.com/`）
- `env`：环境标识（如 `ltqcdev`、`ci63`）。优先从用户输入提取；若未指定，读取 `ACTIVE_ENV` 环境变量；若仍为空，从 `url` 的域名推断或向用户询问

若 `md_path` 为功能名而非完整路径，在 `workspace/{{project}}/archive/` 中递归搜索匹配的 `.md` 文件。

若 `url` 未提供，向用户询问。

## 1.2 解析用例

```bash
bun run .claude/skills/ui-autotest/scripts/parse-cases.ts --file {{md_path}}
```

解析输出为任务队列 JSON，格式：

```json
{
  "source": "workspace/{{project}}/archive/{{YYYYMM}}/xxx.md",
  "suite_name": "功能名称",
  "tasks": [
    {
      "id": "t1",
      "title": "【P0】验证xxx",
      "priority": "P0",
      "page": "列表页",
      "steps": [{ "step": "进入【xxx】页面", "expected": "页面正常加载" }],
      "preconditions": "前置条件说明"
    }
  ],
  "stats": { "total": 20, "P0": 5, "P1": 10, "P2": 5 }
}
```

其中 `title` 保留 Archive MD 原始 H5 标题（Contract B），`priority` 为从该标题中额外提取出的结构化字段。

## 1.3 执行范围确认

默认行为：

- 若用户输入已明确给出执行范围或优先级，直接采用并继续
- 若未明确，展示配置摘要并让用户选择执行范围

```
🧪 UI 自动化测试配置

环境：{{env}}
目标 URL：{{url}}
用例文件：{{md_path}}
用例总数：{{total}}（P0: {{p0}}, P1: {{p1}}, P2: {{p2}}）
```

仅在需要用户选择范围时，展示：

```
请选择执行范围：
1. 冒烟测试（仅 P0，推荐先跑）
2. 完整测试（P0+P1+P2）
3. 自定义（指定优先级，如：P0,P1）

请输入选项编号（默认 1）：
```

根据用户输入或默认策略确定 `selected_priorities`（默认 `["P0"]`）。

---

按 Task Schema 更新：将 `步骤 1` 标记为 `completed`（subject: `步骤 1 — 解析完成，{{total}} 条用例，{{scope}} 模式`）。
