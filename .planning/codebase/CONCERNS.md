# Codebase Concerns

**Analysis Date:** 2026-03-31

---

## Tech Debt

**Hardcoded module list in convert-history-cases.mjs:**
- Issue: `VALID_MODULES` is a static array `["离线开发", "数据资产", "统一查询", "变量中心", "信永中和", "公共组件"]` that duplicates the authoritative module registry in `.claude/config.json`.
- Files: `.claude/skills/archive-converter/scripts/convert-history-cases.mjs` lines 65-72
- Impact: When a new module is added to `config.json`, `convert-history-cases.mjs` must also be manually updated or the `--module` flag will reject valid module names.
- Fix approach: Replace the static array with `Object.values(loadConfig().modules).map(m => m.zh)` from `load-config.mjs`.

**`dataAssetsVersionMap` is a one-entry manual lookup table:**
- Issue: `config.json`'s `dataAssetsVersionMap` contains only one hard-coded entry (`"数据资产v6.4.10.xmind": "v6.4.10"`). New versions require manual config edits.
- Files: `.claude/config.json` (field `dataAssetsVersionMap`), `.claude/shared/scripts/unify-directory-structure.mjs` line 678, `.claude/skills/archive-converter/scripts/convert-data-assets-v2.mjs` line 347
- Impact: `unify-directory-structure.mjs` can fail to extract a version from XMind filenames for new releases, silently skipping those files.
- Fix approach: Either automate extraction from the filename regex (pattern `v\d+\.\d+`) or document that this map must be updated per release.

**`DEFAULT_REPO_HINT_KEYS_BY_PRODUCT` is not config-driven:**
- Issue: Repo hint keys for source resolution are hardcoded in `md-content-source-resolver.mjs` as a constant, independent of `config.json`'s `repos` section.
- Files: `.claude/shared/scripts/md-content-source-resolver.mjs` lines 34-41
- Impact: If a module's repo associations change, two places must be kept in sync.
- Fix approach: Move the mapping into `config.json` under `modules[].repoHints` and read it via `loadConfig()`.

**`zentaoId` only configured for two modules:**
- Issue: Only `batch-works` (24) and `data-assets` (23) have `zentaoId` in `config.json`. The three other DTStack modules (`data-query`, `variable-center`, `public-service`) silently omit the `(#ID)` suffix from XMind root titles.
- Files: `.claude/config.json`, `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` line 67
- Impact: Generated XMind titles for those modules are inconsistent; root nodes cannot be traced back to Zentao projects.
- Fix approach: Add `zentaoId` for all DTStack modules, or document which modules intentionally have none.

---

## Known Bugs

**DTStack root title test failure (2 failing assertions):**
- Symptoms: `test-json-to-xmind.mjs` reports 2 failures: "DTStack root title 使用 <项目><版本>迭代用例" and "多输入 DTStack root title 保持不变". The test asserts `root.title === "数据资产v6.4.10迭代用例"` but the script produces a title without the `(#23)` zentaoId suffix — or vice versa; actual vs. expected mismatch in test vs. production config.
- Files: `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` `buildRootTitle()`, `.claude/tests/test-json-to-xmind.mjs` lines 321, 357
- Trigger: Running `node .claude/tests/run-all.mjs` or `node .claude/tests/test-json-to-xmind.mjs`
- Workaround: None; root title format is incorrect in generated XMind files for DTStack modules.

**`latest-output.xmind` symlink is absent:**
- Symptoms: `test-output-convention-migration.mjs` fails with "latest-output.xmind 存在" — the symlink at the repo root does not exist at test time, which also means tooling that reads `latest-output.xmind` after generation may break.
- Files: `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` `refreshLatestOutput()`, symlink path `latest-output.xmind` at repo root
- Trigger: Running `node .claude/tests/run-all.mjs` or `node .claude/tests/test-output-convention-migration.mjs`
- Workaround: Generate a new XMind to recreate the symlink.

**`archive_md_path` in active `.qa-state` files points to non-existent archive files:**
- Symptoms: `test-output-convention-migration.mjs` reports 4 state files whose `archive_md_path` values reference files that do not exist under `cases/archive/data-assets/v6.4.10/`.
- Files: `cases/requirements/data-assets/v6.4.10/.qa-state-【通用配置】json格式配置.json`, `.qa-state-【内置规则丰富】完整性...json`, `.qa-state-【内置规则丰富】有效性...（格式校验）.json`, `.qa-state-【内置规则丰富】有效性...（且或关系）.json`
- Trigger: Running `test-output-convention-migration.mjs`; also means resume/continuation logic will fail to find the referenced archive files.
- Workaround: Re-run the `archive` step for those PRDs or delete the stale state files.

---

## Security Considerations

**Lanhu cookie stored in plain `.env` file:**
- Risk: The Lanhu session cookie (used for PRD import) is stored in `tools/lanhu-mcp/.env` as `LANHU_COOKIE`. The cookie grants access to design assets.
- Files: `tools/lanhu-mcp/.env` (gitignored), `.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py`
- Current mitigation: `.gitignore` excludes `tools/lanhu-mcp/.env`; the file is not committed.
- Recommendations: No additional action required unless the `.env` is shared across machines; rotate the cookie after suspected exposure.

---

## Performance Bottlenecks

**`normalize-md-content.mjs` is 1,138 lines with no code splitting:**
- Problem: The normalization script handles table-style, bullet/XMind-tree, and hybrid formats in a single file, making it the largest script in the codebase.
- Files: `.claude/shared/scripts/normalize-md-content.mjs`
- Cause: All archive body normalization paths coexist in one module, including many regex-heavy classification and transformation functions.
- Improvement path: Extract `normalizeTableStyleArchiveBody` and `normalizeXmindStyleArchiveBody` into separate files under a `normalize/` subdirectory; the 800-line rule from project coding standards applies.

**`audit-md-frontmatter.mjs` performs full directory walk without caching:**
- Problem: Every run re-reads all `.md` files under `cases/archive/` and `cases/requirements/`, which grows over time.
- Files: `.claude/shared/scripts/audit-md-frontmatter.mjs` (1,083 lines)
- Cause: No incremental mode or file-modification timestamp check.
- Improvement path: Add `--since` option that compares `mtime` against a last-audit timestamp, or integrate with `INDEX.json` already generated by `build-archive-index.mjs`.

---

## Fragile Areas

**`mergeJsonFiles` in `json-to-xmind.mjs` uses `all[0].meta` as the canonical root meta for multi-input:**
- Files: `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` lines 276-290
- Why fragile: When multiple JSON files are merged, root title and version are derived from only the first file's `meta`. If files are passed in a different order, the root title will differ. No validation enforces consistent `project_name`/`version` across inputs.
- Safe modification: Always pass the primary requirement JSON first; add a guard that warns when `project_name` or `version` differ across inputs.
- Test coverage: 2 tests currently failing for this exact behavior.

**`sync-source-repos.mjs` uses `--ff-only` pull which aborts on diverged remote:**
- Files: `.claude/skills/using-qa-flow/scripts/sync-source-repos.mjs` line 57
- Why fragile: A non-fast-forward remote branch (e.g., after a force-push) causes the entire sync to throw an error with no recovery path, blocking test-case generation for DTStack modules.
- Safe modification: Add error messaging that identifies `ff-only` failures separately and suggests `git reset --hard origin/<branch>` as the recovery step (already forbidden for Claude agents per `repo-safety.md`, so the guidance must go to the human operator).
- Test coverage: Tested only for happy path; no tests for diverged branch scenarios.

**`.qa-state` file cleanup is user-dependent and not automated:**
- Files: `.claude/skills/test-case-generator/prompts/step-notify.md`, `.gitignore` (pattern `**/.qa-state.json` covers single-PRD state but not per-PRD slug files `**/.qa-state-*.json`)
- Why fragile: Orphaned per-PRD state files (e.g., `.qa-state-【通用配置】json格式配置.json`) remain after failed or incomplete runs. If the user does not manually trigger the `notify` step, stale state causes incorrect resume behavior.
- Safe modification: Add a gitignore rule for `**/.qa-state-*.json`; add a cleanup script or a `--clean-state` flag to `test-case-generator`.
- Test coverage: `test-output-convention-migration.mjs` detects orphaned state files but does not fix them.

---

## Scaling Limits

**`cases/requirements/data-assets/v6.4.10/temp/` accumulates intermediate JSON files:**
- Current capacity: 7 intermediate `final-reviewed-*.json` files totaling ~450 KB currently.
- Limit: No automated cleanup; files grow without bound. Intermediate JSONs can be 50-100 KB each.
- Scaling path: The `step-notify.md` cleanup step deletes `temp/` on success, but orphaned runs leave files behind. Add a `--clean-temp` utility or document that `temp/` is safe to purge manually.

**`.trash/` directory has no automated pruning despite `retentionDays: 30` in config:**
- Current capacity: 38 MB across 4 timestamped subdirectories.
- Limit: `retentionDays` is declared in `config.json` but no script reads or enforces it. The directory will grow unbounded.
- Scaling path: Implement a `prune-trash.mjs` script that reads `config.trash.retentionDays` and deletes subdirectories older than that threshold; wire it into `using-qa-flow init` or as a cron reminder.

---

## Dependencies at Risk

**`xmind-generator` library wraps an undocumented XMind binary format:**
- Risk: `xmind-generator` (used in `json-to-xmind.mjs`) has no published update cadence visible in the project lockfile; XMind format changes between versions have historically broken third-party generators.
- Impact: All XMind generation breaks if the library becomes incompatible with newer XMind desktop versions.
- Migration plan: The project already uses JSZip to directly manipulate `content.json` inside the `.xmind` archive (see `appendToExisting`, `buildWorkbookBuffer`). If `xmind-generator` breaks, direct JSON generation via JSZip is a feasible fallback.

---

## Missing Critical Features

**No automated `.trash/` pruning despite config declaring `retentionDays: 30`:**
- Problem: `config.json` declares `"trash": { "dir": ".trash/", "retentionDays": 30 }` but no script reads or acts on this field.
- Blocks: Expected housekeeping does not happen; disk usage grows silently.

**`.gitignore` has wrong path for test temp directories:**
- Problem: `.gitignore` line 24 reads `.claude/scripts/__test_*/` but the actual test temp directories are created in `.claude/tests/__test_*/`.
- Blocks: 88 leftover test temp directories (all empty but structurally present) are not gitignored under their real path. Running `git status` shows no issue only because the directories are empty; non-empty runs would pollute `git status`.
- Fix: Change `.gitignore` entry to `.claude/tests/__test_*/`.

---

## Test Coverage Gaps

**DTStack root title generation is broken and not caught by CI:**
- What's not tested: The correct `<项目><版本>迭代用例(#<zentaoId>)` format including the zentaoId suffix for `data-assets`.
- Files: `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` `buildRootTitle()`, `.claude/tests/test-json-to-xmind.mjs`
- Risk: Every generated XMind for `data-assets` has a malformed root title.
- Priority: High

**No tests for `sync-source-repos.mjs` error paths:**
- What's not tested: Network failure, diverged branch (`ff-only` failure), missing `.repos/` directory.
- Files: `.claude/skills/using-qa-flow/scripts/sync-source-repos.mjs`
- Risk: Silent failure during DTStack source sync could cause Writer subagents to generate cases against stale or wrong source code.
- Priority: High

**No tests for `.trash/` pruning (feature does not exist):**
- What's not tested: Retention enforcement.
- Files: `.claude/config.json` `trash.retentionDays`, all scripts using `trashFile()` / `trashDir()`
- Risk: Disk fills silently.
- Priority: Medium

**`normalize-md-content.mjs` bullet/XMind-tree path lacks edge case coverage:**
- What's not tested: Partial XMind sources (original `.xmind` missing, fallback to header-tree parse), deeply nested `####` + `#####` with mixed bullet and table rows.
- Files: `.claude/shared/scripts/normalize-md-content.mjs`, `.claude/tests/test-md-body-normalization.mjs`
- Risk: Silent data loss when normalizing hybrid-format archive files during `audit --fix` runs.
- Priority: Medium

---

*Concerns audit: 2026-03-31*
