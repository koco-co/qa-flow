import { Command, Option } from "commander";
import { createLogger, initLogLevel, type Logger } from "./logger.ts";

export interface CliOption {
  flag: string;
  description: string;
  required?: boolean;
  defaultValue?: unknown;
  /**
   * When set, commander enforces this enum at parse time and the help output
   * shows `(choices: "a", "b")` automatically. Use for fields like
   * `--confidence high|medium|low` where the allowed set is a closed list.
   */
  choices?: readonly string[];
}

export interface CliArgument {
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
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
  arguments?: CliArgument[];
  action: (opts: T, ctx: CliContext) => void | Promise<void>;
}

export interface CliRootActionSpec<T = Record<string, unknown>> {
  options?: CliOption[];
  arguments?: CliArgument[];
  action: (opts: T, ctx: CliContext) => void | Promise<void>;
}

export interface CliConfig {
  name: string;
  description: string;
  commands?: CliCommandSpec[];
  rootAction?: CliRootActionSpec;
  onError?: (err: unknown, ctx: CliContext) => void;
}

function attachOption(cmd: Command, opt: CliOption): void {
  // choices requires commander's Option class to be used, so when choices are
  // present we always go through addOption() instead of option()/requiredOption().
  if (opt.choices && opt.choices.length > 0) {
    const option = new Option(opt.flag, opt.description).choices([
      ...opt.choices,
    ]);
    if (opt.required) option.makeOptionMandatory(true);
    if (opt.defaultValue !== undefined) option.default(opt.defaultValue);
    cmd.addOption(option);
    return;
  }
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

function formatArgument(arg: CliArgument): string {
  const required = arg.required !== false;
  const suffix = arg.variadic === true ? "..." : "";
  if (required) return `<${arg.name}${suffix}>`;
  return `[${arg.name}${suffix}]`;
}

function attachArgument(cmd: Command, arg: CliArgument): void {
  const token = formatArgument(arg);
  if (arg.defaultValue !== undefined) {
    cmd.argument(token, arg.description, arg.defaultValue as string);
    return;
  }
  cmd.argument(token, arg.description);
}

function defaultErrorHandler(log: Logger) {
  return (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(msg);
    process.exit(1);
  };
}

function buildActionHandler(
  argumentsSpec: ReadonlyArray<CliArgument>,
  action: (opts: Record<string, unknown>, ctx: CliContext) => void | Promise<void>,
  ctx: CliContext,
  onError: (err: unknown, ctx: CliContext) => void,
): (...args: unknown[]) => Promise<void> {
  return async (...actionArgs: unknown[]) => {
    // commander passes: (positional1, positional2, ..., opts, command)
    const positionals =
      argumentsSpec.length > 0 ? actionArgs.slice(0, argumentsSpec.length) : [];
    const optsIdx = argumentsSpec.length;
    const rawOpts = (actionArgs[optsIdx] ?? {}) as Record<string, unknown>;

    const merged: Record<string, unknown> = { ...rawOpts };
    for (let i = 0; i < argumentsSpec.length; i += 1) {
      const key = argumentsSpec[i].name;
      merged[key] = positionals[i];
    }

    try {
      await action(merged, ctx);
    } catch (err) {
      onError(err, ctx);
    }
  };
}

/**
 * Build a commander program with logger and error wrapping.
 *
 * Supports three shapes:
 *  - `commands`: classic subcommand dispatch (e.g. `state init --prd ...`)
 *  - `rootAction`: root-level action, for single-purpose tools (e.g. `xmind-gen --input ...`)
 *  - Both: root action runs when no subcommand matches (hybrid tools like `repo-sync`)
 *
 * Env initialization is done once by the kata-cli root entry point before dispatch,
 * not here. This keeps module imports side-effect-free so tests importing helpers
 * from script files do not accidentally trigger .env loading.
 */
export function createCli(config: CliConfig): Command {
  initLogLevel();

  const logger = createLogger(config.name);
  const ctx: CliContext = { log: logger, cwd: process.cwd() };
  const onError = config.onError ?? defaultErrorHandler(logger);

  const program = new Command();
  program.name(config.name).description(config.description).showHelpAfterError();

  if (config.rootAction) {
    const { arguments: args, options, action } = config.rootAction;
    for (const arg of args ?? []) {
      attachArgument(program, arg);
    }
    for (const opt of options ?? []) {
      attachOption(program, opt);
    }
    program.action(buildActionHandler(args ?? [], action, ctx, onError));
  }

  for (const cmdSpec of config.commands ?? []) {
    const cmd = program.command(cmdSpec.name).description(cmdSpec.description);
    for (const arg of cmdSpec.arguments ?? []) {
      attachArgument(cmd, arg);
    }
    for (const opt of cmdSpec.options ?? []) {
      attachOption(cmd, opt);
    }
    cmd.action(
      buildActionHandler(cmdSpec.arguments ?? [], cmdSpec.action, ctx, onError),
    );
  }

  return program;
}
