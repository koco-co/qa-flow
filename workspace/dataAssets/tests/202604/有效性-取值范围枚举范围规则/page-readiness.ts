export interface PollReadinessOptions {
  readonly timeoutMs: number;
  readonly intervalMs: number;
  readonly wait: (ms: number) => Promise<void>;
  readonly isReady: () => Promise<boolean>;
}

export async function pollReadiness(
  options: PollReadinessOptions,
): Promise<boolean> {
  let elapsedMs = 0;

  while (elapsedMs < options.timeoutMs) {
    if (await options.isReady()) {
      return true;
    }

    const remainingMs = options.timeoutMs - elapsedMs;
    if (remainingMs <= 0) {
      break;
    }

    const waitMs = Math.min(options.intervalMs, remainingMs);
    await options.wait(waitMs);
    elapsedMs += waitMs;
  }

  return await options.isReady();
}
