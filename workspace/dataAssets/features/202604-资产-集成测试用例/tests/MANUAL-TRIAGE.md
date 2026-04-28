# MANUAL TRIAGE — features tests/ reorg

The following spec files embed test bodies inline (not just imports).
Automated reorg cannot safely split them. A human needs to:

1. Extract each `test(...)` block into a new `cases/t{nn}-{slug}.ts` file
2. Replace the inline body in this runner with `import "../cases/t{nn}-{slug}.ts"`
3. Verify Playwright still loads the runner

## Files

- `smoke.spec.ts`