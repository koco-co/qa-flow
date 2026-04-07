export type DriverType = 'mysql' | 'doris' | 'hive' | 'sparkthrift'

export interface ConnectionConfig {
  readonly type: DriverType
  readonly host: string
  readonly port: number
  readonly username: string
  readonly password: string
  readonly database?: string
}

export interface QueryResult {
  readonly rows: ReadonlyArray<Record<string, unknown>>
  readonly affectedRows?: number
}

export interface SqlDriver {
  readonly supportedTypes: ReadonlyArray<DriverType>
  connect(config: ConnectionConfig): Promise<void>
  execute(sql: string): Promise<QueryResult>
  disconnect(): Promise<void>
}
