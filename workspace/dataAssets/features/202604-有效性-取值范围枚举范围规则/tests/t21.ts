// META: {"id":"t21","priority":"P1","title":"验证规则库中新增取值范围&枚举范围内置规则展示正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import { gotoRuleBase } from "./rule-editor-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(120000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则库配置"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证规则库中新增取值范围&枚举范围内置规则展示正确", async ({ page, step }) => {
      // 步骤1：进入规则库配置页面
      await step(
        "步骤1: 进入【数据质量 → 规则库配置】页面 → 规则库配置页面打开，列表显示规则数据",
        async () => {
          await gotoRuleBase(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({
            timeout: 15000,
          });
        },
      );

      // 步骤2：确认在内置规则 Tab 下，使用搜索定位目标规则
      await step(
        "步骤2: 确认【内置规则】Tab 激活，搜索取值范围&枚举范围 → 列表筛选完成",
        async () => {
          // 确认内置规则 Tab 激活
          const builtinTab = page.getByRole("tab", { name: "内置规则" });
          await expect(builtinTab).toHaveAttribute("aria-selected", "true");

          // 使用搜索框快速定位
          const searchBox = page.getByPlaceholder("请输入规则名称进行搜索");
          await searchBox.fill("取值范围");
          await page.getByRole("button", { name: "search" }).click();
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(500);
        },
      );

      // 步骤3：查找【取值范围&枚举范围】规则条目并验证
      const ruleRow = page
        .locator(".ant-table-row")
        .filter({ hasText: "取值范围&枚举范围" })
        .first();

      await step(
        "步骤3: 验证【取值范围&枚举范围】规则各列内容正确 → 规则解释/分类/关联范围/描述均正确",
        async () => {
          await expect(ruleRow).toBeVisible({ timeout: 10000 });
          await expect(ruleRow).toContainText("取值范围和枚举范围的联合校验");
          await expect(ruleRow).toContainText("有效性校验");
          await expect(ruleRow).toContainText("字段");
          await expect(ruleRow).toContainText(
            "校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系",
          );
        },
        ruleRow,
      );

      // 步骤4：导出规则库
      const exportButton = page.getByRole("button", { name: "导出规则库" });
      await step(
        "步骤4: 导出规则库 → 文件下载成功",
        async () => {
          await exportButton.click();

          const popconfirm = page.locator(".ant-popconfirm:visible, .ant-popover:visible").last();
          await popconfirm.waitFor({ state: "visible", timeout: 10000 });
          await expect(popconfirm).toContainText("请确认是否导出规则库");
          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 20000 }),
            popconfirm.locator(".ant-btn-primary").click(),
          ]);
          expect(download.suggestedFilename()).toMatch(/内置规则库_.+\.xlsx/);
        },
        exportButton,
      );
    });
  });
}
