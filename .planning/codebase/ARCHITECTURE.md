# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Prompt-orchestrated AI workflow system (not a traditional application)

**Key Characteristics:**
- Claude AI is the runtime engine; there is no application server or main process
- Skills are markdown-defined instruction sets that Claude interprets and executes
- Node.js scripts handle deterministic I/O operations (file format conversion, symlink management, config loading)
- State is persisted in JSON files on disk; all coordination happens through file reads/writes
- The system is driven entirely by user natural language instructions interpreted by Claude via CLAUDE.md and Skill files

## Layers

**Orchestration Layer (Claude Instructions):**
- Purpose: Define workflows, step sequences, branching logic, and execution protocols
- Location: `.claude/skills/*/SKILL.md` and `.claude/skills/*/prompts/step-*.md`
- Contains: Step definitions, mode switches (normal/quick/resume), sub-agent spawning instructions, quality thresholds
- Depends on: Configuration layer, rules layer
- Used by: Claude AI runtime

**Configuration Layer:**
- Purpose: Central source of truth for module keys, output paths, repo mappings, integration endpoints
- Location: `.claude/config.json`
- Contains: Module definitions (key, zh label, type, xmind/archive/requirements paths), repo paths, stack-trace-to-repo mappings, shortcut links, integration configs
- Depends on: Nothing (leaf node)
- Used by: All scripts, all skills, all rules

**Rules Layer:**
- Purpose: Prescriptive writing rules and naming contracts enforced across all skills
- Location: `.claude/rules/*.md` (global), `.claude/skills/*/rules/*.md` (skill-local)
- Contains: Test case writing rules, XMind output naming contracts, archive format templates, directory naming conventions, image handling rules, repo safety rules
- Depends on: Nothing
- Used by: Writer/Reviewer sub-agents, skill orchestrators

**Shared Scripts Layer:**
- Purpose: Deterministic file operations that Claude cannot or should not perform inline
- Location: `.claude/shared/scripts/*.mjs`
- Contains: Config loader (`load-config.mjs`), symlink manager (`latest-link-utils.mjs`), archive index builder (`build-archive-index.mjs`), frontmatter utilities (`front-matter-utils.mjs`), output naming contracts (`output-naming-contracts.mjs`), MD normalization (`normalize-md-content.mjs`), auditing (`audit-md-frontmatter.mjs`)
- Depends on: `jszip` (via npm); configuration layer via `load-config.mjs`
- Used by: Skill scripts, tests

**Skill Scripts Layer:**
- Purpose: Format-specific conversion and manipulation scripts
- Location: `.claude/skills/xmind-converter/scripts/*.mjs`, `.claude/skills/archive-converter/scripts/*.mjs`
- Contains: JSON→XMind converter (`json-to-xmind.mjs`), XMind root patcher (`patch-xmind-roots.mjs`), Archive MD generators (`json-to-archive-md.mjs`, `backfill-archive-frontmatter.mjs`), history converters (`convert-history-cases.mjs`)
- Depends on: `jszip`, `xmind-generator` (npm); shared scripts layer
- Used by: Skill orchestrators (Claude invokes via `node <script> <args>`)

**Data Layer (Cases):**
- Purpose: Persistent storage for all workflow inputs and outputs
- Location: `cases/` (requirements, xmind, archive), `assets/images/`, `reports/`
- Contains: PRD markdown files, `.qa-state-*.json` state files, `.xmind` outputs, archive markdown files, temporary JSON intermediate files in `temp/` subdirectories

## Data Flow

**Primary Flow — Test Case Generation:**

1. User triggers via natural language ("为 Story-xxx 生成测试用例")
2. `parse-input` step reads/creates `.qa-state-{prd-slug}.json` in the PRD's working directory
3. `req-elicit` step augments the raw PRD with clarification results
4. `source-sync` step pulls the correct branch from `.repos/` read-only source repos
5. `prd-formalize` step restructures raw PRD into canonical form (DTStack only)
6. `prd-enhancer` step reads images multimodally, inserts AI descriptions, writes enhanced `.md` file, moves originals to `.trash/`
7. `brainstorm` step queries `cases/archive/INDEX.json` for historical test cases, performs decoupling analysis
8. `checklist` step outputs lightweight checklist JSON for user confirmation
9. `writer` step spawns parallel sub-agents; each outputs a `temp/<module>.json` file using the intermediate JSON schema defined in `references/intermediate-format.md`
10. `reviewer` step merges JSON outputs, applies quality thresholds (15%/40% abort), produces `final_json`
11. `xmind` step calls `node json-to-xmind.mjs <input.json> <output.xmind>`; updates `latest-output.xmind` symlink via `refresh-latest-link.mjs`
12. `archive` step calls `node json-to-archive-md.mjs` to produce versioned archive markdown
13. `notify` step cleans up `temp/` and state file after user verification

**State Persistence Flow:**

- Single-PRD: `.qa-state-{prd-slug}.json` in `cases/requirements/<module>/v{version}/`
- Batch: `.qa-state.json` in the same directory
- Each step writes `last_completed_step` as a string step ID; resume logic reads this to skip completed steps
- `awaiting_verification: true` parks the workflow until user confirms, preventing re-execution of archive step

**Intermediate Data Format:**

- All test case data flows through the JSON schema in `.claude/skills/test-case-generator/references/intermediate-format.md`
- Structure: `meta{}` + `modules[{name, pages[{name, sub_groups[{name, test_cases[]}]}]}]`
- `meta.module_key` and `meta.prd_version` drive output directory routing in both xmind-converter and archive scripts

## Key Abstractions

**Skill:**
- Purpose: A named, self-contained workflow definition that Claude interprets as a program
- Examples: `.claude/skills/test-case-generator/SKILL.md`, `.claude/skills/xmind-converter/SKILL.md`, `.claude/skills/prd-enhancer/SKILL.md`
- Pattern: YAML frontmatter with `name` and `description` triggers; body defines step sequence, modes, and references to sub-prompt files

**Step Prompt:**
- Purpose: Detailed per-step instructions for the orchestrating Claude instance
- Examples: `.claude/skills/test-case-generator/prompts/step-parse-input.md`, `step-xmind.md`, `step-archive.md`
- Pattern: Loaded on-demand by step ID; contains decision logic, output contracts, error handling

**Sub-agent Prompt:**
- Purpose: Isolated instructions for Writer or Reviewer Claude instances spawned in parallel
- Examples: `.claude/skills/test-case-generator/prompts/writer-subagent.md`, `reviewer-subagent.md`
- Pattern: Self-contained; receives pre-extracted source code context from orchestrator; outputs strictly-typed JSON

**Module Key:**
- Purpose: Stable identifier linking a product module to its file system paths in config
- Examples: `data-assets`, `batch-works`, `xyzh`
- Pattern: Defined in `.claude/config.json` under `modules`; used as directory segment, state file field, and routing key in all scripts

**Intermediate JSON:**
- Purpose: Language-agnostic exchange format between Writer agents, Reviewer, XMind converter, and Archive converter
- Examples: `cases/requirements/data-assets/v6.4.10/temp/list.json`
- Pattern: `meta` block + `modules` array; defined in `references/intermediate-format.md`; versioned by `meta.prd_version`

## Entry Points

**Test Case Generation:**
- Location: `.claude/skills/test-case-generator/SKILL.md`
- Triggers: "生成测试用例", "为 Story-xxx", "--quick", "继续 Story-xxx", lanhuapp.com URL
- Responsibilities: Orchestrate full 11-step pipeline with state checkpointing

**PRD Enhancement:**
- Location: `.claude/skills/prd-enhancer/SKILL.md`
- Triggers: "增强 PRD", "帮我增强这个 PRD", "PRD 预处理"
- Responsibilities: Image multimodal analysis, format standardization, health check report

**XMind Conversion:**
- Location: `.claude/skills/xmind-converter/SKILL.md`
- Triggers: "转换为 XMind", "生成 XMind 文件", called by test-case-generator step 9
- Responsibilities: JSON → .xmind conversion via `json-to-xmind.mjs`; new/append/replace modes

**Archive Conversion:**
- Location: `.claude/skills/archive-converter/SKILL.md`
- Triggers: "转化历史用例", called by test-case-generator step 10
- Responsibilities: XMind or CSV → versioned Archive markdown files

**Menu / Init:**
- Location: `.claude/skills/using-qa-flow/`
- Triggers: `/using-qa-flow`, `/using-qa-flow init`
- Responsibilities: Display feature menu, initialize environment (lanhu-mcp setup, repo checkout)

**Code Analysis Report:**
- Location: `.claude/skills/code-analysis-report/`
- Triggers: "帮我分析这个报错"
- Responsibilities: Stack trace → HTML analysis report; repo auto-fetch via `stackTrace` config mapping

## Error Handling

**Strategy:** Multi-tier; script errors surface to Claude which applies retry or escalation logic

**Patterns:**
- Writer failure: Auto-retry once; second failure presents user with skip/manual-retry choice; state tracked in `writers.<name>.status`
- Reviewer quality block: Problem rate >40% sets `reviewer_status: "escalated"`; workflow stops and waits for user decision
- Image not found: Logged as "找不到文件", processing continues with next image
- Script errors (Node.js): Surface as stderr; Claude reports to user and stops step
- Source repo unreachable: `source-sync` step must confirm branch before Writer starts; abort if checkout fails

## Cross-Cutting Concerns

**Logging:** `execution_log` array in `.qa-state-*.json`; each step appends `{step, status, at, duration_ms, summary}`

**Validation:** Output naming contracts enforced by `output-naming-contracts.mjs`; frontmatter audited by `audit-md-frontmatter.mjs`; test case quality enforced by Reviewer sub-agent with three-tier thresholds

**Authentication:** Lanhu MCP requires cookie refresh; handled by `.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py`; credentials stored in `tools/lanhu-mcp/.env` (never read by Claude)

---

*Architecture analysis: 2026-03-31*
