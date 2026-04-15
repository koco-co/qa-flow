// META: {"id":"t1","priority":"P0","title":"验证在规则集中按完整顺序新建取值范围&枚举范围且关系规则（数值类型字段）"}
import { expect, test } from "../../fixtures/step-screenshot";
import { applyRuntimeCookies, buildDataAssetsUrl, selectAntOption } from "../../helpers/test-setup";
import {
  DORIS_DATABASE,
  injectProjectContext,
  QUALITY_PROJECT_ID,
  runPreconditions,
} from "./test-data";

test.use({ storageState: ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";

async function postRuleSetApi<T>(
  page: import("@playwright/test").Page,
  path: string,
  body: unknown,
) {
  return page.evaluate(
    async ({ requestPath, requestBody, projectId }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify(requestBody),
      });
      return response.json();
    },
    {
      requestPath: path,
      requestBody: body,
      projectId: QUALITY_PROJECT_ID,
    },
  ) as Promise<T>;
}

async function deleteExistingRuleSets(
  page: import("@playwright/test").Page,
  tableNames: string[],
): Promise<void> {
  const listResponse = (await postRuleSetApi<{
    data?: { contentList?: Array<{ id?: number | string; tableName?: string }> };
  }>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
    current: 1,
    size: 50,
    search: "",
  })) ?? { data: { contentList: [] } };

  const rows = (listResponse.data?.contentList ?? []).filter((item) =>
    tableNames.includes(String(item.tableName ?? "")),
  );

  for (const row of rows) {
    if (!row.id) continue;
    await postRuleSetApi(page, "/dassets/v1/valid/monitorRuleSet/delete", {
      id: Number(row.id),
    });
  }
}

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
        await deleteExistingRuleSets(page, ["quality_test_num", "quality_test_str"]);
        await page.reload();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        const tableBody = page.locator(".ant-table-tbody, .ant-empty, [class*='empty']");
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
        const packageNameInput = page.locator("input[placeholder*='规则包名称']").first();
        await packageNameInput.waitFor({ state: "visible", timeout: 5000 });
        await packageNameInput.clear();
        await packageNameInput.fill("且关系校验包");
        await page.waitForTimeout(500);

        // 点击下一步进入 Step 2
        await page.getByRole("button", { name: "下一步" }).click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1500);

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
        // Step 2 页面：先点击"新增规则包"
        const addPackageBtn = page.getByText("新增规则包", { exact: false }).first();
        await addPackageBtn.waitFor({ state: "visible", timeout: 10000 });
        await addPackageBtn.click();
        await page.waitForTimeout(1000);

        // 选择规则包名称（在 ruleSetMonitor__packageSelect 下拉框中选择或输入）
        const packageSelect = page
          .locator(".ruleSetMonitor__packageSelect, .ant-select")
          .filter({ has: page.locator(".ant-select-selection-placeholder") })
          .first();
        await packageSelect.locator(".ant-select-selector").click();
        await page.waitForTimeout(500);
        // 在下拉框中选择第一个可用的规则包名称，或输入新名称
        const pkgDropdown = page.locator(".ant-select-dropdown:visible").last();
        await pkgDropdown.waitFor({ state: "visible", timeout: 5000 });
        // 从 Step 1 定义的规则包中选择（包名来自基础信息配置）
        const pkgOption = pkgDropdown.locator(".ant-select-item-option").first();
        if (await pkgOption.isVisible()) {
          await pkgOption.click();
        }
        await page.waitForTimeout(1000);

        // 点击"添加规则"（Dropdown 按钮）→ 选择"有效性校验"规则类型
        const addRuleBtn = page.getByRole("button", { name: /添加规则/ }).first();
        await addRuleBtn.waitFor({ state: "visible", timeout: 10000 });
        await addRuleBtn.click();
        await page.waitForTimeout(500);
        // 从 Dropdown 菜单选择规则类型
        const ruleTypeMenu = page.locator(".ant-dropdown:visible, .ant-dropdown-menu:visible");
        await ruleTypeMenu.first().waitFor({ state: "visible", timeout: 10000 });
        await ruleTypeMenu.getByText("有效性校验", { exact: false }).first().click();
        await page.waitForTimeout(1500);

        // 先选字段: score（选字段后统计函数选项才会更新）
        const fieldFormItem = page.locator(".ant-form-item").filter({ hasText: /^字段/ }).first();
        const fieldSelect = fieldFormItem.locator(".ant-select").first();
        await selectAntOption(page, fieldSelect, "score");
        await page.waitForTimeout(1000);

        // 统计函数: 取值范围&枚举范围（Ant Select 使用虚拟滚动，需通过 helper 搜索/滚动）
        const funcListItem = page.locator(".rule__function-list__item").first();
        await funcListItem.waitFor({ state: "visible", timeout: 10000 });
        const statFuncSelect = funcListItem.locator(".ant-select").first();
        await selectAntOption(page, statFuncSelect, "取值范围&枚举范围");
        await page.waitForTimeout(1000);

        // 取值范围设置: > 1 且 < 10
        // 操作符1: >
        const rangeOp1 = funcListItem.locator(".ant-select").nth(1);
        await selectAntOption(page, rangeOp1, ">");
        await page.waitForTimeout(300);

        // 期望值1: 1
        await page.getByPlaceholder("请输入数值").first().fill("1");
        await page.waitForTimeout(300);

        // 选择"且"（双条件）
        const rangeRadioGroup = funcListItem.locator(
          ".ant-radio-wrapper, .ant-radio-button-wrapper",
        );
        await rangeRadioGroup.filter({ hasText: /^且$/ }).first().click();
        await page.waitForTimeout(300);

        // 操作符2: <
        const rangeOp2 = funcListItem.locator(".ant-select").nth(2);
        await selectAntOption(page, rangeOp2, "<");
        await page.waitForTimeout(300);

        // 期望值2: 10
        await page.getByPlaceholder("请输入数值").nth(1).fill("10");
        await page.waitForTimeout(300);

        // 枚举值设置: in 1、2、3
        const enumOpSelect = funcListItem.locator(".ant-select").nth(3);
        await selectAntOption(page, enumOpSelect, "in");
        await page.waitForTimeout(300);

        const enumInput = funcListItem.locator(".ant-select").nth(4).locator("input").last();
        for (const val of ["1", "2", "3"]) {
          await enumInput.fill(val);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(200);
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);

        // 取值范围和枚举值关系: 且
        await rangeRadioGroup.filter({ hasText: /^且$/ }).nth(1).click();
        await page.waitForTimeout(300);

        // 强弱规则: 强规则
        const ruleStrengthSelect = page
          .locator(".ant-form-item")
          .filter({ hasText: /强弱规则/ })
          .locator(".ant-select")
          .first();
        await selectAntOption(page, ruleStrengthSelect, "强规则");
        await page.waitForTimeout(300);

        // 规则描述
        await page
          .getByPlaceholder("请填写规则描述")
          .first()
          .fill("score取值范围1到10且枚举值in 1,2,3");
        await page.waitForTimeout(300);

        // 验证枚举值操作符支持 in/not in
        await enumOpSelect.click();
        await page.waitForTimeout(300);
        const enumDropdown = page.locator(".ant-select-dropdown:visible").last();
        const enumOptions = await enumDropdown
          .locator(".ant-select-item-option")
          .evaluateAll((els) =>
            els.map((el) => el.textContent?.trim()).filter((text): text is string => Boolean(text)),
          );
        expect(enumOptions).toContain("in");
        expect(enumOptions).toContain("not in");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
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
        await page.getByRole("button", { name: /保\s*存/ }).click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1500);

        const successMsg = page.locator(
          ".ant-message-notice, .ant-notification-notice, .ant-message",
        );
        await expect(successMsg.filter({ hasText: /成功/ }).first()).toBeVisible({
          timeout: 10000,
        });
      },
      page.locator(".ant-message-notice, .ant-notification-notice").first(),
    );
  });
});
