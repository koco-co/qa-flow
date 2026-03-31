# Roadmap: qa-flow v2

## Overview

qa-flow v2 transforms a DTStack-specific internal tool into a universal QA automation skills suite usable by any QA engineer on any project. The journey moves through six natural delivery boundaries: first removing all hardcoded business coupling so the main branch runs on a blank config; then rebuilding the project structure and shared scripts to support arbitrary project layouts; then delivering a self-configuring init wizard; then rewriting all core Skills with generic examples and config-driven path resolution; then adding multi-channel IM notification integration; and finally writing documentation against behavior that actually exists and has been tested.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Generalization Refactor** - Remove all DTStack-specific coupling from config, rules, prompts, and scripts
- [ ] **Phase 2: Project Structure + Shared Scripts** - Redesign directory layout and adapt shared Node.js scripts to new config schema
- [ ] **Phase 3: Init Wizard** - Build interactive using-qa-flow init with structure inference and config scaffolding
- [ ] **Phase 4: Core Skills Redesign** - Rewrite all Skills to be config-driven with generic examples, zero business coupling
- [ ] **Phase 5: IM Notification Integration** - Deliver multi-channel notification adapters (DingTalk, Feishu, WeCom, SMTP)
- [ ] **Phase 6: Documentation** - Write GitHub-ready README, CHANGELOG, and LICENSE against real tested behavior

## Phase Details

### Phase 1: Generalization Refactor
**Goal**: The main branch runs end-to-end on a blank-slate config with no DTStack business data
**Depends on**: Nothing (first phase)
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06
**Success Criteria** (what must be TRUE):
  1. Running the workflow with a minimal blank config produces no DTStack-specific error messages or undefined field crashes
  2. No DTStack module names, repo paths, Java package mappings, or Doris/Hive/SparkThrift references appear in config.json, rules files, or prompt steps on the main branch
  3. All DTStack business data (examples, config, requirements) is accessible from the dtstack-data branch and not present on main
  4. loadConfig() throws a descriptive error naming the missing field when a required config key is absent
  5. All existing tests pass against the generalized codebase
**Plans:** 5 plans

Plans:
- [ ] 01-01-PLAN.md — Config schema redesign + loadConfig() validation + Wave 0 test scaffolds
- [ ] 01-02-PLAN.md — Shared scripts generalization (output-naming-contracts, skill scripts, call sites)
- [ ] 01-03-PLAN.md — Rules files generalization
- [ ] 01-04-PLAN.md — Prompts, skill files, and CLAUDE.md generalization
- [ ] 01-05-PLAN.md — DTStack business data branch migration + blank config e2e smoke test

### Phase 2: Project Structure + Shared Scripts
**Goal**: The project directory layout supports arbitrary projects and all shared scripts read from the new config schema without hardcoded paths
**Depends on**: Phase 1
**Requirements**: STRU-01, STRU-02, STRU-03
**Success Criteria** (what must be TRUE):
  1. A fresh clone with no pre-existing cases/ directory can be initialized without manual directory creation
  2. All shared scripts (load-config.mjs, output-naming-contracts.mjs, etc.) resolve paths exclusively through config values, with no string-literal path segments
  3. The test suite runs green against the new directory structure with no fixture path updates required beyond the new layout
**Plans**: TBD

### Phase 3: Init Wizard
**Goal**: A new user on a blank project can run using-qa-flow init and emerge with a working config.json, a populated CLAUDE.md, and confirmed IM channel probing — without reading the source code
**Depends on**: Phase 2
**Requirements**: INIT-01, INIT-02, INIT-03, INIT-04, INIT-05
**Success Criteria** (what must be TRUE):
  1. Running using-qa-flow init on a blank directory scans the directory, proposes a module structure, and waits for confirmation before writing any files
  2. A user can upload a CSV or XMind history file during init and the wizard infers module keys and case hierarchy from it
  3. The generated config.json and CLAUDE.md are syntactically valid and immediately usable by the test-case-generator workflow without manual edits
  4. Multi-version (e.g., v1.0 + v2.0) and multi-module scenarios are expressible in the generated config without requiring post-init hand-editing
**Plans**: TBD

### Phase 4: Core Skills Redesign
**Goal**: All six Skills work on any project using config-driven routing and generic examples; no DTStack terminology appears in any user-visible prompt or output
**Depends on**: Phase 3
**Requirements**: SKIL-01, SKIL-02, SKIL-03, SKIL-04, SKIL-05, SKIL-06
**Success Criteria** (what must be TRUE):
  1. Running the full test-case-generator workflow on a sample e-commerce PRD (no DTStack config present) produces valid XMind and Markdown archive outputs in the correct config-specified directories
  2. prd-enhancer processes a generic PRD with images and produces a health-checked enhanced output with no DTStack field references in warnings or suggestions
  3. xmind-converter generates a valid .xmind file from an intermediate JSON using the root node format defined in config, not a hardcoded product name
  4. using-qa-flow displays a feature menu that accurately reflects all available Skills, accessible without prior knowledge of the codebase
**Plans**: TBD

### Phase 5: IM Notification Integration
**Goal**: QA workflows can send structured notifications to any combination of DingTalk, Feishu, WeCom, and SMTP email channels via a single unified dispatch call
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07
**Success Criteria** (what must be TRUE):
  1. A test-case-generator run that completes successfully sends a notification to each configured channel with the correct case count and output file link
  2. A DingTalk channel with keyword security configured drops no messages when the required keyword is present in the notification title
  3. Running notify.mjs with --dry-run prints the rendered payload for each enabled channel without making any network calls
  4. A user can enable or disable individual channels by setting or unsetting the corresponding env var in .env, with no code changes required
  5. .env.example documents every required and optional env var for all four channels with example values
**Plans**: TBD

### Phase 6: Documentation
**Goal**: A first-time visitor to the GitHub repository can understand what qa-flow does, install it, and run their first test-case-generator workflow using only the README
**Depends on**: Phase 5
**Requirements**: DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. Following the README Quick Start on a brand-new empty project (no pre-existing config) produces a working installation without needing to consult any other file
  2. CHANGELOG contains an accurate v2.0.0 entry listing all major changes from v1 to v2 delivered in Phases 1-5
  3. An open-source LICENSE file is present at the repository root and is referenced in the README
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Generalization Refactor | 0/5 | Planning complete | - |
| 2. Project Structure + Shared Scripts | 0/TBD | Not started | - |
| 3. Init Wizard | 0/TBD | Not started | - |
| 4. Core Skills Redesign | 0/TBD | Not started | - |
| 5. IM Notification Integration | 0/TBD | Not started | - |
| 6. Documentation | 0/TBD | Not started | - |
