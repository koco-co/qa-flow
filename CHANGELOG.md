# Changelog

All notable changes to `qa-flow` will be documented in this file.

The format follows a GitHub-friendly Markdown style inspired by Keep a Changelog.

## [Unreleased]

### Added

- **Harness Runtime Protocol（Phase 1）**
  - `harness-step-resolver.mjs`：步骤解析器，从 workflow JSON 实时计算下一步、跳过条件、依赖关系
  - `harness-state-machine.mjs`：状态机，管理 `.qa-state.json` 生命周期（init / advance / fail / set-writer / query）
  - `load-config.mjs` 新增三个导出：`resolveStepDelegate`、`getWorkflowStepOrder`（拓扑排序）、`evaluateStepConditions`
  - `test-harness-runtime.mjs`：75 项运行时测试（全部通过）
- **SKILL.md 重构（Phase 2）**
  - `test-case-generator/SKILL.md` 从 595 行精简为 ~130 行 Harness Protocol 绑定文件
  - 新建 9 个 per-step prompt 文件（`prompts/step-*.md`），逐字提取各步骤指导内容
  - 保留备份 `SKILL.md.bak`
- **Archive 格式标准化（Phase 3）**
  - `json-to-archive-md.mjs`：修复 `formatCaseFromXmind` 始终输出 Format C 表格（步骤为空时输出占位行）
  - `split-archive.mjs`：新建 Archive 拆分工具，按 `##` heading 拆分大文件，支持 `--dry-run`，自动推导版本目录
- **工作流优化（Phase 4）**
  - `hooks.json`：新增 `auto-confirm` 和 `module-specified` 两个 conditions
  - `test-case-generation.json`：`notify` 步骤新增 `skippableWhen: ["auto-confirm"]`
  - `repo-branch-mapping.yaml`：扩展覆盖全部 5 个 DTStack 模块（batch-works、data-query、variable-center、public-service）
  - `output-naming-contracts.mjs`：新增 `auditArchiveDirectory` 函数，检测中文目录名、缺 `v` 前缀版本目录、超大文件无拆分版本
- **README.md 全面重写（Phase 5）**
  - 新增用户视角极简流程图（输入 → 底层处理 → 快捷链接 → 验收）
  - 新增 Harness 5 层架构图（mermaid）
  - 更新测试用例生成详细流程图（含 Harness Protocol 循环节点）
  - 新增状态续传图、代码分析流程图
  - 新增 Harness 工程参考（添加 workflow/delegate/hook 操作指南 + 步骤字段说明）

### Fixed

- `json-to-xmind.mjs`：修复多 JSON 输入时 `mergeJsonFiles` 丢失每条需求 meta，导致只生成 1 个 L1 节点的 bug
- `harness-state-machine.mjs`：修复 `--init` 时状态文件已存在但为空（mktemp 创建）时的 JSON 解析异常
- `harness-step-resolver.mjs`：修复 `deriveCompletedSets` 使用 JSON 数组顺序而非拓扑排序，导致 quick-mode 续传计算错误的 bug
- `latest-output.xmind` 符号链接：修复指向大小写不匹配的旧文件名（`v` vs `V`）

### Removed

- 清理空测试目录 `cases/archive/custom/xyzh/vtest-35566-1774694175473`
- 删除过期的设计文档（已完成实施）

### Changed


- Normalized hidden source repository paths from `repos/` references to `.repos/` across config, workflow docs, and agent contracts.
- Renamed the integrated Lanhu runtime directory contract from `vendor/lanhu-mcp/` to `tools/lanhu-mcp/`.
- Renamed the Lanhu integration config field from `vendorPath` to `runtimePath` to better match the new directory semantics.
- Split DTStack and XYZH/custom workflow standards explicitly across `README.md`, `CLAUDE.md`, rules, Skills, and agent contracts.
- Added a root-level `repo-branch-mapping.yaml` contract so QA can maintain DTStack repo profiles and development-version-to-branch mappings.
- Inserted DTStack-only `source-sync` and `prd-formalizer` stages into the test-case workflow control plane before PRD enhancement.
- Updated DTStack archive routing to support semantic-version folders such as `cases/archive/data-assets/v6.4.10/` and requirement-title-first filenames.
- Updated DTStack XMind rendering to emit sample-style root/L1 metadata (`<项目><版本>迭代用例`, requirement ticket, labels, folded L1).

### Fixed

- Updated Lanhu runtime scripts and related tests to resolve paths from the new `tools/lanhu-mcp/` contract.
- Fixed Copilot MCP configuration examples to use explicit HTTP transport metadata.
- Fixed workflow validation coverage to read repo-facing docs from the current repository state instead of a deleted legacy doc path.

### Docs

- Refreshed `README.md`, `CLAUDE.md`, repository safety rules, and Lanhu integration documentation to match the current `qa-flow` layout.
- Added DTStack-specific guidance for source-aware PRD formalization, stricter preconditions/steps, versioned archive output, and sample-driven XMind output.
