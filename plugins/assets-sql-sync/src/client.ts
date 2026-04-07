export interface DtStackClientOptions {
  readonly baseUrl: string
  readonly cookie: string
}

interface DtStackResponse<T = unknown> {
  readonly code: number
  readonly data: T
  readonly message?: string
  readonly success?: boolean
}

export class DtStackClient {
  private readonly baseUrl: string
  private readonly cookie: string

  constructor(options: DtStackClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.cookie = options.cookie
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      'content-type': 'application/json;charset=UTF-8',
      'Accept-Language': 'zh-CN',
      cookie: this.cookie,
      ...extra,
    }
  }

  async post<T = unknown>(path: string, data?: unknown, extraHeaders?: Record<string, string>): Promise<DtStackResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(extraHeaders),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`)
    }

    return response.json() as Promise<DtStackResponse<T>>
  }

  async postWithProjectId<T = unknown>(path: string, data: unknown, projectId: number): Promise<DtStackResponse<T>> {
    return this.post<T>(path, data, { 'X-Project-Id': String(projectId) })
  }
}

export function extractCookieFromPage(page: { context: () => { cookies: () => Promise<Array<{ name: string; value: string }>> } }): Promise<string> {
  return page
    .context()
    .cookies()
    .then((cookies) => cookies.map((c) => `${c.name}=${c.value}`).join('; '))
}
