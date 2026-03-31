# Architecture Patterns: Universal QA Automation Skills Suite

**Domain:** Claude Code Skills-based QA automation framework
**Researched:** 2026-03-31
**Focus:** Skill decomposition, config externalization, plugin architecture for IM/PM integrations, Playwright orchestration, project initialization flow

---

## Recommended Architecture

The system is a **prompt-orchestrated AI workflow engine** — not a traditional application. Claude is the runtime; Skills are the programs; Node.js scripts handle deterministic I/O. The v2 architecture preserves this core model while replacing all DTStack-specific coupling with an **adapter-layer pattern** driven by externalized project configuration.

### High-Level Component Map

```
┌─────────────────────────────────────────────────────────────┐
│                   USER (Claude Code CLI)                     │
│  Natural language triggers → Skill invocation via /slash     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│             ENTRY POINT: CLAUDE.md + Skill Index            │
│  Master handbook; loaded on every conversation by Claude    │
│  Routes user intent to correct Skill via trigger matching   │
└──────┬─────────────────────────────────────┬────────────────┘
       │                                     │
┌──────▼──────────────┐          ┌──────────▼──────────────┐
│  CORE SKILLS        │          │  INTEGRATION SKILLS     │
│  (always present)   │          │  (conditionally active) │
│                     │          │                         │
│  using-qa-flow      │          │  notify-im              │
│  test-case-generator│          │  submit-bug             │
│  prd-enhancer       │          │  playwright-runner      │
│  xmind-converter    │          │  code-analysis-report   │
│  archive-converter  │          │                         │
└──────┬──────────────┘          └──────────┬──────────────┘
       │                                    │
┌──────▼────────────────────────────────────▼──────────────┐
│              SHARED SCRIPTS LAYER (.claude/shared/)       │
│  load-config  │  output-naming  │  latest-link-utils     │
│  front-matter │  audit-md       │  build-archive-index   │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│         CONFIGURATION LAYER (.claude/config.json)        │
│  modules[]  │  integrations{}  │  playwright{}           │
│  repos{}    │  notifications{} │  urlMappings{}           │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│               DATA LAYER (cases/, assets/)               │
│  requirements/  │  xmind/  │  archive/  │  reports/      │
│  State files (.qa-state-*.json) │  temp/  │  .trash/      │
└──────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. CLAUDE.md — Master Entry Point

**Responsibility:** Route user intent to the correct Skill. Provide always-on project context (workspace structure, Skill index, rule index).

**Communicates with:** All Skills (by reference); never calls scripts directly.

**Universal design:** CLAUDE.md becomes a template with project-specific variables filled during `/using-qa-flow init`. It must not contain any hardcoded module names, repo paths, or organization-specific examples. All such data comes from `config.json` at runtime.

**Boundary:** CLAUDE.md is read-only during a session. Claude interprets it; scripts never modify it.

---

### 2. using-qa-flow Skill — Initialization and Menu

**Responsibility:** Two modes:
- **Menu mode** (`/using-qa-flow`): Display available capabilities contextualized to the current project state.
- **Init mode** (`/using-qa-flow init`): Interactive project onboarding — infer project structure, prompt user for confirmation, write `config.json`, scaffold directory layout, verify Playwright install, probe IM webhook endpoints.

**Communicates with:**
- Writes `.claude/config.json` (only component that creates/modifies it)
- Calls `unify-directory-structure.mjs` to scaffold `cases/` directories
- Reads user-provided files (CSV, XMind) to infer module hierarchy

**Universal design:** Init flow must work with zero prior knowledge of the project. It asks four questions: (1) product/module names, (2) version scheme, (3) source code repo presence, (4) which integrations to enable. It writes `config.json` from a template and scaffolds directories matching the answers.

**Key pattern — Progressive Disclosure Init:**
```
Step 1: Scan working directory → infer project name, existing structure
Step 2: Show proposed config to user → "Does this look right?"
Step 3: User corrections → rewrite config
Step 4: Scaffold directories that don't yet exist
Step 5: Optional: probe integration endpoints (IM webhooks, PM API)
```

---

### 3. config.json — Configuration Layer (Leaf Node)

**Responsibility:** Single source of truth for all runtime routing. No component derives paths by convention; all paths come from config.

**Schema (universal v2):**
```json
{
  "project": {
    "name": "string",
    "versionScheme": "semver | sprint | free",
    "defaultModule": "string"
  },
  "modules": [
    {
      "key": "string",         // stable identifier used in state files, dirs
      "label": "string",       // human-readable display name
      "xmind": "string",       // output dir (relative to project root)
      "archive": "string",
      "requirements": "string",
      "sourceRepo": "string | null"  // path under .repos/ or null
    }
  ],
  "repos": {},                 // name → .repos/ path (empty if no source repos)
  "playwright": {
    "enabled": false,
    "urlMappings": {}          // branch/env → base URL for UI automation
  },
  "integrations": {
    "im": {
      "enabled": false,
      "channels": []           // see Integration Adapters section
    },
    "bugTracker": {
      "enabled": false,
      "type": "zentao | jira | linear | github",
      "endpoint": "",
      "tokenEnvVar": ""
    }
  },
  "shortcuts": {
    "latestXmind": "latest-output.xmind",
    "latestPrd": "latest-prd-enhanced.md"
  },
  "trash": { "retentionDays": 30 }
}
```

**Key change from v1:** `modules` no longer hardcodes DTStack module keys. The `integrations` block replaces scattered DTStack-specific config (Zentao, Lanhu MCP) with a typed, extensible adapter registry.

---

### 4. Core Skills — Workflow Orchestrators

Each Skill is a self-contained subdirectory under `.claude/skills/`. The canonical structure:

```
.claude/skills/<skill-name>/
├── SKILL.md              # Frontmatter triggers + orchestration steps
├── prompts/              # One file per workflow step
│   └── step-*.md
├── references/           # Schemas, spec documents Claude reads on demand
├── rules/                # Skill-local rule copies (test-case-writing, etc.)
└── scripts/              # Node.js ESM executables
    └── package.json
```

**Skill-to-Skill communication:** Skills do not call each other directly. The orchestrating Claude instance reads SKILL.md files sequentially by following explicit "next step" references. The `test-case-generator` Skill delegates to `xmind-converter` and `archive-converter` by instructing Claude to execute their scripts, not by invoking the Skills themselves.

**Sub-agent pattern:** Writer and Reviewer sub-agents are spawned by Claude with `context: fork` semantics. They receive pre-extracted context (source code snippets, PRD content) from the orchestrating instance. They output strictly-typed JSON matching the intermediate format schema. This isolation prevents sub-agents from polluting the parent context with irrelevant tool calls.

---

### 5. Integration Adapters — IM and Bug Tracker Plugins

**Responsibility:** Decouple notification/reporting logic from core workflow steps. Any Skill can call `notify-im` or `submit-bug` without knowing which platform is configured.

**Architecture:** Two thin adapter Skills that read `config.json → integrations` and dispatch to the correct platform-specific script.

```
.claude/skills/notify-im/
├── SKILL.md              # disable-model-invocation: true; user/automation trigger
├── adapters/
│   ├── dingtalk.mjs      # DingTalk webhook POST
│   ├── feishu.mjs        # Feishu/Lark webhook POST
│   ├── wecom.mjs         # WeCom webhook POST
│   └── email.mjs         # SMTP via nodemailer
└── notify.mjs            # Entry: reads config, dispatches to adapter

.claude/skills/submit-bug/
├── SKILL.md
├── adapters/
│   ├── zentao.mjs
│   ├── jira.mjs
│   ├── linear.mjs
│   └── github-issues.mjs
└── submit.mjs            # Entry: reads config, dispatches to adapter
```

**How a core Skill triggers notification:**
```
# In step-archive.md (test-case-generator):
After archive generation, if config.integrations.im.enabled:
  node .claude/skills/notify-im/notify.mjs \
    --event "case-generation-complete" \
    --module "$MODULE_KEY" \
    --xmind "$XMIND_PATH" \
    --archive "$ARCHIVE_PATH"
```

The adapter script reads `config.json` to determine which IM platform is active, formats the message in the platform's expected payload structure, and POSTs to the webhook URL. Credentials (webhook tokens, API keys) are always read from environment variables named in `config.json → integrations.im.channels[].tokenEnvVar`, never from `config.json` itself.

**Adding a new integration:** Create a new adapter script in the appropriate adapter directory. No changes to core Skills required. This is the extension point for community contributions.

---

### 6. playwright-runner Skill — UI Automation Layer

**Responsibility:** Bridge between Markdown test cases and executable Playwright scripts. Three sub-responsibilities:
1. **Script generation:** Transform archived test cases (Markdown) into Playwright TypeScript test files.
2. **Script execution:** Run generated scripts via `npx playwright test` and capture structured results.
3. **Result sync:** Inject execution results back into archive Markdown (pass/fail status, error screenshots).

**Architecture decision — CLI over MCP:**
Playwright MCP consumes approximately 114K tokens per session; CLI-based invocation reduces this to ~27K tokens (4x reduction, confirmed by community benchmarks as of 2025). For a QA automation skill that runs within a constrained context window alongside large test case documents and source code, CLI is preferred.

```
.claude/skills/playwright-runner/
├── SKILL.md
├── prompts/
│   ├── step-generate-script.md   # MD test case → Playwright TS
│   ├── step-execute.md           # Run scripts, capture output
│   └── step-sync-results.md      # Write back to archive MD
├── references/
│   ├── playwright-template.ts    # Base test file template
│   └── result-schema.md          # JSON schema for execution results
└── scripts/
    ├── run-tests.mjs             # Wrapper: npx playwright test + JSON reporter
    ├── sync-results.mjs          # Write results to archive frontmatter
    └── package.json              # playwright dependency
```

**Data flow:**
```
Archive MD (test cases)
  → step-generate-script: Claude reads cases, writes *.spec.ts files
  → step-execute: node run-tests.mjs → JSON results
  → step-sync-results: node sync-results.mjs → updates archive MD
  → notify-im (if enabled): reports execution summary
  → submit-bug (if enabled): auto-submits failing cases as bugs
```

**URL mapping:** `config.json → playwright.urlMappings` maps environment names (or branch names) to base URLs. Step-execute reads this mapping to run tests against the correct environment. This replaces hardcoded DTStack environment URLs with user-configured mappings set during `/using-qa-flow init`.

---

### 7. Shared Scripts Layer

**Responsibility:** Deterministic, stateless file operations that Claude should not perform inline (format conversion, symlink management, frontmatter validation, config loading).

**Key principle:** All scripts import config exclusively through `load-config.mjs`. No script hardcodes paths. All paths are resolved against the project root at runtime via `loadConfig()`.

**Communicates with:** Skills (invoked as `node <script> <args>`), Tests (imported as modules).

**Boundary:** Scripts never read Claude's conversation state. They operate only on files and return exit codes + stdout. Claude interprets the output and decides next steps.

---

### 8. Data Layer

**Responsibility:** Persistent storage for all workflow inputs and outputs.

**Universal directory scaffold:**
```
cases/
├── requirements/
│   └── <module-key>/
│       └── <version>/          # Version dir: semver (v1.2.3), sprint (sprint-42), or flat
│           ├── *.md             # Enhanced PRD files
│           ├── .qa-state-*.json # Per-PRD state checkpoints
│           └── temp/            # Writer sub-agent intermediate JSON
├── xmind/
│   └── <module-key>/
│       └── <version>/
├── archive/
│   └── <module-key>/
│       └── <version>/
│           └── INDEX.json       # Search index for historical case retrieval
└── playwright-scripts/          # New in v2: generated Playwright test files
    └── <module-key>/
        └── <version>/
            └── *.spec.ts
```

The version directory strategy is configurable via `config.json → project.versionScheme`. For teams that don't use semantic versioning, "sprint" or "free" schemes produce directories like `sprint-42/` or `2026-Q1/`.

---

## Data Flow

### Primary Flow: Test Case Generation

```
User trigger ("generate test cases for Story-X")
  ↓
CLAUDE.md routes to test-case-generator Skill
  ↓
parse-input: Read/create .qa-state-{slug}.json
  ↓
req-elicit: Clarify ambiguities with user
  ↓
[if sourceRepo configured] source-sync: git fetch/checkout target branch
  ↓
prd-enhancer: Multimodal image analysis, structure normalization
  ↓
brainstorm: Query cases/archive/INDEX.json for historical context
  ↓
checklist: Output lightweight checklist JSON for user confirmation
  ↓
writer (parallel sub-agents): Output temp/<module>.json per module
  ↓
reviewer: Merge JSON, apply 15%/40% quality thresholds
  ↓
xmind: node json-to-xmind.mjs → .xmind file + latest-output.xmind symlink
  ↓
archive: node json-to-archive-md.mjs → versioned Markdown
  ↓
[if im enabled] notify-im: POST to configured IM channel
  ↓
cleanup: Remove temp/, update .qa-state.json to completed
```

### Integration Flow: Playwright Execution

```
User trigger ("/playwright-runner run <module> <version>")
  ↓
playwright-runner reads archive MD for target module/version
  ↓
step-generate-script: Claude writes *.spec.ts to playwright-scripts/
  ↓
step-execute: node run-tests.mjs → JSON results file
  ↓
step-sync-results: node sync-results.mjs → updates archive MD frontmatter
  ↓
[if failures] submit-bug: node submit.mjs → bug tickets in configured tracker
  ↓
[if im enabled] notify-im: Send execution summary to IM channel
```

### State Persistence Flow

```
.qa-state-{prd-slug}.json:
  {
    "last_completed_step": "reviewer",
    "awaiting_verification": true,
    "module_key": "ecommerce-checkout",
    "prd_version": "v2.1.0",
    "execution_log": [...],
    "writers": { "<module>": { "status": "completed" } },
    "source_context": { "branch": "main", "commit": "abc123" }
  }
```

Each step reads `last_completed_step` on startup to skip already-completed steps (resume/breakpoint support).

---

## Patterns to Follow

### Pattern 1: Adapter Registration (IM / Bug Tracker)

**What:** Each integration type (IM platform, bug tracker) is an adapter module implementing a fixed interface. The router (`notify.mjs` / `submit.mjs`) reads `config.json` to select the active adapter and delegates.

**When:** Any time a new IM platform or bug tracker needs to be supported.

**Interface contract (conceptual):**
```javascript
// Each adapter exports:
export async function send(payload, config) {
  // payload: { event, module, summary, links }
  // config: the channel config block from config.json
  // Returns: { ok: boolean, response: string }
}
```

**Why this matters:** Adding Slack support in the future requires only a new `slack.mjs` adapter file. No changes to any core Skill or orchestration step.

### Pattern 2: Config-Driven Path Resolution

**What:** All file paths are resolved through `loadConfig()` using module keys, never constructed by string concatenation in Skill prompts.

**When:** Any script that writes or reads cases, xmind, or archive files.

```javascript
// Correct
const { xmind, archive } = loadConfig().modules.find(m => m.key === moduleKey)
const outPath = path.join(projectRoot, xmind, version, `${filename}.xmind`)

// Wrong
const outPath = `cases/xmind/${moduleKey}/v${version}/${filename}.xmind`
```

### Pattern 3: Intermediate JSON as Exchange Format

**What:** All test case data flows through the intermediate JSON schema between Writer sub-agents, Reviewer, XMind converter, and Archive converter. No component directly converts between output formats.

**When:** Any new output format (e.g., TestRail CSV, Allure XML) must consume intermediate JSON, not raw PRD or archive Markdown.

**Schema (stable):**
```
{ meta: { module_key, prd_version, ... }, modules: [{ name, pages: [{ name, sub_groups: [{ name, test_cases: [] }] }] }] }
```

### Pattern 4: Skill Isolation via context: fork

**What:** Writer and Reviewer sub-agents run in forked contexts. The orchestrator injects pre-extracted context (source code snippets, PRD content, historical cases) as explicit string blocks. Sub-agents do not have access to conversation history.

**When:** Any workflow step that spawns parallel workers or runs isolated analysis.

**Why:** Prevents context window pollution from sub-agent tool calls. Keeps orchestrator token budget predictable.

### Pattern 5: Graceful Integration Degradation

**What:** Every integration point (IM, bug tracker, Playwright) is gated by `config.json → integrations.X.enabled`. If disabled, the step is skipped silently. Core workflows function fully without any integration configured.

**When:** Init flow writes `enabled: false` for all integrations by default. Users opt in explicitly.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Business Domain Leakage into Core Skills

**What goes wrong:** Skill prompts reference organization-specific terminology (e.g., "DTStack", "Doris", "Zentao product ID") as if they are universal concepts.

**Why bad:** New users cannot onboard without understanding internal jargon. Skills break if terminology changes.

**Instead:** All domain-specific strings come from `config.json` at runtime via `$ARGUMENTS` substitution or config reads. Skill prompts use generic placeholders: `<product-name>`, `<module-key>`, `<version>`.

### Anti-Pattern 2: Hardcoded Output Paths in Prompts

**What goes wrong:** Step prompts contain literal paths like `cases/xmind/data-assets/v6.4.10/`.

**Why bad:** Every new project structure requires editing Skill prompts. Prompts become project forks, not a universal framework.

**Instead:** Step prompts instruct Claude to call `loadConfig()` (via a shared helper script invocation) or reference `$MODULE_XMIND_PATH` variables injected from the state file.

### Anti-Pattern 3: MCP for High-Frequency Script Execution

**What goes wrong:** Using Playwright MCP server for every test run inside a session that also has large PRD documents and source code loaded.

**Why bad:** MCP accessibility-tree payloads consume 114K tokens per session versus ~27K for CLI-based invocation. Context window exhaustion mid-workflow is a real failure mode.

**Instead:** Use `npx playwright test` via Bash through the `run-tests.mjs` wrapper. Reserve Playwright MCP only for interactive debugging sessions where accessibility tree inspection is needed.

### Anti-Pattern 4: Monolithic State File for Batch Workflows

**What goes wrong:** A single `.qa-state.json` tracks all PRDs in a batch with one `last_completed_step` field.

**Why bad:** If one PRD's Writer sub-agent fails, resume logic cannot restart from that PRD's last step without re-running the others.

**Instead:** Per-PRD state files (`.qa-state-{prd-slug}.json`) for all workflows. Batch coordination uses a thin batch manifest that references per-PRD state files but never absorbs their step tracking.

### Anti-Pattern 5: Coupling Rules to a Single Skill

**What goes wrong:** `test-case-writing.md` rules exist only in `test-case-generator/rules/` and are not accessible to the `playwright-runner` Skill when generating scripts.

**Why bad:** Playwright script generation should respect the same case writing rules (step format, priority notation, etc.). Duplication leads to drift.

**Instead:** Rules with cross-skill applicability live in `.claude/rules/` (global). Skills reference global rules and may have local addenda in `skills/<name>/rules/`. Global rules take precedence.

---

## Suggested Build Order (Phase Dependencies)

Components have these dependency relationships:

```
config.json schema
  └── load-config.mjs (shared script)
       └── All other shared scripts
            └── Core skill scripts (json-to-xmind, json-to-archive-md, etc.)

using-qa-flow init
  └── config.json written
       └── Directory scaffold created
            └── All workflows can run

Universal CLAUDE.md + Skill rewrites
  └── config.json schema stable

Integration adapters (notify-im, submit-bug)
  └── Core skill scripts stable
  └── config.json integrations schema stable

Playwright runner Skill
  └── Archive format stable (reads test cases from it)
  └── config.json playwright schema stable
  └── Integration adapters present (for post-run notifications)
```

**Recommended build sequence:**

1. **Config schema + load-config.mjs** — Leaf node, no dependencies. All other components depend on it. Must be finalized first.
2. **Universal directory structure + using-qa-flow init** — Scaffolding and onboarding. Depends on config schema only.
3. **Universal CLAUDE.md template** — Requires config schema to be stable so references are correct.
4. **Core Skill rewrites** (prd-enhancer, test-case-generator, xmind-converter, archive-converter) — Remove DTStack coupling, replace with config-driven paths. Depends on config schema and shared scripts.
5. **Integration adapter layer** (notify-im, submit-bug) — Plugs into existing core skills via exit hooks. Depends on core skills being stable.
6. **playwright-runner Skill** — Reads from archive output of core skills. Depends on archive format being stable and integration adapters being present for post-run notifications.

---

## Scalability Considerations

| Concern | Single project (1 module) | Mid-scale (5-10 modules) | Large-scale (20+ modules, multi-team) |
|---------|--------------------------|--------------------------|---------------------------------------|
| Config management | Single config.json, hand-edited | Config.json with array of modules | Config.json becomes large; consider per-module config overrides or env-var injection |
| State files | 1-2 per PRD | Many per module/version | Batch manifest pattern becomes essential to avoid lost state files |
| Archive index | Single INDEX.json per module | Separate INDEX.json per module | Sharded by version; brainstorm step queries only recent N versions |
| Context window | Manageable | Monitor token usage per session | Enforce sub-agent isolation strictly; never load all modules' rules into orchestrator context |
| Integration adapters | One channel configured | Multiple channels per module | Channel routing by module key (e.g., different Slack/DingTalk channels per team) |

---

## Sources

- [Extend Claude with skills — official docs](https://code.claude.com/docs/en/skills) — HIGH confidence (official, current)
- [Playwright MCP — microsoft/playwright-mcp GitHub](https://github.com/microsoft/playwright-mcp) — HIGH confidence (official)
- [Playwright MCP token usage comparison](https://testdino.com/blog/playwright-mcp/) — MEDIUM confidence (community benchmark)
- [Claude Code Skills deep dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) — MEDIUM confidence (verified against official docs)
- [Webhook architecture patterns — Beeceptor](https://beeceptor.com/docs/webhook-feature-design/) — MEDIUM confidence (reference architecture)
- Current codebase analysis (`ARCHITECTURE.md`, `STRUCTURE.md`) — HIGH confidence (direct inspection)

---

*Architecture research: 2026-03-31*
