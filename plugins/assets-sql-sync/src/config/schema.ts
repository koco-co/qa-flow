import { parse } from 'yaml'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'

export interface EnvironmentConfig {
  readonly baseUrl: string
  readonly login?: {
    readonly username: string
    readonly password: string
  }
  readonly tenant?: string
}

export interface DatasourceEntry {
  readonly type: string
  readonly host: string
  readonly jdbcPort?: number
  readonly httpPort?: number
  readonly port?: number
  readonly username: string
  readonly password: string
  readonly database?: string
}

export interface PluginConfig {
  readonly environments?: Record<string, EnvironmentConfig>
  readonly datasources: Record<string, DatasourceEntry>
}

export function loadPluginConfig(configPath?: string): PluginConfig {
  const defaultPath = resolve(dirname(new URL(import.meta.url).pathname), '../config/datasources.yaml')
  const filePath = configPath ?? defaultPath
  const content = readFileSync(filePath, 'utf-8')
  return parse(content) as PluginConfig
}
