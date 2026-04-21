import { expect, type Locator, type Page } from "@playwright/test";
import {
  normalizeDataAssetsBaseUrl,
  selectAntOption,
} from "../../helpers/test-setup";
import {
  JSON_KEY_PRESETS,
  getCurrentDatasource,
  getJsonValidationDataSourceType,
  runSuitePreconditions,
  type JsonRuleScenario,
} from "./test-data";
import {
  addRuleToPackage,
  createRuleSetDraft,
  deleteRuleSetsByTableNames,
  getRulePackage,
  getSelectOptions,
  gotoRuleBase,
  gotoRuleSetList,
  keepOnlyRulePackages,
  openRuleSetEditor,
  saveRuleSet,
  selectRuleFieldAndFunction,
} from "./rule-editor-base";
import { resolveEffectiveQualityProjectId } from "./test-data";

const preparedPresets = new Set<string>();
const preparedRuleSets = new Set<string>();

export type JsonTreeNode = {
  id: number | string;
  jsonKey: string;
  fullPath?: string;
  level?: number;
  name?: string;
  value?: string;
  dataSourceType?: number;
  children?: JsonTreeNode[];
};

type JsonConfigPayload = {
  id?: number | string;
  jsonKey: string;
  name?: string;
  value?: string;
  dataSourceType: number;
  parentId: number | string;
  level: number;
  fullPath: string;
};

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(
    normalizedPath,
    new URL(normalizeDataAssetsBaseUrl()).origin,
  ).toString();
}

function buildFullPath(pathSegments: readonly string[]): string {
  return pathSegments.map((segment) => `['${segment}']`).join("");
}

export function buildKeyPath(pathSegments: readonly string[]): string {
  return pathSegments.join("-");
}

async function requestValidJson<T>(
  page: Page,
  url: string,
  body: unknown,
  projectId: number,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.context().request.post(url, {
        data: body,
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          "X-Valid-Project-ID": String(projectId),
        },
        timeout: 15_000,
      });
      const text = await response.text();

      if (!response.ok()) {
        throw new Error(
          `HTTP ${response.status()} ${response.statusText()} from ${url}: ${text.slice(0, 200)}`,
        );
      }

      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === 3) {
        throw lastError;
      }
      await page.waitForTimeout(500 * attempt);
    }
  }

  throw lastError ?? new Error(`Request failed: ${url}`);
}

async function postValidApi<T>(
  page: Page,
  path: string,
  body: unknown,
): Promise<T> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  return requestValidJson<T>(page, buildApiUrl(path), body, effectiveProjectId);
}

async function getJsonTree(page: Page): Promise<JsonTreeNode[]> {
  const response = await postValidApi<{
    success?: boolean;
    data?: JsonTreeNode[];
  }>(page, "/dassets/v1/valid/jsonValidationConfig/getTree", {});
  if (!response.success) {
    throw new Error("获取 json 格式校验树失败");
  }
  return response.data ?? [];
}

function findJsonNodeByPath(
  tree: JsonTreeNode[],
  path: readonly string[],
): JsonTreeNode | null {
  let levelNodes = tree;
  let matched: JsonTreeNode | null = null;
  for (const segment of path) {
    matched = levelNodes.find((node) => node.jsonKey === segment) ?? null;
    if (!matched) {
      return null;
    }
    levelNodes = matched.children ?? [];
  }
  return matched;
}

type ResolvedJsonTreePath = {
  pathSegments: string[];
  pathNodes: JsonTreeNode[];
};

function findJsonTreePathByKeyPath(
  tree: readonly JsonTreeNode[],
  keyPath: string,
): ResolvedJsonTreePath | null {
  const search = (
    nodes: readonly JsonTreeNode[],
    currentSegments: readonly string[],
    currentNodes: readonly JsonTreeNode[],
  ): ResolvedJsonTreePath | null => {
    for (const node of nodes) {
      const nextSegments = [...currentSegments, node.jsonKey];
      const nextNodes = [...currentNodes, node];
      if (buildKeyPath(nextSegments) === keyPath) {
        return {
          pathSegments: nextSegments,
          pathNodes: nextNodes,
        };
      }
      const child = search(node.children ?? [], nextSegments, nextNodes);
      if (child) {
        return child;
      }
    }
    return null;
  };

  return search(tree, [], []);
}

function uniqueNonEmptyStrings(
  values: readonly (string | undefined)[],
): string[] {
  return [
    ...new Set(values.map((value) => value?.trim()).filter(Boolean)),
  ] as string[];
}

function buildFallbackResolvedPath(keyPath: string): ResolvedJsonTreePath {
  const pathSegments = keyPath.split("-");
  return {
    pathSegments,
    pathNodes: pathSegments.map((segment) => ({
      id: segment,
      jsonKey: segment,
    })),
  };
}

function buildNodeTitleCandidates(
  resolvedPath: ResolvedJsonTreePath,
  index: number,
): string[] {
  const currentSegments = resolvedPath.pathSegments.slice(0, index + 1);
  const currentNode = resolvedPath.pathNodes[index];
  return uniqueNonEmptyStrings([
    buildKeyPath(currentSegments),
    currentNode.name,
    currentNode.jsonKey,
  ]);
}

async function addOrUpdateJsonNode(
  page: Page,
  existingNode: JsonTreeNode | null,
  payload: JsonConfigPayload,
): Promise<void> {
  if (!existingNode) {
    const response = await postValidApi<{
      success?: boolean;
      data?: unknown;
      message?: string;
    }>(page, "/dassets/v1/valid/jsonValidationConfig/add", payload);
    if (!response.success) {
      throw new Error(
        `新增 json key 失败: ${response.message ?? payload.jsonKey}`,
      );
    }
    return;
  }

  const shouldUpdate =
    (payload.name ?? "") !== (existingNode.name ?? "") ||
    (payload.value ?? "") !== (existingNode.value ?? "") ||
    payload.dataSourceType !==
      Number(existingNode.dataSourceType ?? payload.dataSourceType);

  if (!shouldUpdate) {
    return;
  }

  const response = await postValidApi<{
    success?: boolean;
    data?: unknown;
    message?: string;
  }>(page, "/dassets/v1/valid/jsonValidationConfig/update", {
    id: existingNode.id,
    jsonKey: payload.jsonKey,
    name: payload.name,
    value: payload.value,
    dataSourceType: payload.dataSourceType,
    ...(payload.parentId === 0 ? { parentId: 0 } : {}),
  });
  if (!response.success) {
    throw new Error(
      `更新 json key 失败: ${response.message ?? payload.jsonKey}`,
    );
  }
}

export async function ensureJsonKeyPreset(
  page: Page,
  presetName: keyof typeof JSON_KEY_PRESETS,
): Promise<void> {
  const datasource = getCurrentDatasource();
  const cacheKey = `${datasource.cacheKey}:${presetName}`;
  if (preparedPresets.has(cacheKey)) {
    return;
  }

  await runSuitePreconditions(page, datasource);
  const dataSourceType = getJsonValidationDataSourceType(datasource);

  for (const seed of JSON_KEY_PRESETS[presetName]) {
    let tree = await getJsonTree(page);
    for (let level = 0; level < seed.path.length; level += 1) {
      const currentPath = seed.path.slice(0, level + 1);
      const existingNode = findJsonNodeByPath(tree, currentPath);
      const parentNode =
        level === 0 ? null : findJsonNodeByPath(tree, currentPath.slice(0, -1));
      const isLeaf = level === seed.path.length - 1;
      const payload: JsonConfigPayload = {
        jsonKey: currentPath[currentPath.length - 1],
        name: isLeaf ? seed.name : existingNode?.name,
        value: isLeaf ? seed.value : existingNode?.value,
        dataSourceType,
        parentId: parentNode?.id ?? 0,
        level: level + 1,
        fullPath: buildFullPath(currentPath),
      };
      await addOrUpdateJsonNode(page, existingNode, payload);
      tree = await getJsonTree(page);
    }
  }

  preparedPresets.add(cacheKey);
}

export async function prepareJsonRuleSetDraft(
  page: Page,
  tableName: string,
  packageName: string,
  presetNames: readonly (keyof typeof JSON_KEY_PRESETS)[] = [],
): Promise<void> {
  await runSuitePreconditions(page);
  for (const presetName of presetNames) {
    await ensureJsonKeyPreset(page, presetName);
  }
  await gotoRuleSetList(page);
  await deleteRuleSetsByTableNames(page, [tableName]);
  await createRuleSetDraft(page, tableName, [packageName]);
  await keepOnlyRulePackages(page, [packageName]);
}

function getKeySelect(ruleForm: Locator): Locator {
  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  return functionRow
    .locator(".ant-select.ant-tree-select, .ant-tree-select")
    .first()
    .or(functionRow.locator(".ant-select").nth(1));
}

async function getKeyDropdown(page: Page): Promise<Locator> {
  const dropdown = page
    .locator(".ant-select-dropdown:visible, .ant-select-tree-dropdown:visible")
    .last();
  await expect(dropdown).toBeVisible({ timeout: 10000 });
  return dropdown;
}

function toXPathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  return `concat('${value.replace(/'/g, `',"'",'`)}')`;
}

async function findTreeNodeByTitle(
  scope: Locator,
  title: string,
): Promise<Locator | null> {
  const node = scope
    .locator(
      `xpath=.//*[contains(@class,'ant-select-tree-title') or contains(@class,'ant-select-tree-node-content-wrapper')][normalize-space(.)=${toXPathLiteral(title)}]/ancestor::*[contains(@class,'ant-select-tree-treenode')][1]`,
    )
    .first();
  const visible = await node.isVisible({ timeout: 1500 }).catch(() => false);
  return visible ? node : null;
}

async function findTreeNodeByTitles(
  scope: Locator,
  titles: readonly string[],
): Promise<Locator | null> {
  for (const title of titles) {
    const node = await findTreeNodeByTitle(scope, title);
    if (node) {
      return node;
    }
  }
  return null;
}

async function collectVisibleTreeTitles(dropdown: Locator): Promise<string[]> {
  return dropdown
    .locator(".ant-select-tree-title, .ant-select-tree-node-content-wrapper")
    .evaluateAll((nodes) => [
      ...new Set(
        nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
      ),
    ]);
}

function getTreeSearchInput(dropdown: Locator): Locator {
  return dropdown.locator("input").last();
}

async function clearTreeSearchInput(
  page: Page,
  dropdown: Locator,
): Promise<void> {
  const searchInput = getTreeSearchInput(dropdown);
  if (!(await searchInput.isVisible({ timeout: 500 }).catch(() => false))) {
    return;
  }
  await searchInput.fill("");
  await page.waitForTimeout(200);
}

async function searchTreeNodeByTitles(
  page: Page,
  dropdown: Locator,
  titles: readonly string[],
): Promise<Locator | null> {
  const searchInput = getTreeSearchInput(dropdown);
  if (!(await searchInput.isVisible({ timeout: 1000 }).catch(() => false))) {
    return null;
  }

  for (const title of titles) {
    await searchInput.fill(title);
    await page.waitForTimeout(400);
    const matchedNode = await findTreeNodeByTitles(dropdown, titles);
    if (matchedNode) {
      return matchedNode;
    }
  }

  await clearTreeSearchInput(page, dropdown);
  return null;
}

async function expandVisibleTreeNodes(
  page: Page,
  scope: Locator,
  maxExpansions = 12,
): Promise<void> {
  for (let attempt = 0; attempt < maxExpansions; attempt += 1) {
    const switchers = scope.locator(".ant-select-tree-switcher_close");
    const count = await switchers.count();
    if (count === 0) {
      return;
    }

    let expanded = false;
    for (let index = 0; index < count; index += 1) {
      const switcher = switchers.nth(index);
      if (await switcher.isVisible().catch(() => false)) {
        await switcher.click();
        await page.waitForTimeout(200);
        expanded = true;
        break;
      }
    }

    if (!expanded) {
      return;
    }
  }
}

async function getTreeNodeByKeyPath(
  page: Page,
  dropdown: Locator,
  keyPath: string,
): Promise<Locator> {
  const tree = await getJsonTree(page);
  const resolvedPath =
    findJsonTreePathByKeyPath(tree, keyPath) ??
    buildFallbackResolvedPath(keyPath);
  const leafTitleCandidates = uniqueNonEmptyStrings([
    keyPath,
    resolvedPath.pathNodes.at(-1)?.name,
    resolvedPath.pathNodes.at(-1)?.jsonKey,
  ]);

  const fullPathNode = await findTreeNodeByTitles(
    dropdown,
    leafTitleCandidates,
  );
  if (fullPathNode) {
    return fullPathNode;
  }

  const searchedNode = await searchTreeNodeByTitles(
    page,
    dropdown,
    leafTitleCandidates,
  );
  if (searchedNode) {
    return searchedNode;
  }

  await clearTreeSearchInput(page, dropdown);
  await expandVisibleTreeNodes(page, dropdown);

  const expandedNode = await findTreeNodeByTitles(
    dropdown,
    leafTitleCandidates,
  );
  if (expandedNode) {
    return expandedNode;
  }

  let scope = dropdown;
  let node = dropdown.locator(".ant-select-tree-treenode").first();
  for (let index = 0; index < resolvedPath.pathNodes.length; index += 1) {
    const titleCandidates = buildNodeTitleCandidates(resolvedPath, index);
    let matchedNode = await findTreeNodeByTitles(scope, titleCandidates);
    if (!matchedNode) {
      await expandVisibleTreeNodes(page, scope, 4);
      matchedNode = await findTreeNodeByTitles(scope, titleCandidates);
    }
    if (!matchedNode) {
      const visibleTitles = await collectVisibleTreeTitles(dropdown);
      throw new Error(
        `未找到校验key节点: ${keyPath}; 尝试标题: ${titleCandidates.join(" / ")}; 当前可见节点: ${visibleTitles.slice(0, 20).join(", ")}`,
      );
    }
    node = matchedNode;
    await expect(node).toBeVisible({ timeout: 10000 });
    if (index < resolvedPath.pathNodes.length - 1) {
      const switcher = node.locator(".ant-select-tree-switcher_close").first();
      if (await switcher.isVisible().catch(() => false)) {
        await switcher.click();
        await page.waitForTimeout(200);
      }
      scope = node;
    }
  }
  return node;
}

export async function openValidationKeyDropdown(
  page: Page,
  ruleForm: Locator,
): Promise<Locator> {
  const keySelect = getKeySelect(ruleForm);
  await keySelect
    .locator(".ant-select-selector, .ant-select-selection-overflow")
    .first()
    .click();
  return getKeyDropdown(page);
}

export async function searchValidationKey(
  page: Page,
  keyword: string,
): Promise<Locator> {
  const dropdown = await getKeyDropdown(page);
  const searchInput = getTreeSearchInput(dropdown);
  await expect(searchInput).toBeVisible({ timeout: 5000 });
  await searchInput.fill(keyword);
  await page.waitForTimeout(400);
  return dropdown;
}

export async function selectValidationKeyPaths(
  page: Page,
  ruleForm: Locator,
  keyPaths: readonly string[],
): Promise<void> {
  const dropdown = await openValidationKeyDropdown(page, ruleForm);
  for (const keyPath of keyPaths) {
    const node = await getTreeNodeByKeyPath(page, dropdown, keyPath);
    const checkbox = node.locator(".ant-select-tree-checkbox").first();
    await checkbox.click();
    await page.waitForTimeout(200);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(200);
}

export async function getValidationKeyState(
  page: Page,
  path: string,
): Promise<{ checked: boolean; disabled: boolean }> {
  const dropdown = await getKeyDropdown(page);
  const node = await getTreeNodeByKeyPath(page, dropdown, path);
  const checkbox = node.locator(".ant-select-tree-checkbox").first();
  const className = (await checkbox.getAttribute("class")) ?? "";
  return {
    checked: /checked/.test(className),
    disabled: /disabled/.test(className),
  };
}

export async function getValidationKeyLabels(page: Page): Promise<string[]> {
  const dropdown = await getKeyDropdown(page);
  return dropdown
    .locator(".ant-select-tree-title, .ant-select-tree-node-content-wrapper")
    .evaluateAll((nodes) => [
      ...new Set(
        nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
      ),
    ]);
}

export async function getSelectedValidationKeyTexts(
  ruleForm: Locator,
): Promise<string[]> {
  return ruleForm
    .locator(".rule__function-list__item")
    .first()
    .locator(".ant-tag, .ant-select-selection-item")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
    );
}

export async function openValueFormatPreview(
  page: Page,
  ruleForm: Locator,
): Promise<Locator> {
  await ruleForm.getByRole("button", { name: "value格式预览" }).click();
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal).toBeVisible({ timeout: 10000 });
  return modal;
}

export async function hoverJsonFormatHelpIcon(
  page: Page,
  ruleForm: Locator,
): Promise<Locator> {
  const icon = ruleForm
    .locator(".rule__function-list__item")
    .first()
    .locator(".anticon-question-circle")
    .last();
  await expect(icon).toBeVisible({ timeout: 5000 });
  await icon.hover();
  const tooltip = page
    .locator(".ant-tooltip:visible, .ant-popover:visible")
    .last();
  await expect(tooltip).toBeVisible({ timeout: 10000 });
  return tooltip;
}

export async function addJsonFormatRule(
  page: Page,
  packageName: string,
  options: {
    field: string;
    selectedKeyPaths?: readonly string[];
    ruleStrength?: "强规则" | "弱规则";
  },
): Promise<Locator> {
  const ruleForm = await addRuleToPackage(page, packageName, "有效性校验");
  await selectRuleFieldAndFunction(
    page,
    ruleForm,
    options.field,
    "格式-json格式校验",
  );
  await page.waitForTimeout(500);

  if (options.selectedKeyPaths?.length) {
    await selectValidationKeyPaths(page, ruleForm, options.selectedKeyPaths);
  }

  if (options.ruleStrength) {
    const strengthSelect = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .locator(".ant-select")
      .first();
    await selectAntOption(page, strengthSelect, options.ruleStrength);
  }

  return ruleForm;
}

export async function ensureSavedScenarioRuleSet(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<void> {
  const cacheKey = `${getCurrentDatasource().cacheKey}:${scenario.tableName}:${scenario.packageName}`;
  if (preparedRuleSets.has(cacheKey)) {
    return;
  }

  await prepareJsonRuleSetDraft(
    page,
    scenario.tableName,
    scenario.packageName,
    scenario.keyPresets,
  );
  await addJsonFormatRule(page, scenario.packageName, {
    field: scenario.field,
    selectedKeyPaths: scenario.selectedKeyPaths,
    ruleStrength: scenario.ruleStrength,
  });
  await saveRuleSet(page);
  preparedRuleSets.add(cacheKey);
}

export async function openScenarioRuleSetPackage(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<Locator> {
  await gotoRuleSetList(page);
  await openRuleSetEditor(page, scenario.tableName, [scenario.packageName]);
  return getRulePackage(page, scenario.packageName);
}

export async function getStatisticsOptionsForField(
  page: Page,
  ruleForm: Locator,
  field: string,
): Promise<string[]> {
  await selectRuleFieldAndFunction(page, ruleForm, field, "非空值数");
  const functionSelect = ruleForm
    .locator(".rule__function-list__item")
    .first()
    .locator(".ant-select")
    .first();
  return getSelectOptions(page, functionSelect);
}

export async function gotoRuleBaseAndSearch(
  page: Page,
  keyword: string,
): Promise<void> {
  await gotoRuleBase(page);
  const searchBox = page.getByPlaceholder("请输入规则名称进行搜索");
  await searchBox.fill(keyword);
  await page.getByRole("button", { name: "search" }).click();
  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => undefined);
  await page.waitForTimeout(500);
}

export async function gotoRuleSetEditorByTable(
  page: Page,
  tableName: string,
  packageName: string,
): Promise<Locator> {
  await gotoRuleSetList(page);
  await openRuleSetEditor(page, tableName, [packageName]);
  return getRulePackage(page, packageName);
}
