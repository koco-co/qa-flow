// META: {"id":"t18","priority":"P2","title":"验证取值范围&枚举范围规则执行失败时可查看日志"}
import { expect, test } from "../../fixtures/step-screenshot";
import { applyRuntimeCookies, buildDataAssetsUrl, navigateViaMenu } from "../../helpers/test-setup";

test.use({ storageState: ".auth/session.json" });

const tableRows = ".ant-table-tbody tr:not(.ant-table-measure-row)";

test.describe("【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 校验结果查询", () => {
  test("验证取值范围&枚举范围规则执行失败时可查看日志", async ({ page, step }) => {
    // 前置：已有规则任务执行状态为【执行失败】，失败任务中包含取值范围&枚举范围规则

    await step("步骤1: 进入校验结果查询页面 → 列表显示已有任务记录", async () => {
      await applyRuntimeCookies(page);
      await page.goto(buildDataAssetsUrl("/dq/rule"));
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // 通过侧边栏菜单导航到校验结果查询
      await navigateViaMenu(page, ["数据质量", "校验结果查询"]);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const resultTable = page.locator(tableRows).first();
      await expect(resultTable).toBeVisible({ timeout: 10000 });
    });

    await step(
      "步骤2: 找到状态为执行失败的实例记录，打开实例详情后点击查看日志 → 日志弹窗正常打开，显示详细日志信息",
      async () => {
        // 找到状态为执行失败的实例行
        // 执行失败的记录可能用不同的文字/颜色标识
        const failedRow = page
          .locator(tableRows)
          .filter({ hasText: /执行失败|失败/ })
          .first();
        await expect(failedRow).toBeVisible({ timeout: 10000 });

        // 点击该行查看详情
        const detailBtn = failedRow
          .getByRole("button", { name: "查看详情" })
          .or(failedRow.locator("button, a").filter({ hasText: "查看详情" }))
          .first();
        await detailBtn.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // 在实例详情中找到取值范围&枚举范围规则行
        const ruleRow = page.locator(tableRows).filter({ hasText: "取值范围&枚举范围" }).first();
        await expect(ruleRow).toBeVisible({ timeout: 10000 });

        // 点击操作列的【查看日志】链接
        const viewLogBtn = ruleRow.locator("button, a").filter({ hasText: "查看日志" }).first();
        await expect(viewLogBtn).toBeVisible({ timeout: 5000 });
        await viewLogBtn.click();
        await page.waitForTimeout(1000);

        // 验证日志弹窗正常打开
        const logModal = page.locator(".ant-modal:visible, [class*='log-modal']:visible").first();
        await expect(logModal).toBeVisible({ timeout: 10000 });

        // 验证日志内容不为空（包含错误相关文本）
        const logContent = logModal
          .locator("[class*='log-content'], .ant-modal-body, pre, .log-viewer")
          .first();
        await expect(logContent).toBeVisible({ timeout: 5000 });
        await expect(logContent).not.toHaveText("", { timeout: 5000 });
      },
      page.locator(".ant-modal:visible").first(),
    );
  });
});
