// META: {"id":"t1","priority":"P0","title":"验证在规则集中按完整顺序新建取值范围&枚举范围且关系规则（数值类型字段）"}
import { expect, test } from "../../fixtures/step-screenshot";
import {
  addRuleToPackage,
  configureRangeEnumRule,
  createRuleSetDraft,
  deleteRuleSetsByTableNames,
  getSelectOptions,
  gotoRuleSetList,
  saveRuleSet,
} from "./rule-editor-helpers";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import { runPreconditions } from "./test-data";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${`${SUITE_NAME} - ${PAGE_NAME}`} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    // ── 前置条件：建表 ──
    test.beforeAll(async ({ browser }) => {
      test.setTimeout(360000);
      const setupPage = await browser.newPage({
        storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json",
      });
      try {
        await runPreconditions(setupPage);
      } finally {
        await setupPage.close();
      }
    });

    test("验证在规则集中按完整顺序新建取值范围&枚举范围且关系规则（数值类型字段）", async ({
      page,
      step,
    }) => {
      // 步骤1：进入规则集管理页面，并导航到新建页
      await step(
        "步骤1: 进入规则集管理页面 → 规则集管理页面打开",
        async () => {
          await gotoRuleSetList(page);
          await deleteRuleSetsByTableNames(page, ["quality_test_num", "quality_test_str"]);
          await gotoRuleSetList(page);
          const tableBody = page.locator(".ant-table-tbody, .ant-empty, [class*='empty']");
          await expect(tableBody.first()).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ant-table-tbody"),
      );

      // 步骤2：新建规则集，填写 Step1 基础信息后点击【下一步】
      await step(
        "步骤2: 点击新建规则集，填写 Step1 基础信息后点击下一步 → 进入 Step2 监控规则页面",
        async () => {
          await createRuleSetDraft(page, "quality_test_num", ["且关系校验包"]);

          await expect(page.getByText("监控规则", { exact: false }).first()).toBeVisible({
            timeout: 10000,
          });
        },
        page.getByText("监控规则").first(),
      );

      // 步骤3：新增规则包 → 添加规则 → 填写配置
      await step(
        "步骤3: 新增取值范围&枚举范围规则并填写配置 → 规则配置区域展开正常，各字段可正常录入",
        async () => {
          const ruleForm = await addRuleToPackage(page, "且关系校验包", "有效性校验");
          const functionRow = await configureRangeEnumRule(page, ruleForm, {
            field: "score",
            range: {
              firstOperator: ">",
              firstValue: "1",
              condition: "且",
              secondOperator: "<",
              secondValue: "10",
            },
            enumOperator: "in",
            enumValues: ["1", "2", "3"],
            relation: "且",
            ruleStrength: "强规则",
            description: "score取值范围1到10且枚举值in 1,2,3",
          });

          const enumOptions = await getSelectOptions(page, functionRow.locator(".ant-select").nth(3));
          expect(enumOptions).toContain("in");
          expect(enumOptions).toContain("not in");
        },
        page
          .locator(".ant-form-item")
          .filter({ hasText: /枚举值/ })
          .first(),
      );

      // 步骤4：保存规则并完成规则集创建
      await step(
        "步骤4: 保存规则并完成规则集创建 → 规则集保存成功，规则列表显示正确信息",
        async () => {
          await saveRuleSet(page);
          await expect(
            page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)").first(),
          ).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)").first(),
      );
    });
  });
}
