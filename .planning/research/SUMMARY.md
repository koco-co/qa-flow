# Project Research Summary

**Project:** qa-flow v2 — Universal QA Automation Skills Suite
**Domain:** Claude Code Skills-based QA automation framework (LLM-native, CLI-first)
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

qa-flow is a prompt-orchestrated AI workflow engine, not a traditional application. Claude Code is the runtime; Skills (markdown instruction sets) are the programs; Node.js ESM scripts handle deterministic I/O. The v2 milestone has one non-negotiable prerequisite: full removal of DTStack-specific coupling from every layer of the system (config, rule files, prompt steps, and Node.js constants) before any new capability is added. This coupling is distributed across at least 5 layers simultaneously, and a partial decoupling pass produces a system that appears generic but fails silently for non-DTStack users at runtime.

The recommended architecture for v2 preserves the existing prompt-orchestration model while replacing all hardcoded paths with an adapter-layer pattern driven by an externalized, versioned `config.json`. The config schema must be defined and validated before any other component is built — it is the leaf dependency for all shared scripts, all Skills, and both integration adapter families (IM notifications and bug trackers). The build order is strict: config schema first, then init wizard, then core Skill rewrites, then integration adapters, then Playwright runner.

The three highest-consequence risks are: (1) DTStack coupling surviving the refactor because it is distributed across layers that are easy to miss; (2) silent config field failures for new users because there is currently no schema validation on `loadConfig()`; and (3) Playwright selector brittleness on arbitrary target apps because LLM-generated selectors default to the most specific (and most fragile) selector available. Each of these has a clear prevention strategy but requires discipline to execute before writing new feature code.

---

## Key Findings

### Recommended Stack

The existing stack (JavaScript ESM, Node.js v25, Python 3.10+ scoped to `tools/lanhu-mcp/`) requires only targeted additions for v2. Three capability areas are new: Playwright-based UI automation via `@playwright/mcp@latest` registered as a Claude Code project-scope MCP server; IM notifications implemented with Node.js built-in `fetch` + `crypto` for DingTalk/Feishu/WeCom webhooks and `nodemailer ^8.0.4` for SMTP email; and Zentao project management integration via direct REST API calls using the built-in `fetch` (the only maintained Zentao Node.js option — `node-zentao` npm was abandoned in 2019).

A key architectural decision from the stack research: Playwright MCP consumes approximately 114K tokens per session versus ~27K for CLI-based invocation. For production use inside sessions that also carry large PRD documents and source code, the CLI path (`npx playwright test` via `run-tests.mjs`) is preferred. Playwright MCP should be reserved for interactive debugging sessions only.

**Core technologies — new additions:**

- `@playwright/mcp@latest` (v0.0.69): Project-scope MCP server for interactive browser debugging; CLI preferred for production test runs — official Microsoft package, not the community fork
- Node.js built-in `fetch` + `crypto`: DingTalk, Feishu, WeCom webhook POSTs — no SDK needed for fire-and-forget notifications
- `nodemailer ^8.0.4`: SMTP email; only non-built-in IM dependency; requires `createRequire` workaround in ESM context (tracked upstream in nodemailer#1518)
- Zentao REST API v1 via `fetch`: `POST /api.php/v1/tokens` for auth, then token-header requests; implement in-memory token cache with expiry check
- `notify.mjs` unified dispatcher in `.claude/shared/scripts/`: routes to channel-specific adapters based on `config.json`

### Expected Features

The feature landscape is defined by qa-flow's nature as a CLI Skills suite, not a SaaS. The comparison set is other Claude Code agent skill collections and DIY Playwright + LLM setups, not TestRail or Testsigma.

**Must have (table stakes — already exist in v1, must survive generalization):**
- PRD/requirement parsing from file or URL
- Test case generation from structured requirement (the core value proposition)
- XMind output (de-facto Chinese QA deliverable format)
- Markdown archive output for version-controlled diff review
- Checkpoint/resume on interrupted generation (`.qa-state-*.json` pattern)
- Quality threshold auto-decision (15%/40% thresholds, auto-fix/warn/block)
- Module-level re-run without regenerating entire PRD
- One-command project initialization that works on a blank-slate project
- Human-readable config with no code required

**Should have (differentiators — planned for v2):**
- Universal project init with structure inference (key to open-source adoption)
- IM notification integration (DingTalk/Feishu webhook — low complexity, high value for Chinese enterprise teams)
- Playwright UI automation script generation from test cases (closes requirement → case → executed script loop)
- Bidirectional sync: script execution results annotate archive (pass/fail/flaky status)
- Bug report auto-generation from failed scripts → Zentao/tracker auto-submit
- Open standard Agent Skills format (agentskills.io portability — no extra work, already compatible)

**Defer to subsequent milestones:**
- Zentao/Jira integration: deliver after IM notifications validate the integration model
- Bidirectional sync full structural round-trip: implement MD → Playwright first, result annotation second
- Mobile automation, API automation, performance testing: explicitly out of scope

### Architecture Approach

The system is a layered prompt-orchestration engine. Claude reads Skills sequentially; Skills delegate to Node.js scripts for deterministic I/O; all routing decisions flow from a single `config.json`. The v2 change is replacing DTStack-specific coupling with a typed adapter registry in `config.json → integrations` and a strict rule that all paths resolve through `loadConfig()`, never by string concatenation in Skill prompts.

**Major components:**

1. **CLAUDE.md** — Master entry point; routes user intent to Skills; must be a template with zero hardcoded module names after generalization
2. **config.json** — Single source of truth for all runtime routing; must have a `schemaVersion` field, a canonical `config.schema.json`, and validation on every `loadConfig()` call
3. **using-qa-flow init** — Only component that creates/modifies config; progressive disclosure (scan → propose → confirm → scaffold → probe integrations); the gate that new users pass through
4. **Core Skills** (`test-case-generator`, `prd-enhancer`, `xmind-converter`, `archive-converter`) — Workflow orchestrators; must be decoupled from DTStack terminology; use `$MODULE_XMIND_PATH` variables from state files, not literal paths
5. **Integration adapter layer** (`notify-im`, `submit-bug`) — Thin dispatch layer; each platform is an adapter module implementing a fixed `send(payload, config)` interface; adding a new platform requires only a new adapter file
6. **playwright-runner Skill** — Reads from stable archive output; three sub-responsibilities: script generation, CLI execution via `run-tests.mjs`, result sync back to archive frontmatter
7. **Shared scripts layer** — Stateless file operations; all import config through `load-config.mjs`; never hardcode paths
8. **Data layer** — Version-aware directory scaffold (`cases/requirements|xmind|archive|playwright-scripts/<module-key>/<version>/`); per-PRD state files, not monolithic batch state

### Critical Pitfalls

1. **Implicit DTStack coupling surviving refactor** — Coupling is in 5 layers simultaneously (config, rules markdown, prompt steps, Node.js constants, `.gitignore`). Prevention: audit all 5 layers before writing one line of new code; replace every DTStack-specific example with an e-commerce equivalent; keep a named `dtstack-data` branch and validate main runs with a blank-slate config.

2. **Config schema versioning absent** — No `schemaVersion`, no JSON Schema validation, no deep-merge against defaults means new users hit mid-workflow errors from missing fields. Prevention: define `config.schema.json` before the init wizard; `loadConfig()` must validate and throw a descriptive error listing the missing field name.

3. **Playwright selector brittleness on unknown apps** — LLM-generated selectors default to the most specific available (CSS class, positional) and break on any UI update. Prevention: enforce selector priority in the generation prompt (`getByRole` > `getByLabel` > `getByTestId` > `getByText` > CSS last resort); add a post-generation scan that flags CSS class selectors as warnings.

4. **Auth not modeled for Playwright** — Every real enterprise app requires login; scripts that navigate protected pages without `storageState` setup fail immediately. Prevention: `storageState` capture is a required init step in the playwright-runner Skill, not optional; store auth state at `playwright/.auth/state.json`, credentials in `.env`.

5. **IM notification format divergence** — DingTalk, Feishu, WeCom use incompatible payload schemas; DingTalk silently drops messages that don't contain a configured keyword. Prevention: define a platform-agnostic content schema (title, summary, detail list, severity, link) with separate per-platform renderers; init wizard must ask for DingTalk keyword and validate with a test message before saving config.

---

## Implications for Roadmap

Based on the strict dependency graph from ARCHITECTURE.md and the phase-specific warnings in PITFALLS.md, the suggested phase structure is:

### Phase 1: Generalization Refactor

**Rationale:** Every subsequent phase depends on a clean, DTStack-free foundation. Shipping new features on top of the current coupling produces a system that works for one team and breaks silently for everyone else. This is not optional sequencing — it is a hard prerequisite.

**Delivers:** A codebase where the main branch runs end-to-end on a blank-slate config; DTStack data lives on a named branch; no script constant lists module names or repo paths as literals.

**Addresses:** DTStack coupling (Pitfall 1), stale state file gitignore (Pitfall 7 — one-line fix, do first), `normalize-md-content.mjs` 1,138-line split (Pitfall 11), `mergeJsonFiles` non-deterministic root (Pitfall 15), `sync-source-repos.mjs` silent ff-only failure (Pitfall 12).

**Avoids:** All downstream phases inheriting coupling debt.

**Research flag:** Standard patterns — no additional research needed. This is systematic audit and refactor work.

---

### Phase 2: Config Schema + Init Wizard

**Rationale:** Config schema is the leaf dependency for all shared scripts and Skills. The init wizard is the gate every new user passes through. Both must exist before universal adoption is possible. Getting this right prevents the "mid-workflow missing field" failure mode that creates highest support burden.

**Delivers:** `config.schema.json` with `schemaVersion`; `loadConfig()` that validates and throws descriptive errors; `using-qa-flow init` with progressive disclosure flow (scan → propose → confirm → scaffold → probe integrations); `config.defaults.json` for automatic field backfill; `.trash/` prune script wired into init housekeeping.

**Uses:** Stack: Node.js built-ins only; no new dependencies.

**Implements:** Architecture components: config.json, using-qa-flow init, shared scripts layer.

**Avoids:** Config schema versioning absent (Pitfall 2), stale state path assumptions (Pitfall 7), `.trash/` retention never enforced (Pitfall 10).

**Research flag:** Standard patterns — JSON Schema validation and init wizard UX are well-documented. No additional research needed.

---

### Phase 3: Core Skill Rewrites

**Rationale:** Core Skills are the highest-traffic code path. After generalization and config stabilization, the Skills can be rewritten to be config-driven without risking regression on new users' blank configs.

**Delivers:** `test-case-generator`, `prd-enhancer`, `xmind-converter`, `archive-converter` Skills with all DTStack-specific prompt language, conditional branches, and hardcoded examples replaced by config-driven equivalents; universal `CLAUDE.md` template; `$MODULE_XMIND_PATH` variable injection pattern standardized across all step prompts.

**Addresses:** Anti-Pattern 1 (business domain leakage into core Skills), Anti-Pattern 2 (hardcoded output paths in prompts).

**Avoids:** Partial decoupling at the prompt layer after the script layer has already been cleaned (Pitfall 1 follow-on).

**Research flag:** Standard patterns. The adapter pattern and config-driven path resolution are documented in ARCHITECTURE.md. No additional research needed.

---

### Phase 4: IM Notification Integration

**Rationale:** Low-complexity, high-perceived-value feature that demonstrates the integration extension model before the more complex Playwright and Zentao integrations are built. Validates the adapter architecture in a low-risk context. Delivers immediate value to Chinese enterprise QA teams.

**Delivers:** `notify-im` Skill with four adapters (DingTalk, Feishu, WeCom, SMTP email); platform-agnostic content schema with per-platform renderers; `--dry-run` flag for format validation; DingTalk keyword validation in init; init wizard integration probing step for IM channels; `NOTIFY_CHANNELS` env var and all webhook env vars documented in `.env.example`.

**Uses:** Stack: Node.js built-in `fetch` + `crypto` for DingTalk/Feishu/WeCom; `nodemailer ^8.0.4` for email (only new npm dependency in this phase).

**Implements:** Architecture component: Integration adapter layer (IM side).

**Avoids:** Format divergence across platforms (Pitfall 5), DingTalk keyword silent drop (Pitfall 5), lowest-common-denominator plain-text notification (Pitfall 13).

**Research flag:** Needs a focused test of each webhook endpoint's actual behavior. DingTalk keyword security and Feishu card format have nuances not fully covered by documentation alone.

---

### Phase 5: Playwright Integration

**Rationale:** Highest-complexity feature of the v2 milestone. Requires stable archive format (from Phase 3), config-driven URL mappings, and integration adapters (Phase 4) for post-run notifications. Sequencing it last ensures it builds on a stable foundation rather than requiring retrofits to earlier phases.

**Delivers:** `playwright-runner` Skill with three sub-responsibilities (script generation, CLI execution, result sync); selector priority enforcement in generation prompt; auth setup flow with `storageState` capture; URL mapping in `config.json → playwright.urlMappings`; `run-tests.mjs` and `sync-results.mjs` scripts; `cases/playwright-scripts/<module>/<version>/` directory structure; bidirectional sync contract defined before either direction is implemented (MD → script first, result annotation second).

**Uses:** Stack: `@playwright/mcp@latest` for interactive debugging; `npx playwright test` via CLI for production runs (4x token reduction vs. MCP).

**Implements:** Architecture component: playwright-runner Skill.

**Avoids:** Selector brittleness (Pitfall 3), auth not modeled (Pitfall 4), bidirectional sync without defined contract (Pitfall 8), MCP overuse in token-constrained sessions (Anti-Pattern 3).

**Research flag:** Needs research-phase during planning. Playwright script generation from Markdown test cases is an emerging pattern; the specific selector priority enforcement and `storageState` setup flow need validation against a real target app before committing to the generation prompt template.

---

### Phase 6: Zentao Integration

**Rationale:** Delivers after IM notifications validate the integration model and adapter pattern. Zentao field mapping is highly instance-specific, so the init wizard's API-driven product/module ID discovery (Phase 2 scaffolding) must already exist.

**Delivers:** `submit-bug` Skill with Zentao adapter; wizard-driven product/module ID discovery via Zentao API; severity mapping (P0/P1/P2 → Zentao integers) configurable; test-submit step in init flow; token caching with expiry; all credentials in `.env`.

**Uses:** Stack: Zentao REST API v1 via `fetch`; no new npm dependencies.

**Implements:** Architecture component: Integration adapter layer (bug tracker side).

**Avoids:** Wrong field mapping per Zentao instance (Pitfall 6), hardcoded product IDs.

**Research flag:** Needs targeted research on the specific Zentao instance being used. The Zentao API docs are in Chinese and the field mapping is instance-specific. A test-submit against the real Zentao instance is required before declaring this phase done.

---

### Phase 7: Documentation Rebuild

**Rationale:** The README Quick Start section must describe a flow that actually works. Writing it before the init wizard exists and has been tested on a blank-slate project produces documentation that sends first-time users to a failure state and permanently reduces trust. Write last, after end-to-end validation.

**Delivers:** README Quick Start tested on a brand-new empty project with no DTStack config; `using-qa-flow` skill menu updated to reflect all v2 capabilities; `.env.example` covering all integration env vars.

**Avoids:** README describing non-existent init wizard (Pitfall 14).

**Research flag:** No research needed. Pure documentation and integration test work.

---

### Phase Ordering Rationale

- Phases 1-2 are prerequisites for everything else: no new feature work on top of coupling debt; no init wizard without a stable config schema.
- Phase 3 (core Skill rewrites) is decoupled from Phase 4 (IM notifications) — they can proceed in parallel if two developers are available, but Phase 3 must complete before Phase 5 (Playwright reads from archive output).
- Phase 4 before Phase 5 ensures the notification integration that Playwright uses post-run is already battle-tested.
- Phase 6 (Zentao) is explicitly after Phase 4 because the adapter pattern and init wizard integration probing need to be proven on lower-risk IM integrations first.
- Phase 7 (docs) is last because it documents the real behavior, not the intended behavior.

### Research Flags

Phases needing `/gsd:research-phase` during planning:
- **Phase 5 (Playwright Integration):** Script-from-Markdown generation is an emerging pattern; selector enforcement prompt templates and `storageState` setup flow need validation against a real app.
- **Phase 6 (Zentao Integration):** API field mapping is instance-specific; requires targeted research against the specific Zentao deployment being used.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Generalization Refactor):** Systematic audit and refactor; no novel patterns.
- **Phase 2 (Config Schema + Init Wizard):** JSON Schema validation and progressive init UX are well-documented patterns.
- **Phase 3 (Core Skill Rewrites):** Config-driven path resolution and adapter pattern are defined in ARCHITECTURE.md.
- **Phase 4 (IM Notifications):** Webhook POST patterns are standard; per-platform formats are documented.
- **Phase 7 (Documentation):** No research needed; write against real behavior.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All key decisions verified against official sources (Microsoft Playwright MCP, official Lark/DingTalk/WeCom docs, nodemailer npm). The Zentao docs are in Chinese but endpoint pattern confirmed via multiple sources. |
| Features | HIGH | Table stakes confirmed against v1 codebase. Differentiators validated against community comparisons and official Claude Code Skills docs. Anti-features grounded in explicit scope decisions from PROJECT.md. |
| Architecture | HIGH | Adapter pattern, config-driven routing, and sub-agent isolation patterns are verified against official Claude Code Skills docs and direct codebase analysis. Token comparison for MCP vs. CLI confirmed via community benchmark. |
| Pitfalls | HIGH | Critical pitfalls (1, 2, 5) drawn directly from codebase analysis of existing coupling points in CONCERNS.md plus verified external sources. Playwright pitfalls (3, 4, 8) confirmed against official Playwright docs and 2026 community reports. |

**Overall confidence:** HIGH

### Gaps to Address

- **Zentao instance specifics:** The Zentao REST API v1 endpoint pattern is confirmed, but field mapping (product IDs, severity integers, assign-to user lookup) is instance-specific. Cannot be resolved in research; requires a test call against the actual Zentao deployment during Phase 6 planning.
- **Playwright target app coverage:** Selector priority enforcement and auth setup flow are well-documented in principle, but the specific prompt template for the `step-generate-script.md` Skill step needs validation against a real target app before it can be declared production-ready.
- **DingTalk keyword behavior on edge cases:** Documentation confirms keyword security causes silent drops, but exact behavior when a message contains the keyword as a substring (vs. exact match) is not confirmed. Include a `--dry-run` test step to surface this before live deployment.
- **xmind-generator version pinning:** The library has no visible update cadence. The current version in use should be pinned in `package.json` before the generalization refactor, and the JSZip fallback path should be documented as the official recovery path rather than discovered reactively.

---

## Sources

### Primary (HIGH confidence)

- `@playwright/mcp` GitHub Releases (microsoft/playwright-mcp, v0.0.69 confirmed 2026-03-30) — Playwright MCP stack recommendation
- Microsoft DevOps Blog: Manual Testing to AI-Generated Automation — Playwright MCP integration patterns
- Feishu/Lark Open Platform official docs (open.larkoffice.com) — Feishu webhook format
- nodemailer npm (v8.0.4 confirmed) — Email stack recommendation
- Claude Code Agent Skills official docs (code.claude.com/docs/en/skills) — Architecture patterns
- Direct codebase analysis (CONCERNS.md, config.json, shared scripts) — Pitfall identification

### Secondary (MEDIUM confidence)

- DingTalk webhook documentation (alibabacloud.com help center) — DingTalk format and keyword security
- Playwright selector best practices 2026 (BrowserStack) — Pitfall 3 prevention strategy
- Playwright MCP token usage comparison (testdino.com, 2026) — MCP vs. CLI token decision
- Zentao REST API v1 docs (zentao.net/book/api, official, Chinese) — Zentao integration approach
- Testomat.io Playwright MCP guide — Feature landscape for Playwright integration
- Webhook architecture patterns (Beeceptor) — Integration adapter design

### Tertiary (LOW confidence)

- `@makun111/zentao-mcp-server` (glama.ai) — Mentioned as a future exploration path; not recommended for this milestone
- WeCom group robot (bika.ai third-party guide) — WeCom API is stable but source is not official

---

*Research completed: 2026-03-31*
*Ready for roadmap: yes*
