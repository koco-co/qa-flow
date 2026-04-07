import {
  HiveClient,
  HiveUtils,
  thrift,
  connections,
  auth,
} from 'hive-driver'
import type { ConnectionConfig, DriverType, QueryResult, SqlDriver } from './types'

const { TCLIService, TCLIService_types } = thrift
const { TcpConnection } = connections
const { NoSaslAuthentication } = auth

interface HiveConnectionConfig {
  readonly host: string
  readonly port: number
  readonly options: {
    readonly connect_timeout: number
  }
}

export class HiveDriver implements SqlDriver {
  readonly supportedTypes: ReadonlyArray<DriverType> = ['hive', 'sparkthrift']
  private client: InstanceType<typeof HiveClient> | null = null
  private session: Awaited<ReturnType<InstanceType<typeof HiveClient>['openSession']>> | null = null
  private utils: InstanceType<typeof HiveUtils> | null = null

  toHiveConnectionConfig(config: ConnectionConfig): HiveConnectionConfig {
    return {
      host: config.host,
      port: config.port,
      options: {
        connect_timeout: 30_000,
      },
    }
  }

  async connect(config: ConnectionConfig): Promise<void> {
    const hiveConfig = this.toHiveConnectionConfig(config)

    this.client = new HiveClient(TCLIService, TCLIService_types)
    this.utils = new HiveUtils(TCLIService_types)

    await this.client.connect(hiveConfig, new TcpConnection(), new NoSaslAuthentication())

    this.session = await this.client.openSession({
      client_protocol:
        TCLIService_types.TProtocolVersion.HIVE_CLI_SERVICE_PROTOCOL_V8,
      username: config.username || undefined,
      password: config.password || undefined,
    })
  }

  async execute(sql: string): Promise<QueryResult> {
    if (!this.session || !this.utils) {
      throw new Error('Not connected. Call connect() first.')
    }

    const operation = await this.session.executeStatement(sql, {
      runAsync: true,
    })

    await this.utils.waitUntilReady(operation, false)
    await this.utils.fetchAll(operation)

    const resultHandler = this.utils.getResult(operation)
    const rows = resultHandler.getValue() as Record<string, unknown>[]

    await operation.close()

    return {
      rows: rows ?? [],
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.session) {
        await this.session.close()
        this.session = null
      }
    } finally {
      if (this.client) {
        this.client.close()
        this.client = null
      }
      this.utils = null
    }
  }
}
