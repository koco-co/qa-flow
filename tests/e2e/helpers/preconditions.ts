/**
 * 前置条件 — 兼容层
 * 从 assets-sql-sync 插件重新导出，保持向后兼容
 */
export {
  setupPreconditions,
  createClient,
  BatchApi,
  AssetsApi,
  DtStackClient,
  extractCookieFromPage,
  metaFlow,
} from '../../../plugins/assets-sql-sync/src/index'

export type {
  PreconditionOptions,
  PreconditionResult,
  MetaFlowOptions,
  MetaFlowResult,
} from '../../../plugins/assets-sql-sync/src/index'
