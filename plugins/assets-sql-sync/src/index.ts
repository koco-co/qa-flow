import type { Page } from '@playwright/test'
import { DtStackClient, extractCookieFromPage } from './client'
import { BatchApi } from './api/batch'
import { AssetsApi } from './api/assets'
import { metaFlow } from './flows/meta-flow'
import type { MetaFlowOptions, MetaFlowResult } from './flows/meta-flow'

export interface PreconditionOptions {
  readonly type?: 'meta' | 'non-meta'
  readonly datasourceType: 'Doris' | 'MySQL' | 'Hive' | 'SparkThrift'
  readonly tables: ReadonlyArray<{ readonly name: string; readonly sql: string }>
  readonly projectName?: string
  readonly syncTimeout?: number
}

export interface PreconditionResult {
  readonly flow: 'meta' | 'non-meta'
  readonly tablesCreated: ReadonlyArray<string>
  readonly syncComplete: boolean
}

function resolveBaseUrl(): string {
  return (
    process.env.UI_AUTOTEST_BASE_URL ??
    process.env.E2E_BASE_URL ??
    process.env.QA_BASE_URL_CI78 ??
    'http://172.16.122.52'
  )
}

export async function createClient(page: Page, baseUrl?: string): Promise<DtStackClient> {
  const cookie = await extractCookieFromPage(page)
  return new DtStackClient({
    baseUrl: baseUrl ?? resolveBaseUrl(),
    cookie,
  })
}

export async function setupPreconditions(
  page: Page,
  options: PreconditionOptions,
): Promise<PreconditionResult> {
  const client = await createClient(page)
  const flowType = options.type ?? 'meta'

  if (flowType === 'meta') {
    const result = await metaFlow(client, {
      datasourceType: options.datasourceType,
      tables: options.tables,
      projectName: options.projectName,
      syncTimeout: options.syncTimeout ? options.syncTimeout * 1000 : undefined,
    })

    return {
      flow: 'meta',
      tablesCreated: result.tablesCreated,
      syncComplete: result.syncComplete,
    }
  }

  throw new Error('Non-meta flow not yet implemented. Use type: "meta".')
}

// Re-export step APIs for fine-grained control
export { BatchApi } from './api/batch'
export { AssetsApi } from './api/assets'
export { DtStackClient, extractCookieFromPage } from './client'
export { metaFlow } from './flows/meta-flow'
export type { MetaFlowOptions, MetaFlowResult } from './flows/meta-flow'
