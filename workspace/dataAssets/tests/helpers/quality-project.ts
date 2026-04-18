// quality-project.ts — split from test-setup.ts

import type { Page } from "@playwright/test";

type RuntimeEnv = Record<string, string | undefined>;
type ProjectListResponse = { data?: Array<{ id?: number | string }> };

export async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const result = (await response.json()) as ProjectListResponse;
    return (result.data ?? [])
      .map((item: { id?: number | string }) => Number(item?.id))
      .filter((id: number) => Number.isFinite(id));
  });
}

/**
 * 获取数据质量项目列表并返回指定名称的项目 ID
 */
export async function getQualityProjectId(
  page: Page,
  projectName?: string,
): Promise<number | null> {
  const ids = await getAccessibleProjectIds(page);
  if (ids.length === 0) return null;
  if (!projectName) return ids[0];

  // 如果需要按名称查找，先获取所有项目详情
  const result = await page.evaluate(async (name: string) => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const json = (await response.json()) as {
      data?: Array<{
        id?: number | string;
        name?: string;
        projectName?: string;
      }>;
    };
    const project = (json.data ?? []).find((p) => (p.name ?? p.projectName ?? "").includes(name));
    return project ? Number(project.id) : null;
  }, projectName);

  return result ?? ids[0];
}
