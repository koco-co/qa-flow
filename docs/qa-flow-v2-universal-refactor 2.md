# qa-flow v2: 通用 QA 自动化 Skills 套件 — 需求文档

> 日期：2026-03-31 | 分支：release | 状态：approved

---

## 1. 背景与目标

qa-flow v1 是一套基于 Claude Code Skills 的 QA 自动化工具，涵盖 PRD 增强、测试用例生成、XMind/Markdown 归档、代码分析报告等能力。但 v1 深度耦合了 DTStack 的业务数据（模块定义、仓库路径、Java 包名映射、Doris/Hive 等数据源示例），导致无法直接复用到其他项目。

**v2 目标：** 将 qa-flow 重构为通用框架，任何 QA 工程师通过 Claude Code 一键初始化即可使用。同时新增 IM 通知能力，并为后续 Playwright WebUI 自动化和禅道集成打好基础。

---

## 2. 目标用户

有测试经验的 **QA 工程师**，通过 **Claude Code CLI** 使用本工具。

---

## 3. 核心需求

### 3.1 通用化重构（Phase 1）

| ID | 需求 | 优先级 |
|----|------|--------|
| GEN-01 | Config schema 解耦 — 移除所有 DTStack 硬编码，引入 JSON Schema 验证 | P0 |
| GEN-02 | loadConfig() 添加 schema 验证 — 缺失字段给出明确错误 | P0 |
| GEN-03 | Rules 文件通用化 — 替换为电商平台等通用示例 | P0 |
| GEN-04 | Prompts/Steps 通用化 — 移除 Doris/Hive/SparkThrift 等引用 | P0 |
| GEN-05 | 中间 JSON schema 通用化 — 移除 DTStack 特定字段 | P0 |
| GEN-06 | DTStack 业务数据迁移至 dtstack-data 分支 | P0 |

### 3.2 项目结构重构（Phase 2）

| ID | 需求 | 优先级 |
|----|------|--------|
| STRU-01 | 重新设计项目目录结构 — 更合理的层级，支持任意项目 | P0 |
| STRU-02 | 共享脚本重构 — 适配新 config schema | P0 |
| STRU-03 | 测试套件更新 — 适配新结构 | P0 |

### 3.3 初始化向导（Phase 3）

| ID | 需求 | 优先级 |
|----|------|--------|
| INIT-01 | 交互式初始化 — 全自动推断项目结构 + 确认 | P0 |
| INIT-02 | 历史用例文件上传解析 — CSV/XMind，推断模块和层级 | P1 |
| INIT-03 | 多迭代版本 / 多产品线场景支持 | P1 |
| INIT-04 | CLAUDE.md 标准化模板生成 | P0 |
| INIT-05 | config.json 模板生成 | P0 |

### 3.4 Skills 重新设计（Phase 4）

| ID | 需求 | 优先级 |
|----|------|--------|
| SKIL-01 | test-case-generator 通用化编排 | P0 |
| SKIL-02 | prd-enhancer 通用化 | P0 |
| SKIL-03 | code-analysis-report 扩展前端分析模板 | P1 |
| SKIL-04 | xmind-converter 通用化 | P0 |
| SKIL-05 | archive-converter 通用化 | P0 |
| SKIL-06 | using-qa-flow 整合初始化 + 菜单 | P0 |

### 3.5 IM 通知集成（Phase 5）

| ID | 需求 | 优先级 |
|----|------|--------|
| NOTF-01 | 统一 notify.mjs 通知模块 — 单一入口，多渠道分发 | P0 |
| NOTF-02 | 钉钉 webhook 通知（含安全关键词） | P0 |
| NOTF-03 | 飞书 webhook 通知 | P0 |
| NOTF-04 | 企业微信 webhook 通知 | P0 |
| NOTF-05 | 邮箱通知（nodemailer） | P1 |
| NOTF-06 | 通知触发点集成 | P0 |
| NOTF-07 | .env 配置模板 | P0 |

### 3.6 文档重建（Phase 6）

| ID | 需求 | 优先级 |
|----|------|--------|
| DOCS-01 | GitHub 风格 README（badges, quick start, architecture） | P0 |
| DOCS-02 | CHANGELOG 设计与初始内容 | P1 |
| DOCS-03 | 开源 LICENSE（MIT） | P0 |

---

## 4. v2 延期需求

以下需求已确认延后到 v2 迭代：

| 领域 | 需求 | 延期原因 |
|------|------|---------|
| WebUI 自动化 | Playwright CLI 集成、MD↔脚本双向同步、无头浏览器验证 | 复杂度高，依赖通用化完成 |
| 平台 URL 映射 | 分支→环境 URL 映射 | 依赖 Playwright 集成 |
| 项目管理 | 禅道 REST API Bug 提交、自动指派 | 依赖 IM 验证集成模型 |

---

## 5. 技术决策

| 决策 | 理由 |
|------|------|
| Playwright CLI 优于 MCP | 节省 4x token 消耗（27K vs 114K/session） |
| IM 通知使用原生 webhook | 钉钉/飞书/企微均支持 HTTPS POST，无需额外 SDK |
| 唯一新 npm 依赖：nodemailer | 邮箱通知需要 SMTP 客户端 |
| 禅道直连 REST API | node-zentao 已废弃，直接用 fetch |
| 通用示例使用电商平台 | 覆盖表单/列表/搜索/详情等常见 UI 模式 |

---

## 6. 约束

- 所有工作在 `release` 分支进行
- DTStack 数据移入 `dtstack-data` 分支，不删除
- 不引入额外运行时（保持 Node.js ESM + Python venv）
- Skills 示例数据不使用真实公司业务数据
- 计划开源，需完善的 README 和 LICENSE

---

## 7. 路线图

```
Phase 1: Generalization Refactor (GEN-01~06)
    ↓
Phase 2: Project Structure + Shared Scripts (STRU-01~03)
    ↓
Phase 3: Init Wizard (INIT-01~05)
    ↓
Phase 4: Core Skills Redesign (SKIL-01~06)
    ↓
Phase 5: IM Notification Integration (NOTF-01~07)
    ↓
Phase 6: Documentation (DOCS-01~03)
```

详细路线图见 `.planning/ROADMAP.md`，研究报告见 `.planning/research/`。

---

## 8. 参考资料

- `.planning/PROJECT.md` — 项目上下文
- `.planning/REQUIREMENTS.md` — 完整需求列表（30 条 v1 + 10 条 v2）
- `.planning/research/SUMMARY.md` — 领域研究综合报告
- `.planning/codebase/` — 代码库分析文档（7 份）
