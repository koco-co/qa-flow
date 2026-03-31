# Requirements: qa-flow v2

**Defined:** 2026-03-31
**Core Value:** 让任何 QA 工程师通过 Claude Code 一键初始化项目环境，即可使用完整的测试用例生成、Bug 分析和团队通知能力

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Generalization

- [ ] **GEN-01**: Config schema 解耦 — 移除所有 DTStack 硬编码，引入 JSON Schema 验证
- [ ] **GEN-02**: loadConfig() 添加 schema 验证 — 缺失字段给出明确错误而非中途崩溃
- [x] **GEN-03**: 所有 Rules 文件通用化 — 移除 DTStack 特定示例，替换为电商平台等通用场景
- [ ] **GEN-04**: 所有 Prompts/Steps 通用化 — 移除 Doris/Hive/SparkThrift 等业务数据引用
- [ ] **GEN-05**: 中间 JSON schema 通用化 — 移除 DTStack 特定字段，保持格式稳定
- [ ] **GEN-06**: DTStack 业务数据迁移至 dtstack-data 分支

### Initialization

- [ ] **INIT-01**: using-qa-flow 交互式初始化 — 全自动推断项目结构 + 确认
- [ ] **INIT-02**: 历史用例文件上传解析 — 支持 CSV/XMind 格式，推断模块和层级
- [ ] **INIT-03**: 多迭代版本 / 多产品线场景支持
- [ ] **INIT-04**: CLAUDE.md 标准化模板生成 — 初始化时自动创建，规范化主编排入口
- [ ] **INIT-05**: config.json 模板生成 — 根据推断结果生成项目配置

### Skills Redesign

- [ ] **SKIL-01**: test-case-generator 重新设计 — 通用化编排流程，去除业务耦合
- [ ] **SKIL-02**: prd-enhancer 重新设计 — 通用化图片解析和健康度检查逻辑
- [ ] **SKIL-03**: code-analysis-report 重新设计 — 支持前端代码分析模板（扩展现有后端模板）
- [ ] **SKIL-04**: xmind-converter 重新设计 — 通用化 Root 节点格式和路径逻辑
- [ ] **SKIL-05**: archive-converter 重新设计 — 通用化转换规则和目录映射
- [ ] **SKIL-06**: using-qa-flow 重新设计 — 整合初始化流程 + 功能菜单

### Project Structure

- [ ] **STRU-01**: 重新设计项目目录结构 — 更合理的层级，支持任意项目适配
- [ ] **STRU-02**: 共享脚本重构 — load-config.mjs 等脚本适配新 config schema
- [ ] **STRU-03**: 测试套件更新 — 适配新结构的单元测试

### IM Notification

- [ ] **NOTF-01**: 统一 notify.mjs 通知模块 — 单一入口，多渠道分发
- [ ] **NOTF-02**: 钉钉 webhook 通知 — 支持安全关键词配置
- [ ] **NOTF-03**: 飞书 webhook 通知
- [ ] **NOTF-04**: 企业微信 webhook 通知
- [ ] **NOTF-05**: 邮箱通知 — 使用 nodemailer
- [ ] **NOTF-06**: 通知触发点集成 — Bug 报告 / 用例生成 / 脚本执行完成后自动触发
- [ ] **NOTF-07**: .env 配置模板 — 各渠道 webhook URL / SMTP 配置

### Documentation

- [ ] **DOCS-01**: GitHub 风格 README — badges, feature highlights, quick start, architecture diagram
- [ ] **DOCS-02**: CHANGELOG 设计与初始内容
- [ ] **DOCS-03**: 开源 LICENSE 选择与添加（建议 MIT）

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### WebUI Automation

- **AUTO-01**: Playwright CLI 集成 — 脚本生成、调试、执行
- **AUTO-02**: MD 用例 → Playwright 脚本自动生成
- **AUTO-03**: 脚本执行结果反向补充 MD 用例（双向同步）
- **AUTO-04**: 执行完成后自动重新生成 XMind
- **AUTO-05**: 分支 → 前端环境 URL 映射配置
- **AUTO-06**: 无头浏览器模式验证
- **AUTO-07**: 失败用例自动生成 Bug 报告（结合源码分析）

### Project Management

- **PROJ-01**: 禅道 REST API Bug 自动提交
- **PROJ-02**: Bug 自动指派给负责人
- **PROJ-03**: Jira 集成（可选）

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web Dashboard / Admin UI | CLI-native 工具，输出文件即 UI |
| 用户账号和 RBAC | 无服务端，多用户通过 git 协作 |
| API 自动化测试 | 不同领域，超出 UI 功能测试范畴 |
| 移动端自动化 | WebUI 稳定后的后续迭代 |
| 性能/压力测试 | 超出功能测试范畴 |
| AI 自愈测试选择器 | 增加不确定性，Playwright 内置足够 |
| SaaS / 订阅服务 | 开源项目，不做商业化 |
| CI/CD 集成 | 后续迭代考虑 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GEN-01 | Phase 1 | Pending |
| GEN-02 | Phase 1 | Pending |
| GEN-03 | Phase 1 | Complete |
| GEN-04 | Phase 1 | Pending |
| GEN-05 | Phase 1 | Pending |
| GEN-06 | Phase 1 | Pending |
| STRU-01 | Phase 2 | Pending |
| STRU-02 | Phase 2 | Pending |
| STRU-03 | Phase 2 | Pending |
| INIT-01 | Phase 3 | Pending |
| INIT-02 | Phase 3 | Pending |
| INIT-03 | Phase 3 | Pending |
| INIT-04 | Phase 3 | Pending |
| INIT-05 | Phase 3 | Pending |
| SKIL-01 | Phase 4 | Pending |
| SKIL-02 | Phase 4 | Pending |
| SKIL-03 | Phase 4 | Pending |
| SKIL-04 | Phase 4 | Pending |
| SKIL-05 | Phase 4 | Pending |
| SKIL-06 | Phase 4 | Pending |
| NOTF-01 | Phase 5 | Pending |
| NOTF-02 | Phase 5 | Pending |
| NOTF-03 | Phase 5 | Pending |
| NOTF-04 | Phase 5 | Pending |
| NOTF-05 | Phase 5 | Pending |
| NOTF-06 | Phase 5 | Pending |
| NOTF-07 | Phase 5 | Pending |
| DOCS-01 | Phase 6 | Pending |
| DOCS-02 | Phase 6 | Pending |
| DOCS-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
