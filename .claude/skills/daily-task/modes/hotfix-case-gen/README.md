---
name: hotfix-case-gen
description: "Hotfix 用例生成。粘贴禅道 Bug 链接即触发，自动抓取信息、同步源码、生成简洁验证用例（Archive MD）。触发词：hotfix、线上 bug 验证、分析 bug 链接、禅道 Bug、bug-view-。"
argument-hint: "[禅道 Bug URL | Bug ID]"
---

<role>
你是 hotfix-case-gen 编排技能，负责把禅道 Bug 链接或 Bug ID 转化为一条可执行的 Hotfix Archive MD 验证用例。职责在编排层结束——分析与用例生成由 `hotfix-case-agent` 完成。
</role>

<inputs>
- 禅道 Bug URL（`{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html`）或裸 Bug ID
- `workspace/{{project}}` 输出目录、`config.ts` 配置、只读源码副本（按需同步）
- 用户可选补充：`fix_branch`、`repo_name`
</inputs>

<pre_guard>
<hard_required>输入必须是禅道 Bug URL（含 `bug-view-{{bug_id}}`）或纯数字 Bug ID；否则请求用户提供链接或 ID，禁止进入后续步骤</hard_required>
<soft>`fix_branch` 缺失时通过 AskUserQuestion 补充；全部缺失时进入路径 B（见 E2）</soft>
<invalid_input>链接格式损坏 / 无法解析出 Bug ID → 立即返回输入无效，不进入 agent 派发</invalid_input>
</pre_guard>

<confirmation_policy>
<rule id="status_only">模式识别、分析摘要、报告生成完成仅作状态展示，不要求确认。</rule>
<rule id="no_merge">引用源码 / 执行 repo sync 与写回 `.env` / 分支映射是两道独立门禁，不得合并为一次确认。</rule>
<rule id="reference_sync">Hotfix 模式若已给出 fix_branch，可自动 sync 作为 reference，但不自动写回配置；fix_branch 缺失时需先 AskUserQuestion 确认仓库和分支。</rule>
<rule id="writeback">写回 `.env`、repo branch mapping 或其他配置前，必须单独展示变更预览并再次确认。</rule>
</confirmation_policy>

<output_contract>
<hotfix_artifact>Hotfix 场景输出 Archive Markdown，用于后续验证与归档。</hotfix_artifact>
</output_contract>

## 执行前准备

参见 [`.claude/references/skill-preamble.md`](../../../references/skill-preamble.md)（项目选择、读取配置、符号规则、异常处理通用片段）。

输入解析格式与输出目录约定详见 [`zentao-input.md`](zentao-input.md)。

## 规则加载（强制）

派发 `hotfix-case-agent` 前，必须合并加载全局 + 项目级规则：

```bash
kata-cli rule-loader load --project {{project}} > workspace/{{project}}/.temp/rules-merged.json
# 查看参数：kata-cli rule-loader load --help
```

在传入 agent 的提示中明确引用以下规则文件（存在即加载，优先级：项目级 > 全局）：

- `rules/case-writing.md` / `workspace/{{project}}/rules/case-writing.md` — 用例编写通用规范
- `workspace/{{project}}/rules/hotfix-frontmatter.md` — Hotfix frontmatter 约束（如 `keywords` 字段）
- `workspace/{{project}}/rules/hotfix-prerequisites.md` — **Hotfix 前置条件 SQL 示例约束**
- `.claude/references/unicode-symbols.md` — 符号规范

<precedence>
用户当前指令 > 项目级 rules（workspace/{{project}}/rules/） > 全局 rules/ > agent 内置模板
</precedence>

---

## 工作流总览

| 步骤 | 名称              | 职责                                                |
| ---- | ----------------- | --------------------------------------------------- |
| E1   | 抓取禅道 Bug 信息 | 调 zentao 插件，解析 bug_id/title/fix_branch 等     |
| E2   | 源码同步          | fix_branch 自动同步（路径 A）/ 缺失时确认（路径 B） |
| E3   | AI 分析           | 派发 `hotfix-case-agent`，返回 Archive Markdown     |
| E4   | 输出用例文件      | 写入 `workspace/{{project}}/issues/YYYYMM/`         |
| E5   | 发送通知          | 触发 plugin-loader notify 事件                      |
| E6   | 完成摘要          | 状态展示，无需确认                                  |

完整执行细节详见 [`main.md`](main.md)。
