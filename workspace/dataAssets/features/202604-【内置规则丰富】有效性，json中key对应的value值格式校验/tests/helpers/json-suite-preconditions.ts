const RETRYABLE_ERROR_PATTERNS = [
  /HTTP (502|503|504)\b/,
  /Timeout \d+ms exceeded/,
  /net::ERR_/,
  /ETIMEDOUT/,
  /not found in offline development/,
  /Datasource type .* not found in project/,
] as const;

export interface RetriablePreconditionsOptions {
  readonly reportName: string;
  readonly projectNames: readonly string[];
  readonly wait: (ms: number) => Promise<void>;
  readonly runForProject: (projectName: string) => Promise<void>;
  readonly log?: (message: string) => void;
}

function isMetadataSyncTimeout(message: string): boolean {
  return message.includes("Metadata sync timed out");
}

function isRetryableError(message: string): boolean {
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export async function runRetriablePreconditions(
  options: RetriablePreconditionsOptions,
): Promise<void> {
  const { projectNames, wait, runForProject, log } = options;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const projectName of projectNames) {
      try {
        await runForProject(projectName);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isMetadataSyncTimeout(message)) {
          log?.(
            `[preconditions] ${options.reportName} metadata sync timed out, continuing with existing synced metadata.\n`,
          );
          return;
        }
        if (!isRetryableError(message)) {
          throw error;
        }
        log?.(
          `[preconditions] ${options.reportName} project="${projectName}" hit error: ${message.slice(0, 100)}\n`,
        );
      }
    }

    if (attempt === 3) {
      log?.(
        `[preconditions] ${options.reportName} setup kept hitting transient errors, continuing with existing project metadata.\n`,
      );
      return;
    }

    log?.(
      `[preconditions] ${options.reportName} hit transient error, retrying setup (${attempt}/3)...\n`,
    );
    await wait(3000 * attempt);
  }
}
