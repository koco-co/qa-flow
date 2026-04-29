# 模板选择指南

## 可用模板

| 模板文件                     | 用途                          | 使用场景                                 |
| ---------------------------- | ----------------------------- | ---------------------------------------- |
| `archive.md.hbs`             | Archive Markdown 测试用例文档 | test-case-gen 输出、标准化归档           |
| `bug-report.html.hbs`        | Bug 报告（简版）              | bug-report 输出、快速 Bug 反馈           |
| `bug-report-full.html.hbs`   | Bug 报告（完整版）            | 包含复现步骤和截图的详细报告             |
| `bug-report-zentao.html.hbs` | 禅道 Bug 报告                 | zentao 插件集成、自动提交 Bug            |
| `conflict-report.html.hbs`   | 合并冲突报告                  | PRD 分析阶段发现矛盾时                   |
| `scan-report.html.hbs`       | 静态扫描报告                  | static-scan skill 输出、提测分支扫描产物 |

## 选择规则

1. **测试用例输出** → `archive.md.hbs`
2. ** Bug 反馈** → `bug-report.html.hbs`
3. **提交禅道** → `bug-report-zentao.html.hbs`
4. **完整调查报告** → `bug-report-full.html.hbs`
5. **合并冲突** → `conflict-report.html.hbs`
6. **静态扫描报告** → `scan-report.html.hbs`

## 自定义模板

模板使用 Handlebars 语法。可用变量参见各脚本的数据模型定义：

- Archive: `engine/lib/types.ts` — `IntermediateJson`
- Bug Report: bug-report / hotfix-case-gen skill 派发的 agent 输出 JSON 结构
- Scan Report: `engine/lib/scan-report-types.ts` — `AuditMeta` / `ScanReport` / `Bug`
