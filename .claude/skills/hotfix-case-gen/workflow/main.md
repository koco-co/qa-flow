# hotfix-case-gen · main workflow（E1-E6 完整执行流程）

> 由 SKILL.md 路由后加载。共享的输入校验、确认策略、契约、产物路径定义在 SKILL.md 前段，本文件不重复。

---

## E1. 抓取禅道 Bug 信息

```bash
bun run plugins/zentao/fetch.ts --bug-id {{bug_id}} --project {{project}} --output workspace/{{project}}/.temp/zentao
```

读取输出 JSON，提取：`bug_id`、`title`、`severity`、`fix_branch`、`status`。

若返回 `partial: true`（API 不可达），则跳过 E2，直接用 URL 中的 Bug ID 继续后续步骤。

---

## E2. 源码同步（自动优先，必要时才确认）

根据 fix_branch 是否可用，分两种路径：

**路径 A — fix_branch 已获取（自动引用，不自动写回配置）：**

1. 从 fix_branch 名称中推断仓库（匹配 config.repos 中已有的仓库，或根据分支前缀、Bug 所属产品推断）
2. 直接执行同步，不询问用户：

```bash
bun run .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{fix_branch}}
```

3. 同步完成后输出一行状态信息即可：`源码已同步：{{repo_name}} @ {{fix_branch}}`
4. 若需要把推断出的 repo / branch 持久化到 `.env` 或分支映射，按双门策略的 `writeback` 规则单独确认。

**路径 B — fix_branch 为 null（需要用户确认）：**

通过 AskUserQuestion 工具询问仓库和分支：

确认格式：`确认 [Hotfix 源码同步] 分析 → 目标: [repo_name @ branch] → 来源: [用户提供]`。用户确认后继续。

用户确认后执行同步。若提供了新仓库或分支，仍需先展示写回预览，再单独确认是否持久化到配置。

---

## E3. AI 分析

派发 `hotfix-case-agent`（model: sonnet），传入禅道 Bug 信息和 git diff，由 Agent 独立完成分析并返回 Archive 格式 Markdown。

---

## E4. 输出用例文件

> **约束：直接使用 agent 返回的用例内容写入文件，编排层不得追加、拆分或重写用例。** 若 agent 输出质量不足，应调整 agent 提示词，而非在编排层补救。

文件路径：`workspace/{{project}}/issues/{{YYYYMM}}/hotfix_{{version}}_{{bugId}}-{{summary}}.md`

其中：

- `{{YYYYMM}}`：当前年月，如 `202604`
- `{{version}}`：从 fix_branch 提取版本号（如 `6.4.10`），无法提取时省略该段
- `{{bugId}}`：Bug ID
- `{{summary}}`：Bug 标题前 20 字（去除特殊字符）

```bash
mkdir -p workspace/{{project}}/issues/{{YYYYMM}}
```

---

## E5. 发送通知

```bash
bun run .claude/scripts/plugin-loader.ts notify --event hotfix-case-generated --data '{"bugId":"{{bugId}}","branch":"{{fix_branch}}","file":"{{output_path}}","changedFiles":{{changed_files_json}}}'
```

---

## E6. 完成摘要（状态展示，无需确认）

```
Hotfix 用例生成完成

Bug：#{{bugId}} {{title}}
修复分支：{{fix_branch}}
用例文件：{{output_path}}
```
