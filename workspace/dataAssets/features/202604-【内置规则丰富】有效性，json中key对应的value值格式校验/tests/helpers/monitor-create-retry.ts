type MonitorCreateResponse = {
  readonly success?: boolean;
  readonly message?: string;
};

function isDuplicateMonitorMessage(message: string): boolean {
  return /监控对象已存在/.test(message);
}

function toCreateError(response: MonitorCreateResponse, fallbackLabel: string): Error {
  return new Error(`创建任务失败: ${response.message ?? fallbackLabel}`);
}

export async function createMonitorWithDuplicateRetry(
  create: () => Promise<MonitorCreateResponse>,
  cleanup: () => Promise<void>,
  fallbackLabel: string,
): Promise<void> {
  const firstResponse = await create();
  if (firstResponse.success) {
    return;
  }

  const firstMessage = firstResponse.message ?? "";
  if (!isDuplicateMonitorMessage(firstMessage)) {
    throw toCreateError(firstResponse, fallbackLabel);
  }

  await cleanup();
  const secondResponse = await create();
  if (!secondResponse.success) {
    throw toCreateError(secondResponse, fallbackLabel);
  }
}
