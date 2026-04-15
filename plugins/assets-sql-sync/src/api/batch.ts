import type { DtStackClientLike } from "../client";

export interface Project {
  readonly id: number;
  readonly projectName: string;
  readonly projectAlias?: string;
}

export interface BatchDatasource {
  readonly id: number;
  readonly dataName: string;
  readonly dataSourceType: number;
  readonly identity?: string;
  readonly schemaName?: string;
  readonly schema?: string;
  readonly jdbcUrl?: string;
  readonly dataJson?: {
    readonly jdbcUrl?: string;
    readonly url?: string;
    readonly username?: string;
  };
}

function toBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isCreateStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase();
  return upper.startsWith("CREATE ");
}

function isDropStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase();
  return upper.startsWith("DROP ");
}

function isInsertStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase();
  return upper.startsWith("INSERT ");
}

function isAlreadyExistsError(message: string): boolean {
  return /already exists|已存在/i.test(message);
}

function isMissingObjectError(message: string): boolean {
  return /not exist|does not exist|unknown table|不存在/i.test(message);
}

function extractSchemaFromJdbcUrl(jdbcUrl: string): string | undefined {
  try {
    const afterProtocol = jdbcUrl.split("//")[1];
    if (!afterProtocol) return undefined;
    const pathPart = afterProtocol.split("?")[0];
    const segments = pathPart.split("/");
    return segments.length > 1 ? segments[segments.length - 1] : undefined;
  } catch {
    return undefined;
  }
}

export class BatchApi {
  constructor(private readonly client: DtStackClientLike) {}

  private async executeCustomSql(
    projectId: number,
    datasource: BatchDatasource,
    sql: string,
    targetSchema: string,
  ): Promise<void> {
    const resp = await this.client.postWithProjectId(
      "/api/rdos/batch/batchTableInfo/startCustomSql",
      {
        sql,
        sourceId: datasource.id,
        targetSchema,
        syncTask: true,
      },
      projectId,
    );
    if (resp.code !== 1) {
      throw new Error(resp.message ?? "unknown error");
    }
  }

  async findProject(name: string): Promise<Project | null> {
    const resp = await this.client.post<Project[]>("/api/rdos/common/project/getProjects", {});
    if (resp.code !== 1 || !resp.data) return null;
    const project = resp.data.find((p) => p.projectName === name || p.projectAlias === name);
    return project ?? null;
  }

  async getProjectDatasource(
    projectId: number,
    datasourceType: string,
  ): Promise<BatchDatasource | null> {
    const resp = await this.client.postWithProjectId<BatchDatasource[]>(
      "/api/rdos/batch/batchDataSource/list",
      { projectId, syncTask: true },
      projectId,
    );
    if (resp.code !== 1 || !resp.data) return null;
    const typeLower = datasourceType.toLowerCase();
    const ds = resp.data.find((d) => {
      if (d.identity?.toLowerCase() === typeLower) return true;
      if (d.dataName?.toLowerCase().includes(typeLower)) return true;
      return false;
    });
    return ds ?? null;
  }

  private async executeSqlViaDdlApi(
    projectId: number,
    datasource: BatchDatasource,
    stmt: string,
    targetSchema: string,
  ): Promise<void> {
    const resp = await this.client.postWithProjectId(
      "/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption",
      {
        sql: toBase64(stmt),
        sourceId: datasource.id,
        targetSchema,
        syncTask: true,
      },
      projectId,
    );
    if (resp.code !== 1) {
      throw new Error(resp.message ?? "unknown error");
    }
  }

  async executeDDL(projectId: number, datasource: BatchDatasource, sql: string): Promise<void> {
    const targetSchema =
      datasource.schemaName ??
      datasource.schema ??
      extractSchemaFromJdbcUrl(datasource.jdbcUrl ?? "") ??
      extractSchemaFromJdbcUrl(datasource.dataJson?.jdbcUrl ?? "");

    const statements = splitStatements(sql);

    for (const stmt of statements) {
      const isDrop = isDropStatement(stmt);
      const isCreate = isCreateStatement(stmt);

      try {
        if (isCreate) {
          // CREATE TABLE goes through DDL API
          await this.executeSqlViaDdlApi(projectId, datasource, stmt, targetSchema ?? "");
        } else {
          // DROP/INSERT/others go through custom SQL API first
          await this.executeCustomSql(projectId, datasource, stmt, targetSchema ?? "");
        }
      } catch (primaryError) {
        if (isAlreadyExistsError((primaryError as Error).message)) {
          process.stderr.write(`[batch] warning (already exists): ${(primaryError as Error).message}\n`);
          continue;
        }
        if (isDrop) {
          process.stderr.write(`[batch] DROP skipped: ${(primaryError as Error).message}\n`);
          continue;
        }

        // For non-DDL statements, try the other API as fallback
        try {
          if (isCreate) {
            await this.executeCustomSql(projectId, datasource, stmt, targetSchema ?? "");
          } else {
            await this.executeSqlViaDdlApi(projectId, datasource, stmt, targetSchema ?? "");
          }
        } catch (fallbackError) {
          // For INSERT: warn but continue (table may already have data)
          if (isInsertStatement(stmt)) {
            process.stderr.write(`[batch] INSERT skipped (table may have data): ${(primaryError as Error).message}\n`);
            continue;
          }
          const details = [(primaryError as Error).message, (fallbackError as Error).message].join(
            " | fallback: ",
          );
          throw new Error(`SQL execution failed: ${details}`);
        }
      }
    }
  }
}
