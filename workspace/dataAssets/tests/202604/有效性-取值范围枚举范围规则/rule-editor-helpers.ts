import { expect, type Locator, type Page } from "@playwright/test";

import { applyRuntimeCookies, buildDataAssetsUrl, selectAntOption } from "../../helpers/test-setup";
import { DORIS_DATABASE, injectProjectContext, QUALITY_PROJECT_ID } from "./test-data";

export interface RangeConfig {
  firstOperator?: string;
  firstValue?: string;
  condition?: "且" | "或";
  secondOperator?: string;
  secondValue?: string;
}

export interface RangeEnumConfig {
  field: string;
  functionName?: string;
  range?: RangeConfig;
  enumOperator?: string;
  enumValues?: string[];
  relation?: "且" | "或";
  ruleStrength?: "强规则" | "弱规则";
  description?: string;
}

const RULESET_ROW_FALLBACKS: Record<string, string> = {
  ruleset_15695_and: "quality_test_num",
  ruleset_15695_enum: "quality_test_num",
  ruleset_15695_enum_orig: "quality_test_num",
  ruleset_15695_filter: "quality_test_num",
  ruleset_15695_notin: "quality_test_num",
  ruleset_15695_or: "quality_test_num",
  ruleset_15695_range: "quality_test_num",
  ruleset_15695_str: "quality_test_str",
};

const DORIS_DATASOURCE_PATTERN = /doris/i;

export function getRuleSetListRow(page: Page, rulesetName: string): Locator {
  const rowText = RULESET_ROW_FALLBACKS[rulesetName] ?? rulesetName;
  return page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: rowText })
    .first();
}

export async function gotoRuleSetList(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

async function gotoRuleSetCreate(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

async function ensurePackageNamesInBaseInfo(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const packageNameInputs = page.locator('input[placeholder="请输入规则包名称"]');
  await packageNameInputs.first().waitFor({ state: "visible", timeout: 10000 });

  const existingPackageNames = (await packageNameInputs.evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value.trim()).filter(Boolean),
  )) as string[];

  const missingPackageNames = requiredPackageNames.filter(
    (packageName) => !existingPackageNames.includes(packageName),
  );

  for (const packageName of missingPackageNames) {
    await page.getByRole("button", { name: /新增/ }).click();
    await page.waitForTimeout(300);
    await packageNameInputs.last().fill(packageName);
    await page.waitForTimeout(200);
  }
}

async function gotoBaseInfoStep(page: Page): Promise<void> {
  const packageNameInputs = page.locator('input[placeholder="请输入规则包名称"]');
  if (
    await packageNameInputs
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  const prevBtn = page.getByRole("button", { name: "上一步" }).first();
  if (await prevBtn.isVisible().catch(() => false)) {
    await prevBtn.click();
  } else {
    const baseInfoBtn = page.getByRole("button", { name: /基础信息/ }).first();
    if (await baseInfoBtn.isVisible().catch(() => false)) {
      await baseInfoBtn.click();
    } else {
      throw new Error("Cannot switch to 基础信息 step.");
    }
  }

  await packageNameInputs.first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(500);
}

async function gotoMonitorRulesStep(page: Page): Promise<void> {
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();
  const firstPackage = page.locator(".ruleSetMonitor__package").first();
  const isMonitorRulesVisible = async () =>
    (await firstPackage.isVisible().catch(() => false)) ||
    (await newPackageBtn.isVisible().catch(() => false));
  if (await isMonitorRulesVisible()) {
    return;
  }

  const nextBtn = page.getByRole("button", { name: "下一步" }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(1000);
  }

  if (await isMonitorRulesVisible()) {
    return;
  }

  const monitorRulesBtn = page.getByRole("button", { name: /监控规则/ }).first();
  if (await monitorRulesBtn.isVisible().catch(() => false)) {
    await monitorRulesBtn.click();
    await page.waitForTimeout(1000);
  }

  await expect.poll(async () => await isMonitorRulesVisible(), { timeout: 10000 }).toBe(true);
}

async function addPackageSlot(page: Page, packageName: string): Promise<void> {
  await page
    .getByRole("button", { name: /新增规则包/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const packageSection = page.locator(".ruleSetMonitor__package").last();
  const packageSelect = packageSection.locator(".ruleSetMonitor__packageSelect").first();
  await packageSelect.waitFor({ state: "visible", timeout: 10000 });
  await selectAntOption(page, packageSelect, packageName);
  await page.waitForTimeout(300);
}

async function ensureRuleSetPackagesVisible(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();
  const firstPackage = page.locator(".ruleSetMonitor__package").first();
  await expect
    .poll(
      async () =>
        (await firstPackage.isVisible().catch(() => false)) ||
        (await newPackageBtn.isVisible().catch(() => false)),
      { timeout: 10000 },
    )
    .toBe(true);

  for (const packageName of requiredPackageNames) {
    const packageSection = page
      .locator(".ruleSetMonitor__package")
      .filter({ hasText: packageName })
      .first();
    if (await packageSection.isVisible().catch(() => false)) {
      continue;
    }
    await addPackageSlot(page, packageName);
    await expect(
      page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first(),
    ).toBeVisible({ timeout: 10000 });
  }
}

async function createRuleSetDraft(
  page: Page,
  tableName: string,
  requiredPackageNames: string[],
): Promise<void> {
  await gotoRuleSetCreate(page);

  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  await selectAntOption(
    page,
    sourceFormItem.locator(".ant-select").first(),
    DORIS_DATASOURCE_PATTERN,
  );

  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOption(page, schemaFormItem.locator(".ant-select").first(), DORIS_DATABASE);
  await page.waitForTimeout(1000);

  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  await selectAntOption(page, tableFormItem.locator(".ant-select").first(), tableName);
  await page.waitForTimeout(500);

  await ensurePackageNamesInBaseInfo(page, requiredPackageNames);
  await gotoMonitorRulesStep(page);
  await ensureRuleSetPackagesVisible(page, requiredPackageNames);
}

export async function openRuleSetEditor(
  page: Page,
  rulesetName: string,
  requiredPackageNames: string[] = [],
): Promise<void> {
  await page.locator(".ant-table-tbody").waitFor({ state: "visible", timeout: 15000 });
  const dataRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
  await expect(dataRows.first()).toBeVisible({ timeout: 15000 });

  const rowTexts = [rulesetName];
  const fallbackRowText = RULESET_ROW_FALLBACKS[rulesetName];
  if (fallbackRowText && fallbackRowText !== rulesetName) {
    rowTexts.push(fallbackRowText);
  }

  for (const rowText of rowTexts) {
    const targetRow = dataRows.filter({ hasText: rowText }).first();
    if (await targetRow.isVisible().catch(() => false)) {
      await targetRow.getByRole("button", { name: "编辑" }).click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      await ensureMonitorRulesStep(page, requiredPackageNames);
      return;
    }
  }

  if (fallbackRowText === "quality_test_str") {
    await createRuleSetDraft(page, fallbackRowText, requiredPackageNames);
    return;
  }

  const availableRows = await dataRows.allTextContents();
  throw new Error(
    `Rule set row not found for "${rulesetName}". Available rows: ${availableRows.join(" | ")}`,
  );
}

async function ensureMonitorRulesStep(page: Page, requiredPackageNames: string[]): Promise<void> {
  const packageNameInputs = page.locator('input[placeholder="请输入规则包名称"]');
  const firstPackageSection = page.locator(".ruleSetMonitor__package").first();
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();

  const isMonitorRulesStep =
    (await firstPackageSection.isVisible().catch(() => false)) ||
    (await newPackageBtn.isVisible().catch(() => false));

  if (isMonitorRulesStep) {
    const missingStep2Packages: string[] = [];
    for (const packageName of requiredPackageNames) {
      const packageSection = page
        .locator(".ruleSetMonitor__package")
        .filter({ hasText: packageName })
        .first();
      if (!(await packageSection.isVisible().catch(() => false))) {
        missingStep2Packages.push(packageName);
      }
    }

    if (missingStep2Packages.length === 0) {
      return;
    }

    await gotoBaseInfoStep(page);
  }

  if (
    await packageNameInputs
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await ensurePackageNamesInBaseInfo(page, requiredPackageNames);
  }

  await gotoMonitorRulesStep(page);
  await ensureRuleSetPackagesVisible(page, requiredPackageNames);
}

export async function getRulePackage(page: Page, packageName: string): Promise<Locator> {
  const packageSection = page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first();
  await expect(packageSection).toBeVisible({ timeout: 10000 });

  const expandBtn = packageSection.getByRole("button", { name: /展开/ }).first();
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(300);
  }

  return packageSection;
}

export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType = "有效性校验",
): Promise<Locator> {
  const packageSection = await getRulePackage(page, packageName);
  const ruleForms = packageSection.locator(".ruleForm");
  const beforeCount = await ruleForms.count();

  await packageSection
    .getByRole("button", { name: /添加规则/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const ruleTypeMenu = page.locator(".ant-dropdown:visible, .ant-dropdown-menu:visible");
  await ruleTypeMenu.first().waitFor({ state: "visible", timeout: 10000 });
  await ruleTypeMenu.getByText(ruleType, { exact: false }).first().click();

  await expect(ruleForms).toHaveCount(beforeCount + 1, { timeout: 10000 });
  return ruleForms.nth(beforeCount);
}

export async function getRuleForm(page: Page, text: string | RegExp): Promise<Locator> {
  const ruleForm = page.locator(".ruleForm").filter({ hasText: text }).first();
  await expect(ruleForm).toBeVisible({ timeout: 10000 });
  return ruleForm;
}

export async function selectRuleFieldAndFunction(
  page: Page,
  ruleForm: Locator,
  field: string,
  functionName = "取值范围&枚举范围",
): Promise<Locator> {
  const fieldSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /字段/ })
    .locator(".ant-select")
    .first();
  await selectAntOption(page, fieldSelect, field);
  await page.waitForTimeout(300);

  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  await selectAntOption(page, functionRow.locator(".ant-select").first(), functionName);
  await page.waitForTimeout(300);

  return functionRow;
}

export async function configureRangeEnumRule(
  page: Page,
  ruleForm: Locator,
  config: RangeEnumConfig,
): Promise<Locator> {
  const functionRow = await selectRuleFieldAndFunction(
    page,
    ruleForm,
    config.field,
    config.functionName,
  );

  if (config.range?.firstOperator) {
    await selectAntOption(
      page,
      functionRow.locator(".ant-select").nth(1),
      config.range.firstOperator,
    );
    await page.waitForTimeout(200);
  }
  if (config.range?.firstValue !== undefined) {
    await functionRow.getByPlaceholder("请输入数值").first().fill(config.range.firstValue);
    await page.waitForTimeout(200);
  }
  if (config.range?.condition) {
    await functionRow
      .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
      .filter({ hasText: new RegExp(`^${config.range.condition}$`) })
      .first()
      .click();
    await page.waitForTimeout(200);
  }
  if (config.range?.secondOperator) {
    await selectAntOption(
      page,
      functionRow.locator(".ant-select").nth(2),
      config.range.secondOperator,
    );
    await page.waitForTimeout(200);
  }
  if (config.range?.secondValue !== undefined) {
    await functionRow.getByPlaceholder("请输入数值").nth(1).fill(config.range.secondValue);
    await page.waitForTimeout(200);
  }

  if (config.enumOperator) {
    await selectAntOption(page, functionRow.locator(".ant-select").nth(3), config.enumOperator);
    await page.waitForTimeout(200);
  }
  if (config.enumValues?.length) {
    const enumInput = functionRow.locator(".ant-select").nth(4).locator("input").last();
    for (const value of config.enumValues) {
      await enumInput.fill(value);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
  if (config.relation) {
    await functionRow
      .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
      .filter({ hasText: new RegExp(`^${config.relation}$`) })
      .last()
      .click();
    await page.waitForTimeout(200);
  }

  if (config.ruleStrength) {
    const strengthSelect = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .locator(".ant-select")
      .first();
    await selectAntOption(page, strengthSelect, config.ruleStrength);
    await page.waitForTimeout(200);
  }

  if (config.description !== undefined) {
    await ruleForm.getByPlaceholder("请填写规则描述").first().fill(config.description);
    await page.waitForTimeout(200);
  }

  return functionRow;
}

export async function selectRuleRelation(ruleForm: Locator, relation: "且" | "或"): Promise<void> {
  await ruleForm
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: new RegExp(`^${relation}$`) })
    .last()
    .click();
}

export async function getSelectOptions(page: Page, selectLocator: Locator): Promise<string[]> {
  await selectLocator.click();
  await page.waitForTimeout(200);

  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });

  const options = await dropdown
    .locator(".ant-select-item-option")
    .evaluateAll((els) =>
      els.map((el) => el.textContent?.trim()).filter((text): text is string => Boolean(text)),
    );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  return options;
}

export async function saveRuleSet(page: Page): Promise<void> {
  const saveResponsePromise = page
    .waitForResponse(
      (response) => {
        const request = response.request();
        return (
          request.method() === "POST" &&
          /\/dassets\/v1\/valid\/monitorRuleSet\/(add|edit)/.test(response.url())
        );
      },
      { timeout: 15000 },
    )
    .catch(() => null);

  await page.getByRole("button", { name: /保\s*存/ }).click();

  const confirmSaveBtn = page
    .locator(".ant-modal-confirm:visible .ant-btn-primary, .ant-modal:visible .ant-btn-primary")
    .filter({ hasText: /保\s*存/ })
    .first();
  if (await confirmSaveBtn.isVisible().catch(() => false)) {
    await confirmSaveBtn.click();
  }

  const saveResponse = await saveResponsePromise;
  if (saveResponse) {
    const responseBody = await saveResponse.json().catch(() => null);
    const saveSucceeded =
      saveResponse.ok() &&
      (!responseBody || typeof responseBody !== "object" || responseBody.success !== false);

    if (!saveSucceeded) {
      const errorMessage =
        responseBody && typeof responseBody === "object" && "message" in responseBody
          ? String(responseBody.message)
          : `HTTP ${saveResponse.status()}`;
      throw new Error(`Save rule set failed: ${errorMessage}`);
    }

    await page.waitForTimeout(1000);
    return;
  }

  const successToast = page
    .locator(".ant-message-notice, .ant-notification-notice, .ant-message")
    .filter({ hasText: /成功/ })
    .first();
  const listRow = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)").first();

  await Promise.any([
    successToast.waitFor({ state: "visible", timeout: 15000 }),
    listRow.waitFor({ state: "visible", timeout: 15000 }),
  ]);
  await page.waitForTimeout(1000);
}

export async function cloneRule(ruleForm: Locator): Promise<void> {
  await ruleForm.getByRole("button", { name: "克隆" }).click();
}

export async function deleteRule(page: Page, ruleForm: Locator): Promise<void> {
  await ruleForm.locator(".ruleForm__icon").locator("xpath=ancestor::button[1]").click();
  await page.waitForTimeout(200);

  const confirmBtn = page
    .locator(".ant-popover:visible .ant-btn-primary, .ant-popconfirm .ant-btn-primary")
    .first();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(300);
  }
}
