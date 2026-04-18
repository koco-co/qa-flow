import { Command } from "commander";
import { initEnv } from "./env.ts";
import { createLogger, setLogLevel, type Logger, type LogLevel } from "./logger.ts";

export interface CliOption {
  flag: string;
  description: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface CliContext {
  log: Logger;
  cwd: string;
}

export interface CliCommandSpec<T = Record<string, unknown>> {
  name: string;
  description: string;
  options?: CliOption[];
  action: (opts: T, ctx: CliContext) => void | Promise<void>;
}

export interface CliConfig {
  name: string;
  description: string;
  commands: CliCommandSpec[];
  initEnv?: boolean;
  onError?: (err: unknown, ctx: CliContext) => void;
}

const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

function applyLogLevel(): void {
  const raw = process.env["LOG_LEVEL"]?.toLowerCase();
  if (raw && (LOG_LEVELS as readonly string[]).includes(raw)) {
    setLogLevel(raw as LogLevel);
  }
}

function attachOption(cmd: Command, opt: CliOption): void {
  if (opt.required) {
    if (opt.defaultValue !== undefined) {
      cmd.requiredOption(opt.flag, opt.description, opt.defaultValue as string);
      return;
    }
    cmd.requiredOption(opt.flag, opt.description);
    return;
  }
  if (opt.defaultValue !== undefined) {
    cmd.option(opt.flag, opt.description, opt.defaultValue as string);
    return;
  }
  cmd.option(opt.flag, opt.description);
}

function defaultErrorHandler(log: Logger) {
  return (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(msg);
    process.exit(1);
  };
}

/**
 * Build a commander program with uniform initEnv, logger, and error wrapping.
 *
 * Caller chooses `.parse(process.argv)` (sync) or `.parseAsync(process.argv)` (async).
 * For any async action, caller must use `.parseAsync`.
 */
export function createCli(config: CliConfig): Command {
  if (config.initEnv !== false) {
    initEnv();
  }
  applyLogLevel();

  const logger = createLogger(config.name);
  const ctx: CliContext = { log: logger, cwd: process.cwd() };
  const onError = config.onError ?? defaultErrorHandler(logger);

  const program = new Command();
  program.name(config.name).description(config.description).showHelpAfterError();

  for (const cmdSpec of config.commands) {
    const cmd = program.command(cmdSpec.name).description(cmdSpec.description);
    for (const opt of cmdSpec.options ?? []) {
      attachOption(cmd, opt);
    }
    cmd.action(async (opts: Record<string, unknown>) => {
      try {
        await cmdSpec.action(opts as never, ctx);
      } catch (err) {
        onError(err, ctx);
      }
    });
  }

  return program;
}
