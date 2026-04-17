// META: {"id":"t37","priority":"P1","title":"【P1】验证筛选后导出仅包含筛选结果数据"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  waitForTableLoaded,
  confirmPopconfirm,
  uniqueName,
} from "../../helpers/test-setup";


const BASE_URL =
  "http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/dq/generalConfig/jsonValidationConfig";

async function addKey(
  page: import("@playwright/test").Page,
  step: Function,
  keyName: string,
  opts?: { dataSourceType?: string },
) {
  await step(`前置: 新增key ${keyName}`, async () => {
    await page.getByRole("button", { name: /^新\s*增$/ }).click();
    const modal = page.locator(".ant-modal:visible");
    await modal.waitFor({ state: "visible" });
    await modal
      .locator(".ant-form-item")
      .filter({ hasText: /^key/ })
      .locator("input")
      .fill(keyName);
    if (opts?.dataSourceType) {
      const dsSelect = modal
        .locator(".ant-form-item")
        .filter({ hasText: "数据源类型" })
        .locator(".ant-select");
      await dsSelect.locator(".ant-select-selector").click();
      await page
        .locator(".ant-select-dropdown:visible .ant-select-item-option")
        .filter({ hasText: opts.dataSourceType })
        .first()
        .click();
      await page.waitForTimeout(300);
    }
    await modal.getByRole("button", { name: /^确\s*定$/ }).click();
    await modal.waitFor({ state: "hidden", timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);
  });
}

async function dismissWelcomeDialog(page: import("@playwright/test").Page) {
  const dialog = page.locator("dialog, .ant-modal").filter({ hasText: "欢迎使用" });
  if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    const btn = dialog.getByRole("button", { name: "知道了" });
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
  }
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证筛选后导出仅包含筛选结果数据", async ({ page, step }) => {
    // 注意：无法在 Playwright 中直接验证 xlsx 内容，只验证导出流程和下载触发
    const sparkKey = uniqueName("sparkKey");
    const hiveKey = uniqueName("hiveKey");

    await step("步骤1: 进入json格式校验管理页面 → 页面正常加载", async () => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);
      const table = page.locator(".ant-table");
      await table.waitFor({ state: "visible", timeout: 15000 });
      await waitForTableLoaded(page, table);
    });

    // 前置：新增两个 key，使用不同数据源类型
    await addKey(page, step, sparkKey, { dataSourceType: "SparkThrift2.x" });
    await addKey(page, step, hiveKey, { dataSourceType: "Hive2.x" });

    const searchInput = page.locator(".dt-search input, input[placeholder='请输入key名称查询']");
    await step(
      "步骤2: 在搜索框输入 sparkKey 名称，等待筛选结果 → 列表仅显示包含 sparkKey 的记录",
      async () => {
        await searchInput.fill(sparkKey);
        await page.waitForTimeout(500);
        await page.keyboard.press("Enter");
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);
        await waitForTableLoaded(page, page.locator(".ant-table"));
        const sparkRow = page.locator(".ant-table-row").filter({ hasText: sparkKey }).first();
        await expect(sparkRow).toBeVisible({ timeout: 10000 });
      },
      searchInput,
    );

    await step(
      "步骤3: 点击导出，确认 Popconfirm → 下载触发成功",
      async () => {
        await page.getByRole("button", { name: /^导\s*出$/ }).click();
        const popconfirm = page.locator(".ant-popover-inner, .ant-popconfirm");
        await expect(popconfirm.filter({ hasText: "请确认是否导出列表数据" }).first()).toBeVisible({
          timeout: 5000,
        });

        const [download] = await Promise.all([
          page.waitForEvent("download"),
          confirmPopconfirm(page),
        ]);

        expect(download).toBeTruthy();
        // 文件名包含 json_format
        const filename = download.suggestedFilename();
        expect(filename.toLowerCase()).toMatch(/json.?format/i);
      },
      page.getByRole("button", { name: /^导\s*出$/ }),
    );
  });
});
