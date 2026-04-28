# P8 Engine Test Recovery Report

> **Status**: Complete · **Date**: 2026-04-28

## Final Counts

| 指标 | P7.6 | P8 final | Delta |
|------|------|----------|-------|
| pass | 466 | **478** | +12 |
| fail | 358 | 352 | -6 |
| errors | 8 | 8 | 0 |
| 总测试数 | 824 | 830 | +6 |

增量未达目标（≥800 pass），352 残留 fail 集中在 E4 业务回归（CLI 子进程路径、模块加载失败）。

## What Was Fixed

| 阶段 | 改动 |
|------|------|
| P8.0 | R-1 hot-patch：9 处 silent corruption（engine/src/ui-autotest/__tests__/）|
| P8.1 | fix-truthy codemod TDD（6 fixture pair）+ 1 文件应用 |
| P8.1 | Codemod CLI --mode fix-truthy（扫描范围扩展至 engine/src/**/__tests__/）|
| P8.2 | test:bucket-audit CLI（E1-E5 分桶审计）|

## Tooling Shipped

- `engine/src/codemod/fix-truthy-corruption.ts` + 6 TDD fixture pairs（17/17 codemod 测试全绿）
- `kata-cli codemod:node-test --mode fix-truthy`
- `kata-cli test:bucket-audit`

## Bucket Audit Result

```
E1 (subprocess): 0
E2 (temp path):  1 (misclassified, actually E4)
E3 (codemod):    0 ← C-2 corruption fully resolved
E4 (business):   120 (CLI subprocess, module loading, path issues)
E5 (syntax):     0
```

## R-1/R-2/R-3 闭环

- **R-1**: 9 处 `expect(x.method(y).toBeTruthy())` 残留已全部修复（2 文件）
- **R-2**: `fix-truthy-corruption.ts` 已通过 TDD 正式落地（6 fixture + 17 测试）
- **R-3**: 120 个 E4 业务回归已归类到 manifest，不再用 "env-dep" 一刀切

## Known Followups

- 352 fail 的 E4 业务回归需逐个诊断（CLI 子进程退出码不匹配、模块路径错误）
- `workspace/` 311 cases:lint violations（用户产物层）
- v2 path alias removal 后可删除 fixture 豁免（P3 §6.3 清理）
