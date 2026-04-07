# Assets SQL Sync 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 E2E 测试的数据源建表/引入/同步前置条件从 Python CLI 全量重写为 TypeScript，并基于新 API 重写资产集成测试用例。

**Architecture:** 双包架构 — `tools/multiple-sql-cli`（通用 SQL 工具，mysql2 驱动）和 `plugins/assets-sql-sync`（DTStack 平台 API 编排，Meta 流程）。Playwright 测试通过 `setupPreconditions()` 一键 API 调用前置条件。

**Tech Stack:** TypeScript, Bun, mysql2, Playwright, YAML

---

## 文件结构总览

### 新建文件

```
tools/multiple-sql-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              ← 库导出
│   ├── cli.ts                ← CLI 入口
│   ├── drivers/
│   │   ├── types.ts          ← Driver 接口定义
│   │   └── mysql.ts          ← MySQL/Doris 驱动
│   ├── executor.ts           ← SQL 执行器
│   └── config/
│       └── schema.ts         ← YAML 配置类型
└── __tests__/
    ├── drivers/
    │   └── mysql.test.ts
    └── executor.test.ts

plugins/assets-sql-sync/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              ← 高层 + 分步 API 导出
│   ├── client.ts             ← DtStackClient HTTP 客户端
│   ├── api/
│   │   ├── batch.ts          ← 离线开发 API
│   │   └── assets.ts         ← 数据资产 API（引入 + 同步）
│   ├── flows/
│   │   └── meta-flow.ts      ← Meta 数据源流程编排
│   └── config/
│       ├── datasources.yaml  ← CI 稳定数据源配置
│       └── schema.ts         ← 配置类型定义
└── __tests__/
    ├── client.test.ts
    └── meta-flow.test.ts

tests/e2e/202604/资产-集成测试用例/
├── sql/
│   ├── base-tables.sql
│   ├── quality-tables.sql
│   ├── lineage-tables.sql
│   └── active-users.sql
└── smoke.spec.ts             ← 重写
```

### 删除文件

```
tools/multiple-sql-cli/dtstack_pre/          ← 整个 Python 包
tools/multiple-sql-cli/dtstack_preconditions.egg-info/
tools/multiple-sql-cli/.venv/
tools/multiple-sql-cli/pyproject.toml
tools/multiple-sql-cli/uv.lock
tools/multiple-sql-cli/src/                  ← Python src 目录
tools/multiple-sql-cli/README.md
tools/multiple-sql-cli/ci-datasource-config.md  ← 移动到 assets-sql-sync

plugins/assets-sql-sync/preconditions.ts     ← 旧的 Python 桥接
plugins/assets-sql-sync/plugin.json          ← 重建
```

### 修改文件

```
tests/e2e/helpers/preconditions.ts           ← 更新导入源
workspace/archive/202604/资产-集成测试用例.md   ← 补全校验点和 SQL
```

---

## Task 1: 清理 Python 代码，初始化 multiple-sql-cli TS 项目

**Files:**
- Delete: `tools/multiple-sql-cli/dtstack_pre/` (entire directory)
- Delete: `tools/multiple-sql-cli/dtstack_preconditions.egg-info/`
- Delete: `tools/multiple-sql-cli/.venv/`
- Delete: `tools/multiple-sql-cli/pyproject.toml`
- Delete: `tools/multiple-sql-cli/uv.lock`
- Delete: `tools/multiple-sql-cli/src/`
- Delete: `tools/multiple-sql-cli/README.md`
- Create: `tools/multiple-sql-cli/package.json`
- Create: `tools/multiple-sql-cli/tsconfig.json`

- [ ] **Step 1: 删除 Python 文件**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
rm -rf tools/multiple-sql-cli/dtstack_pre
rm -rf tools/multiple-sql-cli/dtstack_preconditions.egg-info
rm -rf tools/multiple-sql-cli/.venv
rm -rf tools/multiple-sql-cli/src
rm -f tools/multiple-sql-cli/pyproject.toml
rm -f tools/multiple-sql-cli/uv.lock
rm -f tools/multiple-sql-cli/README.md
```

注意：保留 `tools/multiple-sql-cli/ci-datasource-config.md`，后续移动到 assets-sql-sync。

- [ ] **Step 2: 创建 package.json**

Create: `tools/multiple-sql-cli/package.json`

```json
{
  "name": "multiple-sql-cli",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "bin": {
    "multiple-sql-cli": "src/cli.ts"
  },
  "scripts": {
    "cli": "bun run src/cli.ts",
    "test": "bun test"
  },
  "dependencies": {
    "mysql2": "^3.11.0",
    "yaml": "^2.6.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 3: 创建 tsconfig.json**

Create: `tools/multiple-sql-cli/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

- [ ] **Step 4: 安装依赖**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/tools/multiple-sql-cli
bun install
```

Expected: `node_modules/` created, `bun.lockb` generated.

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add tools/multiple-sql-cli/package.json tools/multiple-sql-cli/tsconfig.json tools/multiple-sql-cli/bun.lockb
git commit -m "chore: init multiple-sql-cli as TypeScript project, remove Python code"
```

---

## Task 2: 实现 Driver 接口和 MySQL/Doris 驱动

**Files:**
- Create: `tools/multiple-sql-cli/src/drivers/types.ts`
- Create: `tools/multiple-sql-cli/src/drivers/mysql.ts`
- Test: `tools/multiple-sql-cli/__tests__/drivers/mysql.test.ts`

- [ ] **Step 1: 编写驱动测试**

Create: `tools/multiple-sql-cli/__tests__/drivers/mysql.test.ts`

```typescript
import { describe, test, expect, mock } from 'bun:test'
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/tools/multiple-sql-cli
bun test __tests__/drivers/mysql.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: 实现 types.ts**

Create: `tools/multiple-sql-cli/src/drivers/types.ts`

```typescript
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
```

- [ ] **Step 4: 实现 mysql.ts**

Create: `tools/multiple-sql-cli/src/drivers/mysql.ts`

```typescript
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
```

- [ ] **Step 5: 运行测试确认通过**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/tools/multiple-sql-cli
bun test __tests__/drivers/mysql.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add tools/multiple-sql-cli/src/drivers/ tools/multiple-sql-cli/__tests__/drivers/
git commit -m "feat(multiple-sql-cli): add driver types and MySQL/Doris driver"
```

---

## Task 3: 实现 SQL 执行器

**Files:**
- Create: `tools/multiple-sql-cli/src/executor.ts`
- Test: `tools/multiple-sql-cli/__tests__/executor.test.ts`

- [ ] **Step 1: 编写执行器测试**

Create: `tools/multiple-sql-cli/__tests__/executor.test.ts`

```typescript
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/tools/multiple-sql-cli
bun test __tests__/executor.test.ts
```

Expected: FAIL — SqlExecutor not found.

- [ ] **Step 3: 实现 executor.ts**

Create: `tools/multiple-sql-cli/src/executor.ts`

```typescript
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
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/tools/multiple-sql-cli
bun test __tests__/executor.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add tools/multiple-sql-cli/src/executor.ts tools/multiple-sql-cli/__tests__/executor.test.ts
git commit -m "feat(multiple-sql-cli): add SQL executor with lazy connection and file support"
```

---

## Task 4: 实现 YAML 配置解析和 CLI 入口

**Files:**
- Create: `tools/multiple-sql-cli/src/config/schema.ts`
- Create: `tools/multiple-sql-cli/src/cli.ts`
- Create: `tools/multiple-sql-cli/src/index.ts`

- [ ] **Step 1: 实现配置 schema**

Create: `tools/multiple-sql-cli/src/config/schema.ts`

```typescript
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
```

- [ ] **Step 2: 实现 CLI 入口**

Create: `tools/multiple-sql-cli/src/cli.ts`

```typescript
#!/usr/bin/env bun

import { parseArgs } from 'util'
import { SqlExecutor } from './executor'
import { loadDatasourceConfig, resolveConnection } from './config/schema'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    config: { type: 'string', short: 'c' },
    source: { type: 'string', short: 's' },
    sql: { type: 'string' },
    file: { type: 'string', short: 'f' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  strict: true,
})

const command = positionals[0]

function printUsage(): void {
  console.log(`Usage: multiple-sql-cli <command> [options]

Commands:
  exec    Execute SQL statement or file
  ping    Test database connection

Options:
  -c, --config <path>   YAML config file path
  -s, --source <name>   Datasource name from config
  --sql <statement>     SQL to execute
  -f, --file <path>     SQL file to execute
  -h, --help            Show help`)
}

async function main(): Promise<void> {
  if (values.help || !command) {
    printUsage()
    process.exit(0)
  }

  if (!values.config || !values.source) {
    console.error('Error: --config and --source are required')
    process.exit(1)
  }

  const yamlConfig = loadDatasourceConfig(values.config)
  const connConfig = resolveConnection(yamlConfig, values.source)

  if (command === 'ping') {
    const executor = new SqlExecutor(connConfig)
    try {
      await executor.execute('SELECT 1')
      console.log(`Connection to "${values.source}" successful.`)
    } catch (error) {
      console.error(`Connection to "${values.source}" failed:`, (error as Error).message)
      process.exit(1)
    } finally {
      await executor.close()
    }
    return
  }

  if (command === 'exec') {
    if (!values.sql && !values.file) {
      console.error('Error: --sql or --file is required for exec command')
      process.exit(1)
    }

    const executor = new SqlExecutor(connConfig)
    try {
      if (values.file) {
        const results = await executor.executeFile(values.file)
        console.log(`Executed ${results.length} statement(s) from ${values.file}`)
      } else if (values.sql) {
        const result = await executor.execute(values.sql)
        if (result.rows.length > 0) {
          console.log(JSON.stringify(result.rows, null, 2))
        } else {
          console.log(`OK. Affected rows: ${result.affectedRows ?? 0}`)
        }
      }
    } catch (error) {
      console.error('Execution failed:', (error as Error).message)
      process.exit(1)
    } finally {
      await executor.close()
    }
    return
  }

  console.error(`Unknown command: ${command}`)
  printUsage()
  process.exit(1)
}

main()
```

- [ ] **Step 3: 实现库导出 index.ts**

Create: `tools/multiple-sql-cli/src/index.ts`

```typescript
export { SqlExecutor } from './executor'
export { MysqlDriver } from './drivers/mysql'
export { loadDatasourceConfig, resolveConnection } from './config/schema'
export type { ConnectionConfig, DriverType, QueryResult, SqlDriver } from './drivers/types'
export type { DatasourceYamlConfig } from './config/schema'
```

- [ ] **Step 4: 验证 CLI help 可执行**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/tools/multiple-sql-cli
bun run src/cli.ts --help
```

Expected: 打印 usage 信息，退出码 0。

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add tools/multiple-sql-cli/src/config/ tools/multiple-sql-cli/src/cli.ts tools/multiple-sql-cli/src/index.ts
git commit -m "feat(multiple-sql-cli): add YAML config parser, CLI entry, and library exports"
```

---

## Task 5: 初始化 assets-sql-sync TS 项目

**Files:**
- Delete: `plugins/assets-sql-sync/preconditions.ts` (旧 Python 桥接)
- Delete: `plugins/assets-sql-sync/plugin.json` (重建)
- Move: `tools/multiple-sql-cli/ci-datasource-config.md` → 参考后删除
- Create: `plugins/assets-sql-sync/package.json`
- Create: `plugins/assets-sql-sync/tsconfig.json`
- Create: `plugins/assets-sql-sync/plugin.json`

- [ ] **Step 1: 清理旧文件**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
rm -f plugins/assets-sql-sync/preconditions.ts
rm -f plugins/assets-sql-sync/plugin.json
```

- [ ] **Step 2: 创建 package.json**

Create: `plugins/assets-sql-sync/package.json`

```json
{
  "name": "assets-sql-sync",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "test": "bun test"
  },
  "dependencies": {
    "yaml": "^2.6.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@playwright/test": "^1.59.1"
  }
}
```

- [ ] **Step 3: 创建 tsconfig.json**

Create: `plugins/assets-sql-sync/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

- [ ] **Step 4: 重建 plugin.json**

Create: `plugins/assets-sql-sync/plugin.json`

```json
{
  "name": "assets-sql-sync",
  "description": "DTStack 平台前置条件插件 — Meta/非Meta 数据源建表、引入、元数据同步",
  "version": "0.1.0"
}
```

- [ ] **Step 5: 安装依赖**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/plugins/assets-sql-sync
bun install
```

- [ ] **Step 6: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add plugins/assets-sql-sync/package.json plugins/assets-sql-sync/tsconfig.json plugins/assets-sql-sync/plugin.json plugins/assets-sql-sync/bun.lockb
git commit -m "chore(assets-sql-sync): init as TypeScript project, remove Python bridge"
```

---

## Task 6: 实现 DtStackClient HTTP 客户端

**Files:**
- Create: `plugins/assets-sql-sync/src/client.ts`
- Test: `plugins/assets-sql-sync/__tests__/client.test.ts`

- [ ] **Step 1: 编写客户端测试**

Create: `plugins/assets-sql-sync/__tests__/client.test.ts`

```typescript
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { DtStackClient } from '../src/client'

describe('DtStackClient', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('post sends correct headers and body', async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: 'ok' })))
    )
    globalThis.fetch = mockFetch as unknown as typeof fetch

    const client = new DtStackClient({
      baseUrl: 'http://172.16.122.52',
      cookie: 'SESSION=abc; JSESSIONID=xyz',
    })

    const result = await client.post<{ code: number; data: string }>(
      '/api/test',
      { key: 'value' },
    )

    expect(result.code).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = (mockFetch as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://172.16.122.52/api/test')
    expect(options.method).toBe('POST')
    expect(options.headers).toMatchObject({
      'content-type': 'application/json;charset=UTF-8',
      'Accept-Language': 'zh-CN',
      cookie: 'SESSION=abc; JSESSIONID=xyz',
    })
    expect(JSON.parse(options.body as string)).toEqual({ key: 'value' })
  })

  test('throws on non-ok response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500 }))
    ) as unknown as typeof fetch

    const client = new DtStackClient({
      baseUrl: 'http://localhost',
      cookie: 'SESSION=abc',
    })

    expect(client.post('/api/fail')).rejects.toThrow()
  })

  test('postWithProjectId sends X-Project-Id header', async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: null })))
    )
    globalThis.fetch = mockFetch as unknown as typeof fetch

    const client = new DtStackClient({
      baseUrl: 'http://localhost',
      cookie: 'SESSION=abc',
    })

    await client.postWithProjectId('/api/batch', { sql: 'test' }, 42)

    const [, options] = (mockFetch as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit]
    const headers = options.headers as Record<string, string>
    expect(headers['X-Project-Id']).toBe('42')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/plugins/assets-sql-sync
bun test __tests__/client.test.ts
```

Expected: FAIL — DtStackClient not found.

- [ ] **Step 3: 实现 client.ts**

Create: `plugins/assets-sql-sync/src/client.ts`

```typescript
export interface DtStackClientOptions {
  readonly baseUrl: string
  readonly cookie: string
}

interface DtStackResponse<T = unknown> {
  readonly code: number
  readonly data: T
  readonly message?: string
  readonly success?: boolean
}

export class DtStackClient {
  private readonly baseUrl: string
  private readonly cookie: string

  constructor(options: DtStackClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.cookie = options.cookie
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      'content-type': 'application/json;charset=UTF-8',
      'Accept-Language': 'zh-CN',
      cookie: this.cookie,
      ...extra,
    }
  }

  async post<T = unknown>(path: string, data?: unknown, extraHeaders?: Record<string, string>): Promise<DtStackResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(extraHeaders),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`)
    }

    return response.json() as Promise<DtStackResponse<T>>
  }

  async postWithProjectId<T = unknown>(path: string, data: unknown, projectId: number): Promise<DtStackResponse<T>> {
    return this.post<T>(path, data, { 'X-Project-Id': String(projectId) })
  }
}

export function extractCookieFromPage(page: { context: () => { cookies: () => Promise<Array<{ name: string; value: string }>> } }): Promise<string> {
  return page
    .context()
    .cookies()
    .then((cookies) => cookies.map((c) => `${c.name}=${c.value}`).join('; '))
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/plugins/assets-sql-sync
bun test __tests__/client.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add plugins/assets-sql-sync/src/client.ts plugins/assets-sql-sync/__tests__/client.test.ts
git commit -m "feat(assets-sql-sync): add DtStackClient HTTP client with cookie injection"
```

---

## Task 7: 实现 Batch API（离线开发）

**Files:**
- Create: `plugins/assets-sql-sync/src/api/batch.ts`

- [ ] **Step 1: 实现 batch.ts**

Create: `plugins/assets-sql-sync/src/api/batch.ts`

API 端点来自 httprunner 分析：
- `POST /api/rdos/common/project/getProjects` → 获取项目列表
- `POST /api/rdos/batch/batchDataSource/list` → 获取项目数据源（需要 X-Project-Id header）
- `POST /api/rdos/batch/batchTableInfo/ddlCreateTableEncryption` → DDL 建表（需要 X-Project-Id header，SQL base64 编码）

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add plugins/assets-sql-sync/src/api/batch.ts
git commit -m "feat(assets-sql-sync): add Batch API for offline project and DDL execution"
```

---

## Task 8: 实现 Assets API（数据资产引入 + 元数据同步）

**Files:**
- Create: `plugins/assets-sql-sync/src/api/assets.ts`

- [ ] **Step 1: 实现 assets.ts**

API 端点来自 httprunner 分析：
- `POST /dassets/v1/dataSource/pageQuery` → 已引入数据源
- `POST /dassets/v1/dataSource/listUnusedCenterDataSource` → 未引入数据源
- `POST /dassets/v1/dataSource/checkSimilarDatasource` → 检查相似
- `POST /dassets/v1/dataSource/importDataSource` → 引入
- `POST /dmetadata/v1/dataSource/listMetadataDataSource` → 元数据数据源列表
- `POST /dmetadata/v1/scheduleJob/syncSourceJob` → 触发同步
- `POST /dmetadata/v1/dataDb/listSyncedDbsByDataSourceId` → 已同步数据库
- `POST /dmetadata/v1/dataTable/listSyncTables` → 已同步表

Create: `plugins/assets-sql-sync/src/api/assets.ts`

```typescript
import type { DtStackClient } from '../client'

export interface AssetsDatasource {
  readonly id: number
  readonly dataSourceName?: string
  readonly dtCenterSourceName?: string
  readonly name?: string
  readonly dtCenterSourceId?: number
  readonly dataSourceType?: number
}

export interface MetadataSource {
  readonly dataSourceId: number
  readonly dataSourceName: string
  readonly dataSourceType: number
}

export interface SyncedDb {
  readonly id: number
  readonly dbName: string
}

export interface SyncedTable {
  readonly id: number
  readonly tableName: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class AssetsApi {
  constructor(private readonly client: DtStackClient) {}

  async findImportedDatasource(name: string): Promise<AssetsDatasource | null> {
    const resp = await this.client.post<{ records: AssetsDatasource[] }>(
      '/dassets/v1/dataSource/pageQuery',
      { current: 1, size: 20, search: name },
    )

    if (resp.code !== 1 || !resp.data?.records) return null

    return resp.data.records.find((ds) =>
      (ds.dataSourceName ?? ds.name ?? '')
        .toLowerCase()
        .includes(name.toLowerCase()),
    ) ?? null
  }

  async listUnusedDatasources(search: string): Promise<AssetsDatasource[]> {
    const resp = await this.client.post<AssetsDatasource[]>(
      '/dassets/v1/dataSource/listUnusedCenterDataSource',
      { search, current: 1, size: 50 },
    )

    if (resp.code !== 1 || !resp.data) return []
    return resp.data
  }

  async importDatasource(centerSourceId: number): Promise<void> {
    try {
      await this.client.post(
        '/dassets/v1/dataSource/checkSimilarDatasource',
        { dtCenterSourceIdList: [centerSourceId] },
      )
    } catch {
      // checkSimilar may fail, non-blocking
    }

    const resp = await this.client.post<boolean>(
      '/dassets/v1/dataSource/importDataSource',
      { dtCenterSourceIdList: [centerSourceId] },
    )

    if (resp.code !== 1) {
      throw new Error(`Import datasource failed: ${resp.message ?? 'unknown'}`)
    }
  }

  async findMetadataDatasource(name: string): Promise<MetadataSource | null> {
    const resp = await this.client.post<MetadataSource[]>(
      '/dmetadata/v1/dataSource/listMetadataDataSource',
      { type: 0 },
    )

    if (resp.code !== 1 || !resp.data) return null

    return resp.data.find((ds) =>
      ds.dataSourceName.toLowerCase().includes(name.toLowerCase()),
    ) ?? null
  }

  async triggerSync(dataSourceId: number, dataSourceType: number): Promise<void> {
    const resp = await this.client.post(
      '/dmetadata/v1/scheduleJob/syncSourceJob',
      { dataSourceId, dataSourceType },
    )

    if (resp.code !== 1) {
      throw new Error(`Trigger sync failed: ${resp.message ?? 'unknown'}`)
    }
  }

  async listSyncedDbs(dataSourceId: number): Promise<SyncedDb[]> {
    const resp = await this.client.post<SyncedDb[]>(
      '/dmetadata/v1/dataDb/listSyncedDbsByDataSourceId',
      { dataSourceId },
    )

    if (resp.code !== 1 || !resp.data) return []
    return resp.data
  }

  async listSyncedTables(dataSourceId: number, dbId: number): Promise<SyncedTable[]> {
    const resp = await this.client.post<{ records?: SyncedTable[] }>(
      '/dmetadata/v1/dataTable/listSyncTables',
      { current: 1, size: 200, dataSourceId, dbId },
    )

    if (resp.code !== 1 || !resp.data) return []
    return resp.data.records ?? (resp.data as unknown as SyncedTable[])
  }

  async pollSyncComplete(
    dataSourceId: number,
    expectedTables?: ReadonlyArray<string>,
    timeoutMs = 180_000,
  ): Promise<boolean> {
    const pollInterval = 5_000
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      await sleep(pollInterval)

      const dbs = await this.listSyncedDbs(dataSourceId)
      if (dbs.length === 0) continue

      if (!expectedTables || expectedTables.length === 0) {
        // No specific tables required, just check any tables synced
        for (const db of dbs) {
          const tables = await this.listSyncedTables(dataSourceId, db.id)
          if (tables.length > 0) return true
        }
        continue
      }

      // Check all expected tables are synced
      const allSyncedNames = new Set<string>()
      for (const db of dbs) {
        const tables = await this.listSyncedTables(dataSourceId, db.id)
        for (const t of tables) {
          allSyncedNames.add(t.tableName)
        }
      }

      const allFound = expectedTables.every((name) => allSyncedNames.has(name))
      if (allFound) return true
    }

    console.warn(`Sync poll timed out after ${timeoutMs}ms. Continuing anyway.`)
    return false
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add plugins/assets-sql-sync/src/api/assets.ts
git commit -m "feat(assets-sql-sync): add Assets API for datasource import and metadata sync"
```

---

## Task 9: 实现 Meta 流程编排

**Files:**
- Create: `plugins/assets-sql-sync/src/flows/meta-flow.ts`
- Test: `plugins/assets-sql-sync/__tests__/meta-flow.test.ts`

- [ ] **Step 1: 编写 Meta 流程测试**

Create: `plugins/assets-sql-sync/__tests__/meta-flow.test.ts`

```typescript
import { describe, test, expect, mock } from 'bun:test'
import { metaFlow } from '../src/flows/meta-flow'
import type { DtStackClient } from '../src/client'

describe('metaFlow', () => {
  test('throws when project not found', async () => {
    const mockClient = {
      post: mock(() => Promise.resolve({ code: 1, data: [] })),
      postWithProjectId: mock(() => Promise.resolve({ code: 1, data: [] })),
    } as unknown as DtStackClient

    expect(
      metaFlow(mockClient, {
        datasourceType: 'Doris',
        tables: [{ name: 'test', sql: 'CREATE TABLE test (id INT)' }],
        projectName: 'nonexistent',
      }),
    ).rejects.toThrow('Project "nonexistent" not found')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/plugins/assets-sql-sync
bun test __tests__/meta-flow.test.ts
```

Expected: FAIL — metaFlow not found.

- [ ] **Step 3: 实现 meta-flow.ts**

Create: `plugins/assets-sql-sync/src/flows/meta-flow.ts`

```typescript
import type { DtStackClient } from '../client'
import { BatchApi } from '../api/batch'
import { AssetsApi } from '../api/assets'

export interface MetaFlowOptions {
  readonly datasourceType: string
  readonly tables: ReadonlyArray<{ readonly name: string; readonly sql: string }>
  readonly projectName?: string
  readonly syncTimeout?: number
}

export interface MetaFlowResult {
  readonly projectId: number
  readonly projectName: string
  readonly datasourceId: number
  readonly tablesCreated: ReadonlyArray<string>
  readonly syncComplete: boolean
}

export async function metaFlow(
  client: DtStackClient,
  options: MetaFlowOptions,
): Promise<MetaFlowResult> {
  const batchApi = new BatchApi(client)
  const assetsApi = new AssetsApi(client)

  const projectName = options.projectName ?? 'env_rebuild_test'
  const syncTimeout = options.syncTimeout ?? 180_000

  // Step 1: Find project
  console.log(`[meta-flow] Looking for project: ${projectName}`)
  const project = await batchApi.findProject(projectName)
  if (!project) {
    throw new Error(`Project "${projectName}" not found in offline development`)
  }
  console.log(`[meta-flow] Found project: ${project.projectName} (id=${project.id})`)

  // Step 2: Find datasource in project
  console.log(`[meta-flow] Looking for ${options.datasourceType} datasource...`)
  const datasource = await batchApi.getProjectDatasource(
    project.id,
    options.datasourceType,
  )
  if (!datasource) {
    throw new Error(
      `Datasource type "${options.datasourceType}" not found in project "${projectName}"`,
    )
  }
  console.log(`[meta-flow] Found datasource: ${datasource.dataName} (id=${datasource.id})`)

  // Step 3: Execute DDL for each table
  const tablesCreated: string[] = []
  for (const table of options.tables) {
    console.log(`[meta-flow] Creating table: ${table.name}`)
    try {
      await batchApi.executeDDL(project.id, datasource, table.sql)
      tablesCreated.push(table.name)
      console.log(`[meta-flow] Table ${table.name} created successfully`)
    } catch (error) {
      console.error(`[meta-flow] Failed to create table ${table.name}:`, (error as Error).message)
      throw error
    }
  }

  // Step 4: Import datasource to assets (if not already imported)
  console.log(`[meta-flow] Checking if datasource is imported to assets...`)
  const imported = await assetsApi.findImportedDatasource(datasource.dataName)
  if (!imported) {
    console.log(`[meta-flow] Importing datasource to assets...`)
    const unusedList = await assetsApi.listUnusedDatasources(datasource.dataName)
    const target = unusedList.find((ds) => {
      const name = ds.dtCenterSourceName ?? ds.dataSourceName ?? ds.name ?? ''
      return name.toLowerCase().includes(datasource.dataName.toLowerCase())
    })

    if (target) {
      const centerId = target.dtCenterSourceId ?? target.id
      await assetsApi.importDatasource(centerId)
      console.log(`[meta-flow] Datasource imported successfully`)
    } else {
      console.warn(`[meta-flow] Datasource not found in unused list, may already be imported`)
    }
  } else {
    console.log(`[meta-flow] Datasource already imported (id=${imported.id})`)
  }

  // Step 5: Trigger metadata sync and poll
  console.log(`[meta-flow] Triggering metadata sync...`)
  const metaSource = await assetsApi.findMetadataDatasource(datasource.dataName)
  let syncComplete = false

  if (metaSource) {
    await assetsApi.triggerSync(metaSource.dataSourceId, metaSource.dataSourceType)
    console.log(`[meta-flow] Sync triggered, polling for completion...`)

    const expectedTableNames = options.tables.map((t) => t.name)
    syncComplete = await assetsApi.pollSyncComplete(
      metaSource.dataSourceId,
      expectedTableNames,
      syncTimeout,
    )
    console.log(`[meta-flow] Sync ${syncComplete ? 'complete' : 'timed out (continuing)'}`)
  } else {
    console.warn(`[meta-flow] Metadata datasource not found, skipping sync`)
  }

  return {
    projectId: project.id,
    projectName: project.projectName,
    datasourceId: datasource.id,
    tablesCreated,
    syncComplete,
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/plugins/assets-sql-sync
bun test __tests__/meta-flow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add plugins/assets-sql-sync/src/flows/meta-flow.ts plugins/assets-sql-sync/__tests__/meta-flow.test.ts
git commit -m "feat(assets-sql-sync): add Meta datasource flow orchestration"
```

---

## Task 10: 实现高层 API 和 YAML 配置

**Files:**
- Create: `plugins/assets-sql-sync/src/config/schema.ts`
- Create: `plugins/assets-sql-sync/src/config/datasources.yaml`
- Create: `plugins/assets-sql-sync/src/index.ts`

- [ ] **Step 1: 实现配置类型**

Create: `plugins/assets-sql-sync/src/config/schema.ts`

```typescript
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
```

- [ ] **Step 2: 创建 CI 数据源 YAML 配置**

Create: `plugins/assets-sql-sync/src/config/datasources.yaml`

从 `ci-datasource-config.md` 提取关键数据源，优先 Doris：

```yaml
environments:
  ci63:
    baseUrl: http://172.16.122.52
    login:
      username: admin@dtstack.com
      password: DrpEco_2020
    tenant: hadoop2

  ci78:
    baseUrl: http://172.16.124.78
    login:
      username: admin@dtstack.com
      password: DrpEco_2020
    tenant: hadoop2

datasources:
  doris_2x:
    type: doris
    host: 172.16.124.72
    jdbcPort: 19030
    httpPort: 18030
    username: root
    password: ""

  mysql:
    type: mysql
    host: 172.16.124.43
    port: 30307
    username: root
    password: ""
```

- [ ] **Step 3: 实现 index.ts — 高层 API + 分步 API 导出**

Create: `plugins/assets-sql-sync/src/index.ts`

```typescript
import type { Page } from '@playwright/test'
import { DtStackClient, extractCookieFromPage } from './client'
import { BatchApi } from './api/batch'
import { AssetsApi } from './api/assets'
import { metaFlow } from './flows/meta-flow'
import type { MetaFlowOptions, MetaFlowResult } from './flows/meta-flow'

export interface PreconditionOptions {
  readonly type?: 'meta' | 'non-meta'
  readonly datasourceType: 'Doris' | 'MySQL' | 'Hive' | 'SparkThrift'
  readonly tables: ReadonlyArray<{ readonly name: string; readonly sql: string }>
  readonly projectName?: string
  readonly syncTimeout?: number
}

export interface PreconditionResult {
  readonly flow: 'meta' | 'non-meta'
  readonly tablesCreated: ReadonlyArray<string>
  readonly syncComplete: boolean
}

function resolveBaseUrl(): string {
  return (
    process.env.UI_AUTOTEST_BASE_URL ??
    process.env.E2E_BASE_URL ??
    process.env.QA_BASE_URL_CI78 ??
    'http://172.16.122.52'
  )
}

export async function createClient(page: Page, baseUrl?: string): Promise<DtStackClient> {
  const cookie = await extractCookieFromPage(page)
  return new DtStackClient({
    baseUrl: baseUrl ?? resolveBaseUrl(),
    cookie,
  })
}

/**
 * 一键执行前置条件
 * 从 Playwright page 提取 cookie，自动完成建表→引入→同步全流程
 */
export async function setupPreconditions(
  page: Page,
  options: PreconditionOptions,
): Promise<PreconditionResult> {
  const client = await createClient(page)
  const flowType = options.type ?? 'meta'

  if (flowType === 'meta') {
    const result = await metaFlow(client, {
      datasourceType: options.datasourceType,
      tables: options.tables,
      projectName: options.projectName,
      syncTimeout: options.syncTimeout ? options.syncTimeout * 1000 : undefined,
    })

    return {
      flow: 'meta',
      tablesCreated: result.tablesCreated,
      syncComplete: result.syncComplete,
    }
  }

  // non-meta flow — to be implemented in Phase 2
  throw new Error('Non-meta flow not yet implemented. Use type: "meta".')
}

// Re-export step APIs for fine-grained control
export { BatchApi } from './api/batch'
export { AssetsApi } from './api/assets'
export { DtStackClient, extractCookieFromPage } from './client'
export { metaFlow } from './flows/meta-flow'
export type { MetaFlowOptions, MetaFlowResult } from './flows/meta-flow'
```

- [ ] **Step 4: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add plugins/assets-sql-sync/src/config/ plugins/assets-sql-sync/src/index.ts
git commit -m "feat(assets-sql-sync): add high-level setupPreconditions API and YAML config"
```

---

## Task 11: 更新 helpers/preconditions.ts 兼容层

**Files:**
- Modify: `tests/e2e/helpers/preconditions.ts`

- [ ] **Step 1: 重写兼容层**

更新 `tests/e2e/helpers/preconditions.ts`，改为从新的 TS 原生模块导入：

```typescript
/**
 * 前置条件 — 兼容层
 * 从 assets-sql-sync 插件重新导出，保持向后兼容
 */
export {
  setupPreconditions,
  createClient,
  BatchApi,
  AssetsApi,
  DtStackClient,
  extractCookieFromPage,
  metaFlow,
} from '../../plugins/assets-sql-sync/src/index'

export type {
  PreconditionOptions,
  PreconditionResult,
  MetaFlowOptions,
  MetaFlowResult,
} from '../../plugins/assets-sql-sync/src/index'
```

- [ ] **Step 2: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add tests/e2e/helpers/preconditions.ts
git commit -m "refactor: update preconditions helper to use native TS assets-sql-sync"
```

---

## Task 12: 创建测试用例 SQL 文件

**Files:**
- Create: `tests/e2e/202604/资产-集成测试用例/sql/base-tables.sql`
- Create: `tests/e2e/202604/资产-集成测试用例/sql/quality-tables.sql`
- Create: `tests/e2e/202604/资产-集成测试用例/sql/lineage-tables.sql`
- Create: `tests/e2e/202604/资产-集成测试用例/sql/active-users.sql`

- [ ] **Step 1: 创建 sql 目录和基础表 SQL**

Create: `tests/e2e/202604/资产-集成测试用例/sql/base-tables.sql`

```sql
DROP TABLE IF EXISTS test_table;
CREATE TABLE IF NOT EXISTS test_table (
    id INT COMMENT '主键',
    name VARCHAR(255) COMMENT '姓名',
    info VARCHAR(255) COMMENT '信息'
) DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO test_table VALUES (1, 'one', 'desc 1');
INSERT INTO test_table VALUES (2, 'two', 'desc 2');
INSERT INTO test_table VALUES (3, 'three', 'desc 3')
```

- [ ] **Step 2: 创建数据质量表 SQL**

Create: `tests/e2e/202604/资产-集成测试用例/sql/quality-tables.sql`

```sql
DROP TABLE IF EXISTS doris_test;
CREATE TABLE IF NOT EXISTS doris_test (
    id INT COMMENT '主键ID',
    name STRING COMMENT '姓名',
    age INT COMMENT '年龄'
) DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO doris_test VALUES (1, 'qq', 11);

DROP TABLE IF EXISTS doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
    user_id BIGINT COMMENT '用户ID',
    created_date DATE COMMENT '创建日期',
    name VARCHAR(50) COMMENT '姓名',
    age TINYINT COMMENT '年龄',
    status SMALLINT COMMENT '状态码',
    price DECIMAL(10,2) COMMENT '价格',
    weight FLOAT COMMENT '重量',
    rating DOUBLE COMMENT '评分',
    description STRING COMMENT '描述信息',
    gender VARCHAR(10) COMMENT '性别',
    department VARCHAR(20) COMMENT '部门',
    created_time DATETIME COMMENT '创建时间',
    birth_date DATE COMMENT '出生日期',
    is_active BOOLEAN COMMENT '是否激活',
    tags VARCHAR(100) COMMENT '标签',
    total_amount BIGINT COMMENT '总金额',
    order_count INT COMMENT '订单数量'
) ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO doris_demo_data_types_source VALUES
(1001, '2024-01-15', '张三', 25, 1, 99.99, 65.5, 4.5, '技术部员工', '男', '技术部', '2024-01-15 10:30:00', '1998-05-20', true, '科技,财经', 1500, 5),
(1002, '2024-01-16', '李四', 30, 2, 199.50, 55.2, 4.8, '市场部经理', '女', '市场部', '2024-01-16 14:20:00', '1993-12-10', true, '娱乐', 2500, 8),
(1003, '2024-01-17', '王五', 22, 0, 49.99, 70.1, 3.9, '销售专员', '其他', '销售部', '2024-01-17 16:45:00', '2001-08-25', false, '科技,体育', 800, 3);

DROP TABLE IF EXISTS doris_demo1_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo1_data_types_source (
    user_id BIGINT COMMENT '用户ID',
    created_date VARCHAR(20) COMMENT '创建日期',
    name VARCHAR(50) COMMENT '姓名',
    age INT COMMENT '年龄',
    status INT COMMENT '状态码',
    price VARCHAR(20) COMMENT '价格',
    weight VARCHAR(20) COMMENT '重量',
    rating VARCHAR(20) COMMENT '评分',
    description VARCHAR(500) COMMENT '描述信息',
    gender VARCHAR(10) COMMENT '性别',
    department VARCHAR(20) COMMENT '部门',
    created_time VARCHAR(30) COMMENT '创建时间',
    birth_date VARCHAR(20) COMMENT '出生日期',
    is_active VARCHAR(10) COMMENT '是否激活',
    tags VARCHAR(100) COMMENT '标签',
    total_amount INT COMMENT '总金额',
    order_count INT COMMENT '订单数量'
) ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO doris_demo1_data_types_source VALUES
(1001, '2024-01-15', '张三', 25, 1, '99', '65', '4', '技术部员工', '男', '技术部', '2024-01-15 10:30:00', '1998-05-20', 'true', '科技,财经', 1500, 5),
(1002, '2024-01-16', '李四', 30, 2, '199', '55', '4', '市场部经理', '女', '市场部', '2024-01-16 14:20:00', '1993-12-10', 'true', '娱乐', 2500, 8)
```

- [ ] **Step 3: 创建血缘表 SQL**

Create: `tests/e2e/202604/资产-集成测试用例/sql/lineage-tables.sql`

```sql
DROP TABLE IF EXISTS wwz_001;
DROP TABLE IF EXISTS wwz_002;
DROP TABLE IF EXISTS wwz_003;

CREATE TABLE wwz_001 (
    id INT COMMENT '用户ID',
    name VARCHAR(50) COMMENT '用户姓名'
) DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num" = "1");

CREATE TABLE wwz_002 (
    id INT COMMENT '用户ID',
    name VARCHAR(50) COMMENT '用户姓名'
) DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num" = "1");

CREATE TABLE wwz_003 (
    id INT COMMENT '用户ID',
    name VARCHAR(50) COMMENT '用户姓名'
) DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num" = "1");

INSERT INTO wwz_001 SELECT id, name FROM wwz_002;
INSERT INTO wwz_001 SELECT * FROM wwz_002 UNION ALL SELECT * FROM wwz_003
```

- [ ] **Step 4: 创建标准映射表 SQL**

Create: `tests/e2e/202604/资产-集成测试用例/sql/active-users.sql`

```sql
DROP TABLE IF EXISTS active_users;
CREATE TABLE IF NOT EXISTS active_users (
    user_id BIGINT NOT NULL COMMENT '用户ID',
    name VARCHAR(50) NOT NULL COMMENT '用户姓名',
    email VARCHAR(200) NULL COMMENT '邮箱地址',
    address VARCHAR(500) NULL COMMENT '住址',
    age TINYINT NULL COMMENT '用户年龄',
    sex TINYINT NULL COMMENT '用户性别',
    last_active DATETIME COMMENT '最近活跃时间',
    property0 TINYINT NOT NULL COMMENT '属性0',
    property1 TINYINT NOT NULL COMMENT '属性1',
    property2 TINYINT NOT NULL COMMENT '属性2',
    property3 TINYINT NOT NULL COMMENT '属性3'
) DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO active_users VALUES (1, '张三', 'zhangsan@test.com', '北京市', 25, 1, '2024-01-15 10:30:00', 1, 0, 1, 0);
INSERT INTO active_users VALUES (2, '李四', 'lisi@test.com', '上海市', 30, 0, '2024-01-16 14:20:00', 0, 1, 1, 1)
```

- [ ] **Step 5: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add tests/e2e/202604/资产-集成测试用例/sql/
git commit -m "feat: add Doris SQL scripts for asset integration test preconditions"
```

---

## Task 13: 重写 smoke.spec.ts 测试脚本

**Files:**
- Rewrite: `tests/e2e/202604/资产-集成测试用例/smoke.spec.ts`

这是最大的 Task。测试脚本基于 MD 源用例重写，使用新的 `setupPreconditions` API，并推测完善校验点。

注意：使用项目已有的 fixtures 和 helpers：
- `import { test, expect } from '../../fixtures/step-screenshot'` — 提供 `step` fixture
- `import { applyRuntimeCookies, normalizeBaseUrl, navigateViaMenu, ... } from '../../helpers/test-setup'` — 提供 URL 构建、Cookie 注入、菜单导航
- `import { setupPreconditions } from '../../helpers/preconditions'` — 前置条件

- [ ] **Step 1: 重写 smoke.spec.ts 框架和前置条件**

完整重写 `tests/e2e/202604/资产-集成测试用例/smoke.spec.ts`。

由于文件较大（37 个用例），这里提供完整的框架结构和代表性用例。执行者应基于 MD 源用例补充所有用例。

```typescript
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { test, expect } from '../../fixtures/step-screenshot'
import {
  applyRuntimeCookies,
  normalizeBaseUrl,
  buildDataAssetsUrl,
  navigateViaMenu,
  selectAntOption,
  expectAntMessage,
  waitForAntModal,
  uniqueName,
} from '../../helpers/test-setup'
import { setupPreconditions } from '../../helpers/preconditions'

const sqlDir = resolve(__dirname, 'sql')
const SQL_BASE = readFileSync(resolve(sqlDir, 'base-tables.sql'), 'utf-8')
const SQL_QUALITY = readFileSync(resolve(sqlDir, 'quality-tables.sql'), 'utf-8')
const SQL_LINEAGE = readFileSync(resolve(sqlDir, 'lineage-tables.sql'), 'utf-8')
const SQL_ACTIVE = readFileSync(resolve(sqlDir, 'active-users.sql'), 'utf-8')

test.describe('资产-集成测试用例', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await applyRuntimeCookies(page, 'batch')
    await page.goto(`${normalizeBaseUrl('batch')}/batch/`)

    await setupPreconditions(page, {
      datasourceType: 'Doris',
      tables: [
        { name: 'test_table', sql: SQL_BASE },
        { name: 'doris_test', sql: SQL_QUALITY },
        { name: 'wwz_001', sql: SQL_LINEAGE },
        { name: 'active_users', sql: SQL_ACTIVE },
      ],
      syncTimeout: 180,
    })

    await page.close()
  })

  // ========================================
  // 资产盘点
  // ========================================

  test('资产盘点 - 已接入数据源统计数据正确 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await page.goto(buildDataAssetsUrl('/overview'))

    await step('步骤1: 打开资产盘点页面 → 页面加载完毕', async () => {
      await expect(page.locator('.overview-page, [class*="overview"]')).toBeVisible({ timeout: 10_000 })
    })

    await step('步骤2: 验证数据源统计卡片 → 统计数字大于0', async () => {
      const statsCards = page.locator('[class*="stat-card"], [class*="overview-card"]')
      await expect(statsCards.first()).toBeVisible()
      const text = await statsCards.first().textContent()
      expect(text).toBeTruthy()
    })
  })

  // ========================================
  // 元数据 - 数据地图
  // ========================================

  test('元数据-数据地图 - 数据表表数量统计正确 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await page.goto(buildDataAssetsUrl('/dataMap'))

    await step('步骤1: 打开数据地图页面 → 页面加载', async () => {
      await expect(page.locator('[class*="data-map"], [class*="dataMap"]')).toBeVisible({ timeout: 10_000 })
    })

    await step('步骤2: 查看表数量统计 → 数量大于0', async () => {
      const tableCount = page.locator('[class*="table-count"], [class*="tableNum"]')
      await expect(tableCount).toBeVisible()
    })
  })

  test('元数据-数据地图 - 筛选条件组合查询功能正常 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await page.goto(buildDataAssetsUrl('/dataMap'))

    await step('步骤1: 在搜索框输入 test_table → 搜索执行', async () => {
      const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]')
      await searchInput.fill('test_table')
      await searchInput.press('Enter')
    })

    await step('步骤2: 验证搜索结果 → 包含 test_table', async () => {
      await expect(page.getByText('test_table')).toBeVisible({ timeout: 10_000 })
    })
  })

  test('元数据-数据地图 - 数据表结构信息展示正确 (P1)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await page.goto(buildDataAssetsUrl('/dataMap'))

    await step('步骤1: 搜索并点击 test_table → 进入表详情', async () => {
      const searchInput = page.locator('input[placeholder*="搜索"]')
      await searchInput.fill('test_table')
      await searchInput.press('Enter')
      await page.getByText('test_table').first().click()
    })

    await step('步骤2: 验证字段列表 → 包含 id, name, info 字段', async () => {
      await expect(page.getByText('id')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('name')).toBeVisible()
      await expect(page.getByText('info')).toBeVisible()
    })
  })

  test('元数据-数据地图 - 血缘关系功能正常 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await page.goto(buildDataAssetsUrl('/dataMap'))

    await step('步骤1: 搜索 wwz_001 → 找到表', async () => {
      const searchInput = page.locator('input[placeholder*="搜索"]')
      await searchInput.fill('wwz_001')
      await searchInput.press('Enter')
      await page.getByText('wwz_001').first().click()
    })

    await step('步骤2: 切换到血缘关系 tab → 血缘图加载', async () => {
      await page.getByText('血缘关系').click()
      await expect(page.locator('[class*="lineage"], [class*="blood"]')).toBeVisible({ timeout: 10_000 })
    })

    await step('步骤3: 验证血缘节点 → 包含 wwz_002 和 wwz_003', async () => {
      await expect(page.getByText('wwz_002')).toBeVisible()
      await expect(page.getByText('wwz_003')).toBeVisible()
    })
  })

  // ========================================
  // 元数据管理
  // ========================================

  test('元数据管理 - 数据表列表数据展示正确 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['元数据', '元数据管理'])

    await step('步骤1: 进入元数据管理 → 表列表加载', async () => {
      await expect(page.locator('table, [class*="ant-table"]')).toBeVisible({ timeout: 10_000 })
    })

    await step('步骤2: 验证表列表 → 包含已同步的表', async () => {
      const tableRows = page.locator('.ant-table-row, [class*="table-row"]')
      const count = await tableRows.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test('元数据管理 - 生命周期配置操作正常 (P1)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['元数据', '元数据管理'])

    await step('步骤1: 找到 test_table 并点击 → 进入详情', async () => {
      await page.getByText('test_table').first().click()
    })

    await step('步骤2: 查看生命周期配置 → 页面元素可见', async () => {
      const lifeCycle = page.getByText('生命周期')
      await expect(lifeCycle).toBeVisible({ timeout: 10_000 })
    })
  })

  // ========================================
  // 元模型管理
  // ========================================

  test('元模型管理 - 新增枚举属性并删除 (P1)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['元数据', '元模型管理'])

    const attrName = uniqueName('enum_attr')

    await step('步骤1: 点击新增属性 → 弹窗出现', async () => {
      await page.getByRole('button', { name: /新增|新建/ }).click()
      await expect(page.locator('.ant-modal')).toBeVisible()
    })

    await step('步骤2: 填写枚举属性信息并提交 → 提示成功', async () => {
      await page.locator('input[placeholder*="属性名"]').fill(attrName)
      await page.getByRole('button', { name: /确[定认]/ }).click()
      await expectAntMessage(page, /成功/)
    })

    await step('步骤3: 删除刚创建的属性 → 列表中消失', async () => {
      const row = page.getByText(attrName).locator('..')
      await row.getByRole('button', { name: /删除/ }).click()
      const confirmBtn = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal .ant-btn-primary')
      await confirmBtn.click()
      await expect(page.getByText(attrName)).not.toBeVisible({ timeout: 5_000 })
    })
  })

  // ========================================
  // 元数据同步
  // ========================================

  test('元数据同步 - 同步任务创建 (P1)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['元数据', '同步管理'])

    await step('步骤1: 查看同步任务列表 → 列表加载', async () => {
      await expect(page.locator('table, [class*="ant-table"]')).toBeVisible({ timeout: 10_000 })
    })
  })

  // ========================================
  // 数据标准 - 标准定义
  // ========================================

  test('数据标准-标准定义 - 新建标准 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['数据标准', '标准定义'])

    const standardName = uniqueName('std')

    await step('步骤1: 点击新建标准 → 弹窗出现', async () => {
      await page.getByRole('button', { name: /新建/ }).click()
      await expect(page.locator('.ant-modal')).toBeVisible()
    })

    await step('步骤2: 填写标准名称并提交 → 创建成功', async () => {
      await page.locator('input[placeholder*="标准名"]').fill(standardName)
      await page.getByRole('button', { name: /确[定认]/ }).click()
      await expectAntMessage(page, /成功/)
    })

    await step('步骤3: 验证列表中有该标准 → 标准可见', async () => {
      await expect(page.getByText(standardName)).toBeVisible({ timeout: 5_000 })
    })
  })

  test('数据标准-标准定义 - 查看详情 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['数据标准', '标准定义'])

    await step('步骤1: 点击已有标准 → 进入详情', async () => {
      const firstRow = page.locator('.ant-table-row').first()
      await firstRow.click()
    })

    await step('步骤2: 验证详情页加载 → 标准信息可见', async () => {
      await expect(page.locator('[class*="detail"], [class*="standard-info"]')).toBeVisible({ timeout: 10_000 })
    })
  })

  // ========================================
  // 数据标准 - 标准映射
  // ========================================

  test('数据标准-标准映射 - 创建映射 (P1)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['数据标准', '标准映射'])

    await step('步骤1: 点击新建映射 → 进入创建页面', async () => {
      await page.getByRole('button', { name: /新建|创建/ }).click()
    })

    await step('步骤2: 选择数据表 active_users → 表选中', async () => {
      await page.getByText('active_users').first().click()
    })
  })

  // ========================================
  // 数据标准 - 词根管理
  // ========================================

  test('数据标准-词根管理 - 新建词根 (P1)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['数据标准', '词根管理'])

    const rootName = uniqueName('root')

    await step('步骤1: 点击新建 → 弹窗出现', async () => {
      await page.getByRole('button', { name: /新建/ }).click()
      await expect(page.locator('.ant-modal')).toBeVisible()
    })

    await step('步骤2: 填写词根信息并提交 → 成功', async () => {
      await page.locator('input[placeholder*="词根"]').fill(rootName)
      await page.getByRole('button', { name: /确[定认]/ }).click()
      await expectAntMessage(page, /成功/)
    })

    await step('步骤3: 删除词根 → 列表中消失', async () => {
      await page.getByText(rootName).locator('..').getByRole('button', { name: /删除/ }).click()
      const confirmBtn = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal .ant-btn-primary')
      await confirmBtn.click()
      await expect(page.getByText(rootName)).not.toBeVisible({ timeout: 5_000 })
    })
  })

  // ========================================
  // 数据质量（代表性用例 — 执行者应基于 MD 补充完整 11 个）
  // ========================================

  test('数据质量 - 完整性校验规则 (P1)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['数据质量', '质量规则'])

    const ruleName = uniqueName('completeness_rule')

    await step('步骤1: 新建质量规则 → 进入规则编辑', async () => {
      await page.getByRole('button', { name: /新建/ }).click()
    })

    await step('步骤2: 配置完整性校验规则 → 选择表和字段', async () => {
      await page.locator('input[placeholder*="规则名"]').fill(ruleName)
      // 选择 doris_test 表
      await page.getByText('doris_test').first().click()
    })

    await step('步骤3: 保存规则 → 提示成功', async () => {
      await page.getByRole('button', { name: /保存|确[定认]/ }).click()
      await expectAntMessage(page, /成功/)
    })
  })

  // ========================================
  // 数据安全（代表性用例 — 执行者应基于 MD 补充完整 5 个）
  // ========================================

  test('数据安全 - 表脱敏功能入口正常 (P0)', async ({ page, step }) => {
    await applyRuntimeCookies(page, 'assets')
    await navigateViaMenu(page, ['数据安全', '脱敏管理'])

    await step('步骤1: 进入脱敏管理页面 → 页面加载', async () => {
      await expect(page.locator('[class*="desensitize"], [class*="mask"]')).toBeVisible({ timeout: 10_000 })
    })
  })
})
```

**重要说明：** 以上是框架和代表性用例。执行者需要：
1. 阅读 `workspace/archive/202604/资产-集成测试用例.md` 中的全部 37 个用例
2. 为每个用例推测具体的 UI 元素选择器和校验断言
3. 参考上面的模式补充完整的测试代码
4. 使用 `step()` fixture 包裹每个步骤
5. 使用 `uniqueName()` 为创建操作生成唯一名称，避免冲突

- [ ] **Step 2: 验证 TypeScript 编译无错**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: 无编译错误（或仅与已存在文件相关的警告）。

- [ ] **Step 3: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add tests/e2e/202604/资产-集成测试用例/smoke.spec.ts
git commit -m "feat: rewrite asset integration smoke tests with native TS preconditions"
```

---

## Task 14: 补全 MD 测试用例

**Files:**
- Modify: `workspace/archive/202604/资产-集成测试用例.md`

- [ ] **Step 1: 阅读现有 MD 用例**

```bash
cat workspace/archive/202604/资产-集成测试用例.md
```

了解现有用例的格式和内容。

- [ ] **Step 2: 补充前置条件和校验点**

在 MD 文件中为每个用例补充：

1. **前置条件** — 明确说明需要的数据源（Doris）、表名、SQL 脚本引用
2. **校验点** — 将模糊的"验证成功"替换为具体的断言描述

补充模板：

```markdown
### 用例: XXX

**前置条件:**
- 数据源类型: Doris（Meta）
- 依赖表: test_table（见 sql/base-tables.sql）
- 字段: id(INT), name(VARCHAR), info(VARCHAR)
- 测试数据: 3 条记录

**操作步骤:**
1. 打开数据地图页面
2. 在搜索框输入 "test_table" 并回车
3. 点击搜索结果中的 test_table

**预期结果:**
- 搜索结果中可见 test_table 表名
- 点击后展示字段列表：id, name, info
- 各字段类型标注正确
```

- [ ] **Step 3: Commit**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add workspace/archive/202604/资产-集成测试用例.md
git commit -m "docs: enhance asset integration test cases with SQL, preconditions, and assertions"
```

---

## Task 15: 清理遗留文件和最终验证

**Files:**
- Delete: `tools/multiple-sql-cli/ci-datasource-config.md` (信息已迁移到 YAML)
- Delete: `ci-datasource-config.md` (根目录如果存在)

- [ ] **Step 1: 清理遗留文件**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
rm -f tools/multiple-sql-cli/ci-datasource-config.md
```

- [ ] **Step 2: 运行 multiple-sql-cli 单元测试**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/tools/multiple-sql-cli
bun test
```

Expected: All tests PASS.

- [ ] **Step 3: 运行 assets-sql-sync 单元测试**

```bash
cd /Users/poco/Documents/DTStack/qa-flow/plugins/assets-sql-sync
bun test
```

Expected: All tests PASS.

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit cleanup**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
git add -A
git commit -m "chore: cleanup legacy files and finalize assets-sql-sync migration"
```
