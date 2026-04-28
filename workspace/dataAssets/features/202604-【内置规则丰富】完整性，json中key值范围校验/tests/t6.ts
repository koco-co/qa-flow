// META: {"id":"t6","priority":"P1","title":"验证规则配置参数卡片完整展示所有字段"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import { SCENARIOS, openScenarioEditor, seedScenarioRuleSet } from "./suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 规则配置参数展示"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证规则配置参数卡片完整展示所有字段", async ({ page }) => {
      await seedScenarioRuleSet(page, {
        ...SCENARIOS.main,
        baseRule: {
          field: "info",
          method: "包含",
          keyNames: ["key1", "key2", "key11", "key22"],
          filterSql: "id > 0",
          ruleStrength: "强规则",
          description: "测试key范围校验规则",
        },
      });
      await openScenarioEditor(page, SCENARIOS.main);
      const packageSection = await page.locator(".ruleSetMonitor__package").filter({ hasText: SCENARIOS.main.packageName }).first();
      await expect(packageSection).toContainText("字段级");
      await expect(packageSection).toContainText("info");
      await expect(packageSection).toContainText("key范围校验");
      await expect(packageSection).toContainText("id > 0");
      await expect(packageSection).toContainText("包含");
      await expect(packageSection).toContainText(/key1.*key2/);
      await expect(packageSection).toContainText(/key11.*key22/);
      await expect(packageSection).toContainText("强规则");
      await expect(packageSection).toContainText("测试key范围校验规则");
    });
  });
}
