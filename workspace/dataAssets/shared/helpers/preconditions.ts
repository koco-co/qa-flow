/**
 * 前置条件 — 兼容层
 * 从 dtstack-cli 重新导出，保持向后兼容
 */

export type { DtStackClientLike, PrecondSetupOptions, PrecondSetupResult, PrecondTable } from "dtstack-cli";
export { precondSetup as setupPreconditions } from "dtstack-cli";
export { createClientFromPage as createClient } from "dtstack-cli/adapters/playwright";
