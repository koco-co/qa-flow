/**
 * 前置条件 — 兼容层
 * 从 assets-sql-sync 插件重新导出，保持向后兼容
 */

export type {
  DtStackClientLike,
  MetaFlowOptions,
  MetaFlowResult,
  PreconditionOptions,
  PreconditionResult,
} from "../../../plugins/assets-sql-sync/src/index";
export {
  AssetsApi,
  BatchApi,
  BrowserDtStackClient,
  createClient,
  DtStackClient,
  extractCookieFromPage,
  metaFlow,
  setupPreconditions,
} from "../../../plugins/assets-sql-sync/src/index";
