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
        // 先选择规则包（进入监控规则页面后必须先选包才能新增规则）
        const packageSelect = page
          .locator(".ruleSetMonitor__packageSelect, .ant-select")
          .filter({ hasText: /请选择规则包/ })
          .first();
        await packageSelect.locator(".ant-select-selector").click();
        await page.waitForTimeout(500);
        await page
          .locator(".ant-select-dropdown:visible")
          .getByText("且关系校验包", { exact: false })
          .first()
          .click();
        await page.waitForTimeout(1000);

        // 点击新增规则
        await page.getByRole("button", { name: /新增规则/ }).first().click();
        await page.waitForTimeout(1000);

        // 统计函数: 取值范围&枚举范围
        const statFuncSelect = page
          .locator(".ant-form-item")
          .filter({ hasText: /统计函数|规则类型/ })
          .locator(".ant-select")
          .first();
        await statFuncSelect.locator(".ant-select-selector").click();
        await page.waitForTimeout(500);
        await page
          .locator(".ant-select-dropdown:visible")
          .getByText("取值范围&枚举范围", { exact: false })
          .first()
          .click();
        await page.waitForTimeout(500);

        // 字段: score
        const fieldSelect = page
          .locator(".ant-form-item")
          .filter({ hasText: "字段" })
          .last()
          .locator(".ant-select")
          .first();
        await fieldSelect.locator(".ant-select-selector").click();
        await page.waitForTimeout(500);
        await page
          .locator(".ant-select-dropdown:visible")
          .getByText("score", { exact: false })
          .first()
          .click();
        await page.waitForTimeout(500);

        // 取值范围设置: > 1 且 < 10
        const rangeFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /取值范围/ })
          .first();

        // 操作符1: >
        const rangeOp1 = rangeFormItem.locator(".ant-select").first();
        await rangeOp1.locator(".ant-select-selector").click();
        await page.waitForTimeout(300);
        await page
          .locator(".ant-select-dropdown:visible")
          .getByText(">", { exact: true })
          .first()
          .click();
        await page.waitForTimeout(300);

        // 期望值1: 1
        await rangeFormItem.locator("input").first().fill("1");
        await page.waitForTimeout(300);

        // 选择"且"（双条件）
        const rangeRadioGroup = rangeFormItem.locator(".ant-radio-wrapper, .ant-radio-button-wrapper");
        await rangeRadioGroup.filter({ hasText: "且" }).first().click();
        await page.waitForTimeout(300);

        // 操作符2: <
        const rangeOp2 = rangeFormItem.locator(".ant-select").nth(1);
        await rangeOp2.locator(".ant-select-selector").click();
        await page.waitForTimeout(300);
        await page
          .locator(".ant-select-dropdown:visible")
          .getByText("<", { exact: true })
          .first()
          .click();
        await page.waitForTimeout(300);

        // 期望值2: 10
        await rangeFormItem.locator("input").nth(1).fill("10");
        await page.waitForTimeout(300);

        // 枚举值设置: in 1、2、3
        const enumFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /枚举值/ })
          .first();

        // 操作符默认为 in，直接输入枚举值
        const enumInput = enumFormItem.locator("input").last();
        for (const val of ["1", "2", "3"]) {
          await enumInput.fill(val);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(200);
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);

        // 取值范围和枚举值关系: 且
        const relationFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /关系/ });
        await relationFormItem
          .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
          .filter({ hasText: "且" })
          .first()
          .click();
        await page.waitForTimeout(300);

        // 验证枚举值操作符支持 in/not in
        const enumOpSelect = enumFormItem.locator(".ant-select").first();
        await enumOpSelect.locator(".ant-select-selector").click();
        await page.waitForTimeout(300);
        const enumDropdown = page.locator(".ant-select-dropdown:visible");
        await expect(enumDropdown.getByText("in", { exact: true }).first()).toBeVisible();
        await expect(enumDropdown.getByText("not in", { exact: false }).first()).toBeVisible();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      },
      page.locator(".ant-form-item").filter({ hasText: /枚举值/ }).first(),
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
