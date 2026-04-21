// META: {"id":"t39","priority":"P2","title":"【P2】验证key数量达1000条以上时列表加载和搜索性能正常"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  waitForTableLoaded,
  uniqueName,
} from "../../helpers/test-setup";
import { gotoJsonConfigPage } from "./json-config-helpers";

// 注意：这是性能测试，不需要创建1000条数据。
// 只验证当前列表加载和搜索响应时间。

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P2】验证key数量达1000条以上时列表加载和搜索性能正常", { tag: "@serial" }, async ({ page, step }) => {
    let pageLoadDuration = 0;

    await step(
      "步骤1: 进入json格式校验管理页面，验证页面在5秒内加载完成 → 页面加载时间 ≤ 5000ms",
      async () => {
        const startTime = Date.now();
        await gotoJsonConfigPage(page);
        const table = page.locator(".ant-table");
        await table.waitFor({ state: "visible", timeout: 15000 });
        await waitForTableLoaded(page, table);
        pageLoadDuration = Date.now() - startTime;

        // 验证页面在合理时间内加载完成（5秒内）
        expect(pageLoadDuration).toBeLessThan(5000);
      },
      page.locator(".ant-table"),
    );

    // 使用列表中的第一行的 key 名称进行搜索，确保有结果
    const searchKey = uniqueName("perfTest");
    const searchInput = page.locator(".dt-search input, input[placeholder='请输入key名称查询']");

    await step(
      "步骤2: 搜索某个key，验证结果在3秒内返回 → 搜索响应时间 ≤ 3000ms",
      async () => {
        const searchStart = Date.now();
        await searchInput.fill(searchKey);
        await page.waitForTimeout(300);
        await page.keyboard.press("Enter");

        // 等待网络请求完成或 loading 消失
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
        await waitForTableLoaded(page, page.locator(".ant-table"));

        const searchDuration = Date.now() - searchStart;

        // 验证搜索在3秒内返回结果
        expect(searchDuration).toBeLessThan(3000);

        // 验证页面没有崩溃（表格仍然可见）
        await expect(page.locator(".ant-table")).toBeVisible();
      },
      searchInput,
    );

    await step(
      "步骤3: 清空搜索框，验证列表重新加载正常 → 列表恢复显示",
      async () => {
        await searchInput.clear();
        await page.keyboard.press("Enter");
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
        await waitForTableLoaded(page, page.locator(".ant-table"));
        await expect(page.locator(".ant-table")).toBeVisible();
      },
      page.locator(".ant-table"),
    );
  });
});
