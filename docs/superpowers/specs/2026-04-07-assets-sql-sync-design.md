# Assets SQL Sync 设计方案

> 将 E2E 测试中复杂的数据源建表、引入、同步前置条件从 UI 操作抽离为 API 自动化，让 Playwright 脚本只关注业务验证步骤。

## 背景与目标

### 问题

当测试用例涉及创建 SQL 表时，需要：

1. 进入离线开发创建项目（等同建库）
2. 在项目中创建表
3. 返回数据资产引入该数据源
4. 触发元数据同步

这套流程全部走 UI 自动化极其脆弱且耗时。

### 目标

- 将前置条件操作封装为 API 调用，Playwright 脚本只关注产品内的测试步骤
- 支持 Meta 数据源（离线开发→资产引入）和非 Meta 数据源（公共管理→资产引入）两条路径
- 优先适配 Doris 2.x，后续扩展 MySQL、SparkThrift 2.x、Hive 2.x
- 全 TypeScript 实现，与 Playwright 生态统一

### 决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 技术栈 | TypeScript（全量重写，去除 Python） | 统一生态，无需桥接层 |
| CLI 工具名 | `multiple-sql-cli` | 通用 SQL 工具，不绑定平台概念 |
| 插件名 | `assets-sql-sync` | DTStack 平台专属流程编排 |
| API 层次 | 高层一键 API + 分步 API 两层 | 简洁与灵活兼顾 |
| 配置格式 | YAML（仅连接信息） | SQL 模板由测试用例侧管理 |
| 优先数据源 | Doris 2.x | 当前主要测试场景，走 MySQL 协议 |

## 架构概览

```
Playwright 测试脚本（smoke.spec.ts）
    │
    ▼
plugins/assets-sql-sync          ← DTStack 平台流程编排
    │  高层 API: setupPreconditions()
    │  分步 API: findProject() / createTables() / importDatasource() / syncMetadata()
    │
    ├──▶ src/api/batch.ts        ← 离线开发 API（Meta 建表）
    ├──▶ src/api/assets.ts       ← 数据资产 API（引入 + 同步）
    ├──▶ src/api/public-service.ts ← 公共管理 API（非 Meta）
    │
    ▼
tools/multiple-sql-cli           ← 通用 SQL 工具（直连数据库）
    │  SqlExecutor / SqlDriver 接口
    │
    ▼
  数据库（Doris / MySQL / Hive / SparkThrift）
```

**职责边界：**

- `multiple-sql-cli` — 纯通用 SQL 工具，不含任何 DTStack 平台概念。连接数据库、执行 SQL、CLI 命令行
- `assets-sql-sync` — DTStack 平台专属，封装离线/资产/公共管理的 API 流程。Meta 建表通过平台 Batch DDL API，非 Meta 建表通过 `multiple-sql-cli` 直连

## 组件一：`tools/multiple-sql-cli`

### 目录结构

```
tools/multiple-sql-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts                ← CLI 入口（bun run）
│   ├── index.ts              ← 库导出
│   ├── drivers/
│   │   ├── types.ts          ← 通用 Driver 接口定义
│   │   ├── mysql.ts          ← MySQL/Doris 驱动（mysql2）
│   │   └── (hive.ts)         ← 后续扩展
│   ├── executor.ts           ← SQL 执行器（选驱动→连接→执行→断开）
│   └── config/
│       └── schema.ts         ← YAML 配置类型定义
└── __tests__/
    └── executor.test.ts
```

### 核心接口

```typescript
// --- drivers/types.ts ---

interface ConnectionConfig {
  type: 'mysql' | 'doris' | 'hive' | 'sparkthrift'
  host: string
  port: number
  username: string
  password: string
  database?: string
}

interface QueryResult {
  rows: Record<string, unknown>[]
  affectedRows?: number
}

interface SqlDriver {
  connect(config: ConnectionConfig): Promise<void>
  execute(sql: string): Promise<QueryResult>
  disconnect(): Promise<void>
}
```

```typescript
// --- executor.ts ---

class SqlExecutor {
  constructor(config: ConnectionConfig)

  /** 执行单条 SQL */
  execute(sql: string): Promise<QueryResult>

  /** 执行多条 SQL（按分号拆分） */
  executeMultiple(sqls: string[]): Promise<QueryResult[]>

  /** 执行 SQL 文件 */
  executeFile(filePath: string): Promise<QueryResult[]>

  /** 关闭连接 */
  close(): Promise<void>
}
```

### CLI 用法

```bash
# 执行 SQL 语句
bun run multiple-sql-cli exec --config datasources.yaml --source doris_ci --sql "CREATE TABLE test (id INT)"

# 执行 SQL 文件
bun run multiple-sql-cli exec --config datasources.yaml --source doris_ci --file create_tables.sql

# 测试连接
bun run multiple-sql-cli ping --config datasources.yaml --source doris_ci
```

### 驱动映射

| 数据源类型 | JS 驱动 | 备注 |
|-----------|---------|------|
| MySQL | `mysql2` | 原生支持 |
| Doris 2.x | `mysql2` | 兼容 MySQL 协议 |
| Hive 2.x | `hive-driver` | 后续扩展 |
| SparkThrift 2.x | `hive-driver` | 后续扩展 |

Doris 内部映射到 MySQL 驱动，`type: 'doris'` 是语义别名。

## 组件二：`plugins/assets-sql-sync`

### 目录结构

```
plugins/assets-sql-sync/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              ← 导出高层一键 API + 分步 API
│   ├── client.ts             ← HTTP 客户端基类（baseUrl + cookie）
│   ├── api/
│   │   ├── batch.ts          ← 离线开发 API
│   │   ├── assets.ts         ← 数据资产 API
│   │   └── public-service.ts ← 公共管理 API
│   ├── flows/
│   │   ├── meta-flow.ts      ← Meta 数据源流程编排
│   │   └── non-meta-flow.ts  ← 非 Meta 数据源流程编排
│   └── config/
│       ├── datasources.yaml  ← CI 稳定数据源配置
│       └── schema.ts         ← 配置类型定义
└── __tests__/
    └── flows.test.ts
```

### HTTP 客户端

```typescript
// --- client.ts ---

class DtStackClient {
  constructor(options: { baseUrl: string; cookie: string })

  /** POST 请求，自动注入 cookie 和通用 headers */
  post<T>(path: string, data?: unknown): Promise<T>

  /** GET 请求 */
  get<T>(path: string, params?: Record<string, string>): Promise<T>
}
```

- `baseUrl` 从环境变量 `E2E_BASE_URL` 或 YAML 配置获取
- `cookie` 从 Playwright `page` 上下文提取

### API 层

```typescript
// --- api/batch.ts --- 离线开发

/** 查询离线项目（按名称） */
findProject(name: string): Promise<Project | null>

/** 获取项目下指定类型的数据源 */
getProjectDatasource(projectId: number, type: string): Promise<Datasource>

/** 通过 Batch DDL API 执行建表（SQL 需 base64 编码） */
executeBatchDDL(projectId: number, datasourceId: number, sql: string): Promise<void>
```

```typescript
// --- api/assets.ts --- 数据资产

/** 查询未引入的中心数据源 */
listUnusedDatasources(): Promise<Datasource[]>

/** 引入数据源到资产产品 */
importDatasource(datasourceId: number, forceImport?: boolean): Promise<void>

/** 同步指定表的元数据 */
syncTables(datasourceId: number, dbName: string, tableNames: string[]): Promise<number>

/** 轮询同步状态直到完成 */
pollSyncComplete(taskId: number, timeoutMs?: number): Promise<boolean>
```

```typescript
// --- api/public-service.ts --- 公共管理（非 Meta）

/** 新增数据源 */
addDatasource(config: DatasourceAddConfig): Promise<Datasource>

/** 测试数据源连通性 */
testConnection(config: DatasourceAddConfig): Promise<boolean>

/** 数据源授权给产品 */
authToProduct(datasourceId: number, productCode: string): Promise<void>
```

### API 路径（基于 httprunner 分析）

| 模块 | 接口 | 路径 |
|------|------|------|
| Batch | 查询项目 | `GET /api/rdos/common/project/getProjectInfo` |
| Batch | 获取项目数据源 | `POST /api/rdos/batch/batchDataSource/list` |
| Batch | DDL 建表 | `POST /api/rdos/batch/batchDataSource/executeDDL` |
| Assets | 未引入数据源列表 | `POST /dmetadata/v1/dataSource/listUnusedCenterDataSource` |
| Assets | 引入数据源 | `POST /dmetadata/v1/dataSource/importDataSource` |
| Assets | 同步指定表 | `POST /dassets/v1/syncTask/syncTables` |
| Assets | 同步任务状态 | `POST /dmetadata/v1/syncTask/pageTask` |
| Public | 新增数据源 | `POST /api/publicService/addDs/addOrUpdateSource` |
| Public | 测试连通性 | `POST /api/publicService/addDs/testCon` |
| Public | 授权产品 | `POST /api/publicService/dataSource/product/auth` |

### 流程编排

```typescript
// --- flows/meta-flow.ts ---

/**
 * Meta 数据源完整流程：
 * 1. 查找可用的离线项目（优先已有项目）
 * 2. 获取项目下对应类型的数据源
 * 3. 通过 Batch DDL API 执行建表 SQL
 * 4. 在数据资产中引入该数据源（如未引入）
 * 5. 触发元数据同步，轮询等待完成
 */
async function metaFlow(client: DtStackClient, options: MetaFlowOptions): Promise<FlowResult>
```

```typescript
// --- flows/non-meta-flow.ts ---

/**
 * 非 Meta 数据源完整流程：
 * 1. 在公共管理中新增数据源（或查找已有）
 * 2. 测试连通性
 * 3. 授权给资产产品
 * 4. 在数据资产中引入
 * 5. 通过 multiple-sql-cli 直连数据库建表（如需要）
 * 6. 触发元数据同步
 */
async function nonMetaFlow(client: DtStackClient, options: NonMetaFlowOptions): Promise<FlowResult>
```

### 高层一键 API

```typescript
// --- index.ts ---

interface PreconditionOptions {
  /** 数据源模式，默认 'meta' */
  type?: 'meta' | 'non-meta'
  /** 数据源类型 */
  datasourceType: 'Doris' | 'MySQL' | 'Hive' | 'SparkThrift'
  /** 需要创建的表 */
  tables: Array<{ name: string; sql: string }>
  /** 离线项目名（Meta 模式，可选，自动查找） */
  projectName?: string
  /** 同步超时秒数，默认 180 */
  syncTimeout?: number
  /** 非 Meta 模式下的直连配置名（引用 YAML） */
  connectionConfig?: string
}

/**
 * 一键执行前置条件
 * 从 Playwright page 提取 cookie，自动完成建表→引入→同步全流程
 */
async function setupPreconditions(
  page: Page,
  options: PreconditionOptions
): Promise<PreconditionResult>
```

### 数据源配置 — `datasources.yaml`

```yaml
# CI 稳定数据源（优先适配的 4 种）
datasources:
  doris_2x:
    type: doris
    host: 172.16.124.72
    jdbcPort: 19030
    httpPort: 18030
    username: root
    password: ""
    database: qa_auto_test

  mysql:
    type: mysql
    host: 172.16.124.43
    port: 30307
    username: root
    password: ""
    database: qa_auto_test

  sparkthrift_2x:
    type: sparkthrift
    host: ""
    port: 0
    username: ""
    password: ""

  hive_2x:
    type: hive
    host: ""
    port: 0
    username: ""
    password: ""
```

> SparkThrift 和 Hive 连接信息待从 CI 环境补充，本次不实现。

## 组件三：测试用例重写

### 重写策略

1. 从 MD 源用例分析每个测试的步骤和预期
2. 推测完整校验点（MD 中缺失的部分）
3. 编写 TS 脚本，前置条件统一走 `setupPreconditions()`
4. 反向补充 MD 用例内容（前置条件细节、SQL 脚本、校验点）

### 文件结构

```
tests/e2e/202604/资产-集成测试用例/
├── sql/
│   ├── base-tables.sql        ← 基础表（test_table 等）
│   ├── quality-tables.sql     ← 数据质量表（doris_test 等）
│   ├── lineage-tables.sql     ← 血缘表（wwz_001/002/003）
│   └── active-users.sql       ← 标准映射表
├── smoke.spec.ts              ← 重写的主测试文件
└── README.md                  ← 用例说明（可选）
```

### 前置条件调用示例

```typescript
import { setupPreconditions } from '@plugins/assets-sql-sync'
import { readFileSync } from 'fs'

const SQL_BASE = readFileSync('./sql/base-tables.sql', 'utf-8')
const SQL_QUALITY = readFileSync('./sql/quality-tables.sql', 'utf-8')
const SQL_LINEAGE = readFileSync('./sql/lineage-tables.sql', 'utf-8')
const SQL_ACTIVE = readFileSync('./sql/active-users.sql', 'utf-8')

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  
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
})
```

### 各模块校验点

| 模块 | 校验点 |
|------|--------|
| **资产盘点** | 盘点页面正常加载；统计数字 > 0；图表/卡片渲染完整 |
| **元数据-数据地图** | 搜索 test_table 可见；展开后字段列表包含 id、name、info；字段类型正确 |
| **元数据同步** | 创建同步任务成功；执行后状态变为"成功"；同步后表数据可预览 |
| **血缘关系** | wwz_001→wwz_002→wwz_003 血缘链路可见；字段级血缘可展开；上下游节点数正确 |
| **数据质量** | 质量规则创建成功；规则执行后有结果；合格/不合格数量与预期一致 |
| **标准映射** | 标准创建成功；字段映射关系正确建立；映射覆盖率数据正确 |

### MD 用例补全范围

对 `workspace/archive/202604/资产-集成测试用例.md` 补充：

- **前置条件**：明确数据源类型（Doris）、项目名、完整 SQL 建表语句、预期表结构
- **操作步骤**：补充具体的 UI 操作路径（点击哪里、输入什么）
- **预期结果**：从模糊的"验证成功"细化为具体的断言（元素可见、文本匹配、数量校验）

## 实现优先级

### Phase 1：核心框架（本次实现）

1. `tools/multiple-sql-cli` — Doris 驱动 + CLI + 库导出
2. `plugins/assets-sql-sync` — Meta 流程（batch API + assets API + 一键 API）
3. 测试用例重写 — 基于新的前置条件 API 重写 smoke.spec.ts
4. MD 用例补全 — 反向补充校验点和 SQL

### Phase 2：扩展（后续）

5. `multiple-sql-cli` 扩展 Hive/SparkThrift 驱动
6. `assets-sql-sync` 补充非 Meta 流程（public-service API）
7. MySQL 数据源适配
8. 更多 CI 环境数据源配置

## 依赖关系

```
Phase 1 实现顺序：
multiple-sql-cli（Doris 驱动）
    → assets-sql-sync（API 层 + Meta 流程）
        → 测试用例重写（smoke.spec.ts）
            → MD 用例补全
```

## 技术约束

- Bun 运行时（与项目现有工具链一致）
- `mysql2` 包用于 Doris/MySQL 连接
- HTTP 请求使用 `fetch`（Bun 原生支持）
- YAML 解析使用 `yaml` 包
- 所有配置支持环境变量覆盖
