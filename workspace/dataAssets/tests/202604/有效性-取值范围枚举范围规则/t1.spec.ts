// META: {"id":"t1","priority":"P0","title":"验证在规则集中按完整顺序新建取值范围&枚举范围且关系规则（数值类型字段）"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  selectAntOption,
} from "../../helpers/test-setup";
import {
  DORIS_DATABASE,
  injectProjectContext,
  QUALITY_PROJECT_ID,
  runPreconditions,
} from "./test-data";

test.use({ storageState: ".auth/session.json" });

const SUITE_NAME =
  "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  // ── 前置条件：建表 ──
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(360000);
    const setupPage = await browser.newPage({ storageState: ".auth/session.json" });
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
        await applyRuntimeCookies(page);
        const url = buildDataAssetsUrl("/dq/ruleSet", QUALITY_PROJECT_ID);
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await injectProjectContext(page, QUALITY_PROJECT_ID);
        await page.reload();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        const tableBody = page.locator(
          ".ant-table-tbody, .ant-empty, [class*='empty']",
        );
        await expect(tableBody.first()).toBeVisible({ timeout: 15000 });
      },
      page.locator(".ant-table-tbody"),
    );

    // 步骤2：新建规则集，填写 Step1 基础信息后点击【下一步】
    await step(
      "步骤2: 点击新建规则集，填写 Step1 基础信息后点击下一步 → 进入 Step2 监控规则页面",
      async () => {
        // 直接导航到新建页面（确保 sessionStorage 生效）
        await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID));
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        // 选择数据源（匹配 doris）
        const sourceFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /选择数据源/ })
          .first();
        const sourceSelector = sourceFormItem.locator(".ant-select-selector").first();
        await sourceSelector.click();
        await page.waitForTimeout(500);
        const dsDropdown = page.locator(".ant-select-dropdown:visible");
        await dsDropdown.waitFor({ state: "visible", timeout: 5000 });
        await dsDropdown
          .locator(".ant-select-item-option")
          .filter({ hasText: /doris/i })
          .first()
          .click();
        await page.waitForTimeout(1000);

        // 选择数据库
        const schemaFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /选择数据库/ })
          .first();
        await selectAntOption(
          page,
          schemaFormItem.locator(".ant-select-selector").first(),
          DORIS_DATABASE,
        );
        // 等待表列表 API 加载
        await page.waitForTimeout(2000);

        // 选择数据表: quality_test_num
        const tableFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /选择数据表/ })
          .first();
        const tableSelector = tableFormItem.locator(".ant-select-selector").first();
        await tableSelector.click();
        await page.waitForTimeout(1000);
        const tableDropdown = page.locator(".ant-select-dropdown:visible").last();
        await tableDropdown.waitFor({ state: "visible", timeout: 5000 });
        await tableDropdown
          .locator(".ant-select-item-option")
          .filter({ hasText: "quality_test_num" })
          .first()
          .click();
        await page.waitForTimeout(500);

        // 填写规则包名称
        const packageNameInput = page
          .locator(".ant-table-row")
          .first()
          .locator("input")
          .first();
        await packageNameInput.clear();
        await packageNameInput.fill("且关系校验包");
        await page.waitForTimeout(300);

        // 点击下一步
        await page.getByRole("button", { name: "下一步" }).click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1500);

        await expect(
          page.getByText("监控规则", { exact: false }).first(),
        ).toBeVisible({ timeout: 10000 });
      },
      page.getByText("监控规则").first(),
    );

    // 步骤3：新增取值范围&枚举范围规则并填写配置
    await step(
      "步骤3: 新增取值范围&枚举范围规则并填写配置 → 规则配置区域展开正常，各字段可正常录入",
      async () => {
        const addRuleBtn = page
          .getByRole("button", { name: /新增规则|新增/ })
          .first();
        await addRuleBtn.click();
        await page.waitForTimeout(1000);

        // 统计函数: 取值范围&枚举范围
        const funcSelectCol = page
          .locator(".rule__function-list__item")
          .first()
          .locator(".ant-select")
          .first();
        await selectAntOption(
          page,
          funcSelectCol.locator(".ant-select-selector"),
          "取值范围&枚举范围",
        );
        await page.waitForTimeout(500);

        // 字段: score
        const fieldFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .first();
        await selectAntOption(
          page,
          fieldFormItem.locator(".ant-select-selector").first(),
          "score",
        );
        await page.waitForTimeout(500);

        // 取值范围: > 1 且 < 10
        const rangeRow = page
          .locator(".col-inline-form")
          .filter({ hasText: /取值范围设置/ })
          .first()
          .locator("..");

        const rangeSelects = rangeRow.locator(".ant-select");
        await selectAntOption(page, rangeSelects.first().locator(".ant-select-selector"), ">");
        await page.waitForTimeout(300);

        const rangeInputs = rangeRow.locator("input:not(.ant-select-selection-search-input)");
        await rangeInputs.first().fill("1");
        await page.waitForTimeout(300);

        await rangeRow.locator(".ant-radio-wrapper").filter({ hasText: "且" }).first().click();
        await page.waitForTimeout(300);

        await selectAntOption(page, rangeSelects.nth(1).locator(".ant-select-selector"), "<");
        await page.waitForTimeout(300);
        await rangeInputs.nth(1).fill("10");
        await page.waitForTimeout(300);

        // 枚举值: in 1、2、3
        const enumRow = page
          .locator(".col-inline-form")
          .filter({ hasText: /枚举值设置/ })
          .first()
          .locator("..");

        const enumOpSelect = enumRow.locator(".ant-select").first();
        await selectAntOption(page, enumOpSelect.locator(".ant-select-selector"), "in");
        await page.waitForTimeout(300);

        const enumTagInput = enumRow.locator(".ant-select").nth(1).locator(".ant-select-selection-search input");
        for (const val of ["1", "2", "3"]) {
          await enumTagInput.fill(val);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(200);
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);

        // 取值范围和枚举值关系: 且
        const relationRow = page
          .locator(".col-inline-form")
          .filter({ hasText: /取值范围和枚举值的关系/ })
          .first()
          .locator("..");
        await relationRow.locator(".ant-radio-wrapper").filter({ hasText: "且" }).first().click();
        await page.waitForTimeout(300);

        // 验证枚举值操作符选项
        await enumOpSelect.locator(".ant-select-selector").click();
        await page.waitForTimeout(300);
        const enumDropdown = page.locator(".ant-select-dropdown:visible");
        await expect(enumDropdown.getByText("in", { exact: true }).first()).toBeVisible();
        await expect(enumDropdown.getByText("not in", { exact: false }).first()).toBeVisible();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      },
      page.locator(".col-inline-form").filter({ hasText: /枚举值设置/ }).first(),
    );

    // 步骤4：保存规则并完成规则集创建
    await step(
      "步骤4: 保存规则并完成规则集创建 → 规则集保存成功，规则列表显示正确信息",
      async () => {
        await page.getByRole("button", { name: "保存" }).first().click();
        await page.waitForTimeout(1000);
        await page.getByRole("button", { name: "保存" }).last().click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1500);

        const successMsg = page.locator(
          ".ant-message-notice, .ant-notification-notice, .ant-message",
        );
        await expect(
          successMsg.filter({ hasText: /成功/ }).first(),
        ).toBeVisible({ timeout: 10000 });
      },
      page.locator(".ant-message-notice, .ant-notification-notice").first(),
    );
  });
});
