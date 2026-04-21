import type { DtStackClientLike } from "../client";

export interface AssetsDatasource {
  readonly id: number;
  readonly dataSourceName?: string;
  readonly dtCenterSourceName?: string;
  readonly name?: string;
  readonly dtCenterSourceId?: number;
  readonly dataSourceType?: number;
}

export interface MetadataSource {
  readonly dataSourceId: number;
  readonly dataSourceName: string;
  readonly dataSourceType: number;
}

export interface SyncedDb {
  readonly id: number;
  readonly dbName: string;
}

export interface SyncedTable {
  readonly id: number;
  readonly tableName: string;
}

interface AssetsPage<T> {
  readonly contentList?: T[];
  readonly records?: T[];
  readonly total?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AssetsApi {
  constructor(private readonly client: DtStackClientLike) {}

  async hasSyncedTables(
    dataSourceId: number,
    expectedTables: ReadonlyArray<string>,
  ): Promise<boolean> {
    if (expectedTables.length === 0) {
      return false;
    }

    const dbs = await this.listSyncedDbs(dataSourceId);
    if (dbs.length === 0) {
      return false;
    }

    const syncedNames = new Set<string>();
    for (const db of dbs) {
      const tables = await this.listSyncedTables(dataSourceId, db.id);
      for (const table of tables) {
        syncedNames.add(table.tableName);
      }
    }

    return expectedTables.every((name) => syncedNames.has(name));
  }

  async findImportedDatasource(name: string): Promise<AssetsDatasource | null> {
    const resp = await this.client.post<{ records: AssetsDatasource[] }>(
      "/dassets/v1/dataSource/pageQuery",
      { current: 1, size: 20, search: name },
    );
    if (resp.code !== 1 || !resp.data?.records) return null;
    return (
      resp.data.records.find((ds) =>
        (ds.dataSourceName ?? ds.name ?? "")
          .toLowerCase()
          .includes(name.toLowerCase()),
      ) ?? null
    );
  }

  async listUnusedDatasources(search: string): Promise<AssetsDatasource[]> {
    const resp = await this.client.post<
      AssetsDatasource[] | AssetsPage<AssetsDatasource>
    >("/dassets/v1/dataSource/listUnusedCenterDataSource", {
      search,
      current: 1,
      size: 50,
    });
    if (resp.code !== 1 || !resp.data) return [];
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.data.contentList)) return resp.data.contentList;
    if (Array.isArray(resp.data.records)) return resp.data.records;
    return [];
  }

  async importDatasource(centerSourceId: number): Promise<void> {
    try {
      await this.client.post("/dassets/v1/dataSource/checkSimilarDatasource", {
        dtCenterSourceIdList: [centerSourceId],
      });
    } catch {
      // checkSimilar may fail, non-blocking
    }

    const resp = await this.client.post<boolean>(
      "/dassets/v1/dataSource/importDataSource",
      {
        dtCenterSourceIdList: [centerSourceId],
      },
    );
    if (resp.code !== 1) {
      throw new Error(`Import datasource failed: ${resp.message ?? "unknown"}`);
    }
  }

  async findMetadataDatasource(name: string): Promise<MetadataSource | null> {
    const resp = await this.client.post<MetadataSource[]>(
      "/dmetadata/v1/dataSource/listMetadataDataSource",
      { type: 0 },
    );
    if (resp.code !== 1 || !resp.data) return null;
    return (
      resp.data.find((ds) =>
        ds.dataSourceName.toLowerCase().includes(name.toLowerCase()),
      ) ?? null
    );
  }

  async triggerSync(
    dataSourceId: number,
    dataSourceType: number,
  ): Promise<void> {
    const resp = await this.client.post(
      "/dmetadata/v1/scheduleJob/syncSourceJob",
      {
        dataSourceId,
        dataSourceType,
      },
    );
    if (resp.code !== 1) {
      throw new Error(`Trigger sync failed: ${resp.message ?? "unknown"}`);
    }
  }

  async listSyncedDbs(dataSourceId: number): Promise<SyncedDb[]> {
    const resp = await this.client.post<SyncedDb[]>(
      "/dmetadata/v1/dataDb/listSyncedDbsByDataSourceId",
      { dataSourceId },
    );
    if (resp.code !== 1 || !resp.data) return [];
    return resp.data;
  }

  async listSyncedTables(
    dataSourceId: number,
    dbId: number,
  ): Promise<SyncedTable[]> {
    const resp = await this.client.post<{ records?: SyncedTable[] }>(
      "/dmetadata/v1/dataTable/listSyncTables",
      { current: 1, size: 200, dataSourceId, dbId },
    );
    if (resp.code !== 1 || !resp.data) return [];
    return resp.data.records ?? (resp.data as unknown as SyncedTable[]);
  }

  async pollSyncComplete(
    dataSourceId: number,
    expectedTables?: ReadonlyArray<string>,
    timeoutMs = 180_000,
  ): Promise<boolean> {
    const pollInterval = 5_000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      await sleep(pollInterval);

      const dbs = await this.listSyncedDbs(dataSourceId);
      if (dbs.length === 0) continue;

      if (!expectedTables || expectedTables.length === 0) {
        for (const db of dbs) {
          const tables = await this.listSyncedTables(dataSourceId, db.id);
          if (tables.length > 0) return true;
        }
        continue;
      }

      const allSyncedNames = new Set<string>();
      for (const db of dbs) {
        const tables = await this.listSyncedTables(dataSourceId, db.id);
        for (const t of tables) {
          allSyncedNames.add(t.tableName);
        }
      }

      const allFound = expectedTables.every((name) => allSyncedNames.has(name));
      if (allFound) return true;
    }

    const expected = expectedTables?.length
      ? expectedTables.join(", ")
      : "any synced table";
    throw new Error(
      `Metadata sync timed out after ${timeoutMs}ms while waiting for ${expected}.`,
    );
  }
}
