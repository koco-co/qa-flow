// META: {"id":"t1","priority":"P0","title":"验证在规则集中按完整顺序新建取值范围&枚举范围且关系规则（数值类型字段）"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  selectAntOption,
} from "../../helpers/test-setup";
import {
  findProjectWithDoris,
  injectProjectContext,
  runPreconditions,
} from "./test-data";

test.use({ storageState: ".auth/session.json" });

const SUITE_NAME =
  "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";

// 共享项目 ID（beforeAll 中初始化）
let qualityProjectId: number | null = null;

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  // ── 前置条件：建表 + 找到有 Doris 数据源的质量项目 ──
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(360000);

    // Step 1: 建表（独立 page）
    const setupPage = await browser.newPage({ storageState: ".auth/session.json" });
    try {
      await runPreconditions(setupPage);
    } finally {
      await setupPage.close();
    }

    // Step 2: 找到有 Doris 数据源的项目
    const projectPage = await browser.newPage({ storageState: ".auth/session.json" });
    try {
      await applyRuntimeCookies(projectPage);
      const { projectId } = await findProjectWithDoris(projectPage);
      qualityProjectId = projectId;
    } finally {
      await projectPage.close();
    }
  });

  test("验证在规则集中按完整顺序新建取值范围&枚举范围且关系规则（数值类型字段）", async ({
    page,
    step,
  }) => {
    test.skip(!qualityProjectId, "未找到有 Doris 数据源的质量项目");

    // 步骤1：进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成
    await step(
      "步骤1: 进入规则集管理页面 → 规则集管理页面打开，列表或空态可见",
      async () => {
        await applyRuntimeCookies(page);
        const url = buildDataAssetsUrl("/dq/ruleSet", qualityProjectId!);
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        // 注入项目上下文到 sessionStorage
        await injectProjectContext(page, qualityProjectId!);
        // 等待页面加载完成（可能有数据行，也可能是空态）
        const tableBody = page.locator(
          ".ant-table-tbody, .ant-empty, [class*='empty']",
        );
        await expect(tableBody.first()).toBeVisible({ timeout: 15000 });
      },
      page.locator(".ant-table-tbody"),
    );

    // 步骤2：点击【新建规则集】，在 Step 1 基础信息中填写并点击【下一步】
    await step(
      "步骤2: 点击新建规则集，填写 Step1 基础信息后点击下一步 → 进入 Step2 监控规则页面",
      async () => {
        // 点击新增规则集按钮
        const addBtn = page
          .getByRole("button", { name: /新增规则集|新建规则集/ })
          .first();
        await addBtn.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // 选择数据源（匹配包含 doris 的选项）
        const sourceFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /选择数据源/ })
          .first();
        const sourceSelector = sourceFormItem.locator(".ant-select-selector").first();
        await sourceSelector.click();
        await page.waitForTimeout(500);
        // 选择第一个包含 doris 的数据源
        const dropdown = page.locator(".ant-select-dropdown:visible");
        await dropdown.waitFor({ state: "visible", timeout: 5000 });
        const dorisOption = dropdown
          .locator(".ant-select-item-option")
          .filter({ hasText: /doris/i })
          .first();
        await dorisOption.click();
        await page.waitForTimeout(1000);

        // 选择数据库/Schema: test_db
        const schemaFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /选择数据库/ })
          .first();
        await selectAntOption(
          page,
          schemaFormItem.locator(".ant-select-selector").first(),
          "test_db",
        );
        await page.waitForTimeout(1000);

        // 选择数据表: quality_test_num
        const tableFormItem = page
          .locator(".ant-form-item")
          .filter({ hasText: /选择数据表/ })
          .first();
        await selectAntOption(
          page,
          tableFormItem.locator(".ant-select-selector").first(),
          "quality_test_num",
        );
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

        // 验证进入 Step2 监控规则页面
        await expect(
          page.getByText("监控规则", { exact: false }).first(),
        ).toBeVisible({ timeout: 10000 });
      },
      page.getByText("监控规则").first(),
    );

    // 步骤3：在规则包"且关系校验包"下新增规则
    await step(
      "步骤3: 新增取值范围&枚举范围规则并填写配置 → 规则配置区域展开正常，各字段可正常录入",
      async () => {
        // 点击新增规则
        const addRuleBtn = page
          .getByRole("button", { name: /新增规则|新增/ })
          .first();
        await addRuleBtn.click();
        await page.waitForTimeout(1000);

        // 选择统计函数: 取值范围&枚举范围
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

        // 选择字段: score
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

        // ── 取值范围设置: > 1 【且】< 10 ──
        const rangeRow = page
          .locator(".col-inline-form")
          .filter({ hasText: /取值范围设置/ })
          .first()
          .locator("..");

        const rangeSelects = rangeRow.locator(".ant-select");
        await selectAntOption(
          page,
          rangeSelects.first().locator(".ant-select-selector"),
          ">",
        );
        await page.waitForTimeout(300);

        const rangeInputs = rangeRow.locator(
          "input:not(.ant-select-selection-search-input)",
        );
        await rangeInputs.first().fill("1");
        await page.waitForTimeout(300);

        // 且条件
        const rangeConditionRadio = rangeRow
          .locator(".ant-radio-wrapper")
          .filter({ hasText: "且" })
          .first();
        await rangeConditionRadio.click();
        await page.waitForTimeout(300);

        const secondOpSelect = rangeSelects.nth(1);
        await selectAntOption(
          page,
          secondOpSelect.locator(".ant-select-selector"),
          "<",
        );
        await page.waitForTimeout(300);

        await rangeInputs.nth(1).fill("10");
        await page.waitForTimeout(300);

        // ── 枚举值设置: in 1、2、3 ──
        const enumRow = page
          .locator(".col-inline-form")
          .filter({ hasText: /枚举值设置/ })
          .first()
          .locator("..");

        const enumOpSelect = enumRow.locator(".ant-select").first();
        await selectAntOption(
          page,
          enumOpSelect.locator(".ant-select-selector"),
          "in",
        );
        await page.waitForTimeout(300);

        const enumTagsSelect = enumRow.locator(".ant-select").nth(1);
        const enumTagInput = enumTagsSelect.locator(
          ".ant-select-selection-search input",
        );
        for (const val of ["1", "2", "3"]) {
          await enumTagInput.fill(val);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(200);
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);

        // ── 取值范围和枚举值关系: 且 ──
        const relationRow = page
          .locator(".col-inline-form")
          .filter({ hasText: /取值范围和枚举值的关系/ })
          .first()
          .locator("..");
        const relationAndRadio = relationRow
          .locator(".ant-radio-wrapper")
          .filter({ hasText: "且" })
          .first();
        await relationAndRadio.click();
        await page.waitForTimeout(300);

        // 验证枚举值操作符下拉框显示 in 和 not in
        await enumOpSelect.locator(".ant-select-selector").click();
        await page.waitForTimeout(300);
        const enumDropdown = page.locator(".ant-select-dropdown:visible");
        await expect(
          enumDropdown.getByText("in", { exact: true }).first(),
        ).toBeVisible();
        await expect(
          enumDropdown.getByText("not in", { exact: false }).first(),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      },
      page
        .locator(".col-inline-form")
        .filter({ hasText: /枚举值设置/ })
        .first(),
    );

    // 步骤4：点击规则行【保存】，再点击页面底部【保存】完成规则集创建
    await step(
      "步骤4: 保存规则并完成规则集创建 → 规则集保存成功，规则列表显示正确信息",
      async () => {
        // 点击规则行保存
        await page.getByRole("button", { name: "保存" }).first().click();
        await page.waitForTimeout(1000);

        // 点击页面底部保存
        await page.getByRole("button", { name: "保存" }).last().click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1500);

        // 验证保存成功提示
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
