# 模板选择指南

## 可用模板

| 模板文件                     | 用途                          | 使用场景                          |
| ---------------------------- | ----------------------------- | --------------------------------- |
| `archive.md.hbs`             | Archive Markdown 测试用例文档 | test-case-gen 输出、标准化归档    |
| `bug-report.html.hbs`        | Bug 报告（简版）              | code-analysis 输出、快速 Bug 反馈 |
| `bug-report-full.html.hbs`   | Bug 报告（完整版）            | 包含复现步骤和截图的详细报告      |
| `bug-report-zentao.html.hbs` | 禅道 Bug 报告                 | zentao 插件集成、自动提交 Bug     |
| `conflict-report.html.hbs`   | 需求冲突报告                  | PRD 分析阶段发现矛盾时            |

## 选择规则

1. **测试用例输出** → `archive.md.hbs`
2. **简单 Bug 反馈** → `bug-report.html.hbs`
3. **提交禅道** → `bug-report-zentao.html.hbs`
4. **完整调查报告** → `bug-report-full.html.hbs`
5. **需求矛盾** → `conflict-report.html.hbs`

## 自定义模板

模板使用 Handlebars 语法。可用变量参见各脚本的数据模型定义：

- Archive: `.claude/scripts/lib/types.ts` — `IntermediateJson`
- Bug Report: `.claude/scripts/code-analysis` 输出格式
