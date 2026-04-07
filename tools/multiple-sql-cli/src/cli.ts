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
