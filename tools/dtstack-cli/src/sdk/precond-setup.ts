import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { DtStackClientLike } from "../core/http/client";
import { BatchApi } from "../core/platform/batch";
import { AssetsApi } from "../core/platform/assets";
import { ProjectApi } from "../core/platform/project";

export interface PrecondTable {
  readonly name: string;
  readonly sql: string;
}

export interface PrecondSetupOptions {
  readonly client: DtStackClientLike;
  readonly project: string;
  readonly datasource: string;
  readonly tables?: ReadonlyArray<PrecondTable>;
  readonly tablesFromFile?: string;
  readonly skipSync?: boolean;
  readonly syncTimeout?: number;
  readonly autoCreate?: boolean;
}

export interface PrecondSetupResult {
  readonly projectId: number;
  readonly projectName: string;
  readonly datasourceId: number;
  readonly tablesCreated: ReadonlyArray<string>;
  readonly syncComplete: boolean;
}

function loadTablesFromFile(file: string): ReadonlyArray<PrecondTable> {
  const raw = parse(readFileSync(file, "utf-8")) as { tables?: PrecondTable[] };
  if (!raw.tables) throw new Error(`${file} missing 'tables' top-level key`);
  return raw.tables;
}

function log(msg: string): void {
  process.stderr.write(`[precond] ${msg}\n`);
}

export async function precondSetup(
  opts: PrecondSetupOptions,
): Promise<PrecondSetupResult> {
  const tables =
    opts.tables ??
    (opts.tablesFromFile ? loadTablesFromFile(opts.tablesFromFile) : []);
  if (tables.length === 0) {
    throw new Error("no tables provided (use 'tables' or 'tablesFromFile')");
  }

  const projects = new ProjectApi(opts.client);
  const batch = new BatchApi(opts.client);
  const assets = new AssetsApi(opts.client);

  log(`ensure project: ${opts.project}`);
  const project =
    opts.autoCreate !== false
      ? await projects.ensureProject({ name: opts.project })
      : (await projects.findByName(opts.project)) ??
        (() => {
          throw new Error(`project not found: ${opts.project}`);
        })();

  log(`find datasource: ${opts.datasource}`);
  const ds = await batch.getProjectDatasource(project.id, opts.datasource);
  if (!ds) {
    throw new Error(
      `datasource ${opts.datasource} not found in project ${opts.project}`,
    );
  }

  const tablesCreated: string[] = [];
  for (const t of tables) {
    log(`DDL: ${t.name}`);
    await batch.executeDDL(project.id, ds, t.sql);
    tablesCreated.push(t.name);
  }

  if (opts.skipSync) {
    return {
      projectId: project.id,
      projectName: project.projectName,
      datasourceId: ds.id,
      tablesCreated,
      syncComplete: false,
    };
  }

  log("import datasource if needed");
  const imported = await assets.findImportedDatasource(ds.dataName);
  if (!imported) {
    const candidates = await assets.listUnusedDatasources(ds.dataName);
    const target = candidates.find((c) =>
      (c.dtCenterSourceName ?? c.dataSourceName ?? c.name ?? "")
        .toLowerCase()
        .includes(ds.dataName.toLowerCase()),
    );
    if (target) {
      await assets.importDatasource(target.dtCenterSourceId ?? target.id);
    }
  }

  log("trigger metadata sync");
  const metaSrc = await assets.findMetadataDatasource(ds.dataName);
  let syncComplete = false;
  if (metaSrc) {
    const expected = tables.map((t) => t.name);
    if (await assets.hasSyncedTables(metaSrc.dataSourceId, expected)) {
      syncComplete = true;
    } else {
      try {
        await assets.triggerSync(
          metaSrc.dataSourceId,
          metaSrc.dataSourceType,
        );
      } catch (err) {
        if (!/timeout/i.test(String(err))) throw err;
      }
      syncComplete = await assets.pollSyncComplete(
        metaSrc.dataSourceId,
        expected,
        opts.syncTimeout ?? 180_000,
      );
    }
  }

  return {
    projectId: project.id,
    projectName: project.projectName,
    datasourceId: ds.id,
    tablesCreated,
    syncComplete,
  };
}
