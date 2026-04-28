# P4 Skill 4-File Contract Report

> **Status**: Complete · **Date**: 2026-04-28
> **Scope**: spec §5.4 (4-file lock per skill) + §5.5 (owner_skill frontmatter)

## Skills Consolidated (7)

| Skill | Files Before | After |
|-------|-------------|-------|
| case-format       | SKILL + 5 workflow files | SKILL + workflow + rules |
| daily-task        | SKILL + 8 modes files + refs | SKILL + workflow + rules + refs |
| knowledge-keeper  | SKILL + 2 workflow files | SKILL + workflow + rules |
| playwright-cli    | SKILL + refs (no workflow!) | SKILL + workflow (new) + rules (new) + refs |
| test-case-gen     | SKILL + 12 workflow files + refs | SKILL + workflow + rules + refs |
| ui-autotest       | SKILL + 12 workflow files + refs + scripts/ | SKILL + workflow + rules + refs (scripts/ → engine/) |
| using-kata        | SKILL + 3 workflow files (incl. nested refs) | SKILL + workflow + rules + refs |

## Sub-Agent Frontmatter

14 agents now declare `owner_skill:`. Mapping:

| Agent | owner_skill |
|-------|-------------|
| analyze-agent, source-facts-agent, writer-agent, reviewer-agent, format-checker-agent | test-case-gen |
| pattern-analyzer-agent, subagent-a-agent, subagent-b-agent | ui-autotest |
| standardize-agent | case-format |
| bug-reporter-agent, backend-bug-agent, frontend-bug-agent, conflict-agent, hotfix-case-agent | daily-task |

## Tooling

- `engine/src/lint/skill-shape.ts` (S1-S7, TDD: 4 tests)
- `engine/src/lint/skill-frontmatter.ts` (A1-A4, TDD: 4 tests)
- `engine/src/cli/skill-audit.ts` (`kata-cli skill audit`)

## Side-Cleanups

- ui-autotest scripts/ (3 .ts + 2 tests) → `engine/src/ui-autotest/`
- using-kata workflow/references/quickstart.md → references/quickstart.md (top-level)
- daily-task modes/ folded into workflow.md as 3 mode sections
- Fixup H2: renamed fixture file to avoid Bun test discovery
- Fixup L2: unanchored `.gitignore` .debug/ pattern
- Fixup M2: gitignored handoff artifacts
- Fixup M1: documented P3.5 completion

## Remaining Violations (6, all expected)

| Rule | Detail | Reason |
|------|--------|--------|
| S4 | playwright-cli SKILL.md 360 lines | Pre-existing, real skill content |
| A4 (×4) | standardize-agent → test-case-gen refs | Legitimate cross-skill knowledge refs |
| A4 (×1) | writer-agent → ui-autotest ref | Legitimate cross-skill knowledge ref |

## Final Audit

- skill:audit total violations: 6 (all expected/acceptable)
- Engine test pass count: 157 (stable, no regression)
- 8 new TDD tests added (4 skill-shape + 4 frontmatter)

## Known Followups

- P4.5: dtstack-cli → dtstack-sdk rename
- Cross-document anchor link verification across docs/
