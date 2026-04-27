export function outputJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function errorExit(message: string, code = 1): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}
