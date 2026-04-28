// META: {"id":"t24","priority":"P1","title":"【P1】验证规则库中「格式-json格式校验」内置规则展示信息正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { gotoRuleBaseAndSearch } from "./json-format-suite-helpers";
import { describeByDatasource } from "./suite-case-helpers";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
});
test.setTimeout(120000);

describeByDatasource("规则库配置", () => {
  test("验证规则库中「格式-json格式校验」内置规则展示信息正确", async ({
    page,
  }) => {
    await gotoRuleBaseAndSearch(page, "格式-json格式校验");

    const ruleRow = page
      .locator(".ant-table-row")
      .filter({ hasText: "格式-json格式校验" })
      .first();
    await expect(ruleRow).toBeVisible({ timeout: 10000 });
    await expect(ruleRow).toContainText("格式-json格式校验");
    await expect(ruleRow).toContainText("有效性校验");
    await expect(ruleRow).toContainText("字段");
    await expect(ruleRow).toContainText(
      "校验json类型的字段中key对应的value值是否符合规范要求",
    );

    const exportButton = page.getByRole("button", { name: "导出规则库" });
    await expect(exportButton).toBeVisible({ timeout: 10000 });
    await exportButton.click();

    const popconfirm = page
      .locator(".ant-popconfirm:visible, .ant-popover:visible")
      .last();
    await expect(popconfirm).toContainText("请确认是否导出规则库", {
      timeout: 5000,
    });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }),
      popconfirm.locator(".ant-btn-primary").click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/内置规则库_.+\.xlsx/);
  });
});
