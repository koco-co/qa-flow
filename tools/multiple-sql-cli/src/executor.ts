import { readFileSync } from 'fs'
import type { ConnectionConfig, QueryResult, SqlDriver } from './drivers/types'
import { MysqlDriver } from './drivers/mysql'

function resolveDriver(type: string): SqlDriver {
  if (type === 'mysql' || type === 'doris') {
    return new MysqlDriver()
  }
  throw new Error(`Unsupported driver type: ${type}`)
}

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export class SqlExecutor {
  private readonly config: ConnectionConfig
  private readonly driver: SqlDriver
  private connected = false

  constructor(config: ConnectionConfig, driver?: SqlDriver) {
    this.config = config
    this.driver = driver ?? resolveDriver(config.type)
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.driver.connect(this.config)
      this.connected = true
    }
  }

  async execute(sql: string): Promise<QueryResult> {
    await this.ensureConnected()
    return this.driver.execute(sql)
  }

  async executeMultiple(sqls: ReadonlyArray<string>): Promise<QueryResult[]> {
    const results: QueryResult[] = []
    for (const sql of sqls) {
      const result = await this.execute(sql)
      results.push(result)
    }
    return results
  }

  async executeFile(filePath: string): Promise<QueryResult[]> {
    const content = readFileSync(filePath, 'utf-8')
    const statements = splitStatements(content)
    return this.executeMultiple(statements)
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.driver.disconnect()
      this.connected = false
    }
  }
}
