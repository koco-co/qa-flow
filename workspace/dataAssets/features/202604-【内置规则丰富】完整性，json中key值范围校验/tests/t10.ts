// META: {"id":"t10","priority":"P1","title":"验证规则库中新增key范围校验内置规则展示信息正确"}
import { expect, test } from "../../../shared/fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import { gotoBuiltInRuleBase, searchRuleBaseRule } from "./suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(120000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 规则库配置"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证规则库中新增key范围校验内置规则展示信息正确", async ({ page }) => {
      await gotoBuiltInRuleBase(page);
      const row = await searchRuleBaseRule(page, "key范围校验");
      await expect(row).toContainText("完整性校验");
      await expect(row).toContainText("字段");
      await expect(row).toContainText(/对数据中包含的key范围校验|校验json类型的字段中key名是否完整/);
      await row.hover();
    });
  });
}
