import type { DtStackClient } from '../client'

export interface Project {
  readonly id: number
  readonly projectName: string
  readonly projectAlias?: string
}

export interface BatchDatasource {
  readonly id: number
  readonly dataName: string
  readonly dataSourceType: number
  readonly identity?: string
  readonly schemaName?: string
  readonly schema?: string
  readonly jdbcUrl?: string
}

function toBase64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64')
}

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function isDDLCreateStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase()
  return upper.startsWith('CREATE ') || upper.startsWith('DROP ')
}

function isInsertStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase()
  return upper.startsWith('INSERT ')
}

function extractSchemaFromJdbcUrl(jdbcUrl: string): string | undefined {
  try {
    const afterProtocol = jdbcUrl.split('//')[1]
    if (!afterProtocol) return undefined
    const pathPart = afterProtocol.split('?')[0]
    const segments = pathPart.split('/')
    return segments.length > 1 ? segments[segments.length - 1] : undefined
  } catch {
    return undefined
  }
}

export class BatchApi {
  constructor(private readonly client: DtStackClient) {}

  async findProject(name: string): Promise<Project | null> {
    const resp = await this.client.post<Project[]>(
      '/api/rdos/common/project/getProjects',
      {},
    )
    if (resp.code !== 1 || !resp.data) return null
    const project = resp.data.find(
      (p) => p.projectName === name || p.projectAlias === name,
    )
    return project ?? null
  }

  async getProjectDatasource(
    projectId: number,
    datasourceType: string,
  ): Promise<BatchDatasource | null> {
    const resp = await this.client.postWithProjectId<BatchDatasource[]>(
      '/api/rdos/batch/batchDataSource/list',
      { projectId, syncTask: true },
      projectId,
    )
    if (resp.code !== 1 || !resp.data) return null
    const typeLower = datasourceType.toLowerCase()
    const ds = resp.data.find((d) => {
      if (d.identity?.toLowerCase() === typeLower) return true
      if (d.dataName?.toLowerCase().includes(typeLower)) return true
      return false
    })
    return ds ?? null
  }

  async executeDDL(
    projectId: number,
    datasource: BatchDatasource,
    sql: string,
  ): Promise<void> {
    const targetSchema =
      datasource.schemaName ??
      datasource.schema ??
      extractSchemaFromJdbcUrl(datasource.jdbcUrl ?? '')

    const statements = splitStatements(sql)
    const ddlStatements = statements.filter((s) => isDDLCreateStatement(s))
    const insertStatements = statements.filter((s) => isInsertStatement(s))

    // Execute DDL (CREATE/DROP) via Batch DDL API — one statement at a time
    for (const stmt of ddlStatements) {
      const resp = await this.client.postWithProjectId(
        '/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption',
        {
          sql: toBase64(stmt),
          sourceId: datasource.id,
          targetSchema: targetSchema ?? '',
          syncTask: true,
        },
        projectId,
      )
      if (resp.code !== 1) {
        throw new Error(`DDL execution failed: ${resp.message ?? 'unknown error'}`)
      }
    }

    // Execute INSERT via general SQL execution API
    for (const stmt of insertStatements) {
      const resp = await this.client.postWithProjectId(
        '/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption',
        {
          sql: toBase64(stmt),
          sourceId: datasource.id,
          targetSchema: targetSchema ?? '',
          syncTask: true,
        },
        projectId,
      )
      // INSERT failures are non-blocking — data may already exist
      if (resp.code !== 1) {
        process.stderr.write(`[batch] INSERT warning: ${resp.message ?? 'unknown'}\n`)
      }
    }
  }
}
