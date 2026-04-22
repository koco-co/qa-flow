# knowledge-keeper · 写入场景与维护

> 由 SKILL.md 路由后加载。共享的前置加载、知识层级、CLI 命令总览在 SKILL.md 中定义，本文件不重复。

---

## B1. 写入流程（所有 type 通用）

1. **识别触发词 + 解析意图**
   - "记一下 X 是 Y" → type=term，confidence=high
   - "项目的 XX 模块有 YY 规则" → type=module
   - "XX 概览是..." → type=overview
   - "踩坑：ZZ" → type=pitfall

2. **判断置信度**
   - 用户显式"记一下" / 提供完整信息 → high
   - 从源码/PRD 提炼推断 → medium
   - 信息不足 → 走 low 升级流程（见 B3）

3. **构造 content JSON**（按 type）：

   ```json
   // type=term: { "term": "...", "zh": "...", "desc": "...", "alias": "" }
   // type=overview: { "section": "...", "body": "...", "mode": "append"|"replace" }
   // type=module/pitfall: { "name": "kebab-case", "title": "...", "tags": ["..."], "body": "...", "source": "" }
   ```

4. **冲突检测（强制）**：

   ```bash
   bun run .claude/scripts/knowledge-keeper.ts verify \
     --project {{project}} --type {{type}} --content '{{json}}'
   ```

   - 退出码 0：无冲突，继续 step 5
   - 退出码 2：**block 级冲突** → 转 B5 冲突仲裁流程
   - warn 级：在 dry-run 输出中提示，用户确认后可继续

5. **dry-run 预览**：

   ```bash
   bun run .claude/scripts/knowledge-keeper.ts write \
     --project {{project}} --type {{type}} \
     --content '{{json}}' --confidence {{conf}} --dry-run
   ```

6. **展示 before/after + 置信度分流**：
   - `confidence=high`：跳过 AskUser，直接真实写入
   - `confidence=medium`：AskUserQuestion 确认后带 `--confirmed` 真写

7. **真实写入**（自动生成快照 + 审计条目）：

   ```bash
   bun run .claude/scripts/knowledge-keeper.ts write \
     --project {{project}} --type {{type}} \
     --content '{{json}}' --confidence {{conf}} --confirmed
   ```

8. **展示结果摘要**：
   ```
   已写入 knowledge/{{path}}
   快照: .history/{{snapshot}}（可用 rollback 回滚）
   _index.md 已自动刷新
   ```

---

## B2. 覆盖已有 module/pitfall

CLI 默认拒绝覆盖。选择：

- **走 update**（推荐）：使用 `update` 命令精细改 frontmatter / body
- **强制覆盖**：加 `--overwrite` flag（同时需要 `--confirmed`）

---

## B3. low 置信度升级流程

当主 agent 判断置信度为 low 时（信息不足/推断性结论），使用 AskUserQuestion：

```
该知识条目证据不足（low 置信度），需补充信息升级为 medium 再写入。

推断内容：{{content_summary}}
推断依据：{{source_or_reasoning}}

选项：[补充证据] [直接升级为 medium 并确认] [放弃]
```

用户选择后视为 medium 继续 B1 流程。

---

## B4. medium 置信度 AskUser 模板

```
检测到新的业务知识条目（置信度：medium）

类型：{{type}}
目标：workspace/{{project}}/knowledge/{{path}}
标题：{{title}}
标签：{{tags}}
证据：{{source}}

【内容预览】
{{body 前 200 字}}...

选项：[确认写入] [调整内容] [更换路径] [跳过]
```

---

## B5. 冲突仲裁流程（verify 返回 block）

当 step 4 `verify` 检测到 block 级冲突时，**禁止**直接 `--force` 写入。走以下流程：

1. **展示冲突摘要** — 直接把 CLI 返回的 `conflict` 块给用户看：

   ```
   检测到知识冲突（severity=block, type={{type}}）
   原因：{{reason}}
   已有：{{existing}}
   新增：{{incoming}}
   ```

2. **AskUserQuestion 仲裁**（四选一）：

   | 选项 | 动作 |
   | --- | --- |
   | 保留旧版 | 跳过本次写入 |
   | 用新版覆盖 | 加 `--force` 重新 write |
   | 合并 | 走 update 精细改（patch 模式） |
   | 先回滚上一个版本 | 调 rollback，再决定 |

3. **写入前强制记录证据**：若用户选"用新版覆盖"，在 audit 条目中 `forced=true` 会自动记录，便于事后追溯。

---

## C1. 刷新 \_index.md

```bash
bun run .claude/scripts/knowledge-keeper.ts index --project {{project}}
```

通常 write/update 会自动刷新；用户手改或导入后需显式触发。

---

## C2. 健康检查

```bash
bun run .claude/scripts/knowledge-keeper.ts lint --project {{project}}
```

返回 `errors` + `warnings`。exit 0 = 健康 / exit 1 = 有 error / exit 2 = 仅 warning。

`--strict` 将 warning 升级为 error。

---

## C3. 历史查询 + 回滚

```bash
# 查看最近 N 条写入/更新/回滚记录
bun run .claude/scripts/knowledge-keeper.ts history --project {{project}} --limit 20

# 回滚到指定 index（省略 --index 即回滚最近一条）
bun run .claude/scripts/knowledge-keeper.ts rollback --project {{project}} \
  --index {{N}} --dry-run
bun run .claude/scripts/knowledge-keeper.ts rollback --project {{project}} \
  --index {{N}} --confirmed
```

**何时使用：**
- 发现最近沉淀的知识是错的（事后察觉、同事反馈、业务变更）
- 冲突仲裁时用户选"先回滚上一个版本"
- rollback 本身也会生成新的快照（当前版本自动存档），可再次回滚

**审计字段解读：**
- `forced: true` — 曾用 `--force` 绕过冲突，重点核查对象
- `confidence: low/medium` — 置信度低的条目，更可能需要回滚

---

## Subagent 调用守则

- subagent **禁止**直接调 `write` / `update`
- subagent 发现需沉淀知识时，在返回报告中标注：
  `建议沉淀：{{type}} / {{content 摘要}} / 置信度 {{conf}}`
- 主 agent 收到后由本 skill 统一处理写入流程
- subagent 可自由调 `read-core` / `read-module` / `read-pitfall`（只读安全）
