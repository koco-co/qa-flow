/**
 * 统一日志模块 — JSON 输出走 stdout，日志走 stderr。
 * 四级日志：debug / info / warn / error
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Read `LOG_LEVEL` environment variable and apply it to the global level.
 * Permissive: invalid values are ignored silently.
 */
export function initLogLevel(): void {
  const raw = process.env["LOG_LEVEL"]?.toLowerCase();
  if (raw && (LOG_LEVELS as readonly string[]).includes(raw)) {
    currentLevel = raw as LogLevel;
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatMessage(level: LogLevel, prefix: string, message: string): string {
  const tag = level.toUpperCase().padEnd(5);
  return `[${prefix}] ${tag}: ${message}\n`;
}

export function createLogger(prefix: string) {
  return {
    debug(msg: string): void {
      if (shouldLog("debug")) process.stderr.write(formatMessage("debug", prefix, msg));
    },
    info(msg: string): void {
      if (shouldLog("info")) process.stderr.write(formatMessage("info", prefix, msg));
    },
    warn(msg: string): void {
      if (shouldLog("warn")) process.stderr.write(formatMessage("warn", prefix, msg));
    },
    error(msg: string): void {
      if (shouldLog("error")) process.stderr.write(formatMessage("error", prefix, msg));
    },
  };
}
