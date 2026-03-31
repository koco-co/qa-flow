# qa-flow v2: Universal QA Automation Skills Suite

## What This Is

qa-flow 是一套基于 Claude Code Skills 的通用 QA 自动化工具套件，面向 QA 工程师提供从需求分析、测试用例生成、WebUI 自动化执行到 Bug 报告全链路的 AI 驱动工作流。当前版本（v1）深度耦合了 DTStack 业务数据和项目结构，v2 将其重构为可在任意项目中开箱即用的通用框架。

## Core Value

让任何 QA 工程师通过 Claude Code 一键初始化项目环境，即可使用完整的测试用例生成、WebUI 自动化、Bug 分析和团队通知能力 —— 无需手动配置或了解框架内部实现。

## Requirements

### Validated

- ✓ PRD 增强（图片解析 + 结构化描述 + 健康度检查）— existing
- ✓ 测试用例生成（多步编排：解析 → 增强 → Writer → Reviewer → XMind）— existing
- ✓ 中间格式 JSON ↔ XMind 双向转换 — existing
- ✓ 历史用例归档转化（CSV/XMind → Markdown）— existing
- ✓ 后端代码分析报告（报错日志 → HTML 报告）— existing
- ✓ 断点续传 + 模块级重跑 — existing
- ✓ 质量阈值自动决策（15%/40% 分档）— existing
- ✓ using-qa-flow 交互式初始化：自动推断项目结构 + 确认 — validated in Phase 3
- ✓ 支持用户上传历史用例文件（CSV/XMind）解析并推断模块/结构 — validated in Phase 3
- ✓ 多迭代版本 / 多产品线场景支持 — validated in Phase 3
- ✓ 重新设计 CLAUDE.md 模板（标准化主编排入口）— validated in Phase 3
- ✓ config.json 模板生成与 re-init 增量更新 — validated in Phase 3

### Active

**通用化重构：**
- [ ] 解耦所有 DTStack 特定业务数据（config、rules、prompts、示例）
- [ ] 重新设计项目目录结构（更合理的层级）
- [ ] 重新设计所有 Skills 内容和规范（使用通用示例数据如电商平台）
- [ ] DTStack 业务数据迁移至独立分支

**WebUI 自动化集成：**
- [ ] Playwright + MCP 集成（脚本生成、调试、执行）
- [ ] 测试用例 MD → UI 自动化脚本生成
- [ ] 脚本执行结果反向补充 MD 用例（双向同步）
- [ ] 执行完成后自动重新生成 XMind（旧文件进回收站）
- [ ] 前端代码分析模板（扩展 code-analysis-report）
- [ ] 失败用例自动生成 Bug 报告（结合源码分析）

**平台 URL 映射：**
- [ ] 分支 → 前端环境 URL 映射配置
- [ ] 无头浏览器模式验证脚本执行

**IM 通知 + 项目管理对接：**
- [ ] 钉钉通知集成
- [ ] 飞书通知集成
- [ ] 企业微信通知集成
- [ ] 邮箱通知集成
- [ ] 禅道 Bug 自动提交 + 指派
- [ ] 通知触发点：Bug 报告 / 用例生成 / 脚本执行完成

**文档重建：**
- [ ] GitHub 风格 README（badges, feature highlights, quick start）
- [ ] CHANGELOG 设计与维护
- [ ] 开源 LICENSE 选择

### Out of Scope

- 移动端自动化测试 — 当前聚焦 WebUI，移动端后续迭代
- 性能测试 / 压力测试 — 超出功能测试范畴
- 自建 Web Dashboard — 通过 Claude Code CLI 交互，不做独立 UI
- API 自动化测试 — 本期聚焦 UI 层功能测试
- CI/CD 集成 — 后续迭代考虑 GitHub Actions / Jenkins

## Context

**现有架构：** Prompt-orchestrated AI workflow system，Claude 作为运行时引擎，Skills 是 Markdown 定义的指令集，Node.js 脚本处理 I/O 操作（格式转换、配置加载），状态通过 JSON 文件持久化。

**技术栈：** JavaScript (ESM) + Node.js v25 + Python 3.10+ (蓝湖 MCP)，无应用框架。

**耦合现状：**
- `config.json` 硬编码了 6 个 DTStack 模块、16 个仓库路径、8 个 Java 包名映射
- Rules/Prompts 中散布 DTStack 特定示例（Doris/Hive/SparkThrift、数据质量、规则集等）
- 目录结构与 DTStack 版本迭代模式绑定（v6.4.x 子目录）

**目标前端：** 已知 DTStack 前端为 React 16 monorepo，但通用化后需支持任意前端框架。

**开源计划：** 计划开源，需要完善的 README、示例和 LICENSE。

## Constraints

- **Tech Stack**: Claude Code Skills + Node.js ESM + Playwright，不引入额外运行时
- **Backward Compat**: DTStack 业务数据移入独立分支，不删除
- **User**: 面向有测试经验的 QA 工程师，通过 Claude Code CLI 使用
- **Branch**: 所有 v2 工作在 `release` 分支进行
- **Examples**: Skills 中的参考数据使用通用场景（如电商平台），不使用真实公司业务数据

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Playwright 作为 UI 自动化框架 | 2025 最流行的 E2E 框架，原生支持多浏览器，与 MCP 集成良好 | — Pending |
| 业务数据移入独立分支而非删除 | 保留历史数据的可追溯性，main 分支保持干净 | — Pending |
| using-qa-flow 采用全自动推断+确认模式 | 降低上手门槛，QA 工程师无需了解内部细节 | Validated in Phase 3 |
| 通用示例使用电商平台数据 | 电商场景普遍易懂，覆盖表单/列表/搜索/详情等常见 UI 模式 | — Pending |
| 开源发布 | 扩大影响力，接受社区反馈 | — Pending |

---
*Last updated: 2026-03-31 after Phase 3 completion*
