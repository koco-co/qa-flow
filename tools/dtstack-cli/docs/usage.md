# dtstack-cli usage

This document mirrors `dtstack-cli --help` output. AI assistants and skills should read this file to learn how to use the CLI without grepping source code.

## Root

```
dtstack-cli — DTStack 平台前置条件 CLI

USAGE
  dtstack-cli <command> [options]

COMMANDS
  Authentication
    login              Log in to a DTStack environment, cache cookie locally
    logout             Clear cached cookie
    whoami             Show current session info

  SQL execution
    sql exec           Run SQL via platform API or direct DB connection
    sql ping           Test connectivity (platform datasource OR direct DB)

  Platform
    project ensure     Find a project by name; create if missing (idempotent)
    precond setup      One-shot: ensure project + DDL + asset import + meta sync

GLOBAL OPTIONS
  -e, --env <name>     Environment name from config (default: $DTSTACK_DEFAULT_ENV)
  -h, --help           Show help (use `<command> -h` for command-specific help)
  -v, --version        Show version
      --json           Print machine-readable JSON output
      --verbose        Print debug logs

ENVIRONMENT
  DTSTACK_DEFAULT_ENV       Default --env if omitted
  DTSTACK_COOKIE            Override cached cookie (CI use)
  DTSTACK_USERNAME / DTSTACK_PASSWORD   Auto-login fallback
  DTSTACK_CONFIG            Override default config file path
```

## sql exec

```
dtstack-cli sql exec — Run SQL statement(s)

USAGE
  # Mode A: via DTStack platform API (default)
  dtstack-cli sql exec --project <name> --datasource <type> (--sql <stmt> | --file <path>)

  # Mode B: direct DB connection
  dtstack-cli sql exec --mode direct --source <name-from-config> (--sql <stmt> | --file <path>)

OPTIONS
      --mode platform|direct  Execution mode (default: platform)

  Platform mode:
      --project <name>        Project name (required); created if missing when --auto-create
      --datasource <type>     Doris | MySQL | Hive | SparkThrift (required)
      --auto-create           Create project if it doesn't exist (default: false)

  Direct mode:
  -s, --source <name>         Datasource name from config file (required)

  Common:
      --sql <stmt>            SQL statement (multiple statements separated by `;`)
  -f, --file <path>           Path to SQL file
      --on-exists warn|fail   How to handle "already exists" errors (default: warn)
      --on-missing warn|fail  How to handle "not exists" errors for DROP (default: warn)

EXAMPLES
  # Platform mode — most common in test preconditions
  dtstack-cli sql exec --project pw_test --datasource Doris --file ddl.sql

  # Direct mode — bypass platform for speed/debugging
  dtstack-cli sql exec --mode direct --source doris-prod --sql "SELECT 1"

NOTES
  Platform mode auto-routes: CREATE → ddlCreateTableEncryption, others → startCustomSql.
  Already-exists errors on CREATE and missing-object errors on DROP are warnings by default.
```

## sql ping

```
dtstack-cli sql ping — Test connectivity

USAGE
  dtstack-cli sql ping --project <name> --datasource <type>
  dtstack-cli sql ping --mode direct --source <name-from-config>

EXAMPLES
  dtstack-cli sql ping --project pw_test --datasource Doris
  dtstack-cli sql ping --mode direct --source doris-prod
```

## project ensure

```
dtstack-cli project ensure — Find or create a project (idempotent)

USAGE
  dtstack-cli project ensure --name <name> [--owner-id <id>] [--engines <list>]

OPTIONS
  --name <name>           Project name (required)
  --owner-id <id>         Numeric user id (default: 1)
  --engines <list>        Comma-separated engines, e.g. doris3 (default: empty)

EXAMPLES
  dtstack-cli project ensure --name pw_test --engines doris3
```

## precond setup

```
dtstack-cli precond setup — Set up UI-test preconditions in one shot

USAGE
  dtstack-cli precond setup --project <name> --datasource <type> --tables-from <file>

WHAT IT DOES (in order)
  1. Ensure project exists (find by name, create if missing)
  2. Find datasource of given type within the project
  3. Run DDL for each table (idempotent — already-exists is OK)
  4. Import datasource to assets platform (skip if already imported)
  5. Trigger metadata sync
  6. Poll until expected tables appear in synced metadata (or timeout)

OPTIONS
      --project <name>        Project name (required)
      --datasource <type>     Doris | MySQL | Hive | SparkThrift (required)
      --tables-from <path>    YAML file with tables (see schema below)
      --skip-sync             Skip step 4-6 (DDL only)
      --sync-timeout <sec>    Metadata sync poll timeout (default: 180)

TABLES YAML SCHEMA
  tables:
    - name: my_table
      sql: |
        CREATE TABLE my_table (...) ...;
        INSERT INTO my_table VALUES (...);

EXAMPLES
  dtstack-cli precond setup \
    --project pw_test --datasource Doris \
    --tables-from precond/tables.yaml

EXIT CODES
  0  All steps succeeded
  1  Generic failure (see stderr)
  2  Sync timed out (DDL/import succeeded; tables not yet visible in assets)
```

## login / logout / whoami

```
dtstack-cli login — Log in and cache cookie

USAGE
  dtstack-cli login [--env <name>] [--username <u>] [--password <p>]

EXAMPLES
  dtstack-cli login --env ci78
```

```
dtstack-cli logout — Clear cached session

USAGE
  dtstack-cli logout [--env <name>]
```

```
dtstack-cli whoami — Show current session

USAGE
  dtstack-cli whoami [--env <name>]
```
