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

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
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
