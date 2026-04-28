// META: {"id":"t14","priority":"P1","title":"验证在规则集中配置过滤条件后规则保存成功"}
import { expect, test } from "../../fixtures/step-screenshot";
import { selectAntOption } from "../../helpers/test-setup";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  addRuleToPackage,
  configureRangeEnumRule,
  getRulePackage,
  getRuleSetListRow,
  gotoRuleSetList,
  openRuleSetEditor,
  saveRuleSet,
} from "./rule-editor-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则集管理"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证在规则集中配置过滤条件后规则保存成功", async ({ page, step }) => {
      await step(
        "步骤1: 进入规则集管理页面 → 页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 编辑ruleset_15695_filter并新增取值范围规则并配置过滤条件 → 规则集编辑页Step2打开，配置正常",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_filter", ["过滤条件包"]);
          await expect(
            page.locator(".ruleSetMonitor__package").filter({ hasText: "过滤条件包" }).first(),
          ).toBeVisible({ timeout: 10000 });

          const ruleForm = await addRuleToPackage(page, "过滤条件包");
          await configureRangeEnumRule(page, ruleForm, {
            field: "score",
            functionName: "取值范围",
            range: {
              firstOperator: ">",
              firstValue: "1",
            },
            ruleStrength: "强规则",
          });

          const filterSection = ruleForm.locator(".filterCondition").first();
          await expect(filterSection).toBeVisible({ timeout: 5000 });
          await filterSection.getByRole("button", { name: /点击配置/ }).click();

          const filterModal = page.locator(".ant-modal:visible").first();
          await filterModal.waitFor({ state: "visible", timeout: 10000 });

          await selectAntOption(page, filterModal.locator(".ant-select").first(), "category");
          await selectAntOption(page, filterModal.locator(".ant-select").nth(1), "in");
          await filterModal.locator("input").last().fill("'1','2','3'");
          await filterModal.getByRole("button", { name: /确\s*认|确\s*定/ }).click();
          await filterModal.waitFor({ state: "hidden", timeout: 10000 });

          await expect(
            ruleForm.locator(".filterCondition input[disabled]").first(),
          ).not.toHaveValue("");
        },
        page.locator(".ruleForm").last(),
      );

      await step(
        "步骤3: 保存规则后重新进入编辑页 → 保存请求携带过滤条件且规则保存成功",
        async () => {
          const saveRequestPromise = page.waitForRequest(
            (request) =>
              request.method() === "POST" &&
              /\/dassets\/v1\/valid\/monitorRuleSet\/(add|edit)/.test(request.url()),
          );
          await saveRuleSet(page);
          const saveRequest = await saveRequestPromise;
          const savePayload = JSON.parse(saveRequest.postData() ?? "{}") as {
            packages?: Array<{
              packageName?: string;
              rules?: Array<{
                filter?: string;
                filterSql?: string;
                columnName?: string | string[];
                standardRuleList?: Array<{
                  filter?: string;
                  filterSql?: string;
                  threshold?: string;
                  functionId?: string;
                }>;
              }>;
            }>;
          };
          const filterPackage = savePayload.packages?.find(
            (item) => item.packageName === "过滤条件包",
          );
          const standardRule = filterPackage?.rules?.[0]?.standardRuleList?.[0];
          const submittedFilter = JSON.parse(standardRule?.filter ?? "{}") as {
            conditions?: Array<{ columnName?: string; threshold?: string }>;
          };
          expect(submittedFilter.conditions?.[0]?.columnName).toBe("category");
          expect(submittedFilter.conditions?.[0]?.threshold).toBe("'1','2','3'");
          expect(standardRule?.filterSql ?? "").toContain("category");
          await gotoRuleSetList(page);
          await expect(getRuleSetListRow(page, "ruleset_15695_filter")).toBeVisible({
            timeout: 10000,
          });

          await openRuleSetEditor(page, "ruleset_15695_filter");
          const packageSection = await getRulePackage(page, "过滤条件包");
          await expect(packageSection).toContainText("score");
          await expect(packageSection).toContainText("取值范围");
        },
      );
    });
  });
}
