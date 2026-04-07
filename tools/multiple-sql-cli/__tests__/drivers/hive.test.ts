import { describe, test, expect } from 'bun:test'
import { HiveDriver } from '../../src/drivers/hive'
import type { ConnectionConfig } from '../../src/drivers/types'

describe('HiveDriver', () => {
  const hiveConfig: ConnectionConfig = {
    type: 'hive',
    host: '172.16.21.253',
    port: 10004,
    username: '',
    password: '',
  }

  const sparkthriftConfig: ConnectionConfig = {
    type: 'sparkthrift',
    host: '172.16.20.255',
    port: 10000,
    username: 'admin',
    password: '',
    database: 'default',
  }

  test('supports hive and sparkthrift types', () => {
    const driver = new HiveDriver()
    expect(driver.supportedTypes).toContain('hive')
    expect(driver.supportedTypes).toContain('sparkthrift')
  })

  test('builds hive connection config correctly', () => {
    const driver = new HiveDriver()
    const hiveConnConfig = driver.toHiveConnectionConfig(hiveConfig)
    expect(hiveConnConfig.host).toBe('172.16.21.253')
    expect(hiveConnConfig.port).toBe(10004)
    expect(hiveConnConfig.options.connect_timeout).toBe(30_000)
  })

  test('builds sparkthrift connection config correctly', () => {
    const driver = new HiveDriver()
    const sparkConfig = driver.toHiveConnectionConfig(sparkthriftConfig)
    expect(sparkConfig.host).toBe('172.16.20.255')
    expect(sparkConfig.port).toBe(10000)
    expect(sparkConfig.options.connect_timeout).toBe(30_000)
  })

  test('throws when executing without connection', async () => {
    const driver = new HiveDriver()
    await expect(driver.execute('SELECT 1')).rejects.toThrow(
      'Not connected. Call connect() first.'
    )
  })

  test('disconnect is safe when not connected', async () => {
    const driver = new HiveDriver()
    await expect(driver.disconnect()).resolves.toBeUndefined()
  })
})
