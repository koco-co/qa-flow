/**
 * key 值范围校验 — 规则编辑辅助函数
 *
 * 为「完整性-json中key值范围校验（KEY_SCOPE_VERIFICATION = '46'）」
 * 测试用例提供独立的 helper，不依赖其他 rule-editor-helpers.ts。
 *
 * UI 结构说明：
 *   - 统计函数：在规则表单中选择"完整性校验"规则后，选择"key范围校验"
 *   - 选择字段后，字段选择器变为单选（单字段约束）
 *   - 校验方法：包含 / 不包含（IntegrityJsonKeyVerifyType 组件，Ant Design Select）
 *   - 校验内容：TreeSelect（JsonFormatConfiguration 组件），从 JSON key 树中勾选 keys
 */

import { expect, type Locator, type Page } from "@playwright/test";

import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  confirmAntModal,
  selectAntOption,
} from "../../helpers/test-setup";
import {
  DORIS_DATABASE,
  DORIS_DATASOURCE_KEYWORD,
  SPARKTHRIFT_DATABASE,
  SPARKTHRIFT_DATASOURCE_KEYWORD,
  injectProjectContext,
  QUALITY_PROJECT_ID,
} from "./data-15693";

// ── 类型定义 ──────────────────────────────────────────────────

export interface KeyRangeRuleConfig {
  /** 要校验的字段名（单选） */
  field: string;
  /** 校验方法：包含 / 不包含 */
  method: "包含" | "不包含";
  /**
   * 要选择的 JSON key 名称列表（在 TreeSelect 中勾选）
   * 传 "全部" 时尝试勾选全部根节点
   */
  keyNames: string[] | "全部";
  /** 规则强弱，默认"强规则" */
  ruleStrength?: "强规则" | "弱规则";
  /** 规则描述（可选） */
  description?: string;
}

export interface MonitorDatasourceConfig {
  keyword: RegExp;
  database: string;
  label: string;
}

// ── 内部工具 ──────────────────────────────────────────────────

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

/** 关闭引导弹窗（"知道了" 按钮） */
async function dismissIntroDialog(page: Page): Promise<void> {
  const knowBtn = page.getByRole("button", { name: "知道了" });
  if (await knowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await knowBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * 带重试的 selectAntOption（处理下拉选项加载缓慢的情况）
 */
async function selectAntOptionWithRetry(
  page: Page,
  triggerLocator: Locator,
  optionText: string | RegExp,
  attempts = 5,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await selectAntOption(page, triggerLocator, optionText);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(message);
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }

  if (lastError) {
    throw lastError;
  }
}

/**
 * 通过 page.evaluate 发送带项目头的 POST 请求
 */
async function postProjectApi<T>(
  page: Page,
  path: string,
  body: unknown,
): Promise<T> {
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

/**
 * 确认目标数据源已授权到质量项目；若未授权则执行授权。
 * 返回 true 表示执行了新的授权（调用方可能需要 reload）。
 */
async function ensureMonitorDatasource(
  page: Page,
  datasource: MonitorDatasourceConfig,
): Promise<boolean> {
  type MonitorListResponse = {
    data?: Array<{
      id?: string;
      dataSourceName?: string;
      dtCenterSourceName?: string;
    }>;
  };

  const listMonitorDatasources = () =>
    postProjectApi<MonitorListResponse>(
      page,
      "/dmetadata/v1/dataSource/monitor/list",
      {},
    );

  const findDatasource = async () => {
    const response = await listMonitorDatasources();
    return (response.data ?? []).find((item) =>
      datasource.keyword.test(
        `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
      ),
    );
  };

  if (await findDatasource()) {
    return false;
  }

  const allDatasources = await postProjectApi<{
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
    projectList: [QUALITY_PROJECT_ID],
  });

  if (!authResponse.success) {
    throw new Error(
      authResponse.message ??
        `Authorize ${datasource.label} datasource to project failed.`,
    );
  }

  await expect
    .poll(async () => Boolean(await findDatasource()), {
      timeout: 15000,
      message: `Waiting for ${datasource.label} datasource to appear in monitor datasource list.`,
    })
    .toBe(true);

  return true;
}

// ── 导航函数 ──────────────────────────────────────────────────

/**
 * 导航到规则集列表页（含 cookie 注入 + 项目上下文注入）
 */
export async function gotoRuleSetList(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await dismissIntroDialog(page);
}

/**
 * 导航到新建规则集页面（含 cookie 注入 + 项目上下文注入）
 */
export async function gotoRuleSetCreate(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", QUALITY_PROJECT_ID));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, QUALITY_PROJECT_ID);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await dismissIntroDialog(page);
}

// ── 规则集创建 & 存在性保证 ───────────────────────────────────

/**
 * 通过 API 查询并删除指定表的全部规则集（测试前清理）
 */
export async function deleteRuleSetsByTableName(
  page: Page,
  tableName: string,
): Promise<void> {
  const listResponse = await postProjectApi<{
    data?: {
      contentList?: Array<{ id?: number | string; tableName?: string }>;
    };
  }>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
    current: 1,
    size: 50,
    search: tableName,
  });

  const rows = (listResponse.data?.contentList ?? []).filter(
    (item) => String(item.tableName ?? "") === tableName,
  );

  for (const row of rows) {
    if (!row.id) continue;
    await postProjectApi(page, "/dassets/v1/valid/monitorRuleSet/delete", {
      id: Number(row.id),
    });
  }
}

/**
 * 在 Step1（基础信息）中确保规则包名已填入表格
 */
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
    if (currentValues.includes(packageName)) continue;

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
          const vals = (await getPackageNameValues()).filter(Boolean);
          return requiredPackageNames.every((n) => vals.includes(n));
        },
        { timeout: 10000 },
      )
      .toBe(true);
  }
}

/**
 * 切换到 Step2（监控规则）
 */
async function gotoMonitorRulesStep(page: Page): Promise<void> {
  const newPackageBtn = page
    .getByRole("button", { name: /新增规则包/ })
    .first();
  const firstPackage = page.locator(".ruleSetMonitor__package").first();

  const isStep2Visible = async () =>
    (await firstPackage.isVisible().catch(() => false)) ||
    (await newPackageBtn.isVisible().catch(() => false));

  if (await isStep2Visible()) return;

  const nextBtn = page.getByRole("button", { name: "下一步" }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(1000);
  }

  if (await isStep2Visible()) return;

  await expect
    .poll(async () => isStep2Visible(), { timeout: 10000 })
    .toBe(true);
}

/**
 * 在 Step2 中添加规则包 slot 并选择包名
 */
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

/**
 * 确保规则包在 Step2 中可见；若不存在则先去 Step1 添加，再回来
 */
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
    if (await packageSection.isVisible().catch(() => false)) continue;

    try {
      await addPackageSlot(page, packageName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) throw error;

      // 回到 Step1 补充包名
      const prevBtn = page.getByRole("button", { name: "上一步" }).first();
      if (await prevBtn.isVisible().catch(() => false)) {
        await prevBtn.click();
        await page
          .locator('input[placeholder="请输入规则包名称"]')
          .first()
          .waitFor({ state: "visible", timeout: 10000 });
      }
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

/**
 * 创建规则集草稿：选数据源→数据库→数据表→填包名→进入 Step2
 */
export async function createRuleSetDraft(
  page: Page,
  tableName: string,
  requiredPackageNames: string[],
  datasource: MonitorDatasourceConfig = DORIS_MONITOR_DATASOURCE,
): Promise<void> {
  await gotoRuleSetCreate(page);

  const authorized = await ensureMonitorDatasource(page, datasource);
  if (authorized) {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await dismissIntroDialog(page);
  }

  // 选数据源
  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  await selectAntOptionWithRetry(
    page,
    sourceFormItem.locator(".ant-select").first(),
    datasource.keyword,
  );

  // 选数据库
  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOptionWithRetry(
    page,
    schemaFormItem.locator(".ant-select").first(),
    datasource.database,
  );
  await page.waitForTimeout(1000);

  // 选数据表（带重试）
  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  const tableSelect = tableFormItem.locator(".ant-select").first();
  let selectTableError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await selectAntOptionWithRetry(page, tableSelect, tableName, 1);
      selectTableError = null;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) throw error;
      selectTableError = error instanceof Error ? error : new Error(message);
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }
  if (selectTableError) throw selectTableError;
  await page.waitForTimeout(500);

  // 填规则包名称
  await ensurePackageNamesInBaseInfo(page, requiredPackageNames);

  // 进入监控规则 Step2
  await gotoMonitorRulesStep(page);
  await ensureRuleSetPackagesVisible(page, requiredPackageNames);
}

/**
 * 确保规则集存在（不存在则使用 createRuleSetDraft 模式创建到 Step2）
 *
 * 通过 API 检查是否已有指定表名的规则集；若已存在则打开编辑页，
 * 否则调用 createRuleSetDraft 建立草稿。
 *
 * @returns 是否为新建（true = 新建草稿，false = 已存在并打开编辑）
 */
export async function ensureRuleSetExists(
  page: Page,
  tableName: string,
  packageName: string,
  datasource: MonitorDatasourceConfig = DORIS_MONITOR_DATASOURCE,
): Promise<boolean> {
  // 先确保在列表页
  await gotoRuleSetList(page);

  const dataRows = page.locator(
    ".ant-table-tbody tr:not(.ant-table-measure-row)",
  );
  const existingRow = dataRows.filter({ hasText: tableName }).first();

  if (await existingRow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await existingRow.getByRole("button", { name: "编辑" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await gotoMonitorRulesStep(page);
    await ensureRuleSetPackagesVisible(page, [packageName]);
    return false;
  }

  // 不存在则新建
  await createRuleSetDraft(page, tableName, [packageName], datasource);
  return true;
}

// ── 规则包 & 规则表单操作 ─────────────────────────────────────

/**
 * 获取规则包容器（.ruleSetMonitor__package 筛选包名）
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

  // 若规则包已折叠，展开它
  const expandBtn = packageSection
    .getByRole("button", { name: /展开/ })
    .first();
  if (await expandBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(300);
  }

  return packageSection;
}

/**
 * 在规则包中添加规则（点击"添加规则" → 选择规则类型），
 * 返回新增的 .ruleForm Locator
 */
export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType: "完整性校验" | "有效性校验" = "完整性校验",
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

/**
 * 在规则包中添加"完整性校验"规则，并选择"key范围校验"统计函数
 * 返回配置好统计函数后的 ruleForm Locator（已定位到函数行）
 */
export async function addKeyRangeRule(
  page: Page,
  packageName: string,
): Promise<Locator> {
  const ruleForm = await addRuleToPackage(page, packageName, "完整性校验");

  // 选择统计函数：key范围校验
  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  const functionSelect = functionRow.locator(".ant-select").first();
  await functionSelect.waitFor({ state: "visible", timeout: 10000 });
  await selectAntOption(page, functionSelect, "key范围校验");
  await page.waitForTimeout(500);

  return ruleForm;
}

// ── TreeSelect 操作（JsonFormatConfiguration 组件）───────────

/**
 * 在校验内容 TreeSelect 中选择指定 key 名称列表
 *
 * 操作流程：
 *   1. 点击 TreeSelect trigger 展开下拉
 *   2. 等待下拉树出现（.ant-select-tree-list 或 .ant-tree-select-dropdown）
 *   3. 遍历 keyNames，在树节点中找到对应文本并勾选
 *   4. 点击空白处关闭下拉
 *
 * @param page         Playwright Page
 * @param ruleForm     规则表单 Locator（.ruleForm），用于定位 TreeSelect
 * @param keyNames     要选择的 key 名称列表，或 "全部" 勾选所有根节点
 */
export async function selectJsonKeys(
  page: Page,
  ruleForm: Locator,
  keyNames: string[] | "全部",
): Promise<void> {
  // 定位校验内容的 TreeSelect（JsonFormatConfiguration 组件）
  // 在 key范围校验函数行中，TreeSelect 通常紧跟在校验方法 Select 之后
  const functionRow = ruleForm.locator(".rule__function-list__item").first();

  // TreeSelect 的 trigger selector：.ant-select.ant-tree-select 或 含 treeSelect 的容器
  const treeSelectTrigger = functionRow
    .locator(".ant-select.ant-tree-select, .ant-tree-select")
    .first();

  // 若 TreeSelect 不在 functionRow，退回到整个 ruleForm 中查找
  const triggerLocator = (await treeSelectTrigger
    .isVisible({ timeout: 2000 })
    .catch(() => false))
    ? treeSelectTrigger
    : ruleForm.locator(".ant-select.ant-tree-select, .ant-tree-select").first();

  // 展开 TreeSelect 下拉
  await triggerLocator.click();
  await page.waitForTimeout(500);

  const dropdown = page
    .locator(
      ".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible .ant-select-tree-list",
    )
    .first();
  await dropdown.waitFor({ state: "visible", timeout: 10000 });

  if (keyNames === "全部") {
    // 全部：勾选根节点的全选 checkbox（通常是第一个 .ant-select-tree-checkbox）
    const rootCheckbox = dropdown.locator(".ant-select-tree-checkbox").first();
    if (await rootCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isChecked = await rootCheckbox.evaluate((el) =>
        el.classList.contains("ant-select-tree-checkbox-checked"),
      );
      if (!isChecked) {
        await rootCheckbox.click();
        await page.waitForTimeout(300);
      }
    }
  } else {
    for (const keyName of keyNames) {
      // 先在可见节点中查找；若树支持搜索，可先在 input 中输入
      const treeInput = dropdown.locator("input").first();
      const hasInput = await treeInput
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (hasInput) {
        await treeInput.fill(keyName);
        await page.waitForTimeout(400);
      }

      const treeNode = dropdown
        .locator(
          ".ant-select-tree-title, .ant-select-tree-node-content-wrapper",
        )
        .filter({ hasText: keyName })
        .first();

      if (!(await treeNode.isVisible({ timeout: 5000 }).catch(() => false))) {
        // 清空搜索，展开树节点后重试
        if (hasInput) {
          await treeInput.fill("");
          await page.waitForTimeout(300);
        }
        // 尝试展开根节点
        const expanders = dropdown.locator(".ant-select-tree-switcher").all();
        for (const expander of await expanders) {
          const isLeaf = await expander
            .evaluate((el) =>
              el.classList.contains("ant-select-tree-switcher_close"),
            )
            .catch(() => false);
          if (isLeaf) {
            await expander.click().catch(() => undefined);
            await page.waitForTimeout(200);
          }
        }
      }

      const nodeCheckbox = treeNode
        .locator(
          "xpath=ancestor::*[contains(@class,'ant-select-tree-treenode')][1]",
        )
        .locator(".ant-select-tree-checkbox")
        .first();

      if (await nodeCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        const isChecked = await nodeCheckbox.evaluate((el) =>
          el.classList.contains("ant-select-tree-checkbox-checked"),
        );
        if (!isChecked) {
          await nodeCheckbox.click();
          await page.waitForTimeout(200);
        }
      } else {
        // fallback：直接点击节点文字触发勾选
        await treeNode.click();
        await page.waitForTimeout(200);
      }

      // 若有搜索框，清空以便下一轮搜索
      if (hasInput) {
        await treeInput.fill("");
        await page.waitForTimeout(200);
      }
    }
  }

  // 关闭下拉（按 Escape 或点击空白处）
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

// ── 规则配置 ─────────────────────────────────────────────────

/**
 * 配置 key 值范围校验规则
 *
 * 操作顺序：
 *   1. 选择校验字段（单选 Select）
 *   2. 选择校验方法（包含 / 不包含）
 *   3. 选择校验内容（TreeSelect，JSON key 列表）
 *   4. 选择规则强弱（可选）
 *   5. 填写规则描述（可选）
 */
export async function configureKeyRangeRule(
  page: Page,
  ruleForm: Locator,
  config: KeyRangeRuleConfig,
): Promise<void> {
  // 1. 选择字段（key范围校验后字段变为单选）
  const fieldFormItem = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /字段/ })
    .first();
  const fieldSelect = fieldFormItem.locator(".ant-select").first();
  await selectAntOption(page, fieldSelect, config.field);
  await page.waitForTimeout(300);

  // 2. 校验方法：包含 / 不包含（IntegrityJsonKeyVerifyType 组件）
  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  // 校验方法通常是 functionRow 中第 2 个 Select（第 1 个是统计函数选择器）
  const methodSelects = functionRow.locator(
    ".ant-select:not(.ant-tree-select)",
  );
  const methodSelectCount = await methodSelects.count();
  // 跳过第 0 个（统计函数），取第 1 个（校验方法）
  const methodSelect = methodSelects.nth(methodSelectCount > 1 ? 1 : 0);
  await selectAntOption(page, methodSelect, config.method);
  await page.waitForTimeout(300);

  // 3. 校验内容（TreeSelect）
  await selectJsonKeys(page, ruleForm, config.keyNames);

  // 4. 规则强弱（可选）
  if (config.ruleStrength) {
    const strengthFormItem = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .first();
    const strengthSelect = strengthFormItem.locator(".ant-select").first();
    await selectAntOption(page, strengthSelect, config.ruleStrength);
    await page.waitForTimeout(200);
  }

  // 5. 规则描述（可选）
  if (config.description !== undefined) {
    await ruleForm
      .getByPlaceholder("请填写规则描述")
      .first()
      .fill(config.description);
    await page.waitForTimeout(200);
  }
}

// ── 保存规则集 ───────────────────────────────────────────────

/**
 * 点击保存按钮并等待保存结果（API 响应或成功 toast）
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

  // 部分场景保存前有确认弹窗
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

  // 降级：等待成功 toast 或列表行出现
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

// ── 组合函数 ─────────────────────────────────────────────────

/**
 * 在规则包中添加"完整性校验 - key范围校验"规则并完成配置
 *
 * @param page        Playwright Page
 * @param packageName 规则包名称（.ruleSetMonitor__package 中的包）
 * @param config      key 值范围校验配置
 * @returns           ruleForm Locator（已配置完成）
 */
export async function addAndConfigureKeyRangeRule(
  page: Page,
  packageName: string,
  config: KeyRangeRuleConfig,
): Promise<Locator> {
  const ruleForm = await addKeyRangeRule(page, packageName);
  await configureKeyRangeRule(page, ruleForm, config);
  return ruleForm;
}
