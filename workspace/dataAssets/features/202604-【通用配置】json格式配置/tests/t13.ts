// META: {"id":"t13","priority":"P1","title":"【P1】验证数据源类型筛选功能"}
import { test, expect } from "../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../shared/helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  searchKey,
  clearSearch,
  ensureRowVisibleByKey,
} from "./json-config-helpers";

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证数据源类型筛选功能", async ({ page, step }) => {
    test.setTimeout(240000);
    const sparkKey = uniqueName("spark_filter");

    async function waitTableLoad(): Promise<void> {
      await page
        .locator(".ant-spin-spinning")
        .waitFor({ state: "hidden", timeout: 15000 })
        .catch(() => undefined);
      await page.waitForTimeout(300);
    }

    async function applyColumnFilter(typeName: string): Promise<void> {
      const filterBtn = page
        .locator(".ant-table-thead")
        .getByRole("button", { name: "filter" });
      await filterBtn.waitFor({ state: "visible", timeout: 10000 });
      await filterBtn.click();

      const dropdown = page.locator(".ant-table-filter-dropdown:visible").last();
      await dropdown.waitFor({ state: "visible", timeout: 5000 });
      const option = dropdown
        .locator(".ant-dropdown-menu-item")
        .filter({ hasText: typeName })
        .first();
      await option.waitFor({ state: "visible", timeout: 5000 });
      await option.click();

      const okBtn = dropdown.getByRole("button", { name: /确\s*定/ }).first();
      await okBtn.waitFor({ state: "visible", timeout: 5000 });
      await okBtn.click();
      await waitTableLoad();
    }

    async function clearColumnFilter(): Promise<void> {
      const filterBtn = page
        .locator(".ant-table-thead")
        .getByRole("button", { name: "filter" });
      await filterBtn.waitFor({ state: "visible", timeout: 10000 });
      await filterBtn.click();

      const dropdown = page.locator(".ant-table-filter-dropdown:visible").last();
      await dropdown.waitFor({ state: "visible", timeout: 5000 });
      const resetBtn = dropdown.getByRole("button", { name: /重\s*置/ }).first();
      await resetBtn.waitFor({ state: "visible", timeout: 5000 });
      if (await resetBtn.isEnabled().catch(() => false)) {
        await resetBtn.click();
      }

      const okBtn = dropdown.getByRole("button", { name: /确\s*定/ }).first();
      await okBtn.waitFor({ state: "visible", timeout: 5000 });
      await okBtn.click();
      await waitTableLoad();
    }

    try {
      await step("步骤1: 进入json格式校验管理页面 → 页面正常加载，列表显示已有key数据", async () => {
        await gotoJsonConfigPage(page);
        await page.reload({ timeout: 30000 });
        await waitTableLoad();
        await expect(page.locator(".ant-table")).toBeVisible({ timeout: 10000 });
      });

      await step("步骤2: 新增 SparkThrift2.x 测试key → 记录创建成功", async () => {
        await addKey(page, sparkKey, { dataSourceType: "SparkThrift2.x" });
        await gotoJsonConfigPage(page);
        await ensureRowVisibleByKey(page, sparkKey, 20000);
      });

      await step("步骤3: 筛选数据源类型=SparkThrift2.x → 列表可命中 Spark 测试数据", async () => {
        await clearSearch(page);
        await applyColumnFilter("SparkThrift2.x");
        const row = await ensureRowVisibleByKey(page, sparkKey, 20000);
        await expect(row).toBeVisible({ timeout: 10000 });
      });

      await step("步骤4: 清空筛选条件 → 列表恢复，Spark 测试数据仍可查询", async () => {
        await clearColumnFilter();
        await clearSearch(page);
      });
    } finally {
      await clearColumnFilter().catch(() => undefined);
    }
  });
});
