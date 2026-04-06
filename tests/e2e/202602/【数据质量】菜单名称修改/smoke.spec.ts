// 冒烟测试（P0）
// 生成时间：2026-04-06T16:29:26.650Z
// 用例数量：1

import { expect, test } from "@playwright/test";

test.describe("【数据质量】菜单名称修改 - 总览页", () => {
  type Page = import("@playwright/test").Page;
  type RuntimeEnv = Record<string, string | undefined>;
  type ProjectListResponse = {
    data?: Array<{
      id?: number | string;
    }>;
  };
  const defaultBaseUrl = "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
  const runtimeCookie = getEnv("UI_AUTOTEST_COOKIE")?.trim();
  const storageStatePath = getEnv("UI_AUTOTEST_SESSION_PATH");
  if (storageStatePath) {
    test.use({ storageState: storageStatePath });
  }
  const visibleMenus = ["总览", "规则任务管理", "校验结果查询", "数据质量报告", "规则集管理"];
  const orderedMenus = ["总览", "规则集管理", "规则任务管理", "校验结果查询", "数据质量报告"];
  const removedMenus = ["概览", "规则任务配置", "任务实例查询", "质量报告"];
  function getEnv(name: string): string | undefined {
    return (
      globalThis as typeof globalThis & {
        process?: { env?: RuntimeEnv };
      }
    ).process?.env?.[name];
  }
  function getRawBaseUrl(): string {
    return getEnv("UI_AUTOTEST_BASE_URL") ?? getEnv("E2E_BASE_URL") ?? defaultBaseUrl;
  }
  function normalizeDataAssetsBaseUrl(): string {
    const rawBaseUrl = getRawBaseUrl();
    const parsed = new URL(rawBaseUrl);
    const cleanPath = parsed.pathname.replace(/\/$/, "");
    const dataAssetsIndex = cleanPath.indexOf("/dataAssets");
    const dataAssetsPath =
      dataAssetsIndex >= 0
        ? cleanPath.slice(0, dataAssetsIndex + "/dataAssets".length)
        : `${cleanPath}/dataAssets`.replace(/\/{2,}/g, "/");
    return `${parsed.origin}${dataAssetsPath || "/dataAssets"}`;
  }
  function buildDataAssetsUrl(path: string, pid?: number | string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const separator = normalizedPath.includes("?") ? "&" : "?";
    const hashPath = pid ? `${normalizedPath}${separator}pid=${pid}` : normalizedPath;
    return `${normalizeDataAssetsBaseUrl()}/#${hashPath}`;
  }
  async function applyRuntimeCookies(page: Page): Promise<void> {
    if (!runtimeCookie) {
      return;
    }
    const cookieUrl = normalizeDataAssetsBaseUrl();
    const cookieMap = new Map<string, string>();
    for (const pair of runtimeCookie.split(/;\s*/)) {
      if (!pair) continue;
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex <= 0) continue;
      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      if (!name) continue;
      cookieMap.set(name, value);
    }
    await page.context().addCookies(
      Array.from(cookieMap.entries()).map(([name, value]) => ({
        name,
        value,
        url: cookieUrl,
      })),
    );
  }
  async function getAccessibleProjectIds(page: Page): Promise<number[]> {
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
  async function expectRenamedMenus(page: Page): Promise<void> {
    const sideMenu = page.locator(".ant-layout-sider").first();
    await expect(sideMenu).toBeVisible();
    for (const menuName of visibleMenus) {
      await expect(sideMenu.getByText(menuName, { exact: true })).toBeVisible({
        timeout: 5000,
      });
    }
    const sideText = await sideMenu.innerText();
    for (const legacyName of removedMenus) {
      expect(sideText).not.toContain(legacyName);
    }
    const menuIndexes = orderedMenus.map((menuName) => sideText.indexOf(menuName));
    for (const index of menuIndexes) {
      expect(index).toBeGreaterThan(-1);
    }
    expect(menuIndexes[0]).toBeLessThan(menuIndexes[1]);
    expect(menuIndexes[1]).toBeLessThan(menuIndexes[2]);
    expect(menuIndexes[2]).toBeLessThan(menuIndexes[3]);
    expect(menuIndexes[3]).toBeLessThan(menuIndexes[4]);
  }
  test("【P0】验证历史项目菜单名称正确修改", async ({ page }) => {
    // 前置：无
    // 步骤1：进入「资产-数据质量」页面
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview"));
    await page.waitForLoadState("networkidle");
    let projectId: number | null = null;
    await expect
      .poll(
        async () => {
          const projectIds = await getAccessibleProjectIds(page);
          projectId = projectIds[0] ?? null;
          return projectId;
        },
        { timeout: 10000 },
      )
      .not.toBeNull();
    if (projectId === null) {
      throw new Error("未获取到可访问的数据质量项目");
    }
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    // 预期：页面正常打开
    await expect(page).toHaveURL(/#\/dq\/overview\?pid=/);
    // 步骤2：查看历史项目下的页面菜单
    await expectRenamedMenus(page);
    // 预期：1）「概览」名称改为「总览」 2）「规则任务配置」名称改为「规则任务管理」 3）「任务实例查询」名称改为「校验结果查询」 4）「质量报告」名称改为「数据质量报告」 5）新增一级菜单「规则集管理」
  });
});
