import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { SqlExecutor } from '../src/executor'
import type { ConnectionConfig, QueryResult, SqlDriver } from '../src/drivers/types'

const mockDriver: SqlDriver = {
  supportedTypes: ['mysql', 'doris'],
  connect: mock(() => Promise.resolve()),
  execute: mock(() => Promise.resolve({ rows: [], affectedRows: 0 })),
  disconnect: mock(() => Promise.resolve()),
}

const testConfig: ConnectionConfig = {
  type: 'doris',
  host: 'localhost',
  port: 9030,
  username: 'root',
  password: '',
  database: 'test_db',
}

describe('SqlExecutor', () => {
  beforeEach(() => {
    ;(mockDriver.connect as ReturnType<typeof mock>).mockClear()
    ;(mockDriver.execute as ReturnType<typeof mock>).mockClear()
    ;(mockDriver.disconnect as ReturnType<typeof mock>).mockClear()
  })

  test('connects, executes, and disconnects', async () => {
    const executor = new SqlExecutor(testConfig, mockDriver)
    await executor.execute('SELECT 1')
    await executor.close()
    expect(mockDriver.connect).toHaveBeenCalledTimes(1)
    expect(mockDriver.execute).toHaveBeenCalledWith('SELECT 1')
    expect(mockDriver.disconnect).toHaveBeenCalledTimes(1)
  })

  test('executeMultiple runs each SQL sequentially', async () => {
    const executor = new SqlExecutor(testConfig, mockDriver)
    await executor.executeMultiple(['CREATE TABLE t1 (id INT)', 'INSERT INTO t1 VALUES (1)'])
    await executor.close()
    expect(mockDriver.execute).toHaveBeenCalledTimes(2)
  })

  test('executeFile reads file and executes contents', async () => {
    const tmpFile = '/tmp/test-executor.sql'
    await Bun.write(tmpFile, 'SELECT 1;\nSELECT 2;')
    const executor = new SqlExecutor(testConfig, mockDriver)
    const results = await executor.executeFile(tmpFile)
    await executor.close()
    expect(results.length).toBe(2)
  })

  test('lazy connects on first execute', async () => {
    const executor = new SqlExecutor(testConfig, mockDriver)
    expect(mockDriver.connect).not.toHaveBeenCalled()
    await executor.execute('SELECT 1')
    expect(mockDriver.connect).toHaveBeenCalledTimes(1)
    await executor.execute('SELECT 2')
    expect(mockDriver.connect).toHaveBeenCalledTimes(1)
    await executor.close()
  })
})
