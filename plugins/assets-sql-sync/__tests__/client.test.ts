import { describe, test, expect, mock, afterEach } from 'bun:test'
import { DtStackClient } from '../src/client'

describe('DtStackClient', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('post sends correct headers and body', async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: 'ok' })))
    )
    globalThis.fetch = mockFetch as unknown as typeof fetch

    const client = new DtStackClient({
      baseUrl: 'http://172.16.122.52',
      cookie: 'SESSION=abc; JSESSIONID=xyz',
    })

    const result = await client.post<string>('/api/test', { key: 'value' })

    expect(result.code).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = (mockFetch as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://172.16.122.52/api/test')
    expect(options.method).toBe('POST')
    expect((options.headers as Record<string, string>)['content-type']).toBe('application/json;charset=UTF-8')
    expect((options.headers as Record<string, string>).cookie).toBe('SESSION=abc; JSESSIONID=xyz')
    expect(JSON.parse(options.body as string)).toEqual({ key: 'value' })
  })

  test('throws on non-ok response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500 }))
    ) as unknown as typeof fetch

    const client = new DtStackClient({
      baseUrl: 'http://localhost',
      cookie: 'SESSION=abc',
    })

    expect(client.post('/api/fail')).rejects.toThrow()
  })

  test('postWithProjectId sends X-Project-Id header', async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: null })))
    )
    globalThis.fetch = mockFetch as unknown as typeof fetch

    const client = new DtStackClient({
      baseUrl: 'http://localhost',
      cookie: 'SESSION=abc',
    })

    await client.postWithProjectId('/api/batch', { sql: 'test' }, 42)

    const [, options] = (mockFetch as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit]
    const headers = options.headers as Record<string, string>
    expect(headers['X-Project-Id']).toBe('42')
  })
})
