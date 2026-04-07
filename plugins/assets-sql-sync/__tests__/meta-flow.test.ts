import { describe, test, expect, mock } from 'bun:test'
import { metaFlow } from '../src/flows/meta-flow'
import type { DtStackClient } from '../src/client'

describe('metaFlow', () => {
  test('throws when project not found', async () => {
    const mockClient = {
      post: mock(() => Promise.resolve({ code: 1, data: [] })),
      postWithProjectId: mock(() => Promise.resolve({ code: 1, data: [] })),
    } as unknown as DtStackClient

    expect(
      metaFlow(mockClient, {
        datasourceType: 'Doris',
        tables: [{ name: 'test', sql: 'CREATE TABLE test (id INT)' }],
        projectName: 'nonexistent',
      }),
    ).rejects.toThrow('Project "nonexistent" not found')
  })
})
