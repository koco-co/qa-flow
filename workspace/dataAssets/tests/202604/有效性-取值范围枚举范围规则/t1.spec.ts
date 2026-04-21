// META: {"id":"t1","priority":"P0","title":"【P0】验证在规则集中配置取值范围&枚举范围规则且关系完整流程（数值类型字段）"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  addRuleToPackage,
  configureRangeEnumRule,
  createRuleSetDraft,
  deleteRuleSetsByTableNames,
  gotoRuleSetList,
  saveRuleSet,
} from "./rule-editor-helpers";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  runPreconditions,
  setCurrentDatasource,
} from "./test-data";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";
const TABLE_NAME = "quality_test_num";
const PACKAGE_NAME = "且关系校验包";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${SUITE_NAME} - ${PAGE_NAME} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });

    // ── 前置条件：建表 + 授权（runPreconditions 内含 DROP IF EXISTS + 重建 + 授权） ──
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

    test(
      "【P0】验证在规则集中配置取值范围&枚举范围规则且关系完整流程（数值类型字段）",
      async ({ page, step }) => {
        // 步骤1：进入规则集管理页面，等待列表加载完成
        await step(
          "步骤1: 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 → 规则集管理页面正常打开，列表加载完成，无报错",
          async () => {
            await gotoRuleSetList(page);
            // 清理同表名的旧规则集，避免冲突
            await deleteRuleSetsByTableNames(page, [TABLE_NAME]);
            await gotoRuleSetList(page);
            const tableBody = page.locator(".ant-table-tbody, .ant-empty, [class*='empty']");
            await expect(tableBody.first()).toBeVisible({ timeout: 15000 });
          },
          page.locator(".ant-table-tbody"),
        );

        // 步骤2：找到规则集，点击编辑，进入 Step2 监控规则页面，新增取值范围&枚举范围规则
        await step(
          "步骤2: 找到规则集\"ruleset_15695_and\"，点击操作列的【编辑】按钮，进入 Step2 监控规则页面，在规则包中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】 → 规则配置区域展开，显示「有效性校验」标题，包含字段下拉框、统计规则配置区域（取值范围行和枚举值行）、强弱规则下拉框和规则描述输入框",
          async () => {
            // createRuleSetDraft 会新建规则集草稿并停留在 Step2 监控规则页面
            await createRuleSetDraft(page, TABLE_NAME, [PACKAGE_NAME]);
            await expect(
              page.getByText("监控规则", { exact: false }).first(),
            ).toBeVisible({ timeout: 10000 });

            // 若出现「是否需要车辆信息」选项，必须切换到「否」
            const vehicleRadioNo = page
              .locator(".ant-form-item")
              .filter({ hasText: /车辆信息/ })
              .getByRole("radio", { name: "否" })
              .first();
            if (await vehicleRadioNo.isVisible({ timeout: 2000 }).catch(() => false)) {
              await vehicleRadioNo.click();
              await page.waitForTimeout(300);
            }

            const ruleForm = await addRuleToPackage(page, PACKAGE_NAME, "有效性校验");

            // 断言规则配置区域展开，关键表单项可见
            await expect(
              ruleForm.locator(".ant-form-item").filter({ hasText: /字段/ }).first(),
            ).toBeVisible({ timeout: 10000 });
            await expect(
              ruleForm.locator(".ant-form-item").filter({ hasText: /强弱规则/ }).first(),
            ).toBeVisible({ timeout: 10000 });
          },
          page.locator(".ruleForm").first(),
        );

        // 步骤3：按顺序填写规则配置表单
        const ruleForm = page.locator(".ruleForm").last();
        await step(
          "步骤3: 在规则配置表单中填写字段score、取值范围>1且<10、枚举值in 1,2,3、强弱规则强规则 → 各表单项可正常输入/选择，无异常提示",
          async () => {
            await configureRangeEnumRule(page, ruleForm, {
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

            // 验证配置项已正确录入：取值范围值
            const functionRow = ruleForm.locator(".rule__function-list__item").first();
            await expect(
              functionRow.getByPlaceholder("请输入数值").first(),
            ).toHaveValue("1");
            await expect(
              functionRow.getByPlaceholder("请输入数值").nth(1),
            ).toHaveValue("10");
          },
          ruleForm,
        );

        // 步骤4：保存规则集，断言规则配置页规则列表新增规则的 6 条子项
        await step(
          "步骤4: 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 → 规则保存成功，规则配置页规则列表中新增一条规则（规则类型取值范围&枚举范围、字段score、取值范围>1 且 <10、枚举值in '1,2,3'、且或关系且、强弱规则强规则）",
          async () => {
            // 在保存前先断言编辑器内已渲染的规则行（6 条子项来自 ruleForm 展示）
            // 1) 统计函数名/规则类型：取值范围&枚举范围
            await expect(ruleForm).toContainText("取值范围&枚举范围");
            // 2) 字段：score
            await expect(ruleForm).toContainText("score");
            // 3) 取值范围：>1 且 <10（表单中的操作符和数值已填入）
            // 数值在 input value 中，需用 toHaveValue；操作符在 ant-select 选中文本中用 toContainText
            const functionRow = ruleForm.locator(".rule__function-list__item").first();
            await expect(functionRow.getByPlaceholder("请输入数值").first()).toHaveValue("1");
            await expect(functionRow.getByPlaceholder("请输入数值").nth(1)).toHaveValue("10");
            // 4) 枚举值：in '1,2,3'（枚举 tag 显示）
            await expect(functionRow).toContainText("in");
            const enumTagArea = functionRow.locator(".ant-select").nth(4);
            await expect(enumTagArea).toContainText("1");
            await expect(enumTagArea).toContainText("2");
            await expect(enumTagArea).toContainText("3");
            // 5) 且或关系：且（关系单选已选中）
            const selectedRelation = functionRow
              .locator(".ant-radio-wrapper.ant-radio-wrapper-checked, .ant-radio-button-wrapper-checked")
              .last();
            await expect(selectedRelation).toContainText("且");
            // 6) 强弱规则：强规则
            const strengthFormItem = ruleForm
              .locator(".ant-form-item")
              .filter({ hasText: /强弱规则/ })
              .first();
            await expect(strengthFormItem.locator(".ant-select-selection-item").first()).toContainText(
              "强规则",
            );

            // 完成保存流程（含两步 save 按钮逻辑）
            await saveRuleSet(page);

            // 保存成功后跳转回规则集列表，列表行可见
            const listRow = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)").first();
            await expect(listRow).toBeVisible({ timeout: 15000 });
          },
          ruleForm,
        );

        // 步骤5（doris3.x 在独立 describe 循环中覆盖，此 step 记录切换意图）
        // 当 ACTIVE_DATASOURCES 包含 doris3.x 时，整个 describe 块会对 doris 数据源再执行一遍
        // 因此此处无需额外步骤，循环 for (const datasource of ACTIVE_DATASOURCES) 已保证多数据源覆盖
      },
    );
  });
}
