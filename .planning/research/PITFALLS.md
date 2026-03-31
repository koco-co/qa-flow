# Domain Pitfalls

**Domain:** QA automation skills suite generalization — Playwright integration, IM notifications, project management integrations
**Researched:** 2026-03-31
**Confidence:** MEDIUM-HIGH (specific pitfalls drawn from codebase analysis + verified patterns from official sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, blocked phases, or months of rework.

---

### Pitfall 1: Implicit DTStack Coupling Surviving Refactor

**What goes wrong:** Config keys, directory names, prompt examples, and rule language all encode DTStack assumptions. A "generalization pass" that updates the main config but misses rule files, prompt steps, and script constants produces a framework that appears generic but fails for non-DTStack users at runtime.

**Why it happens:** The coupling is distributed across 5+ layers simultaneously: `config.json` (16 hardcoded repo paths), rules markdown (Doris/Hive/SparkThrift examples embedded as canonical), prompt steps (DTStack-conditional branches without a clear "skip if non-DTStack" path), and Node.js scripts (e.g., `VALID_MODULES` static array in `convert-history-cases.mjs` duplicating `config.json`). Each layer requires its own decoupling strategy.

**Consequences:** New users on non-DTStack projects get confusing validation failures, wrong directory names, or silently broken skill steps. Regression: DTStack users on the main branch lose their working workflows if coupling is partially removed.

**Warning signs:**
- Any script constant that lists module names, repo paths, or Java package prefixes as a literal array — not read from config
- Prompt text that says "如 Doris/Hive/SparkThrift" without wrapping in `{if DTStack}`
- A rule file that gives DTStack-specific examples as the only examples

**Prevention:**
1. Audit all scripts for literal strings that match DTStack terms before writing a single new line of generalization code. The CONCERNS.md audit already identified three instances — treat this as the floor, not the ceiling.
2. Separate the config schema into a `core` section (module keys, path aliases) and a `dtstack` extension section. Skills read from core; DTStack-specific steps read from extension.
3. Treat every example in every rule and prompt as a potential coupling point. Systematically replace with e-commerce equivalents before declaring a file "generalized."
4. Keep DTStack data on a named branch (`dtstack-data`) and validate that the main branch runs end-to-end with a blank-slate config before merge.

**Phase:** Generalization Refactor phase (must be first milestone; all subsequent work depends on it).

---

### Pitfall 2: Config Schema Versioning Absent — Breaking New Users

**What goes wrong:** `config.json` grows organically as features are added (`dataAssetsVersionMap`, `zentaoId`, `repoBranchMapping`, `trash.retentionDays`). When users initialize qa-flow v2 on a new project, their blank config is missing fields that scripts silently expect. The `using-qa-flow init` flow produces a config that causes subtle breakage later rather than a clear error up-front.

**Why it happens:** There is no schema version field in `config.json`, no JSON Schema validation on load, and `loadConfig()` does not deep-merge against a defaults file. Fields that are present in the DTStack workspace simply happen to work; new users discover missing fields only when a specific skill step fails.

**Consequences:** First-time users hit confusing errors in mid-workflow (e.g., during `source-sync` or XMind generation), not at init time. Support burden is high because the error location is distant from the missing config field.

**Warning signs:**
- Any script that accesses `config.someField` without a `?? defaultValue` or explicit check
- The `dataAssetsVersionMap` single-entry table pattern — a map that must be manually updated per release
- `zentaoId` only set for two of six modules in `config.json`

**Prevention:**
1. Define a canonical `config.schema.json` before writing the init wizard. Every field must have a default and a description.
2. `loadConfig()` must validate against the schema on every load and throw a descriptive error listing the missing field name and the step that requires it.
3. Ship a `config.defaults.json` that `using-qa-flow init` deep-merges into a user's config, so new fields added in future versions are picked up automatically.
4. Add a `schemaVersion` field to `config.json` and increment it on breaking changes. The init flow should warn when the user's version is behind.

**Phase:** Generalization Refactor (schema) and Init Wizard (enforcement).

---

### Pitfall 3: Playwright Selector Brittleness on Unknown Target Apps

**What goes wrong:** AI-generated Playwright scripts depend on selectors that work in one app but break across the arbitrary apps qa-flow v2 targets. CSS class selectors, positional selectors (`nth-child`), and auto-generated IDs are inherently brittle. The "Markdown test case → Playwright script" pipeline will produce scripts that pass on generation day and fail within days of any UI update.

**Why it happens:** Playwright MCP and LLM-based script generators default to whatever selector is visible in the accessibility snapshot. Without a clear selector hierarchy enforced in the generation prompt, the model picks the most specific-looking selector it sees — which is usually the most brittle one.

**Consequences:** Generated scripts require constant manual repair. QA engineers lose trust in automation. The "self-healing" promise of Playwright Agents requires the Healer agent, which adds latency and token cost to every CI run. The value proposition of md → script automation collapses into a maintenance burden.

**Warning signs:**
- Generated scripts contain selectors like `.ant-table-row:nth-child(3)` or `#root > div > div > div:nth-child(2)`
- Target app uses a component library (Ant Design, Element UI, Shoelace) with Shadow DOM
- Generated scripts pass locally but fail in headless CI

**Prevention:**
1. Enforce a selector priority in the Playwright generation prompt: `getByRole` > `getByLabel` > `getByTestId` (`data-testid`) > `getByText` (exact) > CSS as last resort.
2. Add a validation step after generation that scans the script for CSS class selectors and flags them as warnings before presenting to the user.
3. In the init wizard, ask the user whether the target app uses a component library and inject library-specific guidance (e.g., Ant Design aria roles) into the generation prompt.
4. Shadow DOM deserves an explicit test during skill setup: if the init run detects Shadow DOM, warn the user that Playwright MCP accessibility-tree snapshots cannot see inside it, and recommend `page.locator(':host > button')` patterns.

**Phase:** Playwright Integration phase.

---

### Pitfall 4: Authentication Not Modeled — Scripts Fail on Protected Pages

**What goes wrong:** Every real enterprise app requires login. Generated Playwright scripts that target protected pages re-authenticate on every test run, hit session rate limits, or trigger security alerts from the target system. Cookie/session state is not preserved between runs.

**Why it happens:** The happy-path demo always shows a logged-in browser. The generation prompt does not ask the user for auth configuration. Playwright's built-in `storageState` mechanism is not mentioned in any skill template.

**Consequences:** All generated scripts fail on the first real app page. QA engineers manually patch in login steps, defeating the automation purpose. Auth credentials end up hardcoded in scripts.

**Warning signs:**
- The init flow does not ask "does the app require login?"
- No `storageState.json` in the generated project structure
- Scripts begin with `page.goto('/dashboard')` without a preceding auth fixture

**Prevention:**
1. The Playwright skill MUST include an auth setup step as part of initialization: `npx playwright login` or a guided `storageState` capture flow before script generation begins.
2. Store `storageState.json` in the generated project at a well-known path (e.g., `playwright/.auth/state.json`) and reference it via `playwright.config.ts` `use.storageState`.
3. Treat credentials as secrets: the init wizard must write auth config to `.env` (gitignored), never into `playwright.config.ts` itself.
4. Add a pre-run health check that opens the target URL, detects a redirect to a login page, and aborts with a clear message if `storageState` is missing or expired.

**Phase:** Playwright Integration phase (must be solved before any script generation is exposed to users).

---

### Pitfall 5: IM Notification Format Divergence Across Platforms

**What goes wrong:** DingTalk, Feishu, and WeChat Work each use a different message format. A single notification payload written for one platform fails silently or displays garbled content on the others. Feishu uses JSON card blocks; DingTalk uses Markdown with custom keyword security requirements; WeChat Work uses text or Markdown. There is no unified abstraction.

**Why it happens:** All three webhooks look similar at first glance (POST JSON to URL). Developers write the DingTalk version first, copy-paste for Feishu, and discover the format mismatch only when testing the second platform. DingTalk also requires that the message body contain a pre-configured keyword or the message is silently dropped.

**Consequences:** Notifications appear to send (HTTP 200) but are never delivered. Debugging is time-consuming because the failure is at the platform level, not the HTTP level. DingTalk's keyword security requirement is especially opaque — there is no error message, just silence.

**Warning signs:**
- A single `sendNotification(message)` function that accepts a plain string
- No platform-specific formatting layer between the notification content and the HTTP call
- The DingTalk webhook URL was generated without setting a custom keyword

**Prevention:**
1. Define a platform-agnostic notification schema (title, summary, detail list, severity, link) and write separate renderers for each platform that translate this schema to platform-native format.
2. For DingTalk: document the keyword requirement prominently in the init wizard. The wizard must ask the user to enter their configured keyword and inject it into a template string for all DingTalk messages.
3. For Feishu: use the card message format from the start, not plain text — it is not significantly harder and avoids a later migration.
4. Rate limit awareness: DingTalk free tiers have no API access; Pro plans allow 10,000 daily calls. The notification layer must never fire more than once per workflow run regardless of how many sub-steps complete.
5. Include a `--dry-run` mode for notifications that logs the formatted payload without sending, so users can validate format before live use.

**Phase:** IM Notification Integration phase.

---

### Pitfall 6: Zentao Bug Auto-Submission Field Mapping Is Fragile

**What goes wrong:** Zentao's bug creation API requires fields (product ID, module ID, severity, assign-to user) that are specific to each Zentao instance and project. Auto-submission that hardcodes these IDs works for one team's Zentao setup and silently fails for another's. Non-standard field labels in Zentao's UI also make the mapping between qa-flow's bug report schema and Zentao's API fields non-obvious.

**Why it happens:** Zentao's API documentation uses product/module IDs that are opaque integers. The mapping between a human-readable product name and its Zentao integer ID must be configured per instance. Teams frequently skip this configuration step and discover the problem when the first auto-submitted bug lands in the wrong project.

**Consequences:** Bugs submitted to the wrong product, or submissions that fail with an unhelpful "validation error" from Zentao's API. If the assign-to field is missing or maps to a non-existent user, Zentao silently discards the assignment.

**Warning signs:**
- The init wizard does not ask for Zentao base URL, API key, and a product/module ID mapping
- Bug submission code contains a hardcoded product ID
- No test submission step in the init flow

**Prevention:**
1. The Zentao integration must be configured entirely through the init wizard, not through manual config edits. Wizard should call the Zentao API to list available products and let the user select, then store the integer IDs.
2. Implement a test-submit step in the init wizard that creates a draft bug (or uses a sandbox if available) to verify the field mapping before production use.
3. Severity mapping (qa-flow P0/P1/P2 → Zentao severity integers) must be explicitly configurable, not assumed.
4. Handle Zentao API authentication separately from the main config to avoid storing API keys in committed files.

**Phase:** Zentao Integration phase.

---

### Pitfall 7: Stale State Files Block Resume Logic — Now, and More So After Generalization

**What goes wrong:** Orphaned `.qa-state-*.json` files (already documented in CONCERNS.md) cause incorrect resume behavior. When generalized to arbitrary projects with different directory structures, the state file path assumptions (`cases/requirements/<module>/<version>/`) will not hold, causing state files to be written to the wrong location or not found on resume.

**Why it happens:** State file paths are constructed by concatenating hardcoded base paths from `config.json` with module keys. The cleanup step (`step-notify`) only runs on success — failed or interrupted runs leave state files in place. The `.gitignore` pattern covers single-PRD state files but not the per-slug variant (`**/.qa-state-*.json`).

**Consequences:** On a new project where the user interrupts mid-run, resume fails because the state file exists but the referenced archive path does not. Worse, if the user re-runs with a different module key, two state files coexist and the skill picks the wrong one.

**Warning signs:**
- Any `.qa-state-*.json` file that has an `archive_md_path` pointing to a non-existent file
- The `.gitignore` does not include `**/.qa-state-*.json`
- The notify/cleanup step is the only place state files are deleted

**Prevention:**
1. Add `**/.qa-state-*.json` to `.gitignore` before starting any other work. This is a one-line fix.
2. Generalize the state file path to be configurable: `config.statePath` or derived from the init wizard's project root setting, not from a hardcoded `cases/requirements/` prefix.
3. Add a `--clean-state` command to `using-qa-flow` that lists all orphaned state files and prompts the user to confirm deletion.
4. On the `parse-input` step, validate that any found state file's referenced paths still exist before committing to resume mode.

**Phase:** Generalization Refactor (gitignore fix immediate), Init Wizard (path generalization).

---

### Pitfall 8: Markdown Test Case → Playwright Script Is a One-Way Pipe Without Bidirectional Sync

**What goes wrong:** PROJECT.md requires "script execution results feed back into MD test cases (bidirectional sync)." This is architecturally more complex than it appears. The Playwright script structure (fixtures, `test.describe`, `test.step`) does not map cleanly back to the Markdown table format used in Archive files. Without a defined intermediate representation, the sync is implemented ad-hoc and breaks whenever either format evolves.

**Why it happens:** The natural first implementation writes the sync logic directly against the Playwright file format and the Markdown file format. When either format changes, both sync directions must be updated. The existing intermediate JSON format (used between the Writer and XMind steps) is not extended to cover Playwright output.

**Consequences:** One of three outcomes: the bidirectional sync is never implemented because it is too hard; it is implemented but breaks on the first format change; or it requires a full-time maintenance effort to keep both directions working.

**Warning signs:**
- Playwright generation prompt does not reference the intermediate JSON schema
- The Archive MD format changes without also updating the Playwright sync contract
- "bidirectional sync" is listed as a single story with no schema definition task preceding it

**Prevention:**
1. Define the bidirectional sync contract (a JSON or structured YAML) before implementing either direction. This intermediate format must be stable, versioned, and shared between the Playwright generation skill and the Archive sync skill.
2. The Playwright Agents workflow (Planner → Generator) natively produces Markdown specs, which are structurally closer to qa-flow's Archive MD format than raw Playwright test files. Use Playwright's Planner output as the intermediate representation rather than inventing one.
3. Implement MD → Playwright first, then Playwright result → MD annotation (pass/fail/skip status on each case). Do not attempt full bidirectional structural sync as a first pass.

**Phase:** Playwright Integration phase (define contract first, implement generation second, implement result sync third).

---

## Moderate Pitfalls

---

### Pitfall 9: `xmind-generator` Library Is an Unmonitored Dependency

**What goes wrong:** All XMind output depends on `xmind-generator`, which wraps an undocumented binary format. The library has no visible update cadence. A major XMind desktop version change has historically broken third-party generators without notice.

**Warning signs:** XMind files open but display corrupt root nodes; the `json-to-xmind.mjs` test suite passes but generated files fail to open in a new XMind version.

**Prevention:**
1. The project already uses JSZip to write directly into the `.xmind` archive (`appendToExisting`, `buildWorkbookBuffer`). Document this as the official fallback path today, not after breakage.
2. Pin the `xmind-generator` version in `package.json` and add a monthly check to the project changelog to verify the library is still maintained.
3. The existing 2 failing tests for DTStack root title format should be fixed before generalization — broken tests during a major refactor become invisible noise.

**Phase:** Pre-refactor (fix tests), ongoing monitoring.

---

### Pitfall 10: `.trash/` Retention Is Declared but Never Enforced

**What goes wrong:** `config.json` declares `retentionDays: 30` but no script reads or acts on it. At 38 MB already across 4 directories, disk usage will grow unbounded. On open-source installations, users who run qa-flow for months will accumulate gigabytes without knowing there is a cleanup mechanism.

**Warning signs:** `retentionDays` appears in config but grep finds no script that reads it. `.trash/` directories have timestamps older than 30 days.

**Prevention:** Implement `prune-trash.mjs` and wire it into `using-qa-flow init` as a "housekeeping" sub-step before any other work. This is a low-complexity, high-trust-building feature to ship early.

**Phase:** Generalization Refactor or Init Wizard phase (housekeeping before open-source release).

---

### Pitfall 11: `normalize-md-content.mjs` at 1,138 Lines Will Become a Merge Conflict Magnet

**What goes wrong:** The single-file normalization script handles three distinct input formats. Generalization requires adding new format variants for arbitrary projects. Every feature touches the same file, creating merge conflicts and making the module hard to test in isolation.

**Warning signs:** The file already exceeds the 800-line limit in the project coding standards. The `audit --fix` path that touches archive body content has no edge case test coverage.

**Prevention:** Extract `normalizeTableStyleArchiveBody` and `normalizeXmindStyleArchiveBody` into separate files before adding new format support. Write unit tests for each extracted module before the split. This is a prerequisite for safely adding generalization-era format variants.

**Phase:** Generalization Refactor (code split) before any new format work.

---

### Pitfall 12: `sync-source-repos.mjs` Fails Silently on Diverged Remote Branches

**What goes wrong:** `--ff-only` pull aborts when the remote has been force-pushed. With no recovery path, DTStack users cannot generate test cases until a human operator manually resets the repo. This failure mode has no tests.

**Warning signs:** The skill step silently exits with an error code that the orchestrator treats as a completed step. DTStack users report "wrong test cases" without understanding why.

**Prevention:**
1. Trap the `ff-only` failure explicitly and emit a human-readable error explaining the cause and the manual recovery command (`git reset --hard origin/<branch>`).
2. Add a test for the diverged branch scenario using a mock git repo in the test suite.

**Phase:** Pre-refactor (fix before generalization, since this is a current regression path for existing DTStack users).

---

## Minor Pitfalls

---

### Pitfall 13: Multiple IM Platforms Tempts a "Lowest Common Denominator" Notification

**What goes wrong:** Supporting DingTalk + Feishu + WeChat Work + Email simultaneously pressures developers to produce a single plain-text message that works everywhere. Plain text wastes the rich formatting capabilities of each platform and produces notifications that users ignore.

**Prevention:** Use the platform-agnostic schema described in Pitfall 5. Rich formatting per platform is not significantly more work when the content model is cleanly separated from the renderer. Implement one renderer at a time rather than all four at once.

**Phase:** IM Notification Integration.

---

### Pitfall 14: Open-Source README Written Before the Init Wizard Exists

**What goes wrong:** The README's Quick Start section promises "one-command init." If the README is written before the init wizard is implemented and tested with a real blank-slate project, it will describe a flow that does not work. First-time users follow the README, fail at step 2, and never return.

**Prevention:** Write the README Quick Start section last, after running the init wizard end-to-end on a brand-new empty project with no DTStack config. Treat the README as integration test documentation.

**Phase:** Documentation Rebuild phase (final milestone).

---

### Pitfall 15: `mergeJsonFiles` Uses First-File Meta as Canonical for Multi-Input XMind

**What goes wrong:** Already documented in CONCERNS.md. When multiple JSON files are merged, root title and version come from the first file only. Different input orderings produce different XMind roots, causing non-deterministic output.

**Prevention:** Add a guard that validates `project_name` and `version` consistency across all inputs before merging, and emit a clear error if they differ. This is a pre-existing bug that will surface more frequently as generalization exposes the XMind merger to non-DTStack users.

**Phase:** Generalization Refactor (fix with the other known bugs).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Generalization Refactor | Partial decoupling (Pitfall 1) | Systematic audit across all 5 coupling layers before writing new code |
| Config Schema / Init Wizard | Missing-field silent failures (Pitfall 2) | Define `config.schema.json` and validate on `loadConfig()` before wizard UI |
| Init Wizard | Stale state path assumptions (Pitfall 7) | Generalize state file path in init wizard; add gitignore fix immediately |
| Playwright Integration | Brittle selectors on unknown apps (Pitfall 3) | Enforce selector priority in generation prompt; warn on CSS selectors |
| Playwright Integration | Auth not modeled (Pitfall 4) | `storageState` setup is a required init step, not optional |
| Playwright Integration | Bidirectional sync architecture (Pitfall 8) | Define contract before coding either direction; use Playwright Planner output as intermediate |
| IM Notification | Format divergence across platforms (Pitfall 5) | Platform-agnostic content schema + per-platform renderers from the start |
| IM Notification | DingTalk keyword security silent drop (Pitfall 5) | Init wizard must ask for keyword and validate with a test message |
| Zentao Integration | Wrong field mapping per instance (Pitfall 6) | Wizard-driven product/module ID discovery via API; test-submit during init |
| Documentation Rebuild | README describes non-existent init wizard (Pitfall 14) | Write README Quick Start only after end-to-end init wizard test |
| All phases | `xmind-generator` breakage (Pitfall 9) | Document JSZip fallback path now; pin library version |

---

## Sources

- Playwright Agents official docs (Planner, Generator, Healer): [Playwright Test Agents](https://playwright.dev/docs/test-agents)
- Playwright selector best practices 2026: [BrowserStack — Playwright Selector Best Practices](https://www.browserstack.com/guide/playwright-selectors-best-practices)
- Playwright MCP authentication pitfalls: [Bug0 — Playwright MCP Changes the Build vs. Buy Equation](https://bug0.com/blog/playwright-mcp-changes-ai-testing-2026)
- DingTalk rate limits and keyword security: [Bika.ai — DingTalk Send Message to Group](https://bika.ai/help/guide/automation/dingtalk-webhook-action)
- Platform notification format differences: [Sensors Analytics — Enterprise Group Notification](https://docs.sensorsdata.com/sa/docs/sa_webhook/v0300)
- Zentao API manual: [ZenTao — Confirm Bug Optional Information](https://www.zentao.pm/book/zentao-api-manual/286.html)
- Claude Code Skills deep dive: [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- QA framework coupling anti-patterns 2025-2026: [Sauce Labs — Beyond Pass/Fail: 3 Strategic QA Trends](https://saucelabs.com/resources/blog/beyond-pass-fail-3-strategic-trends-that-will-define-qa-in-2026)
- Codebase analysis: `/Users/poco/Documents/DTStack/qa-flow/.planning/codebase/CONCERNS.md`
- Project context: `/Users/poco/Documents/DTStack/qa-flow/.planning/PROJECT.md`
