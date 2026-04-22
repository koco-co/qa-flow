export interface CanUseFinishedTaskRowOptions {
  readonly rowVisible: boolean;
  readonly rowText: string;
  readonly batchFinished: boolean;
  readonly batchFinishedStableMs: number;
  readonly stableThresholdMs: number;
}

export function isTaskRowRunning(rowText: string): boolean {
  const normalizedText = rowText.replace(/\s+/g, "");
  return normalizedText.includes("执行中") || normalizedText.includes("运行中");
}

export function canUseFinishedTaskRow(
  options: CanUseFinishedTaskRowOptions,
): boolean {
  if (!options.rowVisible || isTaskRowRunning(options.rowText)) {
    return false;
  }

  if (!options.batchFinished) {
    return true;
  }

  return options.batchFinishedStableMs >= options.stableThresholdMs;
}
