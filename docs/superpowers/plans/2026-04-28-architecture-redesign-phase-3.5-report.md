# P3.5 Tests Subdir Reorg Report

> **Status**: Complete · **Date**: 2026-04-28
> **Scope**: features/{ym-slug}/tests/ canonical layout per §4.5 + L1-L8 lint

## Tooling (15 new tests)

| Tool | Tests | Status |
|------|-------|--------|
| `import-fix` codemod | 3 | ✅ |
| `lint-tests` (L1-L7 rules) | 7 | ✅ |
| `reorg-tests` codemod + fixCaseImports | 5 | ✅ |
| CLI wiring (3 commands) | smoke-tested | ✅ |

## Pilots

| Pilot | Cases | Helpers Split | Lint |
|-------|-------|---------------|------|
| 【通用配置】json格式配置 | 46 → cases/ p0/p1 | 1 helper → helpers/ | ✅ clean |
| 有效性-取值范围枚举范围规则 | 24 → cases/ | 6 helpers → helpers/ (3 oversized) | 4 violations (L2 + 3x L4) |

## Sweep

| Project | Features Touched | Inline-Runner Manual Triage |
|---------|------------------|-----------------------------|
| dataAssets | 5 | 3 features (assets-integration, 岚图, 菜单名称修改) |
| xyzh | 0 | N/A |

## Post-Sweep Lint

| Project | Violations | Breakdown |
|---------|-----------|-----------|
| dataAssets | 15 across 3 features | L2(3) L3(2) L4(6) L7(4) |
| xyzh | 0 | N/A |

## Known Manual Followups

- **3 oversized helpers** in Pilot B (2589/2167/1536 lines) need splitting
- **3 oversized helpers** across swept features (924/849/836 lines) need splitting
- **cases/README.md** for swept features (2) need META extraction
- **Module subdirs** (L2) for 3 features with >=15 cases
- **Cross-feature import paths** remain partially unfixed (other features'
  references to Pilot B's helpers will break when Pilot B helpers move)
- **Placeholder slugs** (case-NN) in swept features — promotion to
  semantic slugs is a separate follow-up

## Engine Tests

149 pass (stable, no regression from 130 baseline). 19 format-check tests
restored by H-3 fix.

## Tags

- `refactor-v3-P3.5-snapshot` — pre-P3.5 baseline
- `refactor-v3-P3.5-pre-sweep` — pre-sweep rollback point
