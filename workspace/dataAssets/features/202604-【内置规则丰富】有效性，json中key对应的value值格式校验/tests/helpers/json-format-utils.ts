/**
 * 「#15694 内置规则丰富 - 格式-json格式校验」专用辅助函数
 *
 * 功能特征（来自源码分析）：
 * - 统计函数：格式-json格式校验（FORMAT_JSON_VERIFICATION = '51'）
 * - 支持字段类型：json、string
 * - 校验key：TreeSelect（JsonFormatConfiguration component）
 *   - 只有配置了 value格式 的 key 才可被选中
 *   - 未配置 value格式 的 key 显示为 disabled
 * - 有「value格式预览」按钮（I18N key: AG）
 * - 有悬浮提示：「校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。」
 *   （I18N key: AH）
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { confirmAntModal, selectAntOption } from "../../../../shared/helpers/test-setup";
import {
  DORIS_DATABASE,
  DORIS_DATASOURCE_KEYWORD,
  SPARKTHRIFT_DATABASE,
  SPARKTHRIFT_DATASOURCE_KEYWORD,
  VALUE_FORMAT_TABLE,
  applyRuntimeCookies,
  buildDataAssetsUrl,
  injectProjectContext,
} from "../data/data-15694";
import { resolveEffectiveQualityProjectId } from "../data/test-data";

// ── 接口定义 ──────────────────────────────────────────────────────────────────

export interface JsonFormatRuleConfig {
  /** 字段名（json 或 string 类型字段） */
  field: string;
  /** 要选中的校验 key 名列表（必须是已配置 value格式 的 key） */
  keyNames: string[];
  /** 强弱规则，默认不修改 */
  ruleStrength?: "强规则" | "弱规则";
  /** 规则描述 */
  description?: string;
}

export interface MonitorDatasourceConfig {
  keyword: RegExp;
  database: string;
  label: string;
}

export const DORIS_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  keyword: new RegExp(DORIS_DATASOURCE_KEYWORD, "i"),
  database: DORIS_DATABASE,
  label: "Doris3.x",
};

export const SPARKTHRIFT_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  keyword: new RegExp(SPARKTHRIFT_DATASOURCE_KEYWORD, "i"),
  database: SPARKTHRIFT_DATABASE,
  label: "SparkThrift2.x",
};

// ── 内部工具函数 ──────────────────────────────────────────────────────────────

async function dismissIntroDialog(page: Page): Promise<void> {
  const knowBtn = page.getByRole("button", { name: "知道了" });
  if (await knowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await knowBtn.click();
    await page.waitForTimeout(500);
  }
}

async function postProjectApi<T>(
  page: Page,
  path: string,
  body: unknown,
): Promise<T> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
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
      projectId: effectiveProjectId,
    },
  ) as Promise<T>;
}

async function ensureMonitorDatasource(
  page: Page,
  datasource: MonitorDatasourceConfig,
): Promise<boolean> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const listMonitorDatasources = () =>
    postProjectApi<{
      success?: boolean;
      data?: Array<{
        id?: string;
        dataSourceName?: string;
        dtCenterSourceName?: string;
      }>;
    }>(page, "/dmetadata/v1/dataSource/monitor/list", {});

  const findMonitorDatasource = async () => {
    const response = await listMonitorDatasources();
    return (response.data ?? []).find((item) =>
      datasource.keyword.test(
        `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
      ),
    );
  };

  if (await findMonitorDatasource()) {
    return false;
  }

  const allDatasources = await postProjectApi<{
    success?: boolean;
    data?: Array<{ dataSourceId?: string; dataSourceName?: string }>;
  }>(page, "/dassets/v1/dataSource/getAllDataSourceAndDatabase", {});

  const matchedDatasource = (allDatasources.data ?? []).find((item) =>
    datasource.keyword.test(String(item.dataSourceName ?? "")),
  );

  if (!matchedDatasource?.dataSourceId) {
    throw new Error(
      `No ${datasource.label} datasource available for current quality project.`,
    );
  }

  const authResponse = await postProjectApi<{
    success?: boolean;
    message?: string;
  }>(page, "/dmetadata/v1/dataSource/authDataSourceToProject", {
    dataSourceId: Number(matchedDatasource.dataSourceId),
    projectList: [effectiveProjectId],
  });

  if (!authResponse.success) {
    throw new Error(
      authResponse.message ??
        `Authorize ${datasource.label} datasource to project failed.`,
    );
  }

  await expect
    .poll(async () => Boolean(await findMonitorDatasource()), {
      timeout: 15000,
      message: `Waiting for ${datasource.label} datasource to appear in monitor datasource list.`,
    })
    .toBe(true);

  return true;
}

async function gotoBaseInfoStep(page: Page): Promise<void> {
  const packageNameInputs = page.locator(
    'input[placeholder="请输入规则包名称"]',
  );
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
  const newPackageBtn = page
    .getByRole("button", { name: /新增规则包/ })
    .first();
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

  const monitorRulesBtn = page
    .getByRole("button", { name: /监控规则/ })
    .first();
  if (await monitorRulesBtn.isVisible().catch(() => false)) {
    await monitorRulesBtn.click();
    await page.waitForTimeout(1000);
  }

  await expect.poll(isMonitorRulesVisible, { timeout: 10000 }).toBe(true);
}

async function ensurePackageNamesInBaseInfo(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const packageNameInputs = page.locator(
    'input[placeholder="请输入规则包名称"]',
  );
  const addPackageBtn = page
    .locator(".ant-table-footer")
    .getByRole("button", { name: /新增/ })
    .first();

  await packageNameInputs.first().waitFor({ state: "visible", timeout: 10000 });

  const getPackageNameValues = async () =>
    (await packageNameInputs.evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value.trim()),
    )) as string[];

  for (const packageName of requiredPackageNames) {
    const currentValues = await getPackageNameValues();
    if (currentValues.includes(packageName)) {
      continue;
    }

    let targetIndex = currentValues.findIndex((value) => !value);
    if (targetIndex === -1) {
      const beforeCount = await packageNameInputs.count();
      await addPackageBtn.click();
      await expect(packageNameInputs).toHaveCount(beforeCount + 1, {
        timeout: 10000,
      });
      targetIndex = beforeCount;
    }

    const targetInput = packageNameInputs.nth(targetIndex);
    await targetInput.fill(packageName);
    await targetInput.press("Tab");
    await expect(targetInput).toHaveValue(packageName);
  }

  if (requiredPackageNames.length > 0) {
    await expect
      .poll(
        async () => {
          const currentPackageNames = (await getPackageNameValues()).filter(
            Boolean,
          );
          return requiredPackageNames.every((pkg) =>
            currentPackageNames.includes(pkg),
          );
        },
        { timeout: 10000 },
      )
      .toBe(true);
  }
}

async function addPackageSlot(page: Page, packageName: string): Promise<void> {
  await page
    .getByRole("button", { name: /新增规则包/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const packageSection = page.locator(".ruleSetMonitor__package").last();
  const packageSelect = packageSection
    .locator(".ruleSetMonitor__packageSelect")
    .first();
  await packageSelect.waitFor({ state: "visible", timeout: 10000 });

  try {
    await selectAntOption(page, packageSelect, packageName);
  } catch (error) {
    await page.keyboard.press("Escape").catch(() => undefined);

    const deleteBtn = packageSection
      .locator(".ruleSetMonitor__packageDeleteBtn")
      .first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await confirmAntModal(page);
      await page.waitForTimeout(300);
    }

    throw error;
  }

  await page.waitForTimeout(300);
}

async function ensureRuleSetPackagesVisible(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const newPackageBtn = page
    .getByRole("button", { name: /新增规则包/ })
    .first();
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

    try {
      await addPackageSlot(page, packageName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) {
        throw error;
      }

      await gotoBaseInfoStep(page);
      await ensurePackageNamesInBaseInfo(page, [packageName]);
      await gotoMonitorRulesStep(page);
      await addPackageSlot(page, packageName);
    }

    await expect(
      page
        .locator(".ruleSetMonitor__package")
        .filter({ hasText: packageName })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  }
}

// ── 导出：导航函数 ──────────────────────────────────────────────────────────────

/**
 * 导航到规则集列表页（含 cookie 注入与项目上下文初始化）。
 */
export async function gotoRuleSetList(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet", effectiveProjectId));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, effectiveProjectId);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await dismissIntroDialog(page);
}

/**
 * 导航到新建规则集页面（含 cookie 注入与项目上下文初始化）。
 */
export async function gotoRuleSetCreate(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", effectiveProjectId));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, effectiveProjectId);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await dismissIntroDialog(page);
}

// ── 导出：规则集创建 ──────────────────────────────────────────────────────────

/**
 * 创建规则集草稿：填写基础信息（数据源、数据库、数据表、规则包名），并进入监控规则步骤。
 *
 * @param tableName      - 选择的数据表名，默认使用 VALUE_FORMAT_TABLE
 * @param packageNames   - 规则包名称列表
 */
export async function createRuleSetDraft(
  page: Page,
  tableName: string = VALUE_FORMAT_TABLE,
  packageNames: string[],
  datasource: MonitorDatasourceConfig = SPARKTHRIFT_MONITOR_DATASOURCE,
): Promise<void> {
  await gotoRuleSetCreate(page);

  if (await ensureMonitorDatasource(page, datasource)) {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await dismissIntroDialog(page);
  }

  // 选择数据源
  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  await selectAntOption(
    page,
    sourceFormItem.locator(".ant-select").first(),
    datasource.keyword,
  );
  await page.waitForTimeout(500);

  // 选择数据库
  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOption(
    page,
    schemaFormItem.locator(".ant-select").first(),
    datasource.database,
  );
  await page.waitForTimeout(1000);

  // 选择数据表
  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  let selectTableError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await selectAntOption(
        page,
        tableFormItem.locator(".ant-select").first(),
        tableName,
      );
      selectTableError = null;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) {
        throw error;
      }
      selectTableError = error instanceof Error ? error : new Error(message);
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }
  if (selectTableError) {
    throw selectTableError;
  }
  await page.waitForTimeout(500);

  // 填写规则包名
  await ensurePackageNamesInBaseInfo(page, packageNames);

  // 进入监控规则步骤
  await gotoMonitorRulesStep(page);
  await ensureRuleSetPackagesVisible(page, packageNames);
}

/**
 * 确保规则集存在（列表中存在目标表名对应的规则集）。
 * 若不存在则调用 createRuleSetDraft 创建一个草稿并保存。
 *
 * @param tableName   - 数据表名
 * @param packageName - 规则包名
 */
export async function ensureRuleSetExists(
  page: Page,
  tableName: string,
  packageName: string,
  datasource: MonitorDatasourceConfig = SPARKTHRIFT_MONITOR_DATASOURCE,
): Promise<void> {
  await gotoRuleSetList(page);

  const dataRows = page.locator(
    ".ant-table-tbody tr:not(.ant-table-measure-row)",
  );
  const targetRow = dataRows.filter({ hasText: tableName }).first();

  if (await targetRow.isVisible({ timeout: 5000 }).catch(() => false)) {
    return;
  }

  await createRuleSetDraft(page, tableName, [packageName], datasource);
  await saveRuleSet(page);
}

// ── 导出：规则包操作 ──────────────────────────────────────────────────────────

/**
 * 获取规则包容器 Locator（展开折叠面板后返回）。
 *
 * @param packageName - 规则包名称
 */
export async function getRulePackageSection(
  page: Page,
  packageName: string,
): Promise<Locator> {
  const packageSection = page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first();

  await expect(packageSection).toBeVisible({ timeout: 10000 });

  const expandBtn = packageSection
    .getByRole("button", { name: /展开/ })
    .first();
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(300);
  }

  return packageSection;
}

/**
 * 在指定规则包中添加一条规则，返回新增的规则表单 Locator。
 *
 * @param packageName - 规则包名称
 * @param ruleType    - 规则类型菜单项文本，默认 "有效性校验"
 */
export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType = "有效性校验",
): Promise<Locator> {
  const packageSection = await getRulePackageSection(page, packageName);
  const ruleForms = packageSection.locator(".ruleForm");
  const beforeCount = await ruleForms.count();

  await packageSection
    .getByRole("button", { name: /添加规则/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const ruleTypeMenu = page.locator(
    ".ant-dropdown:visible, .ant-dropdown-menu:visible",
  );
  await ruleTypeMenu.first().waitFor({ state: "visible", timeout: 10000 });
  await ruleTypeMenu.getByText(ruleType, { exact: false }).first().click();

  await expect(ruleForms).toHaveCount(beforeCount + 1, { timeout: 10000 });
  return ruleForms.nth(beforeCount);
}

// ── 导出：json格式校验规则配置 ─────────────────────────────────────────────────

/**
 * 在规则包中添加「有效性校验」规则，并选择「格式-json格式校验」统计函数。
 * 返回新增的规则表单 Locator。
 *
 * @param packageName - 规则包名称
 */
export async function addJsonFormatRule(
  page: Page,
  packageName: string,
): Promise<Locator> {
  const ruleForm = await addRuleToPackage(page, packageName, "有效性校验");

  // 等待字段选择器渲染
  const fieldFormItem = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /字段/ })
    .first();
  await fieldFormItem.waitFor({ state: "visible", timeout: 10000 });

  return ruleForm;
}

/**
 * 在校验key TreeSelect 中选择指定 key 名。
 *
 * 注意：
 * - 只有已配置 value格式 的 key 才可被点击，disabled 项点击无效。
 * - 若 keyName 对应的节点不可见，函数将抛出错误。
 *
 * @param ruleForm  - 规则表单 Locator
 * @param keyNames  - 要选中的 key 名列表
 */
export async function selectJsonFormatKeys(
  page: Page,
  ruleForm: Locator,
  keyNames: string[],
): Promise<void> {
  // 校验key 使用 TreeSelect，class 为 ant-select / ant-tree-select
  // TODO: 需通过 playwright-cli snapshot 确认 TreeSelect 容器的实际选择器
  const keySelectTrigger = ruleForm
    .locator(".ant-tree-select, .ant-select")
    .filter({ hasText: /校验\s*key|请选择/ })
    .first();

  if (
    !(await keySelectTrigger.isVisible({ timeout: 5000 }).catch(() => false))
  ) {
    // fallback: 直接找到规则函数行内的第二个 ant-select（字段之后）
    const functionRow = ruleForm.locator(".rule__function-list__item").first();
    const treeSelect = functionRow
      .locator(".ant-tree-select, .ant-select")
      .first();
    await treeSelect.locator(".ant-select-selector").click();
  } else {
    await keySelectTrigger.locator(".ant-select-selector").click();
  }

  await page.waitForTimeout(500);

  // 等待 TreeSelect 弹出层
  const treeDropdown = page
    .locator(".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible")
    .last();
  await treeDropdown.waitFor({ state: "visible", timeout: 10000 });

  const expandTreeNodes = async (): Promise<void> => {
    for (let round = 0; round < 5; round += 1) {
      const switchers = treeDropdown.locator(
        ".ant-select-tree-switcher, .ant-tree-switcher",
      );
      const count = await switchers.count().catch(() => 0);
      let expanded = false;

      for (let index = 0; index < count; index += 1) {
        const switcher = switchers.nth(index);
        const className = (await switcher.getAttribute("class")) ?? "";
        if (/open|noop/.test(className)) {
          continue;
        }
        await switcher.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(150);
        expanded = true;
      }

      if (!expanded) {
        break;
      }
    }
  };

  await expandTreeNodes();

  for (const keyName of keyNames) {
    const keyNode = treeDropdown
      .locator(".ant-select-tree-treenode, .ant-tree-treenode")
      .filter({ hasText: keyName })
      .first();

    await keyNode.waitFor({ state: "visible", timeout: 5000 });

    // 检查是否为 disabled 状态
    const isDisabled = await keyNode
      .evaluate((el) =>
        el.classList.contains("ant-select-tree-treenode-disabled") ||
        el.classList.contains("ant-tree-treenode-disabled"),
      )
      .catch(() => false);

    if (isDisabled) {
      throw new Error(
        `校验key "${keyName}" 未配置 value格式，无法选中（显示为 disabled）。请先在通用配置模块维护该 key 的 value格式。`,
      );
    }

    await keyNode
      .locator(".ant-select-tree-node-content-wrapper, .ant-tree-node-content-wrapper")
      .first()
      .click();
    await page.waitForTimeout(200);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

/**
 * 点击规则表单中的「value格式预览」按钮。
 *
 * @param ruleForm - 规则表单 Locator
 */
export async function clickValuePreview(
  page: Page,
  ruleForm: Locator,
): Promise<void> {
  const previewBtn = ruleForm
    .getByRole("button", { name: "value格式预览" })
    .first();
  await expect(previewBtn).toBeVisible({ timeout: 5000 });
  await previewBtn.click();
  await page.waitForTimeout(500);
}

/**
 * 完整配置一条「格式-json格式校验」规则：
 *   1. 选择字段（json 或 string 类型）
 *   2. 选择统计函数「格式-json格式校验」
 *   3. 在 TreeSelect 中选择校验 key
 *   4. 可选：配置强弱规则
 *   5. 可选：填写规则描述
 *
 * @param ruleForm - 规则表单 Locator（由 addRuleToPackage / addJsonFormatRule 返回）
 * @param config   - 规则配置对象
 */
export async function configureJsonFormatRule(
  page: Page,
  ruleForm: Locator,
  config: JsonFormatRuleConfig,
): Promise<void> {
  // 1. 选择字段
  const fieldSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /字段/ })
    .locator(".ant-select")
    .first();
  await selectAntOption(page, fieldSelect, config.field);
  await page.waitForTimeout(300);

  // 2. 选择统计函数「格式-json格式校验」
  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  const functionSelect = functionRow.locator(".ant-select").first();
  await selectAntOption(page, functionSelect, "格式-json格式校验");
  await page.waitForTimeout(500);

  // 3. 选择校验 key
  await selectJsonFormatKeys(page, ruleForm, config.keyNames);

  // 4. 配置强弱规则（可选）
  if (config.ruleStrength) {
    const strengthSelect = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .locator(".ant-select")
      .first();
    await selectAntOption(page, strengthSelect, config.ruleStrength);
    await page.waitForTimeout(200);
  }

  // 5. 填写规则描述（可选）
  if (config.description !== undefined) {
    await ruleForm
      .getByPlaceholder("请填写规则描述")
      .first()
      .fill(config.description);
    await page.waitForTimeout(200);
  }
}

// ── 导出：保存规则集 ──────────────────────────────────────────────────────────

/**
 * 点击「保存」按钮并等待保存成功（监听 API 响应或成功 Toast）。
 */
export async function saveRuleSet(page: Page): Promise<void> {
  const saveResponsePromise = page
    .waitForResponse(
      (response) => {
        const request = response.request();
        return (
          request.method() === "POST" &&
          /\/dassets\/v1\/valid\/monitorRuleSet\/(add|edit)/.test(
            response.url(),
          )
        );
      },
      { timeout: 15000 },
    )
    .catch(() => null);

  await page.getByRole("button", { name: /保\s*存/ }).click();

  const confirmSaveBtn = page
    .locator(
      ".ant-modal-confirm:visible .ant-btn-primary, .ant-modal:visible .ant-btn-primary",
    )
    .filter({ hasText: /保\s*存/ })
    .first();
  await confirmSaveBtn
    .waitFor({ state: "visible", timeout: 3000 })
    .catch(() => undefined);
  if (await confirmSaveBtn.isVisible().catch(() => false)) {
    await confirmSaveBtn.click();
  }

  const saveResponse = await saveResponsePromise;
  if (saveResponse) {
    const responseBody = await saveResponse.json().catch(() => null);
    const saveSucceeded =
      saveResponse.ok() &&
      (!responseBody ||
        typeof responseBody !== "object" ||
        responseBody.success !== false);

    if (!saveSucceeded) {
      const errorMessage =
        responseBody &&
        typeof responseBody === "object" &&
        "message" in responseBody
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
  const listRow = page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .first();

  await Promise.any([
    successToast.waitFor({ state: "visible", timeout: 15000 }),
    listRow.waitFor({ state: "visible", timeout: 15000 }),
  ]);
  await page.waitForTimeout(1000);
}
