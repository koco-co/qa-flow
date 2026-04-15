// META: {"id":"t15","priority":"P0","title":"验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { applyRuntimeCookies, buildDataAssetsUrl, navigateViaMenu } from "../../helpers/test-setup";

test.use({ storageState: ".auth/session.json" });

const tableRows = ".ant-table-tbody tr:not(.ant-table-measure-row)";

test.describe("【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则任务管理", () => {
  test("验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确", async ({
    page,
    step,
  }) => {
    // 前置：已创建任务"task_15695_and"，关联规则集ruleset_15695_and（且关系规则）

    await step("步骤1: 进入规则任务管理页面 → 任务列表显示已有任务数据行", async () => {
      await applyRuntimeCookies(page);
      await page.goto(buildDataAssetsUrl("/dq/rule"));
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // 通过侧边栏菜单导航到规则任务管理
      await navigateViaMenu(page, ["数据质量", "规则任务管理"]);

      const taskTable = page.locator(tableRows).first();
      await expect(taskTable).toBeVisible({ timeout: 10000 });
    });

    await step(
      "步骤2: 点击task_15695_and的执行按钮 → 页面弹出提示信息，提示任务已提交执行",
      async () => {
        const targetRow = page.locator(tableRows).filter({ hasText: "task_15695_and" }).first();
        await expect(targetRow).toBeVisible({ timeout: 10000 });

        const executeBtn = targetRow
          .getByRole("button", { name: "执行" })
          .or(targetRow.locator("button").filter({ hasText: "执行" }))
          .first();
        await executeBtn.click();
        await page.waitForTimeout(1000);

        // 验证执行提交成功的提示消息
        const successMsg = page.locator(".ant-message-notice, .ant-notification-notice");
        await expect(successMsg.filter({ hasText: /执行|提交|成功/ }).first()).toBeVisible({
          timeout: 5000,
        });
      },
    );

    await step(
      "步骤3: 进入校验结果查询页面，查看task_15695_and实例详情中取值范围&枚举范围规则行 → 实例详情各列展示正确",
      async () => {
        // 等待一段时间让任务开始执行
        await page.waitForTimeout(3000);

        // 导航到校验结果查询
        await navigateViaMenu(page, ["数据质量", "校验结果查询"]);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // 找到task_15695_and最新实例记录
        const instanceRow = page.locator(tableRows).filter({ hasText: "task_15695_and" }).first();
        await expect(instanceRow).toBeVisible({ timeout: 15000 });

        // 等待任务执行完成（轮询状态，最多等待3分钟）
        await page.waitForFunction(
          () => {
            const rows = document.querySelectorAll(
              ".ant-table-tbody tr:not(.ant-table-measure-row)",
            );
            for (const row of rows) {
              if (row.textContent?.includes("task_15695_and")) {
                return !row.textContent.includes("执行中") && !row.textContent.includes("运行中");
              }
            }
            return false;
          },
          { timeout: 180000 },
        );
        await page.waitForTimeout(1000);

        // 点击查看详情
        const detailBtn = instanceRow
          .getByRole("button", { name: "查看详情" })
          .or(instanceRow.locator("button, a").filter({ hasText: "查看详情" }))
          .first();
        await detailBtn.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // 找到取值范围&枚举范围规则行
        const ruleRow = page.locator(tableRows).filter({ hasText: "取值范围&枚举范围" }).first();
        await expect(ruleRow).toBeVisible({ timeout: 10000 });

        // 验证规则行各列内容
        await expect(ruleRow).toContainText("有效性校验");
        await expect(ruleRow).toContainText("取值范围&枚举范围");
        await expect(ruleRow).toContainText("校验不通过");
      },
      page.locator(tableRows).filter({ hasText: "取值范围&枚举范围" }).first(),
    );
  });
});
