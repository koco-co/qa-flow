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

    const resp = await this.client.postWithProjectId(
      '/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption',
      {
        sql: toBase64(sql),
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
}
