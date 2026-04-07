import { describe, test, expect } from 'bun:test'
import { MysqlDriver } from '../../src/drivers/mysql'
import type { ConnectionConfig } from '../../src/drivers/types'

describe('MysqlDriver', () => {
  const dorisConfig: ConnectionConfig = {
    type: 'doris',
    host: '172.16.124.72',
    port: 19030,
    username: 'root',
    password: '',
    database: 'qa_auto_test',
  }

  test('resolves driver type for doris to mysql', () => {
    const driver = new MysqlDriver()
    expect(driver.supportedTypes).toContain('mysql')
    expect(driver.supportedTypes).toContain('doris')
  })

  test('builds mysql2 connection config correctly', () => {
    const driver = new MysqlDriver()
    const mysqlConfig = driver.toMysql2Config(dorisConfig)
    expect(mysqlConfig.host).toBe('172.16.124.72')
    expect(mysqlConfig.port).toBe(19030)
    expect(mysqlConfig.user).toBe('root')
    expect(mysqlConfig.password).toBe('')
    expect(mysqlConfig.database).toBe('qa_auto_test')
    expect(mysqlConfig.multipleStatements).toBe(true)
  })

  test('builds config without database when not provided', () => {
    const driver = new MysqlDriver()
    const configWithoutDb: ConnectionConfig = {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123',
    }
    const mysqlConfig = driver.toMysql2Config(configWithoutDb)
    expect(mysqlConfig.database).toBeUndefined()
  })
})
