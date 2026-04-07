import { parse } from 'yaml'
import { readFileSync } from 'fs'
import type { ConnectionConfig, DriverType } from '../drivers/types'

export interface DatasourceYamlConfig {
  readonly datasources: Record<string, {
    readonly type: DriverType
    readonly host: string
    readonly port?: number
    readonly jdbcPort?: number
    readonly httpPort?: number
    readonly username: string
    readonly password: string
    readonly database?: string
  }>
}

export function loadDatasourceConfig(filePath: string): DatasourceYamlConfig {
  const content = readFileSync(filePath, 'utf-8')
  return parse(content) as DatasourceYamlConfig
}

export function resolveConnection(config: DatasourceYamlConfig, sourceName: string): ConnectionConfig {
  const source = config.datasources[sourceName]
  if (!source) {
    const available = Object.keys(config.datasources).join(', ')
    throw new Error(`Datasource "${sourceName}" not found. Available: ${available}`)
  }
  return {
    type: source.type,
    host: source.host,
    port: source.jdbcPort ?? source.port ?? 3306,
    username: source.username,
    password: source.password,
    database: source.database,
  }
}
