import { parseFlags } from "./parse-args";
import { execSql } from "../sdk/exec-sql";
import { pingSql } from "../sdk/ping-sql";
import { precondSetup } from "../sdk/precond-setup";
import { ensureProject } from "../sdk/ensure-project";
import { login, logout, whoami, getSession } from "../sdk/auth";
import { loadConfig } from "../core/config/load";
import { DtStackClient } from "../core/http/client";
import type { DtStackCliConfig } from "../core/config/schema";

const DRY_RUN = process.env.DTSTACK_CLI_TEST_DRY === "1";

function resolveConfigPath(values: Record<string, unknown>): string {
  const explicit = (values.config as string | undefined) ?? process.env.DTSTACK_CONFIG;
  if (explicit) return explicit;
  return "dtstack-cli.yaml";
}

function resolveEnv(config: DtStackCliConfig, values: Record<string, unknown>): string {
  return (values.env as string | undefined) ?? process.env.DTSTACK_DEFAULT_ENV ?? config.defaultEnv ?? "default";
}

async function buildClient(config: DtStackCliConfig, env: string): Promise<DtStackClient> {
  const session = await getSession(env, config);
  return new DtStackClient({ baseUrl: config.environments[env].baseUrl, cookie: session.cookie });
}

export async function dispatchCommand(args: ReadonlyArray<string>): Promise<void> {
  const cmd = args.slice(0, 2).join(" ");
  const restArgs = args.slice(args[1]?.startsWith("-") ? 1 : 2);
  const { values } = parseFlags(restArgs);

  if (DRY_RUN) {
    const mode = (values.mode as string | undefined) === "direct" ? "direct" : "platform";
    process.stdout.write(JSON.stringify({
      command: cmd,
      ...values,
      mode,
      engines: values.engines ? String(values.engines).split(",") : undefined,
      tablesFrom: values["tables-from"],
    }));
    process.stdout.write("\n");
    return;
  }

  // Lazy load config — auth commands need it; others may need it too
  const configPath = resolveConfigPath(values);
  const config = loadConfig(configPath);
  const env = resolveEnv(config, values);

  switch (cmd) {
    case "login": {
      const session = await login({
        env, config,
        username: values.username as string | undefined,
        password: values.password as string | undefined,
      });
      process.stdout.write(`logged in as ${session.user} (env=${env})\n`);
      return;
    }
    case "logout": {
      await logout(env);
      process.stdout.write(`session cleared for env=${env}\n`);
      return;
    }
    case "whoami": {
      const s = await whoami(env);
      process.stdout.write(s ? `${s.user} (tenant=${s.tenantName ?? "?"}, env=${env})\n` : `no session for env=${env}\n`);
      return;
    }
    case "sql exec": {
      const mode = (values.mode as string | undefined) === "direct" ? "direct" : "platform";
      if (mode === "direct") {
        const source = values.source as string | undefined;
        if (!source) throw new Error("--source required in direct mode");
        const ds = config.datasources[source];
        if (!ds) throw new Error(`datasource not in config: ${source}`);
        await execSql({ mode: "direct", connection: ds, sql: values.sql as string | undefined, file: values.file as string | undefined });
      } else {
        const client = await buildClient(config, env);
        await execSql({
          mode: "platform",
          project: values.project as string,
          datasource: values.datasource as string,
          sql: values.sql as string | undefined,
          file: values.file as string | undefined,
          autoCreate: Boolean(values["auto-create"]),
          client,
        });
      }
      return;
    }
    case "sql ping": {
      const mode = (values.mode as string | undefined) === "direct" ? "direct" : "platform";
      let ok = false;
      if (mode === "direct") {
        const ds = config.datasources[values.source as string];
        ok = await pingSql({ mode: "direct", connection: ds });
      } else {
        const client = await buildClient(config, env);
        ok = await pingSql({ mode: "platform", project: values.project as string, datasource: values.datasource as string, client });
      }
      process.stdout.write(ok ? "ok\n" : "fail\n");
      process.exit(ok ? 0 : 1);
    }
    case "project ensure": {
      const client = await buildClient(config, env);
      const project = await ensureProject({
        client,
        name: values.name as string,
        ownerId: values["owner-id"] ? Number(values["owner-id"]) : undefined,
        engines: values.engines ? String(values.engines).split(",") : undefined,
      });
      process.stdout.write(`project: id=${project.id} name=${project.projectName}\n`);
      return;
    }
    case "precond setup": {
      const client = await buildClient(config, env);
      const result = await precondSetup({
        client,
        project: values.project as string,
        datasource: values.datasource as string,
        tablesFromFile: values["tables-from"] as string | undefined,
        skipSync: Boolean(values["skip-sync"]),
        syncTimeout: values["sync-timeout"] ? Number(values["sync-timeout"]) * 1000 : undefined,
      });
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      if (!result.syncComplete && !values["skip-sync"]) process.exit(2);
      return;
    }
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}
