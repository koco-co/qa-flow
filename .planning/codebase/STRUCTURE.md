# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
qa-flow/
├── CLAUDE.md                    # Master workflow handbook and skill index (authoritative)
├── README.md                    # Project readme
├── latest-output.xmind          # Symlink → most recently generated XMind file
├── latest-prd-enhanced.md       # Symlink → most recently enhanced PRD file
├── latest-bug-report.html       # Symlink → most recent bug analysis report
├── latest-conflict-report.html  # Symlink → most recent conflict analysis report
│
├── config/
│   └── repo-branch-mapping.yaml # DTStack repo → development branch mapping
│
├── cases/
│   ├── requirements/            # PRD / Story input documents
│   │   ├── data-assets/
│   │   │   └── v6.4.10/         # Version-scoped working directory
│   │   │       ├── *.md         # Enhanced PRD files (status: enhanced in frontmatter)
│   │   │       ├── .qa-state-{prd-slug}.json  # Per-PRD checkpoint state
│   │   │       ├── .qa-state.json             # Batch checkpoint state
│   │   │       ├── temp/        # Writer sub-agent intermediate JSON output
│   │   │       └── .trash/      # Superseded raw/formalized PRD versions
│   │   └── custom/
│   │       └── xyzh/            # Custom client (flat, no version subdirectory)
│   ├── xmind/                   # XMind output files
│   │   ├── batch-works/
│   │   │   ├── v6.4.3/          # Versioned XMind files
│   │   │   ├── 6.3.x/           # Range-version directory (special exception)
│   │   │   └── 集成测试/         # Functional category (special exception)
│   │   ├── data-assets/
│   │   │   ├── v6.4.10/         # One .xmind file per PRD
│   │   │   ├── 主流程/           # Regression suites (special exception)
│   │   │   └── 岚图标品/         # Brand-specific (special exception)
│   │   ├── data-query/
│   │   ├── variable-center/
│   │   ├── public-service/
│   │   └── custom/
│   │       └── xyzh/            # No version subdirectory for custom modules
│   ├── archive/                 # Canonical archived test case markdown
│   │   ├── data-assets/
│   │   │   ├── v6.4.10/         # Versioned archive markdown files
│   │   │   └── INDEX.json       # Search index for historical case retrieval
│   │   ├── batch-works/
│   │   ├── data-query/
│   │   ├── variable-center/
│   │   ├── public-service/
│   │   └── custom/
│   │       └── xyzh/
│   └── history/                 # Raw legacy CSV source files
│       └── xyzh/
│
├── assets/
│   └── images/                  # All PRD screenshots (semantic filenames, ≤2000px)
│
├── reports/
│   ├── bugs/                    # HTML bug analysis reports
│   └── conflicts/               # HTML conflict analysis reports
│
├── tools/
│   └── lanhu-mcp/               # Lanhu design platform MCP integration server (Python)
│
├── docs/                        # Internal documentation and audit proposals
│   └── sessions/                # Session logs
│
├── .planning/                   # GSD planning documents (not committed by default)
│   └── codebase/                # Codebase analysis outputs (this directory)
│
├── .repos/                      # Read-only source code repositories (git checkout targets)
│   ├── dt-insight-web/          # Frontend repositories
│   ├── dt-insight-plat/         # Backend platform repositories
│   ├── dt-insight-engine/       # Engine repositories
│   ├── dt-insight-front/        # Studio frontend
│   ├── CustomItem/              # Client customization repositories
│   └── dt-insight-qa/           # QA utility repository
│
└── .claude/
    ├── config.json              # Central source of truth for all paths and mappings
    ├── rules/                   # Global enforced rules (loaded by Claude on demand)
    │   ├── archive-format.md
    │   ├── directory-naming.md
    │   ├── image-conventions.md
    │   ├── repo-safety.md
    │   ├── test-case-writing.md
    │   └── xmind-output.md
    ├── shared/
    │   ├── schemas/
    │   │   └── front-matter-schema.md
    │   └── scripts/             # Shared Node.js ESM utilities
    │       ├── load-config.mjs
    │       ├── latest-link-utils.mjs
    │       ├── output-naming-contracts.mjs
    │       ├── front-matter-utils.mjs
    │       ├── audit-md-frontmatter.mjs
    │       ├── build-archive-index.mjs
    │       ├── md-content-source-resolver.mjs
    │       ├── normalize-md-content.mjs
    │       ├── refresh-latest-link.mjs
    │       ├── unify-directory-structure.mjs
    │       └── package.json     # jszip dependency
    ├── skills/
    │   ├── test-case-generator/
    │   │   ├── SKILL.md         # Main orchestration definition
    │   │   ├── prompts/         # Step-by-step prompt files
    │   │   ├── references/      # Intermediate format schema, elicitation dimensions
    │   │   └── rules/           # Skill-local test-case-writing rules
    │   ├── prd-enhancer/
    │   │   ├── SKILL.md
    │   │   ├── prompts/         # prd-formalizer prompt
    │   │   ├── references/      # PRD template spec
    │   │   └── rules/
    │   ├── xmind-converter/
    │   │   ├── SKILL.md
    │   │   ├── references/      # xmind-structure-spec.md
    │   │   ├── rules/           # xmind-output.md (skill-local copy)
    │   │   └── scripts/
    │   │       ├── json-to-xmind.mjs      # Main conversion script
    │   │       ├── patch-xmind-roots.mjs  # Root node patcher
    │   │       └── package.json           # jszip + xmind-generator deps
    │   ├── archive-converter/
    │   │   ├── SKILL.md
    │   │   ├── rules/           # archive-format.md (skill-local copy)
    │   │   └── scripts/
    │   │       ├── json-to-archive-md.mjs
    │   │       ├── backfill-archive-frontmatter.mjs
    │   │       ├── convert-history-cases.mjs
    │   │       ├── convert-data-assets-v2.mjs
    │   │       └── split-archive.mjs
    │   ├── using-qa-flow/
    │   │   ├── prompts/         # source-repo-setup.md
    │   │   └── scripts/         # refresh-lanhu-cookie.py
    │   └── code-analysis-report/
    │       ├── prompts/         # code-analyzer.md
    │       └── references/
    └── tests/                   # Node.js test suite for shared scripts
        ├── run-all.mjs          # Test runner (discovers test-*.mjs automatically)
        ├── test-load-config.mjs
        ├── test-json-to-xmind.mjs
        ├── test-latest-link-utils.mjs
        ├── test-archive-history-scripts.mjs
        ├── test-workflow-doc-validator.mjs
        └── test-*.mjs           # Additional test files
```

## Directory Purposes

**`cases/requirements/`:**
- Purpose: Working directory for PRD documents during test case generation
- Contains: Enhanced PRD `.md` files, `.qa-state-*.json` checkpoint files, `temp/` intermediate JSON, `.trash/` superseded versions
- Key files: `*.md` with `status: enhanced` in YAML frontmatter are the canonical inputs to Writer sub-agents

**`cases/xmind/`:**
- Purpose: Final XMind test case outputs organized by module and version
- Contains: `.xmind` binary files (ZIP-based), one file per PRD requirement by default
- Key files: Each `<功能名>.xmind` corresponds to one PRD's complete test suite

**`cases/archive/`:**
- Purpose: Long-term indexed archive of all test cases in searchable markdown format
- Contains: Versioned markdown files with YAML frontmatter, `INDEX.json` for search
- Key files: `cases/archive/INDEX.json` is the search index queried during brainstorm step

**`cases/history/`:**
- Purpose: Raw legacy CSV test case data (read-only historical source)
- Contains: CSV files from pre-automation era

**`.claude/config.json`:**
- Purpose: Single source of truth for all path mappings, module definitions, integrations
- Key: `modules` defines module keys and their xmind/archive/requirements paths; `repos` maps repo names to `.repos/` paths; `stackTrace` maps Java package prefixes to repo names; `shortcuts` defines root-level symlink names

**`.claude/skills/`:**
- Purpose: Self-contained skill definitions including orchestration logic, prompts, and scripts
- Convention: Each skill has `SKILL.md` (trigger description + step table), `prompts/` (per-step instructions), `references/` (schemas/specs), `rules/` (local rule copies), `scripts/` (Node.js executables)

**`.claude/shared/scripts/`:**
- Purpose: Cross-skill reusable Node.js utilities with single `package.json`
- Key files: `load-config.mjs` (config reader, used by all scripts), `output-naming-contracts.mjs` (filename validation), `latest-link-utils.mjs` (symlink management)

**`.claude/tests/`:**
- Purpose: Automated tests for shared scripts and skill scripts
- Convention: Test files named `test-*.mjs`; `run-all.mjs` discovers and runs all of them; tests use temporary directories named `__test_*` pattern

**`.repos/`:**
- Purpose: Read-only checkout of DTStack product source code for PRD formalization and test case authoring
- Rules: Strictly read-only; no commits, pushes, or modifications allowed (enforced by `.claude/rules/repo-safety.md`)

**`tools/lanhu-mcp/`:**
- Purpose: MCP server for importing PRDs directly from the Lanhu design platform
- Contains: Python server; configured via `tools/lanhu-mcp/.env`; entry point `lanhu_mcp_server.py`; runs on `http://127.0.0.1:8000`

## Key File Locations

**Entry Points:**
- `.claude/skills/test-case-generator/SKILL.md`: Main workflow orchestrator definition
- `.claude/skills/prd-enhancer/SKILL.md`: PRD preprocessing entry point
- `.claude/skills/xmind-converter/SKILL.md`: XMind conversion entry point
- `CLAUDE.md`: Master handbook; loaded first by Claude on every conversation

**Configuration:**
- `.claude/config.json`: All module paths, repo mappings, integrations, shortcut link names
- `config/repo-branch-mapping.yaml`: DTStack version → Git branch mapping
- `.claude/shared/scripts/load-config.mjs`: Programmatic config reader (used by all scripts)

**Core Logic:**
- `.claude/skills/test-case-generator/references/intermediate-format.md`: Canonical JSON schema for test case data exchange between all components
- `.claude/shared/scripts/output-naming-contracts.mjs`: Enforces XMind and archive file naming patterns
- `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs`: JSON → `.xmind` binary conversion
- `.claude/skills/archive-converter/scripts/json-to-archive-md.mjs`: JSON → archive markdown conversion

**State Files (runtime, not committed):**
- `cases/requirements/<module>/v{version}/.qa-state-{prd-slug}.json`: Single-PRD checkpoint
- `cases/requirements/<module>/v{version}/.qa-state.json`: Batch checkpoint
- `cases/requirements/<module>/v{version}/temp/<module>.json`: Writer sub-agent JSON output

**Shortcut Symlinks (root-level):**
- `latest-output.xmind` → most recent XMind output
- `latest-prd-enhanced.md` → most recent enhanced PRD
- `latest-bug-report.html` → most recent bug report
- `latest-conflict-report.html` → most recent conflict report

**Testing:**
- `.claude/tests/run-all.mjs`: Test runner entry point
- `.claude/tests/test-*.mjs`: Individual test files

## Naming Conventions

**Skill scripts:**
- Pattern: kebab-case `.mjs` files; descriptive verb-noun names
- Examples: `json-to-xmind.mjs`, `load-config.mjs`, `build-archive-index.mjs`

**Skill prompt files:**
- Pattern: `step-{step-id}.md` for orchestration steps; `{role}-subagent.md` for sub-agents
- Examples: `step-parse-input.md`, `step-xmind.md`, `writer-subagent.md`

**XMind output files:**
- DTStack PRD-level: `<功能名>.xmind` (Chinese feature name, no prefix)
- Story-level aggregation: `Story-YYYYMMDD.xmind`
- Location: `cases/xmind/<module-key>/v{version}/`

**Archive markdown files:**
- DTStack (from PRD): `【功能类别】功能名称.md` (matches PRD title with number prefix stripped)
- Custom project (with PRD ID): `PRD-XX-功能名.md`
- Custom project (from XMind): `<功能名>.md`
- Story-level aggregation: `Story-YYYYMMDD.md`
- Location: `cases/archive/<module-key>/v{version}/`

**PRD requirement files:**
- Enhanced (final): `功能名.md` with `status: enhanced` frontmatter
- Raw/formalized versions: moved to `.trash/` subdirectory after enhancement
- Location: `cases/requirements/<module-key>/v{version}/`

**State files:**
- Single-PRD: `.qa-state-{prd-slug}.json` where prd-slug = basename without `.md`
- Batch: `.qa-state.json`
- Both in same directory as the target PRD file

**Temporary files:**
- Writer output: `cases/requirements/<module>/v{version}/temp/<模块简称>.json`
- Cleaned up after user verification in step 11

**Directories:**
- Module keys: lowercase hyphenated English (`batch-works`, `data-assets`, `data-query`)
- Version directories: `v{semver}` prefix required (`v6.4.10`, not `6.4.10`)
- Custom module path alias: `custom/xyzh` (not `xyzh` at top level in cases/)
- Special exception directories: `6.3.x/`, `集成测试/`, `主流程/`, `岚图标品/` (legacy; not for new files)

## Where to Add New Code

**New Skill:**
- Skill definition: `.claude/skills/<skill-name>/SKILL.md`
- Step prompts: `.claude/skills/<skill-name>/prompts/step-*.md`
- Local rules: `.claude/skills/<skill-name>/rules/`
- References/schemas: `.claude/skills/<skill-name>/references/`
- Node.js scripts: `.claude/skills/<skill-name>/scripts/` with its own `package.json`
- Register trigger in `CLAUDE.md` skill index table

**New Module (DTStack product area):**
- Add entry to `.claude/config.json` `modules` object with `zh`, `type: "dtstack"`, `zentaoId`, `xmind`, `archive`, `requirements` paths
- Add to `.claude/rules/directory-naming.md` module table

**New Shared Script Utility:**
- Implementation: `.claude/shared/scripts/<utility-name>.mjs`
- Export functions; import `loadConfig` from `./load-config.mjs` for config access
- Add tests: `.claude/tests/test-<utility-name>.mjs`

**New External Repo Integration:**
- Add to `.claude/config.json` `repos` object with repo name → `.repos/` path
- Add stack trace mapping in `.claude/config.json` `stackTrace` if Java package prefix known
- Add branch mapping in `config/repo-branch-mapping.yaml`

**New PRD for existing module:**
- Place in `cases/requirements/<module>/v{version}/` directory (create version dir if needed)
- Trigger enhancement via "帮我增强这个 PRD: <path>"
- Trigger generation via "为 <requirement-name> 生成测试用例"

## Special Directories

**`.repos/`:**
- Purpose: Read-only DTStack source code for reference during test case generation
- Generated: No (manually cloned, branch-switched via `git checkout`)
- Committed: No (in `.gitignore`); `.repos/` is local-only

**`.trash/`:**
- Purpose: Soft-delete destination for superseded PRD versions after enhancement
- Generated: Yes (created by prd-enhancer `Step 8`)
- Committed: No; retention policy 30 days (configured in `.claude/config.json` `trash.retentionDays`)

**`cases/requirements/<module>/v{version}/temp/`:**
- Purpose: Writer sub-agent intermediate JSON output during active test case generation
- Generated: Yes (created during workflow step 7)
- Committed: No; deleted after user verification in step 11

**`.claude/tests/__test_*`:**
- Purpose: Isolated temporary directories created by tests for filesystem operation testing
- Generated: Yes (created per test run)
- Committed: No; cleaned up by tests after each run

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: Yes (written by map-codebase agent)
- Committed: No (`.gitignore`-level; used only during planning sessions)

---

*Structure analysis: 2026-03-31*
