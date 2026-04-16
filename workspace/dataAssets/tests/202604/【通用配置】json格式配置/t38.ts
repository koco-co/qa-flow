// META: {"id":"t38","priority":"P2","title":"【P2】验证搜索无结果时的空状态展示"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  waitForTableLoaded,
  uniqueName,
} from "../../helpers/test-setup";


const BASE_URL =
  "http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/dq/generalConfig/jsonValidationConfig";

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
  test("【P2】验证搜索无结果时的空状态展示", async ({ page, step }) => {
    // 使用保证不存在的 key 名称（带时间戳后缀）
    const nonExistKey = "nonExistKeyXyz123_" + uniqueName("");

    await step("步骤1: 进入json格式校验管理页面 → 页面正常加载", async () => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("networkidle");
      await dismissWelcomeDialog(page);
      const table = page.locator(".ant-table");
      await table.waitFor({ state: "visible", timeout: 15000 });
      await waitForTableLoaded(page, table);
    }, page.locator(".ant-table"));

    const searchInput = page.locator(".dt-search input, input[placeholder='请输入key名称查询']");
    await step(
      "步骤2: 在搜索框输入不存在的key名称 → 输入成功",
      async () => {
        await searchInput.fill(nonExistKey);
        await page.waitForTimeout(500);
        await page.keyboard.press("Enter");
        await page.waitForLoadState("networkidle");
      await dismissWelcomeDialog(page);
        await waitForTableLoaded(page, page.locator(".ant-table"));
      },
      searchInput,
    );

    await step(
      "步骤3: 验证表格显示空状态（.ant-empty 或「暂无数据」）→ 空状态元素可见",
      async () => {
        // 优先查找 ant-empty 组件
        const emptyLocator = page.locator(".ant-empty, .ant-table-empty");
        const noDataText = page.locator(".ant-table-tbody").getByText("暂无数据");

        const emptyVisible = await emptyLocator
          .first()
          .waitFor({ state: "visible", timeout: 5000 })
          .then(() => true)
          .catch(() => false);

        if (!emptyVisible) {
          await expect(noDataText.first()).toBeVisible({ timeout: 5000 });
        } else {
          await expect(emptyLocator.first()).toBeVisible();
        }

        // 确保没有数据行
        const dataRows = page.locator(".ant-table-tbody .ant-table-row");
        await expect(dataRows).toHaveCount(0);
      },
      page.locator(".ant-empty, .ant-table-empty").first(),
    );
  });
});
