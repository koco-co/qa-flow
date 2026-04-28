import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { selectAntOption, waitForTableLoaded } from "../../../shared/helpers";
import {
  addKey,
  deleteKey,
  gotoJsonConfigPage,
  searchKey,
} from "../【通用配置】json格式配置/json-config-helpers";
import {
  addRuleToPackage,
  clearAllRules,
  createRuleSetDraft,
  deleteRuleSetsByTableNames,
  getRuleForm,
  getRulePackage,
  getRuleSetListRow,
  getSelectOptions,
  gotoRuleBase,
  gotoRuleSetList,
  keepOnlyRulePackages,
  openRuleSetEditor,
  saveRuleSet,
} from "../有效性-取值范围枚举范围规则/rule-editor-helpers";
import {
  getCurrentDatasource,
  runPreconditions,
  SUITE_KEYS,
} from "./test-data";

export const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验";
export const KEY_RANGE_RULE_NAME = "key范围校验";
export const MAIN_TASK_NAME = "task_json_key_range_test";
export const PASS_TASK_NAME = "task_json_key_range_pass";
export const METHOD_SWITCH_TASK_NAME = "task_json_method_switch";
export const NOT_INCLUDE_TASK_NAME = "task_json_not_include_test";
export const FAIL_LOG_TASK_NAME = "task_json_fail_test";

export type KeyRangeMethod = "包含" | "不包含";

export interface KeyRangeRuleConfig {
  readonly field: string;
  readonly method: KeyRangeMethod;
  readonly keyNames: readonly string[];
  readonly description?: string;
  readonly filterSql?: string;
  readonly ruleStrength?: "强规则" | "弱规则";
}

export interface RuleSetScenario {
  readonly tableName: string;
  readonly packageName: string;
  readonly baseRule?: KeyRangeRuleConfig;
}

const KEY_LABELS: Record<string, string> = {
  key1: "姓名",
  key2: "年龄",
  key3: "性别",
  key11: "省份",
  key22: "城市",
  key33: "区县",
  key_deleted_ref: "删除引用key",
};

export const SCENARIOS = {
  main: {
    tableName: "test_json_key_range",
    packageName: "key范围校验测试包",
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: ["key1", "key2"],
      ruleStrength: "强规则",
    },
  },
  fieldType: {
    tableName: "test_json_key_range",
    packageName: "字段类型测试包",
  },
  methodSwitch: {
    tableName: "test_json_method_switch",
    packageName: "method_switch包",
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: ["key1", "key2"],
      ruleStrength: "强规则",
    },
  },
  pass: {
    tableName: "test_json_key_range_pass",
    packageName: "key范围校验通过包",
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: ["key1", "key2"],
      ruleStrength: "强规则",
    },
  },
  notInclude: {
    tableName: "test_json_not_include",
    packageName: "not_include包",
    baseRule: {
      field: "info",
      method: "不包含",
      keyNames: ["key1", "key2"],
      ruleStrength: "强规则",
    },
  },
  failLog: {
    tableName: "test_json_key_range",
    packageName: "失败日志包",
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: ["key_deleted_ref"],
      ruleStrength: "强规则",
    },
  },
} satisfies Record<string, RuleSetScenario>;

function getDatasourceTypeName(): string {
  return getCurrentDatasource().id === "doris3.x"
    ? "Doris3.x"
    : "SparkThrift2.x";
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getExpectedFieldType(): string {
  return getCurrentDatasource().primaryFieldType;
}

export async function ensureJsonKeys(
  page: Page,
  keys: readonly string[] = [...SUITE_KEYS],
): Promise<void> {
  await gotoJsonConfigPage(page);
  const table = page.locator(".ant-table");
  await table.waitFor({ state: "visible", timeout: 15000 });
  await waitForTableLoaded(page, table);

  for (const keyName of keys) {
    await searchKey(page, keyName);
    const existingRow = page
      .locator(".ant-table-row")
      .filter({ hasText: keyName })
      .first();
    if (await existingRow.isVisible({ timeout: 1500 }).catch(() => false)) {
      continue;
    }
    try {
      await addKey(page, keyName, {
        chineseName: KEY_LABELS[keyName] ?? keyName,
        dataSourceType: getDatasourceTypeName(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("对应层级已经存在相同名称的Key")) {
        continue;
      }
      throw error;
    }
  }
}

export async function ensureDeletedReferenceKey(page: Page): Promise<void> {
  await ensureJsonKeys(page, ["key_deleted_ref"]);
}

export async function removeDeletedReferenceKey(page: Page): Promise<void> {
  await gotoJsonConfigPage(page);
  await deleteKey(page, "key_deleted_ref");
}

export async function startRuleSetDraft(
  page: Page,
  scenario: RuleSetScenario,
): Promise<void> {
  await runPreconditions(page);
  await ensureJsonKeys(page);
  if (scenario.baseRule?.keyNames.includes("key_deleted_ref")) {
    await ensureDeletedReferenceKey(page);
  }
  await gotoRuleSetList(page);
  await deleteRuleSetsByTableNames(page, [scenario.tableName]);
  await createRuleSetDraft(page, scenario.tableName, [scenario.packageName]);
  await keepOnlyRulePackages(page, [scenario.packageName]);
  await clearAllRules(page);
}

function getRuleLevelSelect(ruleForm: Locator): Locator {
  return ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /规则类型/ })
    .locator(".ant-select")
    .first();
}

function getFieldSelect(ruleForm: Locator): Locator {
  return ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /^字段/ })
    .locator(".ant-select")
    .first();
}

function getMethodSelect(ruleForm: Locator): Locator {
  return ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /校验方法/ })
    .locator(".ant-select")
    .first();
}

function getFunctionFormItem(ruleForm: Locator): Locator {
  return ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /统计函数/ })
    .first();
}

async function getFunctionSelect(ruleForm: Locator): Promise<Locator> {
  const legacyFunctionSelect = ruleForm
    .locator(".rule__function-list__item .ant-select")
    .first();
  const inlineFunctionSelect = getFunctionFormItem(ruleForm)
    .locator(".ant-select")
    .first();

  await expect
    .poll(
      async () =>
        (await legacyFunctionSelect.isVisible().catch(() => false)) ||
        (await inlineFunctionSelect.isVisible().catch(() => false)),
      { timeout: 10000, message: "waiting for function select to render" },
    )
    .toBe(true);

  return (await legacyFunctionSelect.isVisible().catch(() => false))
    ? legacyFunctionSelect
    : inlineFunctionSelect;
}

async function ensureFieldLevelControlsReady(ruleForm: Locator): Promise<void> {
  await expect(getFieldSelect(ruleForm)).toBeVisible({ timeout: 10000 });
  await expect(await getFunctionSelect(ruleForm)).toBeVisible({
    timeout: 10000,
  });
}

function getContentSelect(ruleForm: Locator): Locator {
  return ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /校验内容/ })
    .locator(".ant-select, .ant-tree-select")
    .first();
}

function getFilterConfigTypeSelect(ruleForm: Locator): Locator {
  return ruleForm.locator(".filterCondition .ant-select").first();
}

function getFilterInput(ruleForm: Locator): Locator {
  return ruleForm.locator(".filterCondition input").last();
}

async function openDropdown(selectLocator: Locator): Promise<Locator> {
  await selectLocator
    .locator(".ant-select-selector")
    .first()
    .click({ timeout: 5000 });
  const page = selectLocator.page();
  const dropdown = page
    .locator(".ant-select-dropdown:visible, .ant-tree-select-dropdown:visible")
    .last();
  await dropdown.waitFor({ state: "visible", timeout: 10000 });
  return dropdown;
}

async function expandVerificationTree(
  page: Page,
  dropdown: Locator,
): Promise<void> {
  for (let pass = 0; pass < 3; pass += 1) {
    const switchers = dropdown.locator(
      ".ant-select-tree-switcher, .ant-tree-switcher",
    );
    const count = await switchers.count().catch(() => 0);
    let expandedAny = false;

    for (let index = 0; index < count; index += 1) {
      const switcher = switchers.nth(index);
      if (!(await switcher.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }

      const className = (await switcher.getAttribute("class")) ?? "";
      if (/open|noop/.test(className)) {
        continue;
      }

      await switcher.scrollIntoViewIfNeeded().catch(() => undefined);
      await switcher
        .click({ force: true })
        .catch(async () => {
          await switcher.evaluate((node) => {
            (node as HTMLElement).click();
          });
        });
      await page.waitForTimeout(200);
      expandedAny = true;
    }

    if (!expandedAny) {
      break;
    }
  }
}

async function findVerificationOption(
  dropdown: Locator,
  keyName: string,
): Promise<Locator> {
  const exactPattern = new RegExp(`^${escapeRegExp(keyName)}$`);
  const labels = dropdown.locator(
    ".ant-select-tree-title, .ant-select-tree-node-content-wrapper, .ant-select-item-option-content",
  );

  const exactLabel = labels.filter({ hasText: exactPattern }).first();
  if (await exactLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
    return exactLabel.locator(
      "xpath=ancestor::*[contains(@class,'ant-select-tree-treenode') or @role='treeitem' or contains(@class,'ant-select-item-option')][1]",
    );
  }

  const fuzzyLabel = labels.filter({ hasText: new RegExp(keyName) }).first();
  return fuzzyLabel.locator(
    "xpath=ancestor::*[contains(@class,'ant-select-tree-treenode') or @role='treeitem' or contains(@class,'ant-select-item-option')][1]",
  );
}

export async function selectFieldValues(
  page: Page,
  ruleForm: Locator,
  fields: readonly string[],
): Promise<void> {
  const fieldSelect = getFieldSelect(ruleForm);
  const dropdown = await openDropdown(fieldSelect);
  for (const field of fields) {
    const option = dropdown
      .locator(".ant-select-item-option")
      .filter({ hasText: new RegExp(`^${field}$`) })
      .first();
    await option.click();
    await page.waitForTimeout(200);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
}

export async function selectRuleFunction(
  ruleForm: Locator,
  functionName: string,
): Promise<void> {
  const functionSelect = await getFunctionSelect(ruleForm);
  await selectAntOption(ruleForm.page(), functionSelect, functionName);
  await ruleForm.page().waitForTimeout(500);
}

export async function configureKeyRangeRule(
  page: Page,
  ruleForm: Locator,
  config: KeyRangeRuleConfig,
): Promise<void> {
  const levelSelect = getRuleLevelSelect(ruleForm);
  if (await levelSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await selectAntOption(page, levelSelect, /字段级|字段/);
  }
  await ensureFieldLevelControlsReady(ruleForm);

  await selectAntOption(page, getFieldSelect(ruleForm), config.field);
  await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
  await page.waitForTimeout(500);
  await selectAntOption(page, getMethodSelect(ruleForm), config.method);
  await setVerificationContent(page, ruleForm, config.keyNames);

  if (config.filterSql) {
    const filterTypeSelect = getFilterConfigTypeSelect(ruleForm);
    if (
      await filterTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await selectAntOption(page, filterTypeSelect, /手动输入|手动/);
      await getFilterInput(ruleForm).fill(config.filterSql);
    }
  }

  if (config.ruleStrength) {
    const strengthSelect = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .locator(".ant-select")
      .first();
    await selectAntOption(page, strengthSelect, config.ruleStrength);
  }

  if (config.description !== undefined) {
    await ruleForm
      .getByPlaceholder("请填写规则描述")
      .first()
      .fill(config.description);
  }
}

export async function setVerificationContent(
  page: Page,
  ruleForm: Locator,
  keyNames: readonly string[],
): Promise<void> {
  const contentSelect = getContentSelect(ruleForm);
  const dropdown = await openDropdown(contentSelect);
  await expandVerificationTree(page, dropdown);
  const searchInput = dropdown.locator("input").first();
  const hasSearchInput = await searchInput
    .isVisible({ timeout: 1000 })
    .catch(() => false);

  for (const keyName of keyNames) {
    if (hasSearchInput) {
      await searchInput.fill(keyName);
      await page.waitForTimeout(400);
    }

    let option = await findVerificationOption(dropdown, keyName);

    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      if (hasSearchInput) {
        await searchInput.fill("");
        await page.waitForTimeout(300);
      }
      await expandVerificationTree(page, dropdown);
      option = await findVerificationOption(dropdown, keyName);
    }

    const checkbox = option
      .locator(".ant-select-tree-checkbox, .ant-checkbox-input")
      .first();
    if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await checkbox.click({ force: true });
    } else {
      await option.click();
    }
  }

  if (hasSearchInput) {
    await searchInput.fill("");
  }
  const confirmButton = page.getByRole("button", { name: /确认|确 定/ }).last();
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  } else {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  await page.waitForTimeout(300);
}

export async function searchVerificationContent(
  page: Page,
  ruleForm: Locator,
  keyword: string,
): Promise<Locator> {
  const contentSelect = getContentSelect(ruleForm);
  const dropdown = await openDropdown(contentSelect);
  await expandVerificationTree(page, dropdown);
  const searchInput = dropdown.locator("input").first();
  if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await searchInput.fill(keyword);
    await page.waitForTimeout(500);
  }
  return dropdown;
}

export async function collectVerificationOptions(
  page: Page,
  ruleForm: Locator,
): Promise<string[]> {
  const contentSelect = getContentSelect(ruleForm);
  const dropdown = await openDropdown(contentSelect);
  await expandVerificationTree(page, dropdown);
  const items = await dropdown
    .locator(".ant-select-tree-title, .ant-select-item-option-content")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
    );
  await page.keyboard.press("Escape").catch(() => undefined);
  return items;
}

export async function collectFieldOptions(
  page: Page,
  ruleForm: Locator,
): Promise<string[]> {
  return getSelectOptions(page, getFieldSelect(ruleForm));
}

export async function openScenarioEditor(
  page: Page,
  scenario: RuleSetScenario,
): Promise<void> {
  await gotoRuleSetList(page);
  await openRuleSetEditor(page, scenario.tableName, [scenario.packageName]);
}

export async function seedScenarioRule(
  page: Page,
  scenario: RuleSetScenario,
): Promise<Locator> {
  if (!scenario.baseRule) {
    throw new Error(
      `Scenario ${scenario.tableName} does not declare a base rule.`,
    );
  }
  await startRuleSetDraft(page, scenario);
  const ruleForm = await addRuleToPackage(
    page,
    scenario.packageName,
    "完整性校验",
  );
  await configureKeyRangeRule(page, ruleForm, scenario.baseRule);
  await saveRuleSet(page);
  await openScenarioEditor(page, scenario);
  return getRuleForm(page, new RegExp(scenario.baseRule.field));
}

export async function seedScenarioRuleSet(
  page: Page,
  scenario: RuleSetScenario,
): Promise<void> {
  await seedScenarioRule(page, scenario);
}

export async function addEmptyKeyRangeRule(
  page: Page,
  scenario: RuleSetScenario,
): Promise<Locator> {
  await startRuleSetDraft(page, scenario);
  return addRuleToPackage(page, scenario.packageName, "完整性校验");
}

export async function saveInvalidRuleSet(page: Page): Promise<void> {
  await saveRuleSet(page);
  await page.waitForTimeout(500);
}

export async function expectRuleError(
  ruleForm: Locator,
  message: string,
): Promise<void> {
  await expect(
    ruleForm
      .locator(".ant-form-item-explain-error")
      .filter({ hasText: message })
      .first(),
  ).toBeVisible({
    timeout: 5000,
  });
}

export async function openRuleContentTooltip(
  page: Page,
  ruleForm: Locator,
): Promise<Locator> {
  const contentNode = ruleForm
    .locator(".ant-select-selection-item, .ant-select-selection-overflow")
    .first();
  await contentNode.hover();
  const tooltip = page
    .locator(".ant-tooltip:visible, .ant-popover:visible")
    .last();
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  return tooltip;
}

export async function openFunctionTooltip(
  page: Page,
  ruleForm: Locator,
): Promise<Locator> {
  const tooltipIcon = ruleForm
    .locator(".ant-form-item-label")
    .filter({ hasText: /统计函数/ })
    .locator(".anticon, svg")
    .first();
  await tooltipIcon.hover();
  const tooltip = page
    .locator(".ant-tooltip:visible, .ant-popover:visible")
    .last();
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  return tooltip;
}

export async function gotoBuiltInRuleBase(page: Page): Promise<void> {
  await gotoRuleBase(page);
  const builtinTab = page.getByRole("tab", { name: /内置规则/ }).first();
  if (await builtinTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await builtinTab.click();
  }
}

export async function searchRuleBaseRule(
  page: Page,
  keyword: string,
): Promise<Locator> {
  const searchBox = page.getByPlaceholder("请输入规则名称进行搜索").first();
  await searchBox.fill(keyword);
  await page.getByRole("button", { name: /search/i }).click();
  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => undefined);
  const row = page
    .locator(".ant-table-row")
    .filter({ hasText: keyword })
    .first();
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export async function assertOnlyTheseDetailRows(
  dataDrawer: Locator,
  expectedIds: readonly number[],
): Promise<void> {
  const rows = dataDrawer.locator(
    ".ant-table-tbody tr:not(.ant-table-measure-row)",
  );
  await expect(rows).toHaveCount(expectedIds.length, { timeout: 10000 });
  const rowTexts = await rows.allInnerTexts();
  for (const id of expectedIds) {
    expect(rowTexts.some((text) => text.includes(String(id)))).toBe(true);
  }
}

export async function expectHighlightedColumn(
  pageOrDrawer: Locator,
  columnName: string,
): Promise<void> {
  const header = pageOrDrawer
    .locator("th")
    .filter({ hasText: columnName })
    .first();
  await expect(header).toBeVisible({ timeout: 5000 });
  await expect(header.locator("span").first()).toHaveAttribute(
    "style",
    /rgb\(249, 108, 91\)/,
  );
}

export async function expectDetailTitle(
  page: Page,
  titleText: string,
): Promise<void> {
  const drawer = page
    .locator(".ant-drawer:visible, .dtc-drawer:visible")
    .last();
  await expect(drawer).toContainText(titleText, { timeout: 5000 });
}

export { getRuleSetListRow, saveRuleSet, getRulePackage };
