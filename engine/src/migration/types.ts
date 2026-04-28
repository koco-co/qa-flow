/**
 * Migration types for v3 workspace reorg (P3).
 */
export type Feature = {
  yyyymm: string;
  slug: string;
  prdDir?: string;
  prdMdPath?: string;
  archivePath?: string;
  xmindPath?: string;
  testsPath?: string;
  kataSessionPaths?: string[];
};

export type MigrationOpType = "mkdir" | "mv" | "log";

export type MigrationOp = {
  type: MigrationOpType;
  src?: string;
  dst?: string;
  checksumBefore?: string;
  message?: string;
};

export type MigrationLog = {
  schemaVersion: 1;
  timestamp: string;
  project: string;
  mode: "dry" | "real";
  features: Feature[];
  skipped: string[];   // non-yyyymm partitions reported by discoverFeatures
  operations: MigrationOp[];
  warnings: string[];
};
