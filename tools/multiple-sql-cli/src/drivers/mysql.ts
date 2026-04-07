import mysql from 'mysql2/promise'
import type { ConnectionConfig, DriverType, QueryResult, SqlDriver } from './types'

interface Mysql2Config {
  readonly host: string
  readonly port: number
  readonly user: string
  readonly password: string
  readonly database?: string
  readonly multipleStatements: boolean
  readonly connectTimeout: number
}

export class MysqlDriver implements SqlDriver {
  readonly supportedTypes: ReadonlyArray<DriverType> = ['mysql', 'doris']
  private connection: mysql.Connection | null = null

  toMysql2Config(config: ConnectionConfig): Mysql2Config {
    return {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      multipleStatements: true,
      connectTimeout: 30_000,
    }
  }

  async connect(config: ConnectionConfig): Promise<void> {
    const mysqlConfig = this.toMysql2Config(config)
    this.connection = await mysql.createConnection(mysqlConfig)
  }

  async execute(sql: string): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.')
    }

    const [result] = await this.connection.query(sql)

    if (Array.isArray(result)) {
      return {
        rows: result as Record<string, unknown>[],
      }
    }

    return {
      rows: [],
      affectedRows: (result as mysql.ResultSetHeader).affectedRows,
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end()
      this.connection = null
    }
  }
}
