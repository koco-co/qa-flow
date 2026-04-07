/**
 * 前置条件帮助函数 — 兼容层
 *
 * 实际实现已迁移到 plugins/dtstack-preconditions/preconditions.ts（Python CLI 桥接）。
 * 本文件保留原有导出接口，供已有测试用例无缝使用。
 *
 * 新测试也可直接 import:
 *   import { setupOfflineTablesToAssets } from '../../../../plugins/dtstack-preconditions/preconditions';
 */
export type {
  BatchTableConfig as BatchTableOptions,
  DatasourceImportConfig as DatasourceImportOptions,
  MetadataSyncConfig as MetadataSyncOptions,
  SetupOptions,
} from "../../../plugins/assets-sql-sync/preconditions";

export { setupOfflineTablesToAssets } from "../../../plugins/assets-sql-sync/preconditions";

