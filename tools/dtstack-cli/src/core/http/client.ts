export interface DtStackClientOptions {
  readonly baseUrl: string;
  readonly cookie: string;
}

export interface DtStackResponse<T = unknown> {
  readonly code: number;
  readonly data: T;
  readonly message?: string;
  readonly success?: boolean;
}

export interface DtStackClientLike {
  post<T = unknown>(path: string, data?: unknown, extraHeaders?: Record<string, string>): Promise<DtStackResponse<T>>;
  postWithProjectId<T = unknown>(path: string, data: unknown, projectId: number): Promise<DtStackResponse<T>>;
}

const RETRYABLE_HTTP_STATUS = new Set([502, 503, 504]);
export const MAX_RETRY_ATTEMPTS = 6;
const RETRY_DELAY_MS = 2_000;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const isRetryableHttpStatus = (status: number): boolean => RETRYABLE_HTTP_STATUS.has(status);

export class DtStackClient implements DtStackClientLike {
  private readonly baseUrl: string;
  private readonly cookie: string;

  constructor(options: DtStackClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.cookie = options.cookie;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "content-type": "application/json;charset=UTF-8",
      "Accept-Language": "zh-CN",
      cookie: this.cookie,
      ...extra,
    };
  }

  async post<T = unknown>(
    path: string,
    data?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<DtStackResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(extraHeaders),
        body: data ? JSON.stringify(data) : undefined,
      });
      if (response.ok) return response.json() as Promise<DtStackResponse<T>>;
      const text = await response.text();
      lastError = new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
      if (!isRetryableHttpStatus(response.status) || attempt === MAX_RETRY_ATTEMPTS) throw lastError;
      await sleep(RETRY_DELAY_MS * attempt);
    }
    throw lastError ?? new Error(`Request failed: ${url}`);
  }

  async postWithProjectId<T = unknown>(path: string, data: unknown, projectId: number): Promise<DtStackResponse<T>> {
    return this.post<T>(path, data, { "X-Project-Id": String(projectId) });
  }
}
