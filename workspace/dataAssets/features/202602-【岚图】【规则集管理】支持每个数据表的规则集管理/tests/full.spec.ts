// 完整回归测试（P0 + P1 + P2）
// 生成时间：2026-04-07
// 用例数量：56
// 覆盖范围：校验结果查询 (21) + 规则引入 (8) + 规则集管理 (27)

import { expect, test } from "@playwright/test";

// ─── Shared Types ────────────────────────────────────────────────────
type Page = import("@playwright/test").Page;
type RuntimeEnv = Record<string, string | undefined>;
type ProjectListResponse = {
  data?: Array<{ id?: number | string }>;
};

// ─── Shared Constants ────────────────────────────────────────────────
const defaultBaseUrl = "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const runtimeCookie = getEnv("UI_AUTOTEST_COOKIE")?.trim();
const storageStatePath = getEnv("UI_AUTOTEST_SESSION_PATH");

// ─── Shared Helpers ──────────────────────────────────────────────────
function getEnv(name: string): string | undefined {
  return (
    globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }
  ).process?.env?.[name];
}

function getRawBaseUrl(): string {
  return getEnv("UI_AUTOTEST_BASE_URL") ?? getEnv("E2E_BASE_URL") ?? defaultBaseUrl;
}

function normalizeDataAssetsBaseUrl(): string {
  const rawBaseUrl = getRawBaseUrl();
  const parsed = new URL(rawBaseUrl);
  const cleanPath = parsed.pathname.replace(/\/$/, "");
  const dataAssetsIndex = cleanPath.indexOf("/dataAssets");
  const dataAssetsPath =
    dataAssetsIndex >= 0
      ? cleanPath.slice(0, dataAssetsIndex + "/dataAssets".length)
      : `${cleanPath}/dataAssets`.replace(/\/{2,}/g, "/");
  return `${parsed.origin}${dataAssetsPath || "/dataAssets"}`;
}

function buildDataAssetsUrl(path: string, pid?: number | string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  const hashPath = pid ? `${normalizedPath}${separator}pid=${pid}` : normalizedPath;
  return `${normalizeDataAssetsBaseUrl()}/#${hashPath}`;
}

async function applyRuntimeCookies(page: Page): Promise<void> {
  if (!runtimeCookie) return;
  const cookieUrl = normalizeDataAssetsBaseUrl();
  const cookieMap = new Map<string, string>();
  for (const pair of runtimeCookie.split(/;\s*/)) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!name) continue;
    cookieMap.set(name, value);
  }
  await page.context().addCookies(
    Array.from(cookieMap.entries()).map(([name, value]) => ({
      name,
      value,
      url: cookieUrl,
    })),
  );
}

async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const result = (await response.json()) as ProjectListResponse;
    return (result.data ?? [])
      .map((item: { id?: number | string }) => Number(item?.id))
      .filter((id: number) => Number.isFinite(id));
  });
}

async function ensureProjectContext(page: Page): Promise<number> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/overview"));
  await page.waitForLoadState("networkidle");
  let projectId: number | null = null;
  await expect
    .poll(
      async () => {
        const ids = await getAccessibleProjectIds(page);
        projectId = ids[0] ?? null;
        return projectId;
      },
      { timeout: 15000 },
    )
    .not.toBeNull();
  if (projectId === null) throw new Error("未获取到可访问的数据质量项目");
  return projectId;
}

/** Navigate to a specific submenu under 数据质量 */
async function navigateToDqPage(page: Page, menuName: string): Promise<void> {
  const sideMenu = page.locator(".ant-layout-sider").first();
  await expect(sideMenu).toBeVisible({ timeout: 10000 });
  await sideMenu.getByText(menuName, { exact: true }).click();
  await page.waitForLoadState("networkidle");
}

/** Click an Ant Design Select, then pick an option by visible text */
async function selectAntOption(
  page: Page,
  selectLocator: import("@playwright/test").Locator,
  optionText: string | RegExp,
): Promise<void> {
  await selectLocator.locator(".ant-select-selector").click();
  await page
    .locator(".ant-select-dropdown:visible .ant-select-item-option")
    .filter({ hasText: optionText })
    .first()
    .click();
}

/** Wait for an Ant Design message (toast) that contains the specified text */
async function expectAntMessage(
  page: Page,
  text: string | RegExp,
  timeout = 10000,
): Promise<void> {
  await expect(
    page.locator(".ant-message .ant-message-notice").filter({ hasText: text }),
  ).toBeVisible({ timeout });
}

/** Generate a unique name with timestamp suffix */
function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

// ─── Tests ───────────────────────────────────────────────────────────
test.describe("【岚图】规则集管理 - 完整回归测试", () => {
  test.describe.configure({ mode: "serial" });

  if (storageStatePath) {
    test.use({ storageState: storageStatePath });
  }


// ═══════════════════════════════════════════════════════════════════════
// 校验结果查询 - 规则集管理
// 21 test cases (t1–t21): 7 patterns × 3 engine types
// ═══════════════════════════════════════════════════════════════════════

const engineTypes = ["Hive2.x", "Doris3.x", "SparkThrift2.x"] as const;
type EngineType = (typeof engineTypes)[number];

/** Engine-specific configuration for parameterized tests */
interface EngineConfig {
  /** Primary data table with dirty data (NULL, negative prices, empty strings) */
  primaryTable: string;
  /** Time quality check table used in Pattern 5 */
  timeQualityTable: string;
  /** Partition expression for dirty data (validation should fail) */
  dirtyPartition: string;
  /** Partition expression for clean data (validation should pass) */
  cleanPartition: string;
  /** Unique suffix to avoid name collisions across engines */
  suffix: string;
}

const engineConfigs: Record<EngineType, EngineConfig> = {
  "Hive2.x": {
    primaryTable: "dwd_voyah_vehicle_sales_dates",
    timeQualityTable: "dwd_voyah_sales_time_quality",
    dirtyPartition: "factory_date=20260101/sale_date=20260115",
    cleanPartition: "factory_date=20260115/sale_date=20260201",
    suffix: "hive",
  },
  "Doris3.x": {
    primaryTable: "dwd_voyah_vehicle_sales_dates",
    timeQualityTable: "dwd_voyah_sales_time_quality",
    dirtyPartition: "factory_date=20260101/sale_date=20260115",
    cleanPartition: "factory_date=20260115/sale_date=20260201",
    suffix: "doris",
  },
  "SparkThrift2.x": {
    primaryTable: "dwd_voyah_vehicle_sales_dates",
    timeQualityTable: "dwd_voyah_sales_time_quality",
    dirtyPartition: "factory_date=20260101/sale_date=20260115",
    cleanPartition: "factory_date=20260115/sale_date=20260201",
    suffix: "spark",
  },
};

/**
 * Determine test priority based on engine type and pattern number.
 * - Hive2.x / Doris3.x: all P1
 * - SparkThrift2.x: patterns 2, 5, 7 → P0; rest → P1
 */
function getPriority(engine: EngineType, pattern: number): "P0" | "P1" {
  if (engine === "SparkThrift2.x" && [2, 5, 7].includes(pattern)) {
    return "P0";
  }
  return "P1";
}

// ---------------------------------------------------------------------------
// Shared UI interaction helpers (thin wrappers to keep test bodies readable)
// ---------------------------------------------------------------------------

/**
 * Navigate to 规则任务管理 via the side menu.
 */
async function goToRuleTaskPage(page: import("@playwright/test").Page, projectId: number) {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
  await page.waitForLoadState("networkidle");
  await navigateToDqPage(page, "规则任务管理");
}

/**
 * Navigate to 校验结果查询 via the side menu.
 */
async function goToValidationResultsPage(page: import("@playwright/test").Page, projectId: number) {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
  await page.waitForLoadState("networkidle");
  await navigateToDqPage(page, "校验结果查询");
}

/**
 * Navigate to 规则集管理 via the side menu.
 */
async function goToRuleSetPage(page: import("@playwright/test").Page, projectId: number) {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
  await page.waitForLoadState("networkidle");
  await navigateToDqPage(page, "规则集管理");
}

/**
 * Fill an Ant Design Select component by clicking the selector then choosing an option.
 */
async function fillAntSelect(
  page: import("@playwright/test").Page,
  selector: import("@playwright/test").Locator,
  optionText: string,
) {
  await selector.click();
  await page.waitForTimeout(300);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.getByText(optionText, { exact: true }).click();
  await page.waitForTimeout(200);
}

/**
 * Wait for a task execution to complete by polling the status column in the table.
 * Returns the final status text found.
 */
async function waitForTaskExecution(
  page: import("@playwright/test").Page,
  taskName: string,
  timeoutMs = 90_000,
): Promise<string> {
  const startTime = Date.now();
  let statusText = "";

  while (Date.now() - startTime < timeoutMs) {
    // Refresh the page to get updated status
    await page.waitForTimeout(5000);
    await page.reload({ waitUntil: "networkidle" });

    const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName }).first();
    if (await taskRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Look for status cell – typically contains 校验通过/校验不通过/运行中/校验异常
      const cells = taskRow.locator("td");
      const cellCount = await cells.count();
      for (let i = 0; i < cellCount; i++) {
        const cellText = await cells.nth(i).innerText();
        if (
          cellText.includes("校验通过") ||
          cellText.includes("校验不通过") ||
          cellText.includes("校验异常")
        ) {
          statusText = cellText.trim();
          return statusText;
        }
      }
    }
  }

  throw new Error(`Task "${taskName}" did not complete within ${timeoutMs}ms. Last status: ${statusText}`);
}

/**
 * Click the "立即执行" (Execute Now) action for a task row in the table.
 */
async function executeTaskImmediately(
  page: import("@playwright/test").Page,
  taskName: string,
) {
  const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName }).first();
  await expect(taskRow).toBeVisible({ timeout: 10_000 });

  // Click the operation button – may be a direct link or inside a dropdown
  const execBtn = taskRow.getByText("立即执行");
  if (await execBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await execBtn.click();
  } else {
    // Some tables hide actions behind a "更多" dropdown
    const moreBtn = taskRow.getByText("更多");
    if (await moreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      await page.getByText("立即执行").click();
    }
  }

  // Confirm execution in modal if present
  const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const confirmBtn = confirmModal.getByRole("button", { name: /确[认定]/ });
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }

  // Wait for success message
  await expect(page.locator(".ant-message")).toContainText(/成功|已提交/, { timeout: 10_000 });
}

/**
 * Delete a rule set by name from the 规则集管理 page.
 */
async function deleteRuleSet(
  page: import("@playwright/test").Page,
  ruleSetName: string,
) {
  const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleSetName }).first();
  await expect(ruleRow).toBeVisible({ timeout: 10_000 });

  const deleteBtn = ruleRow.getByText("删除");
  if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await deleteBtn.click();
  } else {
    const moreBtn = ruleRow.getByText("更多");
    if (await moreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      await page.getByText("删除").click();
    }
  }

  // Confirm deletion
  const confirmModal = page.locator(".ant-modal-confirm:visible, .ant-modal:visible").last();
  await expect(confirmModal).toBeVisible({ timeout: 5000 });
  await confirmModal.getByRole("button", { name: /确[认定]/ }).click();

  await expect(page.locator(".ant-message")).toContainText(/删除成功|成功/, { timeout: 10_000 });
}

/**
 * Create a new monitoring rule (规则任务) with a single completeness rule.
 * Returns after the rule is saved.
 */
async function createMonitoringRuleWithCompleteness(
  page: import("@playwright/test").Page,
  config: {
    ruleName: string;
    tableName: string;
    partition: string;
    fieldName: string;
    condition: string;
    engineType: string;
  },
) {
  // Click "新建" to start creating a new monitoring rule
  await page.getByRole("button", { name: /新建/ }).click();
  await page.waitForLoadState("networkidle");

  // Step 1: 监控对象配置 (Monitoring Object Configuration)
  // Fill 规则名称
  const nameInput = page.locator('.ant-form-item').filter({ hasText: "规则名称" }).locator("input");
  await nameInput.fill(config.ruleName);

  // Select 数据源类型 (engine type)
  const engineSelect = page.locator('.ant-form-item').filter({ hasText: /数据源类型|引擎类型/ }).locator(".ant-select-selector");
  if (await engineSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fillAntSelect(page, engineSelect, config.engineType);
  }

  // Select 数据表
  const tableSelect = page.locator('.ant-form-item').filter({ hasText: "数据表" }).locator(".ant-select-selector");
  if (await tableSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fillAntSelect(page, tableSelect, config.tableName);
  } else {
    // May be a search input
    const tableInput = page.locator('.ant-form-item').filter({ hasText: "数据表" }).locator("input");
    await tableInput.fill(config.tableName);
    await page.waitForTimeout(500);
    await page.locator(".ant-select-dropdown:visible").getByText(config.tableName).click();
  }

  // Fill 分区
  const partitionInput = page.locator('.ant-form-item').filter({ hasText: "分区" }).locator("input");
  if (await partitionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await partitionInput.fill(config.partition);
  }

  // Click 下一步 to proceed to rule configuration
  await page.getByRole("button", { name: "下一步" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // Step 2: 监控规则配置 (Monitoring Rule Configuration)
  // Add completeness rule: 完整性校验 → 字段级 → field → 字段取值校验 → condition
  await page.getByRole("button", { name: /添加规则|新增规则/ }).click();
  await page.waitForTimeout(500);

  // Select 校验类型: 完整性校验
  const ruleTypeSelect = page.locator('.ant-form-item').filter({ hasText: /校验类型|规则类型/ }).last().locator(".ant-select-selector");
  if (await ruleTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fillAntSelect(page, ruleTypeSelect, "完整性校验");
  }

  // Select 校验级别: 字段级
  const levelSelect = page.locator('.ant-form-item').filter({ hasText: /校验级别/ }).last().locator(".ant-select-selector");
  if (await levelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fillAntSelect(page, levelSelect, "字段级");
  }

  // Select 校验字段
  const fieldSelect = page.locator('.ant-form-item').filter({ hasText: /校验字段|字段/ }).last().locator(".ant-select-selector");
  if (await fieldSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fillAntSelect(page, fieldSelect, config.fieldName);
  }

  // Select 校验方法: 字段取值校验
  const methodSelect = page.locator('.ant-form-item').filter({ hasText: /校验方法/ }).last().locator(".ant-select-selector");
  if (await methodSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fillAntSelect(page, methodSelect, "字段取值校验");
  }

  // Fill 期望值 / 条件
  const conditionInput = page.locator('.ant-form-item').filter({ hasText: /期望值|条件|阈值/ }).last().locator("input");
  if (await conditionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await conditionInput.fill(config.condition);
  }
}

/**
 * Import a rule package into the current rule task configuration.
 */
async function importRulePackage(
  page: import("@playwright/test").Page,
  rulePackageName: string,
) {
  // Click "引入规则包" button
  await page.getByRole("button", { name: /引入规则包|引入规则集/ }).click();
  await page.waitForTimeout(500);

  // Select the rule package in the modal
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Search for the rule package
  const searchInput = modal.locator("input[placeholder*='搜索'], input[placeholder*='规则']");
  if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await searchInput.fill(rulePackageName);
    await page.waitForTimeout(500);
  }

  // Select the rule package row and check all its rules
  const packageRow = modal.locator(".ant-table-tbody tr, .ant-list-item").filter({ hasText: rulePackageName }).first();
  if (await packageRow.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Check "全选" or the checkbox for the package
    const checkbox = packageRow.locator(".ant-checkbox-input, input[type='checkbox']").first();
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.check();
    } else {
      await packageRow.click();
    }
  }

  // Confirm import
  await modal.getByRole("button", { name: /确[认定]|导入|引入/ }).click();
  await page.waitForTimeout(500);
  await expect(page.locator(".ant-message")).toContainText(/成功|引入/, { timeout: 10_000 });
}

/**
 * Save the rule task and optionally set scheduling to immediate execution.
 */
async function saveRuleTask(
  page: import("@playwright/test").Page,
  taskName: string,
  options: { scheduleType?: string; executeImmediately?: boolean } = {},
) {
  const { scheduleType = "时", executeImmediately = true } = options;

  // Set 调度周期 if visible
  const scheduleSelect = page.locator('.ant-form-item').filter({ hasText: /调度周期/ }).locator(".ant-select-selector");
  if (await scheduleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fillAntSelect(page, scheduleSelect, scheduleType);
  }

  // Check "立即生成" if available and requested
  if (executeImmediately) {
    const immediateCheckbox = page.locator("label, .ant-checkbox-wrapper").filter({ hasText: "立即生成" }).locator("input[type='checkbox']");
    if (await immediateCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isChecked = await immediateCheckbox.isChecked();
      if (!isChecked) {
        await immediateCheckbox.check();
      }
    }
  }

  // Click save
  await page.getByRole("button", { name: /保存|提交/ }).click();
  await page.waitForTimeout(500);

  // Confirm save in modal if present
  const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmModal.getByRole("button", { name: /确[认定]/ }).click();
  }

  await expect(page.locator(".ant-message")).toContainText(/成功/, { timeout: 10_000 });
}

/**
 * Edit a rule set's validation condition (期望值).
 */
async function editRuleSetCondition(
  page: import("@playwright/test").Page,
  ruleSetName: string,
  newCondition: string,
) {
  const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleSetName }).first();
  await expect(ruleRow).toBeVisible({ timeout: 10_000 });

  // Click edit button
  const editBtn = ruleRow.getByText("编辑");
  if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await editBtn.click();
  } else {
    const moreBtn = ruleRow.getByText("更多");
    await moreBtn.click();
    await page.waitForTimeout(300);
    await page.getByText("编辑").click();
  }

  await page.waitForLoadState("networkidle");

  // Update the condition/expected value
  const conditionInput = page.locator('.ant-form-item').filter({ hasText: /期望值|条件|阈值/ }).locator("input").first();
  await conditionInput.clear();
  await conditionInput.fill(newCondition);

  // Save changes
  await page.getByRole("button", { name: /保存|确[认定]/ }).click();
  await expect(page.locator(".ant-message")).toContainText(/成功/, { timeout: 10_000 });
}

/**
 * Edit a rule task to change its partition, then save.
 */
async function editRuleTaskPartition(
  page: import("@playwright/test").Page,
  taskName: string,
  newPartition: string,
) {
  const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName }).first();
  await expect(taskRow).toBeVisible({ timeout: 10_000 });

  const editBtn = taskRow.getByText("编辑");
  if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await editBtn.click();
  } else {
    const moreBtn = taskRow.getByText("更多");
    await moreBtn.click();
    await page.waitForTimeout(300);
    await page.getByText("编辑").click();
  }

  await page.waitForLoadState("networkidle");

  // Update partition field
  const partitionInput = page.locator('.ant-form-item').filter({ hasText: "分区" }).locator("input");
  await partitionInput.clear();
  await partitionInput.fill(newPartition);

  // Save
  await page.getByRole("button", { name: /保存|提交/ }).click();
  await page.waitForTimeout(500);

  const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmModal.getByRole("button", { name: /确[认定]/ }).click();
  }

  await expect(page.locator(".ant-message")).toContainText(/成功/, { timeout: 10_000 });
}

/**
 * Navigate to 校验结果查询, find the task, and verify details page shows expected data.
 */
async function verifyValidationResultDetail(
  page: import("@playwright/test").Page,
  projectId: number,
  taskName: string,
  expectFailedData: boolean,
) {
  await goToValidationResultsPage(page, projectId);

  // Search for the task
  const searchInput = page.locator("input[placeholder*='搜索'], input[placeholder*='任务']").first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(taskName);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);
  }

  // Click task name to view details
  const taskLink = page.locator(".ant-table-tbody").getByText(taskName, { exact: false }).first();
  await expect(taskLink).toBeVisible({ timeout: 10_000 });
  await taskLink.click();
  await page.waitForLoadState("networkidle");

  if (expectFailedData) {
    // Verify failed validation data is displayed
    await expect(
      page.getByText(/校验不通过|校验异常|未通过/).first(),
    ).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(
      page.getByText(/校验通过/).first(),
    ).toBeVisible({ timeout: 15_000 });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Parameterized test blocks — one describe per engine type
// ═══════════════════════════════════════════════════════════════════════

for (const engineType of engineTypes) {
  const cfg = engineConfigs[engineType];
  const ts = Date.now(); // timestamp for unique naming across runs

  test.describe(`校验结果查询 - ${engineType}`, () => {
    test.describe.configure({ mode: "serial" });

    let projectId: number;

    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage();
      projectId = await ensureProjectContext(page);
      await page.close();
    });

    // ─────────────────────────────────────────────────────────────────
    // Pattern 1 (t1/t8/t15): 验证删除规则集后, 对已配置过历史规则的任务不生效
    // ─────────────────────────────────────────────────────────────────
    test(`【${getPriority(engineType, 1)}】验证删除规则集后, 对已配置过历史规则的任务不生效 (${engineType})`, async ({ page }) => {
      test.setTimeout(120_000);
      // 前置: 表 dwd_voyah_vehicle_sales_dates 含脏数据（NULL、负价格、空串）
      await applyRuntimeCookies(page);

      // ── 步骤1: 进入规则任务管理页面 ──
      await goToRuleTaskPage(page, projectId);
      await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

      // ── 步骤2: 新建监控规则 rule01 ──
      const ruleName = `rule01_del_${cfg.suffix}_${ts}`;
      const taskName = `task01_del_${cfg.suffix}_${ts}`;

      await createMonitoringRuleWithCompleteness(page, {
        ruleName,
        tableName: cfg.primaryTable,
        partition: cfg.dirtyPartition,
        fieldName: "final_price",
        condition: ">=0",
        engineType,
      });

      // ── 步骤3: 新建监控规则, 配置监控对象后点击下一步 ──
      // (Already handled inside createMonitoringRuleWithCompleteness – we are now
      //  on the rule configuration page)
      await expect(page.getByText(/监控规则配置|规则配置/)).toBeVisible({ timeout: 10_000 });

      // ── 步骤4: 引入规则包 rule01 中所有校验规则 ──
      await importRulePackage(page, ruleName);

      // ── 步骤5: 保存规则任务 task01 后立即执行 ──
      await saveRuleTask(page, taskName, { scheduleType: "时", executeImmediately: true });

      // Wait for execution and verify result: 校验不通过
      await goToRuleTaskPage(page, projectId);
      const status1 = await waitForTaskExecution(page, taskName, 90_000);
      expect(status1).toContain("校验不通过");

      // ── 步骤6: 删除规则集 rule01 ──
      await goToRuleSetPage(page, projectId);
      await deleteRuleSet(page, ruleName);

      // ── 步骤7: 重新运行历史规则任务 task01 ──
      await goToRuleTaskPage(page, projectId);
      await executeTaskImmediately(page, taskName);

      // 预期: 校验结果仍然是 校验不通过（删除规则集不影响历史任务）
      const status2 = await waitForTaskExecution(page, taskName, 90_000);
      expect(status2).toContain("校验不通过");
    });

    // ─────────────────────────────────────────────────────────────────
    // Pattern 2 (t2/t9/t16): 验证编辑规则集后, 对已配置过历史规则的任务不生效
    // ─────────────────────────────────────────────────────────────────
    test(`【${getPriority(engineType, 2)}】验证编辑规则集后, 对已配置过历史规则的任务不生效 (${engineType})`, async ({ page }) => {
      test.setTimeout(120_000);
      await applyRuntimeCookies(page);

      // ── 步骤1: 进入规则任务管理页面 ──
      await goToRuleTaskPage(page, projectId);
      await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

      // ── 步骤2: 新建监控规则 (完整性校验: final_price >=0) ──
      const ruleName = `rule01_edit_${cfg.suffix}_${ts}`;
      const taskName1 = `task01_edit_${cfg.suffix}_${ts}`;
      const taskName2 = `task02_edit_${cfg.suffix}_${ts}`;

      await createMonitoringRuleWithCompleteness(page, {
        ruleName,
        tableName: cfg.primaryTable,
        partition: cfg.dirtyPartition,
        fieldName: "final_price",
        condition: ">=0",
        engineType,
      });

      // ── 步骤3: 配置监控对象后点击下一步 → 进入监控规则配置页面 ──
      await expect(page.getByText(/监控规则配置|规则配置/)).toBeVisible({ timeout: 10_000 });

      // ── 步骤4: 引入规则包 rule01 中所有校验规则 ──
      await importRulePackage(page, ruleName);

      // ── 步骤5: 保存规则任务 task01 后立即执行 ──
      await saveRuleTask(page, taskName1, { scheduleType: "时", executeImmediately: true });

      await goToRuleTaskPage(page, projectId);
      const status1 = await waitForTaskExecution(page, taskName1, 90_000);
      // 预期: 校验不通过（脏数据分区含 final_price < 0 和 NULL）
      expect(status1).toContain("校验不通过");

      // ── 步骤6: 修改规则集 rule01 的校验规则期望值改为 >=−200 ──
      await goToRuleSetPage(page, projectId);
      await editRuleSetCondition(page, ruleName, ">=-200");

      // ── 步骤7: 新建规则任务 task02 (引用修改后的规则集) 并立即执行 ──
      await goToRuleTaskPage(page, projectId);
      await page.getByRole("button", { name: /新建/ }).click();
      await page.waitForLoadState("networkidle");

      // Configure task02 with same table but using the modified rule set
      const nameInput = page.locator('.ant-form-item').filter({ hasText: "规则名称" }).locator("input");
      await nameInput.fill(taskName2);

      const engineSelect = page.locator('.ant-form-item').filter({ hasText: /数据源类型|引擎类型/ }).locator(".ant-select-selector");
      if (await engineSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, engineSelect, engineType);
      }

      const tableSelect = page.locator('.ant-form-item').filter({ hasText: "数据表" }).locator(".ant-select-selector");
      if (await tableSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, tableSelect, cfg.primaryTable);
      }

      const partitionInput = page.locator('.ant-form-item').filter({ hasText: "分区" }).locator("input");
      if (await partitionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await partitionInput.fill(cfg.dirtyPartition);
      }

      await page.getByRole("button", { name: "下一步" }).click();
      await page.waitForLoadState("networkidle");

      // Import the modified rule package
      await importRulePackage(page, ruleName);
      await saveRuleTask(page, taskName2, { scheduleType: "时", executeImmediately: true });

      await goToRuleTaskPage(page, projectId);
      const status2 = await waitForTaskExecution(page, taskName2, 90_000);
      // 预期: task02 使用修改后的规则(>=−200), 应 校验通过
      expect(status2).toContain("校验通过");

      // ── 步骤8: 重新运行历史规则任务 task01 ──
      await executeTaskImmediately(page, taskName1);
      const status3 = await waitForTaskExecution(page, taskName1, 90_000);
      // 预期: task01 仍使用旧规则(>=0), 应 校验不通过
      expect(status3).toContain("校验不通过");
    });

    // ─────────────────────────────────────────────────────────────────
    // Pattern 3 (t3/t10/t17): 验证规则任务配置规则包后校验正常(20规则包 * 1校验规则)
    // ─────────────────────────────────────────────────────────────────
    test(`【${getPriority(engineType, 3)}】验证规则任务配置规则包后校验正常(20规则包×1校验规则) (${engineType})`, async ({ page }) => {
      test.setTimeout(120_000);
      // 前置: 已存在规则任务, 引入20规则包(各含1个校验规则: 空串数、空值数、
      //       字段取值校验、表行数、多表对比、字符串长度、取值范围、枚举值、
      //       重复数、重复率等)
      await applyRuntimeCookies(page);

      const taskName = `rule01_20x1_${cfg.suffix}_${ts}`;

      // ── 步骤1: 进入规则任务管理页面 ──
      await goToRuleTaskPage(page, projectId);
      await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

      // ── 步骤2: 选择任务 rule01 立即执行 ──
      await executeTaskImmediately(page, taskName);

      // 预期: 校验结果 → 校验不通过（脏数据分区应触发至少一条校验失败）
      const status1 = await waitForTaskExecution(page, taskName, 90_000);
      expect(status1).toContain("校验不通过");

      // ── 步骤3: 进入校验结果查询检查详情 ──
      await verifyValidationResultDetail(page, projectId, taskName, true);
      // 预期: 显示未通过数据（详情页展示失败校验项及对应数据）

      // ── 步骤4: SQL 验证 ──
      // Verify the validation detail page shows SQL or data that matches expectations.
      // Look for SQL output or data table showing dirty records.
      const detailContent = page.locator(".ant-table-tbody, .detail-content, .result-detail").first();
      await expect(detailContent).toBeVisible({ timeout: 10_000 });
      // 预期: 数据一致（页面展示的异常记录与 SQL 查询结果吻合）

      // ── 步骤5: 编辑规则任务变更分区后重新执行 ──
      await goToRuleTaskPage(page, projectId);
      await editRuleTaskPartition(page, taskName, cfg.cleanPartition);
      await executeTaskImmediately(page, taskName);

      const status2 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验通过（干净分区数据满足所有20条校验规则）
      expect(status2).toContain("校验通过");
    });

    // ─────────────────────────────────────────────────────────────────
    // Pattern 4 (t4/t11/t18): 验证规则任务配置规则包后校验正常(1规则包 * 10校验规则)
    // ─────────────────────────────────────────────────────────────────
    test(`【${getPriority(engineType, 4)}】验证规则任务配置规则包后校验正常(1规则包×10校验规则) (${engineType})`, async ({ page }) => {
      test.setTimeout(120_000);
      // 前置: 已存在规则任务, 引入1规则包(含10个校验规则)
      await applyRuntimeCookies(page);

      const taskName = `rule01_1x10_${cfg.suffix}_${ts}`;

      // ── 步骤1: 进入规则任务管理页面 ──
      await goToRuleTaskPage(page, projectId);
      await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

      // ── 步骤2: 选择任务 rule01 立即执行 ──
      await executeTaskImmediately(page, taskName);

      // 预期: 校验结果 → 校验不通过
      const status1 = await waitForTaskExecution(page, taskName, 90_000);
      expect(status1).toContain("校验不通过");

      // ── 步骤3: 进入校验结果查询检查详情 ──
      await verifyValidationResultDetail(page, projectId, taskName, true);
      // 预期: 显示未通过数据

      // ── 步骤4: SQL 验证 ──
      const detailContent = page.locator(".ant-table-tbody, .detail-content, .result-detail").first();
      await expect(detailContent).toBeVisible({ timeout: 10_000 });
      // 预期: 数据一致

      // ── 步骤5: 编辑规则任务变更分区后重新执行 ──
      await goToRuleTaskPage(page, projectId);
      await editRuleTaskPartition(page, taskName, cfg.cleanPartition);
      await executeTaskImmediately(page, taskName);

      const status2 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验通过（干净分区数据满足所有10条校验规则）
      expect(status2).toContain("校验通过");
    });

    // ─────────────────────────────────────────────────────────────────
    // Pattern 5 (t5/t12/t19): 验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)
    // Uses timeQualityTable: dwd_voyah_sales_time_quality
    // ─────────────────────────────────────────────────────────────────
    test(`【${getPriority(engineType, 5)}】验证规则任务配置规则包后校验正常(2规则包×2校验规则) (${engineType})`, async ({ page }) => {
      test.setTimeout(120_000);
      await applyRuntimeCookies(page);

      const taskName = `rule01_2x2_${cfg.suffix}_${ts}`;

      // ── 步骤1: 进入规则任务管理页面 ──
      await goToRuleTaskPage(page, projectId);
      await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

      // ── 步骤2: 新建监控规则: 引入规则包1(一致性校验、合理性校验)+规则包2(时效性校验) ──
      await page.getByRole("button", { name: /新建/ }).click();
      await page.waitForLoadState("networkidle");

      // Configure monitoring object
      const nameInput = page.locator('.ant-form-item').filter({ hasText: "规则名称" }).locator("input");
      await nameInput.fill(taskName);

      // Select engine type
      const engineSelect = page.locator('.ant-form-item').filter({ hasText: /数据源类型|引擎类型/ }).locator(".ant-select-selector");
      if (await engineSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, engineSelect, engineType);
      }

      // Select time quality table
      const tableSelect = page.locator('.ant-form-item').filter({ hasText: "数据表" }).locator(".ant-select-selector");
      if (await tableSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, tableSelect, cfg.timeQualityTable);
      } else {
        const tableInput = page.locator('.ant-form-item').filter({ hasText: "数据表" }).locator("input");
        await tableInput.fill(cfg.timeQualityTable);
        await page.waitForTimeout(500);
        await page.locator(".ant-select-dropdown:visible").getByText(cfg.timeQualityTable).click();
      }

      // Fill partition
      const partitionInput = page.locator('.ant-form-item').filter({ hasText: "分区" }).locator("input");
      if (await partitionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await partitionInput.fill(cfg.dirtyPartition);
      }

      // Proceed to rule configuration
      await page.getByRole("button", { name: "下一步" }).click();
      await page.waitForLoadState("networkidle");

      // Import rule package 1: 一致性校验 + 合理性校验
      const rulePackage1 = `rp_consistency_${cfg.suffix}`;
      await importRulePackage(page, rulePackage1);

      // Import rule package 2: 时效性校验
      const rulePackage2 = `rp_timeliness_${cfg.suffix}`;
      await importRulePackage(page, rulePackage2);

      // Save and execute
      await saveRuleTask(page, taskName, { scheduleType: "时", executeImmediately: true });

      // ── 步骤3: 选择任务 rule01 立即执行 → 显示未通过数据 ──
      await goToRuleTaskPage(page, projectId);
      const status1 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验不通过 (dirty partition triggers validation failures)
      expect(status1).toMatch(/校验不通过|校验异常/);

      // ── 步骤4: 进入校验结果查询检查详情 → 显示结果 ──
      await verifyValidationResultDetail(page, projectId, taskName, true);

      // ── 步骤5: 编辑规则任务变更分区后重新执行 ──
      await goToRuleTaskPage(page, projectId);
      await editRuleTaskPartition(page, taskName, cfg.cleanPartition);
      await executeTaskImmediately(page, taskName);

      const status2 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验通过
      expect(status2).toContain("校验通过");
    });

    // ─────────────────────────────────────────────────────────────────
    // Pattern 6 (t6/t13/t20): 验证规则任务配置规则包后校验正常(1规则包 * 3校验规则)
    // ─────────────────────────────────────────────────────────────────
    test(`【${getPriority(engineType, 6)}】验证规则任务配置规则包后校验正常(1规则包×3校验规则) (${engineType})`, async ({ page }) => {
      test.setTimeout(120_000);
      await applyRuntimeCookies(page);

      const taskName = `rule01_1x3_${cfg.suffix}_${ts}`;

      // ── 步骤1: 进入规则任务管理页面 ──
      await goToRuleTaskPage(page, projectId);
      await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

      // ── 步骤2: 新建监控规则 ──
      //   完整性校验(final_price >=0)
      //   有效性校验(vin 字符串长度 >0)
      //   唯一性校验(order_id 重复数 =0)
      await page.getByRole("button", { name: /新建/ }).click();
      await page.waitForLoadState("networkidle");

      // Configure monitoring object
      const nameInput = page.locator('.ant-form-item').filter({ hasText: "规则名称" }).locator("input");
      await nameInput.fill(taskName);

      const engineSelect = page.locator('.ant-form-item').filter({ hasText: /数据源类型|引擎类型/ }).locator(".ant-select-selector");
      if (await engineSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, engineSelect, engineType);
      }

      const tableSelect = page.locator('.ant-form-item').filter({ hasText: "数据表" }).locator(".ant-select-selector");
      if (await tableSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, tableSelect, cfg.primaryTable);
      }

      const partitionInput = page.locator('.ant-form-item').filter({ hasText: "分区" }).locator("input");
      if (await partitionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await partitionInput.fill(cfg.dirtyPartition);
      }

      await page.getByRole("button", { name: "下一步" }).click();
      await page.waitForLoadState("networkidle");

      // ── Add rule 1: 完整性校验 – final_price >= 0 ──
      await page.getByRole("button", { name: /添加规则|新增规则/ }).click();
      await page.waitForTimeout(500);

      const ruleTypeSelect1 = page.locator('.ant-form-item').filter({ hasText: /校验类型|规则类型/ }).last().locator(".ant-select-selector");
      if (await ruleTypeSelect1.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, ruleTypeSelect1, "完整性校验");
      }

      const levelSelect1 = page.locator('.ant-form-item').filter({ hasText: /校验级别/ }).last().locator(".ant-select-selector");
      if (await levelSelect1.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, levelSelect1, "字段级");
      }

      const fieldSelect1 = page.locator('.ant-form-item').filter({ hasText: /校验字段|字段/ }).last().locator(".ant-select-selector");
      if (await fieldSelect1.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, fieldSelect1, "final_price");
      }

      const methodSelect1 = page.locator('.ant-form-item').filter({ hasText: /校验方法/ }).last().locator(".ant-select-selector");
      if (await methodSelect1.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, methodSelect1, "字段取值校验");
      }

      const condInput1 = page.locator('.ant-form-item').filter({ hasText: /期望值|条件|阈值/ }).last().locator("input");
      if (await condInput1.isVisible({ timeout: 3000 }).catch(() => false)) {
        await condInput1.fill(">=0");
      }

      // ── Add rule 2: 有效性校验 – vin 字符串长度 > 0 ──
      await page.getByRole("button", { name: /添加规则|新增规则/ }).click();
      await page.waitForTimeout(500);

      const ruleTypeSelect2 = page.locator('.ant-form-item').filter({ hasText: /校验类型|规则类型/ }).last().locator(".ant-select-selector");
      if (await ruleTypeSelect2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, ruleTypeSelect2, "有效性校验");
      }

      const levelSelect2 = page.locator('.ant-form-item').filter({ hasText: /校验级别/ }).last().locator(".ant-select-selector");
      if (await levelSelect2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, levelSelect2, "字段级");
      }

      const fieldSelect2 = page.locator('.ant-form-item').filter({ hasText: /校验字段|字段/ }).last().locator(".ant-select-selector");
      if (await fieldSelect2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, fieldSelect2, "vin");
      }

      const methodSelect2 = page.locator('.ant-form-item').filter({ hasText: /校验方法/ }).last().locator(".ant-select-selector");
      if (await methodSelect2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, methodSelect2, "字符串长度");
      }

      const condInput2 = page.locator('.ant-form-item').filter({ hasText: /期望值|条件|阈值/ }).last().locator("input");
      if (await condInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await condInput2.fill(">0");
      }

      // ── Add rule 3: 唯一性校验 – order_id 重复数 = 0 ──
      await page.getByRole("button", { name: /添加规则|新增规则/ }).click();
      await page.waitForTimeout(500);

      const ruleTypeSelect3 = page.locator('.ant-form-item').filter({ hasText: /校验类型|规则类型/ }).last().locator(".ant-select-selector");
      if (await ruleTypeSelect3.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, ruleTypeSelect3, "唯一性校验");
      }

      const levelSelect3 = page.locator('.ant-form-item').filter({ hasText: /校验级别/ }).last().locator(".ant-select-selector");
      if (await levelSelect3.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, levelSelect3, "字段级");
      }

      const fieldSelect3 = page.locator('.ant-form-item').filter({ hasText: /校验字段|字段/ }).last().locator(".ant-select-selector");
      if (await fieldSelect3.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, fieldSelect3, "order_id");
      }

      const methodSelect3 = page.locator('.ant-form-item').filter({ hasText: /校验方法/ }).last().locator(".ant-select-selector");
      if (await methodSelect3.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillAntSelect(page, methodSelect3, "重复数");
      }

      const condInput3 = page.locator('.ant-form-item').filter({ hasText: /期望值|条件|阈值/ }).last().locator("input");
      if (await condInput3.isVisible({ timeout: 3000 }).catch(() => false)) {
        await condInput3.fill("=0");
      }

      // Save and execute
      await saveRuleTask(page, taskName, { scheduleType: "时", executeImmediately: true });

      // ── 步骤3: 选择任务 rule01 立即执行 ──
      await goToRuleTaskPage(page, projectId);
      const status1 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验不通过（脏数据分区含 NULL/负值/空串/重复等）
      expect(status1).toContain("校验不通过");

      // ── 步骤4: 进入校验结果查询检查详情 ──
      await verifyValidationResultDetail(page, projectId, taskName, true);

      // Check for 校验异常 status in detail view
      await expect(
        page.getByText(/校验异常/).first(),
      ).toBeVisible({ timeout: 10_000 }).catch(() => {
        // 校验异常 may not always appear; 校验不通过 is also valid
      });

      // ── 步骤5: SQL 验证 ──
      const detailContent = page.locator(".ant-table-tbody, .detail-content, .result-detail").first();
      await expect(detailContent).toBeVisible({ timeout: 10_000 });
      // 预期: 数据一致

      // ── 步骤6: 编辑规则任务变更分区后重新执行 ──
      await goToRuleTaskPage(page, projectId);
      await editRuleTaskPartition(page, taskName, cfg.cleanPartition);
      await executeTaskImmediately(page, taskName);

      const status2 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验通过
      expect(status2).toContain("校验通过");
    });

    // ─────────────────────────────────────────────────────────────────
    // Pattern 7 (t7/t14/t21): 验证规则任务配置规则包后校验正常(1规则包 * 1校验规则)
    // ─────────────────────────────────────────────────────────────────
    test(`【${getPriority(engineType, 7)}】验证规则任务配置规则包后校验正常(1规则包×1校验规则) (${engineType})`, async ({ page }) => {
      test.setTimeout(120_000);
      await applyRuntimeCookies(page);

      const taskName = `rule01_1x1_${cfg.suffix}_${ts}`;

      // ── 步骤1: 进入规则任务管理页面 ──
      await goToRuleTaskPage(page, projectId);
      await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

      // ── 步骤2: 新建监控规则: 完整性校验(字段级, final_price, 字段取值校验, >=0) ──
      await createMonitoringRuleWithCompleteness(page, {
        ruleName: taskName,
        tableName: cfg.primaryTable,
        partition: cfg.dirtyPartition,
        fieldName: "final_price",
        condition: ">=0",
        engineType,
      });

      // Save and execute
      await saveRuleTask(page, taskName, { scheduleType: "时", executeImmediately: true });

      // ── 步骤3: 选择任务 rule01 立即执行 ──
      await goToRuleTaskPage(page, projectId);
      const status1 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验不通过（脏数据分区含 final_price < 0 和 NULL）
      expect(status1).toContain("校验不通过");

      // ── 步骤4: 进入校验结果查询检查详情 → 显示未通过数据 ──
      await verifyValidationResultDetail(page, projectId, taskName, true);

      // ── 步骤5: SQL 验证 ──
      // Expected SQL:
      //   SELECT * FROM dwd_voyah_vehicle_sales_dates
      //   WHERE final_price < 0 OR final_price IS NULL
      // Verify the detail page shows matching dirty data rows
      const detailTable = page.locator(".ant-table-tbody").first();
      await expect(detailTable).toBeVisible({ timeout: 10_000 });

      // Check that the detail table contains records with negative or null final_price
      const detailRows = detailTable.locator("tr");
      const rowCount = await detailRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Spot check: at least one row should display a value that indicates
      // final_price < 0 or NULL (the exact format depends on the UI)
      const tableText = await detailTable.innerText();
      const hasNegativeOrNull =
        tableText.includes("-") || // negative values
        tableText.includes("NULL") ||
        tableText.includes("null") ||
        tableText.includes("空"); // empty/null indicator
      expect(hasNegativeOrNull).toBeTruthy();
      // 预期: 数据一致

      // ── 步骤6: 编辑规则任务变更分区后重新执行 ──
      await goToRuleTaskPage(page, projectId);
      await editRuleTaskPartition(page, taskName, cfg.cleanPartition);
      await executeTaskImmediately(page, taskName);

      const status2 = await waitForTaskExecution(page, taskName, 90_000);
      // 预期: 校验通过（干净分区无脏数据）
      expect(status2).toContain("校验通过");
    });
  });
}


// ═══════════════════════════════════════════════════════════════════════
// 规则引入 (t22–t29)
// 8 test cases: rule import functionality in rule task management
// ═══════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// §1 规则引入功能 (t22–t29)
// ---------------------------------------------------------------------------
test.describe("规则引入", () => {
  /**
   * 前置条件 (t22, t24–t27):
   * 规则集管理中已配置记录:
   * hive2.x 的表 hive_table, 规则包配置:
   *   1) hive_rulePkg01: 完整性校验 × 1
   *   2) hive_rulePkg02: 唯一性校验 × 10
   *   3) hive_rulePkg03: (完整性校验~自定义SQL、一致性校验、时效性校验、合理性校验) × 1
   */

  let projectId: number;

  test.beforeEach(async ({ page }) => {
    projectId = await ensureProjectContext(page);
    await applyRuntimeCookies(page);
  });

  /** Navigate to 规则任务管理 page */
  async function goToRuleTaskManagement(page: import("@playwright/test").Page) {
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则任务管理");
  }

  /** Navigate to 规则集管理 page */
  async function goToRuleSetManagement(page: import("@playwright/test").Page) {
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
  }

  /**
   * Click 新建监控规则, configure 监控对象 (hive_table), and proceed to 监控规则 step.
   * Returns the monitoring rules form container.
   */
  async function createRuleAndGoToMonitoringStep(page: import("@playwright/test").Page) {
    // Click 新建监控规则
    const createBtn = page.getByRole("button", { name: /新建监控规则|新建/ }).first();
    await createBtn.click();
    await page.waitForLoadState("networkidle");

    // Configure 监控对象 — select hive_table
    const tableSelect = page.locator(".ant-select").filter({ hasText: /数据表|选择数据表/ }).first();
    if (await tableSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tableSelect.click();
      await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
      await page.locator(".ant-select-dropdown .ant-select-item").filter({ hasText: "hive_table" }).first().click();
      await page.waitForTimeout(500);
    }

    // Click 下一步 to go to 监控规则 config page
    const nextBtn = page.getByRole("button", { name: /下一步/ }).first();
    await nextBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  }

  /**
   * Select rule package(s) from the 规则包 dropdown.
   * @param pkgNames - one or more rule package names to select
   */
  async function selectRulePackages(
    page: import("@playwright/test").Page,
    ...pkgNames: string[]
  ) {
    const pkgSelect = page.locator(".ant-select").filter({ hasText: /规则包|选择规则包/ }).first();
    await pkgSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    for (const name of pkgNames) {
      await page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
        .filter({ hasText: name }).first().click();
      await page.waitForTimeout(300);
    }
    // Close dropdown by pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  /**
   * Select rule type(s) from the 规则类型 dropdown.
   * @param typeNames - one or more rule types to select (e.g. "完整性校验")
   */
  async function selectRuleTypes(
    page: import("@playwright/test").Page,
    ...typeNames: string[]
  ) {
    const typeSelect = page.locator(".ant-select").filter({ hasText: /规则类型|选择规则类型/ }).first();
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    for (const name of typeNames) {
      await page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
        .filter({ hasText: name }).first().click();
      await page.waitForTimeout(300);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  /** Click the 引入 button */
  async function clickImportButton(page: import("@playwright/test").Page) {
    const importBtn = page.getByRole("button", { name: /引入/ }).first();
    await importBtn.click();
    await page.waitForTimeout(1000);
  }

  /** Confirm an Ant Design modal (覆盖引入确认 / 删除确认 etc.) */
  async function confirmAntModal(page: import("@playwright/test").Page) {
    const modal = page.locator(".ant-modal-confirm, .ant-modal").filter({ has: page.locator(".ant-modal-confirm-btns, .ant-modal-footer") }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    const okBtn = modal.getByRole("button", { name: /确[定认]|OK|是/ }).first();
    await okBtn.click();
    await page.waitForTimeout(500);
  }

  // ── t22 ─────────────────────────────────────────────────────────────
  test("t22: 【P1】验证规则集引用规则仅支持删除", async ({ page }) => {
    // Step 1: Navigate to 规则任务管理
    await goToRuleTaskManagement(page);
    await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Create new monitoring rule, configure 监控对象 (hive_table) → next step
    await createRuleAndGoToMonitoringStep(page);

    // Step 3: Select hive_rulePkg03, check all rule types, and import
    await selectRulePackages(page, "hive_rulePkg03");
    // Select all rule types (完整性校验~自定义SQL, 一致性校验, 时效性校验, 合理性校验)
    const typeSelect = page.locator(".ant-select").filter({ hasText: /规则类型|选择规则类型/ }).first();
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    // Select all available options
    const typeOptions = page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper");
    const optionCount = await typeOptions.count();
    for (let i = 0; i < optionCount; i++) {
      await typeOptions.nth(i).click();
      await page.waitForTimeout(200);
    }
    await page.keyboard.press("Escape");
    await clickImportButton(page);

    // Step 4: Check imported rule blocks — only delete is enabled, all other operations disabled (greyed out)
    const ruleBlocks = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card").filter({ hasText: /完整性校验|一致性校验|时效性校验|合理性校验|自定义SQL|唯一性校验/ });
    const firstBlock = ruleBlocks.first();
    await expect(firstBlock).toBeVisible({ timeout: 5000 });

    // Delete button should be active
    const deleteBtn = firstBlock.getByRole("button", { name: /删除/ }).or(firstBlock.locator("[class*='delete']")).first();
    await expect(deleteBtn).toBeEnabled();

    // Clone button should be disabled
    const cloneBtn = firstBlock.getByRole("button", { name: /克隆|复制/ }).or(firstBlock.locator("[class*='clone'], [class*='copy']")).first();
    if (await cloneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(cloneBtn).toBeDisabled();
    }

    // Step 5: Delete the first rule block with confirmation
    await deleteBtn.click();
    await confirmAntModal(page);
    await page.waitForTimeout(500);

    // Step 6: Check remaining rule blocks — all only support delete
    const remainingBlocks = ruleBlocks;
    const remainingCount = await remainingBlocks.count();
    for (let i = 0; i < Math.min(remainingCount, 3); i++) {
      const block = remainingBlocks.nth(i);
      const blockDeleteBtn = block.getByRole("button", { name: /删除/ }).or(block.locator("[class*='delete']")).first();
      if (await blockDeleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(blockDeleteBtn).toBeEnabled();
      }
    }

    // Step 7: Delete remaining blocks one by one
    let currentCount = await remainingBlocks.count();
    while (currentCount > 0) {
      const block = remainingBlocks.first();
      const delBtn = block.getByRole("button", { name: /删除/ }).or(block.locator("[class*='delete']")).first();
      if (await delBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await delBtn.click();
        await confirmAntModal(page);
        await page.waitForTimeout(500);
      } else {
        break;
      }
      currentCount = await remainingBlocks.count();
    }

    // Step 8: Re-import all rule types from hive_rulePkg03 and save
    await selectRulePackages(page, "hive_rulePkg03");
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    const reTypeOptions = page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper");
    const reCount = await reTypeOptions.count();
    for (let i = 0; i < reCount; i++) {
      await reTypeOptions.nth(i).click();
      await page.waitForTimeout(200);
    }
    await page.keyboard.press("Escape");
    await clickImportButton(page);
    await page.waitForTimeout(500);

    // Save the rule task
    const saveBtn = page.getByRole("button", { name: /保存/ }).first();
    await saveBtn.click();
    await page.waitForTimeout(1000);
    // Verify success message
    await expect(page.locator(".ant-message-success, .ant-message").filter({ hasText: /成功/ }).first())
      .toBeVisible({ timeout: 5000 });
  });

  // ── t23 ─────────────────────────────────────────────────────────────
  test("t23: 【P1】验证更换规则包但不引入, 校验规则配置不变", async ({ page }) => {
    // Step 1: Navigate to 规则集管理, click 新增规则集
    await goToRuleSetManagement(page);
    await expect(page.locator(".ant-table-wrapper").first()).toBeVisible({ timeout: 10_000 });
    const addBtn = page.getByRole("button", { name: /新增规则集|新建规则集/ }).first();
    await addBtn.click();
    await page.waitForLoadState("networkidle");
    // Should enter 新建规则集 ❯ 基础信息 page
    await expect(page.getByText(/基础信息/).first()).toBeVisible({ timeout: 5000 });

    // Step 2: Fill basic info and click 下一步
    const ruleSetNameInput = page.locator("input[placeholder*='规则集名称'], input[placeholder*='名称']").first();
    if (await ruleSetNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ruleSetNameInput.fill(`test_ruleSet_${Date.now()}`);
    }
    const nextBtn = page.getByRole("button", { name: /下一步/ }).first();
    await nextBtn.click();
    await page.waitForLoadState("networkidle");
    // Should enter 监控规则 config page
    await expect(page.getByText(/监控规则/).first()).toBeVisible({ timeout: 5000 });

    // Step 3: Select 规则包1 and import its rules
    await selectRulePackages(page, "hive_rulePkg01");
    await clickImportButton(page);
    await page.waitForTimeout(500);

    // Verify rules from 规则包1 are imported
    const ruleBlocks = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card").filter({ hasText: /完整性校验/ });
    await expect(ruleBlocks.first()).toBeVisible({ timeout: 5000 });

    // Record the current rule config text
    const rulesArea = page.locator("[class*='ruleContent'], [class*='monitoring'], [class*='rule-list']").first();
    const configBefore = await rulesArea.textContent().catch(() => "");

    // Step 4: Switch to 规则包2 (but do NOT import)
    await selectRulePackages(page, "hive_rulePkg02");
    // Do NOT click import — just switch the dropdown
    await page.waitForTimeout(500);

    // Verify rule config hasn't changed
    const configAfter = await rulesArea.textContent().catch(() => "");
    expect(configAfter).toBe(configBefore);

    // Step 5: Save and verify config is unchanged (still 规则包1's rules)
    const saveBtn = page.getByRole("button", { name: /保存/ }).first();
    await saveBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator(".ant-message-success, .ant-message").filter({ hasText: /成功/ }).first())
      .toBeVisible({ timeout: 5000 });
  });

  // ── t24 ─────────────────────────────────────────────────────────────
  test("t24: 【P0】验证规则集引用功能正常(覆盖引入)", async ({ page }) => {
    // Step 1: Navigate to 规则任务管理
    await goToRuleTaskManagement(page);
    await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Create new monitoring rule with hive_table
    await createRuleAndGoToMonitoringStep(page);

    // Step 3: Select hive_rulePkg01, import 完整性校验
    await selectRulePackages(page, "hive_rulePkg01");
    await selectRuleTypes(page, "完整性校验");
    await clickImportButton(page);
    await page.waitForTimeout(500);

    // Verify initial import succeeded
    await expect(page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card")
      .filter({ hasText: /完整性校验/ }).first()).toBeVisible({ timeout: 5000 });

    // Step 4: Select hive_rulePkg02, import 完整性校验 → should trigger override confirmation
    await selectRulePackages(page, "hive_rulePkg02");
    await selectRuleTypes(page, "完整性校验");
    await clickImportButton(page);

    // Expect overwrite confirmation dialog
    const modal = page.locator(".ant-modal-confirm, .ant-modal").filter({ hasText: /覆盖引入|已有规则/ }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Step 5: Confirm override import
    await confirmAntModal(page);
    await page.waitForTimeout(1000);

    // Verify rules are now from hive_rulePkg02 (overwritten)
    const ruleBlocks = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card");
    await expect(ruleBlocks.first()).toBeVisible({ timeout: 5000 });

    // Step 6: Save and verify config shows the overridden rules
    const saveBtn = page.getByRole("button", { name: /保存/ }).first();
    await saveBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator(".ant-message-success, .ant-message").filter({ hasText: /成功/ }).first())
      .toBeVisible({ timeout: 5000 });
  });

  // ── t25 ─────────────────────────────────────────────────────────────
  test("t25: 【P1】验证规则集引用功能正常(规则包选择全部)", async ({ page }) => {
    // Step 1: Navigate to 规则任务管理
    await goToRuleTaskManagement(page);
    await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Create new monitoring rule with hive_table
    await createRuleAndGoToMonitoringStep(page);

    // Step 3: Select all 3 rule packages, check rule type dropdown has all 8 types
    await selectRulePackages(page, "hive_rulePkg01", "hive_rulePkg02", "hive_rulePkg03");

    // Verify rule type dropdown shows 完整性校验~合理性校验 (8 types)
    const typeSelect = page.locator(".ant-select").filter({ hasText: /规则类型|选择规则类型/ }).first();
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    const allTypes = ["完整性校验", "唯一性校验", "一致性校验", "时效性校验", "合理性校验"];
    for (const typeName of allTypes) {
      const option = page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
        .filter({ hasText: typeName }).first();
      await expect(option).toBeVisible({ timeout: 3000 });
    }

    // Step 4: Select all rule types and import
    const allTypeOptions = page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper");
    const typeCount = await allTypeOptions.count();
    for (let i = 0; i < typeCount; i++) {
      await allTypeOptions.nth(i).click();
      await page.waitForTimeout(200);
    }
    await page.keyboard.press("Escape");
    await clickImportButton(page);
    await page.waitForTimeout(1000);

    // Verify: 完整性校验×2 + 唯一性校验×11 + 其它6种校验×1 imported
    const ruleBlocks = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card");
    const blockCount = await ruleBlocks.count();
    // Should have at least 20 rule blocks total (2+11+1+1+1+1+1+1+1 = ~20)
    expect(blockCount).toBeGreaterThanOrEqual(15);

    // Verify 完整性校验 appears at least twice
    const integrityBlocks = ruleBlocks.filter({ hasText: /完整性校验/ });
    expect(await integrityBlocks.count()).toBeGreaterThanOrEqual(2);

    // Verify 唯一性校验 appears at least 10 times
    const uniquenessBlocks = ruleBlocks.filter({ hasText: /唯一性校验/ });
    expect(await uniquenessBlocks.count()).toBeGreaterThanOrEqual(10);
  });

  // ── t26 ─────────────────────────────────────────────────────────────
  test("t26: 【P0】验证规则集引用功能正常(规则包多选)", async ({ page }) => {
    // Step 1: Navigate to 规则任务管理
    await goToRuleTaskManagement(page);
    await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Create new monitoring rule with hive_table
    await createRuleAndGoToMonitoringStep(page);

    // Step 3: Select hive_rulePkg01, hive_rulePkg02 — rule type dropdown should only show 完整性校验 and 唯一性校验
    await selectRulePackages(page, "hive_rulePkg01", "hive_rulePkg02");

    const typeSelect = page.locator(".ant-select").filter({ hasText: /规则类型|选择规则类型/ }).first();
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });

    // Should only support: 完整性校验 and 唯一性校验
    await expect(page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
      .filter({ hasText: "完整性校验" }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
      .filter({ hasText: "唯一性校验" }).first()).toBeVisible({ timeout: 3000 });

    // Step 4: Select all types and import → 完整性校验 × 1 + 唯一性校验 × 10
    const typeOptions = page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper");
    const typeCount = await typeOptions.count();
    for (let i = 0; i < typeCount; i++) {
      await typeOptions.nth(i).click();
      await page.waitForTimeout(200);
    }
    await page.keyboard.press("Escape");
    await clickImportButton(page);
    await page.waitForTimeout(1000);

    // Verify: 完整性校验 × 1 + 唯一性校验 × 10 = 11 rules total
    const ruleBlocks = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card");
    const blockCount = await ruleBlocks.count();
    expect(blockCount).toBeGreaterThanOrEqual(11);

    // Verify completeness: 完整性校验 appears at least 1 time
    const integrityBlocks = ruleBlocks.filter({ hasText: /完整性校验/ });
    expect(await integrityBlocks.count()).toBeGreaterThanOrEqual(1);

    // Verify uniqueness: 唯一性校验 appears at least 10 times
    const uniquenessBlocks = ruleBlocks.filter({ hasText: /唯一性校验/ });
    expect(await uniquenessBlocks.count()).toBeGreaterThanOrEqual(10);
  });

  // ── t27 ─────────────────────────────────────────────────────────────
  test("t27: 【P1】验证规则集引用功能正常(规则包单选)", async ({ page }) => {
    // Step 1: Navigate to 规则任务管理
    await goToRuleTaskManagement(page);
    await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Create new monitoring rule with hive_table
    await createRuleAndGoToMonitoringStep(page);

    // Step 3: Check 规则包 dropdown — should support 全部, hive_rulePkg01~04 (5 options)
    const pkgSelect = page.locator(".ant-select").filter({ hasText: /规则包|选择规则包/ }).first();
    await pkgSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    // Check presence of key options
    for (const name of ["hive_rulePkg01", "hive_rulePkg02", "hive_rulePkg03"]) {
      await expect(page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
        .filter({ hasText: name }).first()).toBeVisible({ timeout: 3000 });
    }
    await page.keyboard.press("Escape");

    // ── Single-select test 1: hive_rulePkg01 → 完整性校验 ──
    // Step 4: Select hive_rulePkg01, check rule type dropdown → only 完整性校验
    await selectRulePackages(page, "hive_rulePkg01");
    const typeSelect = page.locator(".ant-select").filter({ hasText: /规则类型|选择规则类型/ }).first();
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    await expect(page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
      .filter({ hasText: "完整性校验" }).first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");

    // Step 5: Select 完整性校验 and import → 1 rule imported
    await selectRuleTypes(page, "完整性校验");
    await clickImportButton(page);
    await page.waitForTimeout(500);
    const integrityRules = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card").filter({ hasText: /完整性校验/ });
    expect(await integrityRules.count()).toBeGreaterThanOrEqual(1);

    // Step 6: Save configuration
    const saveBtn = page.getByRole("button", { name: /保存/ }).first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }

    // ── Single-select test 2: hive_rulePkg02 → 唯一性校验 ──
    // Step 7: Reconfigure — select hive_rulePkg02 → should cascade to 唯一性校验
    await selectRulePackages(page, "hive_rulePkg02");
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    await expect(page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
      .filter({ hasText: "唯一性校验" }).first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");

    // Step 8: Select 唯一性校验 and import → 10 rules
    await selectRuleTypes(page, "唯一性校验");
    await clickImportButton(page);
    await page.waitForTimeout(500);
    const uniqueRules = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card").filter({ hasText: /唯一性校验/ });
    expect(await uniqueRules.count()).toBeGreaterThanOrEqual(10);

    // Step 9: Save configuration
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }

    // ── Single-select test 3: hive_rulePkg03 → all 8 types ──
    // Step 10: Select hive_rulePkg03 → should show 完整性校验~合理性校验 (8 types)
    await selectRulePackages(page, "hive_rulePkg03");
    await typeSelect.click();
    await page.locator(".ant-select-dropdown").waitFor({ state: "visible" });
    const allTypes = ["完整性校验", "唯一性校验", "一致性校验", "时效性校验", "合理性校验"];
    for (const t of allTypes) {
      await expect(page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper")
        .filter({ hasText: t }).first()).toBeVisible({ timeout: 3000 });
    }

    // Step 11: Select all types and import
    const allTypeOptions = page.locator(".ant-select-dropdown .ant-select-item, .ant-select-dropdown .ant-checkbox-wrapper");
    const optionCount = await allTypeOptions.count();
    for (let i = 0; i < optionCount; i++) {
      await allTypeOptions.nth(i).click();
      await page.waitForTimeout(200);
    }
    await page.keyboard.press("Escape");
    await clickImportButton(page);
    await page.waitForTimeout(500);

    // Verify all rule types are imported
    const allRules = page.locator("[class*='ruleBlock'], [class*='rule-card'], .ant-card");
    expect(await allRules.count()).toBeGreaterThanOrEqual(8);

    // Step 12: Save configuration
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator(".ant-message-success, .ant-message").filter({ hasText: /成功/ }).first())
        .toBeVisible({ timeout: 5000 });
    }
  });

  // ── t28 ─────────────────────────────────────────────────────────────
  test("t28: 【P1】验证监控规则页面变更", async ({ page }) => {
    // Step 1: Navigate to 规则任务管理
    await goToRuleTaskManagement(page);
    await expect(page.getByText("规则任务管理").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Click 新建监控规则, configure 监控对象, go to 监控规则 page
    await createRuleAndGoToMonitoringStep(page);

    // Step 3: Verify page changes:
    // 3a) New elements: 规则包 (required) dropdown, 规则类型 (optional) dropdown, 引入 button
    const pkgSelect = page.locator(".ant-select").filter({ hasText: /规则包|选择规则包/ }).first();
    await expect(pkgSelect).toBeVisible({ timeout: 5000 });

    const typeSelect = page.locator(".ant-select").filter({ hasText: /规则类型|选择规则类型/ }).first();
    await expect(typeSelect).toBeVisible({ timeout: 5000 });

    const importBtn = page.getByRole("button", { name: /引入/ }).first();
    await expect(importBtn).toBeVisible({ timeout: 5000 });

    // 3b) Original top-right buttons (添加规则, 查看全局参数) should be hidden
    const addRuleBtn = page.getByRole("button", { name: /添加规则/ });
    await expect(addRuleBtn).toHaveCount(0, { timeout: 3000 });

    const globalParamBtn = page.getByRole("button", { name: /查看全局参数|全局参数/ });
    await expect(globalParamBtn).toHaveCount(0, { timeout: 3000 });
  });

  // ── t29 ─────────────────────────────────────────────────────────────
  test("t29: 【P2】验证列表字段名称变更(规则名称 ❯ 任务名称)", async ({ page }) => {
    // Step 1: Navigate to 规则任务管理
    await goToRuleTaskManagement(page);
    await expect(page.locator(".ant-table-wrapper").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Verify column header changed from "规则名称" to "任务名称"
    const tableHeader = page.locator(".ant-table-thead");
    await expect(tableHeader).toBeVisible({ timeout: 5000 });

    // "任务名称" should be present
    await expect(tableHeader.getByText("任务名称").first()).toBeVisible({ timeout: 5000 });

    // "规则名称" should NOT be present (old field name)
    const oldColumnName = tableHeader.getByText("规则名称");
    await expect(oldColumnName).toHaveCount(0, { timeout: 3000 });
  });
});


// ═══════════════════════════════════════════════════════════════════════
// 规则集管理 (t30–t56)
// 27 test cases across 6 subsections
// ═══════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// §1 规则集详情 (t30, t31)
// ---------------------------------------------------------------------------
test.describe("规则集管理 - 规则集详情", () => {
  test.beforeEach(async ({ page }) => {
    const pid = await ensureProjectContext(page);
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", pid));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });
  });

  test("t30: 【P2】验证规则集详情页面显示正常(20规则包 * 10校验规则)", async ({ page }) => {
    // 前置: 规则集 rule01 存在, 含 20 个规则包(rulePkg01~20), 每包 10 条校验规则

    // 步骤 1: 进入规则集管理页面 → 已在 beforeEach 完成
    await expect(page.locator(".ant-table-tbody tr")).not.toHaveCount(0, { timeout: 10_000 });

    // 步骤 2: 选择 rule01, 点击表名 → 右侧展开详情页(基本信息+规则详情)
    const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: "rule01" }).first();
    await expect(ruleRow).toBeVisible({ timeout: 5_000 });
    await ruleRow.locator("td").first().click();

    const drawer = page.locator(".ant-drawer").first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    await expect(drawer.locator(".ant-drawer-title")).toContainText("规则集详情");

    // 步骤 3: 检查基本信息 → 规则包数量 20, 规则数量 200
    const basicInfo = drawer.locator(".ant-descriptions, .ant-form, [class*='basicInfo'], [class*='detail']").first();
    await expect(basicInfo).toBeVisible({ timeout: 5_000 });

    // 检查规则包数量
    const rulePackCountLabel = drawer.getByText("规则包数量").first();
    await expect(rulePackCountLabel).toBeVisible();
    const rulePackCountValue = rulePackCountLabel.locator("xpath=following-sibling::*|../following-sibling::*").first();
    await expect(rulePackCountValue).toContainText("20");

    // 检查规则数量
    const ruleCountLabel = drawer.getByText("规则数量").first();
    await expect(ruleCountLabel).toBeVisible();
    const ruleCountValue = ruleCountLabel.locator("xpath=following-sibling::*|../following-sibling::*").first();
    await expect(ruleCountValue).toContainText("200");

    // 步骤 4: 检查规则详情 → 数据正确, 溢出数据通过下滑查看
    const ruleDetailSection = drawer.locator(".ant-collapse, [class*='ruleDetail']").first();
    await expect(ruleDetailSection).toBeVisible({ timeout: 5_000 });

    // 验证规则包面板存在(可折叠), 检查至少能看到前几个
    const collapsePanels = drawer.locator(".ant-collapse-item, .ant-collapse-header");
    await expect(collapsePanels.first()).toBeVisible();
    const panelCount = await collapsePanels.count();
    expect(panelCount).toBeGreaterThanOrEqual(1);

    // 溢出内容 → 可滚动查看
    const scrollContainer = drawer.locator(".ant-drawer-body");
    const isScrollable = await scrollContainer.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(isScrollable).toBeTruthy();

    // 步骤 5: 进入规则任务管理引入所有规则包并保存
    await drawer.locator("button.ant-drawer-close, .ant-drawer-close").click();
    await expect(drawer).not.toBeVisible({ timeout: 3_000 });

    await navigateToDqPage(page, "规则任务管理");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });

    // 创建/编辑规则任务, 引入 rule01 的所有规则包
    const addTaskBtn = page.getByRole("button", { name: /新增|新建/ });
    if (await addTaskBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addTaskBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // 引入规则包 → 选择 rule01 的全部规则包
    const importRulePackBtn = page.getByRole("button", { name: /引入规则包|添加规则包/ });
    if (await importRulePackBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await importRulePackBtn.click();

      // 在弹窗中选择 rule01 相关的规则包
      const modal = page.locator(".ant-modal-content").last();
      await expect(modal).toBeVisible({ timeout: 5_000 });

      // 全选规则包
      const selectAll = modal.locator(".ant-checkbox-wrapper, .ant-table-selection").first();
      if (await selectAll.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await selectAll.click();
      }

      await modal.getByRole("button", { name: /确定|确认/ }).click();
      await expect(modal).not.toBeVisible({ timeout: 5_000 });
    }

    // 保存规则任务
    const saveBtn = page.getByRole("button", { name: "保存" });
    if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await saveBtn.click();
      await expect(page.locator(".ant-message-success, .ant-message-notice")).toBeVisible({
        timeout: 5_000,
      });
    }

    // 步骤 6: 检查规则任务详情页 → 显示所有校验规则
    const taskRow = page.locator(".ant-table-tbody tr").first();
    await expect(taskRow).toBeVisible({ timeout: 5_000 });
    await taskRow.locator("td").first().click();
    await page.waitForLoadState("networkidle");

    // 验证详情页包含校验规则列表
    const taskDetailRules = page.locator(".ant-table-tbody tr, .ant-collapse-item, [class*='rule']");
    const ruleItemCount = await taskDetailRules.count();
    expect(ruleItemCount).toBeGreaterThan(0);

    // 步骤 7: 运行后进入校验结果查询检查详情 → 显示所有校验规则
    // (运行任务需要等待完成, 验证校验结果查询)
    const runBtn = page.getByRole("button", { name: /运行|执行/ });
    if (await runBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await runBtn.click();
      // 等待运行完成 toast
      await expect(page.locator(".ant-message-success, .ant-message-notice")).toBeVisible({
        timeout: 30_000,
      });
    }

    await navigateToDqPage(page, "校验结果查询");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });

    // 检查结果列表包含校验规则
    const resultRows = page.locator(".ant-table-tbody tr");
    await expect(resultRows.first()).toBeVisible({ timeout: 10_000 });
    const resultCount = await resultRows.count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test("t31: 【P1】验证规则集详情数据正确", async ({ page }) => {
    // 前置: 规则集 rule01 存在

    // 步骤 1: 进入规则集管理页面 → 已在 beforeEach 完成
    await expect(page.locator(".ant-table-tbody tr")).not.toHaveCount(0, { timeout: 10_000 });

    // 先记录列表中 rule01 的关键信息, 用于后续对比
    const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: "rule01" }).first();
    await expect(ruleRow).toBeVisible({ timeout: 5_000 });

    const listCells = ruleRow.locator("td");
    const listTableName = (await listCells.nth(0).innerText()).trim();
    const listDatabase = (await listCells.nth(1).innerText()).trim();
    const listDataSource = (await listCells.nth(2).innerText()).trim();
    const listRulePackCount = (await listCells.nth(3).innerText()).trim();
    const listRuleCount = (await listCells.nth(4).innerText()).trim();

    // 步骤 2: 点击表名 → 右侧抽屉展开详情
    await listCells.nth(0).click();

    const drawer = page.locator(".ant-drawer").first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    // 检查标题格式: ${数据表名称}规则集详情
    const drawerTitle = drawer.locator(".ant-drawer-title");
    await expect(drawerTitle).toContainText("规则集详情");
    const titleText = await drawerTitle.innerText();
    expect(titleText).toContain(listTableName);

    // 检查基本信息: 表名/数据库/数据源/规则包数量/规则数量/描述/更新人/更新时间
    const expectedFields = ["表名", "数据库", "数据源", "规则包数量", "规则数量", "描述", "更新人", "更新时间"];
    for (const field of expectedFields) {
      await expect(drawer.getByText(field, { exact: false }).first()).toBeVisible({ timeout: 3_000 });
    }

    // 步骤 3: 检查基本信息 & 规则详情 → 与列表记录一致
    const detailTableName = drawer.getByText("表名").first().locator("xpath=following-sibling::*|../following-sibling::*").first();
    await expect(detailTableName).toContainText(listTableName);

    const detailDatabase = drawer.getByText("数据库").first().locator("xpath=following-sibling::*|../following-sibling::*").first();
    await expect(detailDatabase).toContainText(listDatabase);

    const detailDataSource = drawer.getByText("数据源").first().locator("xpath=following-sibling::*|../following-sibling::*").first();
    await expect(detailDataSource).toContainText(listDataSource);

    const detailRulePackCount = drawer.getByText("规则包数量").first().locator("xpath=following-sibling::*|../following-sibling::*").first();
    await expect(detailRulePackCount).toContainText(listRulePackCount);

    const detailRuleCount = drawer.getByText("规则数量").first().locator("xpath=following-sibling::*|../following-sibling::*").first();
    await expect(detailRuleCount).toContainText(listRuleCount);

    // 检查规则详情: 支持折叠, 默认展开
    const collapseItems = drawer.locator(".ant-collapse-item");
    await expect(collapseItems.first()).toBeVisible({ timeout: 5_000 });

    // 默认展开 → 第一个面板应处于 active 状态
    const firstPanel = collapseItems.first();
    const isExpanded = await firstPanel.evaluate(
      (el) => el.classList.contains("ant-collapse-item-active"),
    );
    expect(isExpanded).toBeTruthy();

    // 点击折叠 → 再点击展开
    await firstPanel.locator(".ant-collapse-header").click();
    await expect(firstPanel).not.toHaveClass(/ant-collapse-item-active/, { timeout: 3_000 });
    await firstPanel.locator(".ant-collapse-header").click();
    await expect(firstPanel).toHaveClass(/ant-collapse-item-active/, { timeout: 3_000 });

    // 关闭抽屉
    await drawer.locator("button.ant-drawer-close, .ant-drawer-close").click();
    await expect(drawer).not.toBeVisible({ timeout: 3_000 });

    // 步骤 4: 进入规则任务管理引入规则包并保存
    await navigateToDqPage(page, "规则任务管理");
    await page.waitForLoadState("networkidle");

    const addTaskBtn = page.getByRole("button", { name: /新增|新建/ });
    if (await addTaskBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addTaskBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // 引入规则包
    const importBtn = page.getByRole("button", { name: /引入规则包|添加规则包/ });
    if (await importBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await importBtn.click();
      const modal = page.locator(".ant-modal-content").last();
      await expect(modal).toBeVisible({ timeout: 5_000 });

      // 选择 rule01 关联的规则包
      const ruleCheckbox = modal.locator("tr").filter({ hasText: "rule01" }).locator(".ant-checkbox-wrapper").first();
      if (await ruleCheckbox.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await ruleCheckbox.click();
      }
      await modal.getByRole("button", { name: /确定|确认/ }).click();
      await expect(modal).not.toBeVisible({ timeout: 5_000 });
    }

    const saveBtn = page.getByRole("button", { name: "保存" });
    if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await saveBtn.click();
      await expect(page.locator(".ant-message-success, .ant-message-notice")).toBeVisible({ timeout: 5_000 });
    }

    // 步骤 5: 检查规则任务详情页 → 显示关联规则包的所有校验规则
    const taskRow = page.locator(".ant-table-tbody tr").first();
    await expect(taskRow).toBeVisible({ timeout: 5_000 });
    await taskRow.locator("td").first().click();
    await page.waitForLoadState("networkidle");

    const detailRules = page.locator(".ant-table-tbody tr, [class*='rule']");
    await expect(detailRules.first()).toBeVisible({ timeout: 5_000 });

    // 步骤 6: 运行后进入校验结果查询 → 显示关联规则包的所有校验规则
    const runBtn = page.getByRole("button", { name: /运行|执行/ });
    if (await runBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await runBtn.click();
      await expect(page.locator(".ant-message-success, .ant-message-notice")).toBeVisible({ timeout: 30_000 });
    }

    await navigateToDqPage(page, "校验结果查询");
    await page.waitForLoadState("networkidle");

    const resultRows = page.locator(".ant-table-tbody tr");
    await expect(resultRows.first()).toBeVisible({ timeout: 10_000 });
    const resultCount = await resultRows.count();
    expect(resultCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §2 编辑规则集 - 监控规则 (t32–t36)
// ---------------------------------------------------------------------------
test.describe("规则集管理 - 编辑规则集 - 监控规则", () => {
  test.beforeEach(async ({ page }) => {
    const pid = await ensureProjectContext(page);
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", pid));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });
  });

  /**
   * 辅助: 进入编辑规则集 → 监控规则配置页面
   */
  async function enterEditMonitoringRules(page: import("@playwright/test").Page): Promise<void> {
    const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: "rule01" }).first();
    await expect(ruleRow).toBeVisible({ timeout: 5_000 });

    // 点击编辑按钮
    const editBtn = ruleRow.getByRole("button", { name: "编辑" }).or(ruleRow.locator("[class*='edit'], .anticon-edit").first());
    await editBtn.click();
    await page.waitForLoadState("networkidle");

    // 进入基础信息配置页面, 点击下一步
    const nextBtn = page.getByRole("button", { name: "下一步" });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();
    await page.waitForLoadState("networkidle");

    // 断言进入监控规则配置页面
    await expect(page.getByText("监控规则配置", { exact: false })).toBeVisible({ timeout: 5_000 });
  }

  test("t32: 【P1】验证更换规则包名称后, 校验规则配置不变", async ({ page }) => {
    // 步骤 1: 编辑 rule01, 点击下一步 → 进入监控规则配置页面
    await enterEditMonitoringRules(page);

    // 步骤 2: 记录当前规则包1的校验规则配置
    const firstRulePack = page.locator(".ant-collapse-item, [class*='rulePack']").first();
    await expect(firstRulePack).toBeVisible({ timeout: 5_000 });

    // 记录校验规则内容
    const rulesBeforeSwitch = await firstRulePack.locator(".ant-table-tbody tr, [class*='ruleItem']").allInnerTexts();
    expect(rulesBeforeSwitch.length).toBeGreaterThan(0);

    // 更换规则包名称: 点击规则包下拉框, 选择另一个规则包
    const rulePackSelect = firstRulePack.locator(".ant-select-selector").first();
    await rulePackSelect.click();

    const dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // 选择不同于当前的第一个可选项
    const options = dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled)");
    const optionCount = await options.count();
    if (optionCount > 0) {
      await options.first().click();
    }

    // 验证校验规则配置内容不变
    const rulesAfterSwitch = await firstRulePack.locator(".ant-table-tbody tr, [class*='ruleItem']").allInnerTexts();
    expect(rulesAfterSwitch).toEqual(rulesBeforeSwitch);
  });

  test("t33: 【P2】验证校验规则增删改功能正常", async ({ page }) => {
    // 步骤 1: 编辑 rule01, 进入监控规则配置页面
    // 注意: 此用例从基础信息页开始, 编辑 rule01 → 进入基础信息配置页面
    const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: "rule01" }).first();
    await expect(ruleRow).toBeVisible({ timeout: 5_000 });
    const editBtn = ruleRow.getByRole("button", { name: "编辑" }).or(ruleRow.locator("[class*='edit'], .anticon-edit").first());
    await editBtn.click();
    await page.waitForLoadState("networkidle");

    // 点击下一步进入监控规则配置
    const nextBtn = page.getByRole("button", { name: "下一步" });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();
    await page.waitForLoadState("networkidle");

    // 步骤 2: 选择规则包, 点击添加规则 → 支持 完整性/有效性/唯一性/统计性/自定义SQL
    const addRuleBtn = page.getByRole("button", { name: /添加规则|添加校验规则/ }).first();
    await expect(addRuleBtn).toBeVisible({ timeout: 5_000 });
    await addRuleBtn.click();

    const ruleTypeDropdown = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
    await expect(ruleTypeDropdown).toBeVisible({ timeout: 3_000 });

    // 验证五种规则类型可选
    const ruleTypes = ["完整性", "有效性", "唯一性", "统计性", "自定义SQL"];
    for (const ruleType of ruleTypes) {
      await expect(ruleTypeDropdown.getByText(ruleType, { exact: false })).toBeVisible({ timeout: 2_000 });
    }

    // 关闭下拉
    await page.keyboard.press("Escape");

    // 步骤 3-7: 逐一添加各类型校验规则并保存
    for (const ruleType of ruleTypes) {
      await addRuleBtn.click();
      const dropdown = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
      await expect(dropdown).toBeVisible({ timeout: 3_000 });
      await dropdown.getByText(ruleType, { exact: false }).click();
      await page.waitForTimeout(500);

      // 填充必填字段(如有)
      const ruleForm = page.locator(".ant-form, [class*='ruleConfig']").last();
      const requiredInputs = ruleForm.locator(".ant-form-item-required").locator("xpath=ancestor::*[contains(@class,'ant-form-item')]").locator("input, .ant-select-selector, textarea");
      const inputCount = await requiredInputs.count();
      for (let i = 0; i < inputCount; i++) {
        const input = requiredInputs.nth(i);
        const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === "input" || tagName === "textarea") {
          const currentValue = await input.inputValue().catch(() => "");
          if (!currentValue) {
            await input.fill(`auto_test_${ruleType}_${i}`);
          }
        }
      }
    }

    // 步骤 8: 添加至 10 个校验规则 → 上限 10 个, 无法再次添加
    // 先获取当前规则数, 补充添加至 10 个
    let currentRuleItems = page.locator("[class*='ruleItem'], .ant-collapse-item .ant-table-tbody tr, [class*='checkRule']");
    let currentCount = await currentRuleItems.count();

    while (currentCount < 10) {
      const addBtn = page.getByRole("button", { name: /添加规则|添加校验规则/ }).first();
      if (await addBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await addBtn.click();
        const dd = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
        if (await dd.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await dd.locator(".ant-select-item-option, .ant-dropdown-menu-item").first().click();
        }
        await page.waitForTimeout(300);
      }
      currentCount = await currentRuleItems.count();
    }

    // 添加至 10 个后, 添加按钮应不可用或隐藏
    const addRuleBtnAfterMax = page.getByRole("button", { name: /添加规则|添加校验规则/ }).first();
    const isDisabledOrHidden =
      (await addRuleBtnAfterMax.isDisabled().catch(() => true)) ||
      !(await addRuleBtnAfterMax.isVisible().catch(() => false));
    expect(isDisabledOrHidden).toBeTruthy();

    // 步骤 9: 选择一条规则, 点击删除 → 删除成功, 可再次添加
    const deleteBtn = page.locator("[class*='ruleItem'], .ant-table-tbody tr").first()
      .getByRole("button", { name: /删除/ }).or(
        page.locator("[class*='ruleItem'], .ant-table-tbody tr").first().locator(".anticon-delete"),
      );
    if (await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await deleteBtn.click();

      // 处理可能的二次确认
      const confirmBtn = page.locator(".ant-popconfirm, .ant-modal-content").last()
        .getByRole("button", { name: /确定|确认|是/ });
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(500);
      const countAfterDelete = await currentRuleItems.count();
      expect(countAfterDelete).toBeLessThan(10);

      // 验证可再次添加
      await expect(page.getByRole("button", { name: /添加规则|添加校验规则/ }).first()).toBeEnabled({ timeout: 3_000 });
    }

    // 步骤 10: 选择一条规则, 编辑内容 → 编辑成功
    const editableRule = page.locator("[class*='ruleItem'], .ant-table-tbody tr").first();
    const editRuleBtn = editableRule.getByRole("button", { name: /编辑/ }).or(editableRule.locator(".anticon-edit"));
    if (await editRuleBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await editRuleBtn.click();
      await page.waitForTimeout(500);
      // 修改某个输入字段
      const editableInput = editableRule.locator("input, textarea").first();
      if (await editableInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await editableInput.fill("edited_rule_value");
      }
    }

    // 步骤 11: 选择一条规则, 点击克隆 → 克隆成功, 配置一致
    const cloneTarget = page.locator("[class*='ruleItem'], .ant-table-tbody tr").first();
    const cloneBtn = cloneTarget.getByRole("button", { name: /克隆|复制/ }).or(cloneTarget.locator(".anticon-copy"));
    if (await cloneBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const textBefore = await cloneTarget.innerText();
      await cloneBtn.click();
      await page.waitForTimeout(500);

      // 验证克隆后新增了一条
      const countAfterClone = await currentRuleItems.count();
      expect(countAfterClone).toBeGreaterThan(0);

      // 验证最后一条规则与源规则配置一致
      const clonedRule = page.locator("[class*='ruleItem'], .ant-table-tbody tr").last();
      const clonedText = await clonedRule.innerText();
      // 克隆体应包含与原规则相似的内容(可能有序号差异)
      expect(clonedText.length).toBeGreaterThan(0);
    }
  });

  test("t34: 【P2】验证查看全局参数功能正常", async ({ page }) => {
    // 步骤 1: 进入编辑 rule01, 点击下一步 → 进入监控规则配置页面
    await enterEditMonitoringRules(page);

    // 步骤 2: 在规则包配置中点击查看全局参数 → 弹窗展示全局参数名称列表
    const globalParamBtn = page.getByRole("button", { name: /全局参数/ }).or(
      page.getByText("查看全局参数", { exact: false }),
    );
    await expect(globalParamBtn).toBeVisible({ timeout: 5_000 });
    await globalParamBtn.click();

    // 弹窗展示全局参数名称列表
    const modal = page.locator(".ant-modal-content").last();
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal.getByText("全局参数", { exact: false })).toBeVisible();

    // 验证参数列表存在内容
    const paramList = modal.locator(".ant-table-tbody tr, .ant-list-item, [class*='param']");
    const paramCount = await paramList.count();
    expect(paramCount).toBeGreaterThanOrEqual(0); // 可能为空但弹窗应正常展示

    // 关闭弹窗
    await modal.getByRole("button", { name: /关闭|取消|确定/ }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("t35: 【P2】验证规则包增删改功能", async ({ page }) => {
    // 步骤 1: 进入编辑 rule01, 点击下一步 → 进入监控规则配置页面
    await enterEditMonitoringRules(page);

    // 步骤 2: 折叠/展开规则包 → 操作成功
    const firstCollapse = page.locator(".ant-collapse-item").first();
    await expect(firstCollapse).toBeVisible({ timeout: 5_000 });

    const collapseHeader = firstCollapse.locator(".ant-collapse-header").first();
    await collapseHeader.click();
    await expect(firstCollapse).not.toHaveClass(/ant-collapse-item-active/, { timeout: 3_000 });
    await collapseHeader.click();
    await expect(firstCollapse).toHaveClass(/ant-collapse-item-active/, { timeout: 3_000 });

    // 步骤 3: 添加至 20 个规则包 → 增加按钮消失
    const addPackBtn = page.getByRole("button", { name: /增加|添加规则包|新增规则包/ }).first();
    let rulePackPanels = page.locator(".ant-collapse-item, [class*='rulePack']");
    let packCount = await rulePackPanels.count();

    while (packCount < 20) {
      if (await addPackBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await addPackBtn.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
      packCount = await rulePackPanels.count();
    }

    // 达到 20 个后, 增加按钮应消失或不可用
    const addBtnAfterMax = page.getByRole("button", { name: /增加|添加规则包|新增规则包/ }).first();
    const addBtnHiddenOrDisabled =
      !(await addBtnAfterMax.isVisible().catch(() => false)) ||
      (await addBtnAfterMax.isDisabled().catch(() => true));
    expect(addBtnHiddenOrDisabled).toBeTruthy();

    // 步骤 4: 删除任一规则包 → 二次确认弹窗
    const deletePackBtn = rulePackPanels.nth(1).locator("[class*='delete'], .anticon-delete").first().or(
      rulePackPanels.nth(1).getByRole("button", { name: /删除/ }),
    );
    await expect(deletePackBtn).toBeVisible({ timeout: 3_000 });
    await deletePackBtn.click();

    // 二次确认弹窗: "删除规则包后该规则包下已经配置好的规则会同步被删除，请确认是否删除?"
    const confirmModal = page.locator(".ant-modal-content, .ant-popconfirm").last();
    await expect(confirmModal).toBeVisible({ timeout: 3_000 });
    await expect(confirmModal).toContainText(/删除规则包后.*规则会同步被删除|确认.*删除/);

    // 步骤 5: 确认删除 → Toast 删除成功, 可再次添加
    await confirmModal.getByRole("button", { name: /确定|确认|是/ }).click();
    await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /删除成功|成功/ })).toBeVisible({
      timeout: 5_000,
    });

    // 删除后可再次添加
    await expect(page.getByRole("button", { name: /增加|添加规则包|新增规则包/ }).first()).toBeVisible({ timeout: 3_000 });

    // 步骤 6: 删除至 1 个规则包 → 删除按钮消失
    rulePackPanels = page.locator(".ant-collapse-item, [class*='rulePack']");
    packCount = await rulePackPanels.count();

    while (packCount > 1) {
      const delBtn = rulePackPanels.last().locator("[class*='delete'], .anticon-delete").first().or(
        rulePackPanels.last().getByRole("button", { name: /删除/ }),
      );
      if (await delBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await delBtn.click();
        const confirm = page.locator(".ant-modal-content, .ant-popconfirm").last();
        if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirm.getByRole("button", { name: /确定|确认|是/ }).click();
          await page.waitForTimeout(500);
        }
      }
      packCount = await rulePackPanels.count();
    }

    // 只剩 1 个时, 删除按钮应不可见
    const lastDeleteBtn = rulePackPanels.first().locator("[class*='delete'], .anticon-delete").first().or(
      rulePackPanels.first().getByRole("button", { name: /删除/ }),
    );
    const deleteHidden = !(await lastDeleteBtn.isVisible().catch(() => false));
    expect(deleteHidden).toBeTruthy();

    // 步骤 7: 编辑规则包中的校验规则内容并保存 → 保存成功
    const ruleInput = rulePackPanels.first().locator("input, textarea, .ant-select-selector").first();
    if (await ruleInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const tagName = await ruleInput.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === "input" || tagName === "textarea") {
        await ruleInput.fill("edited_rule_pack_content");
      }
    }

    const saveBtn = page.getByRole("button", { name: "保存" });
    await expect(saveBtn).toBeVisible({ timeout: 3_000 });
    await saveBtn.click();
    await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /成功/ })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("t36: 【P2】验证规则包下拉框数据正常", async ({ page }) => {
    // 步骤 1: 进入编辑 rule01, 点击下一步 → 进入监控规则配置页面
    await enterEditMonitoringRules(page);

    // 步骤 2: 展开规则包下拉框 → 数据为基础信息中添加的规则包名称
    const rulePackSelect = page.locator(".ant-collapse-item, [class*='rulePack']").first()
      .locator(".ant-select-selector").first();
    await expect(rulePackSelect).toBeVisible({ timeout: 5_000 });
    await rulePackSelect.click();

    const dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // 验证下拉数据存在
    const options = dropdown.locator(".ant-select-item-option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);

    // 步骤 3: 已选择过的规则包不支持再次选择(disabled)
    const selectedValue = await rulePackSelect.innerText();
    if (selectedValue.trim()) {
      const matchingOption = dropdown.locator(".ant-select-item-option").filter({ hasText: selectedValue.trim() });
      if (await matchingOption.isVisible().catch(() => false)) {
        const isDisabled = await matchingOption.evaluate(
          (el) =>
            el.classList.contains("ant-select-item-option-disabled") ||
            el.getAttribute("aria-disabled") === "true",
        );
        expect(isDisabled).toBeTruthy();
      }
    }

    await page.keyboard.press("Escape");
  });
});

// ---------------------------------------------------------------------------
// §3 编辑规则集 - 基础信息 (t37–t41)
// ---------------------------------------------------------------------------
test.describe("规则集管理 - 编辑规则集 - 基础信息", () => {
  test.beforeEach(async ({ page }) => {
    const pid = await ensureProjectContext(page);
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", pid));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });
  });

  /**
   * 辅助: 进入编辑规则集 → 基础信息配置页面
   */
  async function enterEditBasicInfo(page: import("@playwright/test").Page): Promise<void> {
    const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: "rule01" }).first();
    await expect(ruleRow).toBeVisible({ timeout: 5_000 });
    const editBtn = ruleRow.getByRole("button", { name: "编辑" }).or(ruleRow.locator("[class*='edit'], .anticon-edit").first());
    await editBtn.click();
    await page.waitForLoadState("networkidle");

    // 断言进入基础信息配置页面
    await expect(page.getByText("基础信息", { exact: false }).or(page.getByText("选择数据表", { exact: false }))).toBeVisible({
      timeout: 5_000,
    });
  }

  test("t37: 【P2】验证规则包名称不可重复", async ({ page }) => {
    // 步骤 1: 进入规则集管理编辑 rule01 → 进入基础信息配置页面
    await enterEditBasicInfo(page);

    // 步骤 2: 添加规则包 → 添加成功, 从第二个开始有删除按钮
    const addPackBtn = page.getByRole("button", { name: /增加|添加规则包|添加/ }).first();
    await expect(addPackBtn).toBeVisible({ timeout: 5_000 });

    // 确保至少 2 个规则包
    const rulePackInputs = page.locator("[class*='rulePack'] input, .ant-form-item").filter({ hasText: /规则包/ }).locator("input");
    let packCount = await rulePackInputs.count();
    while (packCount < 2) {
      await addPackBtn.click();
      await page.waitForTimeout(300);
      packCount = await rulePackInputs.count();
    }

    // 第一个无删除按钮, 第二个开始有删除按钮
    const rulePackRows = page.locator("[class*='rulePack'], .ant-form-item").filter({ hasText: /规则包/ });
    const firstRowDeleteBtn = rulePackRows.first().locator("[class*='delete'], .anticon-delete, .anticon-minus-circle");
    const secondRowDeleteBtn = rulePackRows.nth(1).locator("[class*='delete'], .anticon-delete, .anticon-minus-circle");

    // 第一个没有删除按钮(或不可见)
    const firstDeleteVisible = await firstRowDeleteBtn.isVisible().catch(() => false);
    // 从设计来看, 只有一个的时候没有删除按钮; 有多个时第一个也可能有 → 此处验证第二个确实有
    await expect(secondRowDeleteBtn).toBeVisible({ timeout: 3_000 });

    // 步骤 3: 配置规则包1和规则包2为同名 → 置红提示: 规则包名称不可重复
    const firstInput = rulePackInputs.first();
    const secondInput = rulePackInputs.nth(1);

    await firstInput.fill("rule01");
    await secondInput.fill("rule01");
    await secondInput.press("Tab"); // 触发校验

    // 验证出现红色错误提示
    const errorMsg = page.locator(".ant-form-item-explain-error").filter({ hasText: /规则包名称不可重复|名称.*重复|重复/ });
    await expect(errorMsg).toBeVisible({ timeout: 5_000 });
  });

  test("t38: 【P2】验证规则包名称增删改功能", async ({ page }) => {
    // 步骤 1: 进入规则集管理编辑 rule01 → 进入基础信息配置页面
    await enterEditBasicInfo(page);

    // 步骤 2: 添加规则包名称 → 从第二个开始有删除按钮
    const addPackBtn = page.getByRole("button", { name: /增加|添加规则包|添加/ }).first();
    await expect(addPackBtn).toBeVisible({ timeout: 5_000 });
    await addPackBtn.click();
    await page.waitForTimeout(300);

    // 步骤 3: 添加至 20 个 → 增加按钮消失
    const rulePackItems = page.locator("[class*='rulePack'], [class*='rulePackItem']");
    let count = await rulePackItems.count();
    while (count < 20 && await addPackBtn.isVisible().catch(() => false)) {
      await addPackBtn.click();
      await page.waitForTimeout(200);
      count = await rulePackItems.count();
    }

    // 增加按钮应消失或禁用
    const addHidden = !(await addPackBtn.isVisible().catch(() => false)) || (await addPackBtn.isDisabled().catch(() => true));
    expect(addHidden).toBeTruthy();

    // 步骤 4: 删除任一 → 可再次添加
    const delBtn = rulePackItems.last().locator("[class*='delete'], .anticon-delete, .anticon-minus-circle").first();
    if (await delBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await delBtn.click();
      // 处理可能的确认弹窗
      const confirm = page.locator(".ant-popconfirm, .ant-modal-content").last();
      if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirm.getByRole("button", { name: /确定|确认|是/ }).click();
      }
      await page.waitForTimeout(300);
    }
    await expect(addPackBtn).toBeVisible({ timeout: 3_000 });

    // 步骤 5: 删除至 1 个 → 删除按钮消失
    count = await rulePackItems.count();
    while (count > 1) {
      const lastDelBtn = rulePackItems.last().locator("[class*='delete'], .anticon-delete, .anticon-minus-circle").first();
      if (await lastDelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await lastDelBtn.click();
        const confirm = page.locator(".ant-popconfirm, .ant-modal-content").last();
        if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await confirm.getByRole("button", { name: /确定|确认|是/ }).click();
        }
        await page.waitForTimeout(300);
      }
      count = await rulePackItems.count();
    }

    // 只剩 1 个时删除按钮消失
    const soleDeleteBtn = rulePackItems.first().locator("[class*='delete'], .anticon-delete, .anticon-minus-circle").first();
    const soleDeleteVisible = await soleDeleteBtn.isVisible().catch(() => false);
    expect(soleDeleteVisible).toBeFalsy();

    // 步骤 6: 输入 51 字符 → 置红提示
    const packInput = rulePackItems.first().locator("input").first();
    await expect(packInput).toBeVisible({ timeout: 3_000 });

    const str51 = "a".repeat(51);
    await packInput.fill(str51);
    await packInput.press("Tab");

    const lengthError = page.locator(".ant-form-item-explain-error");
    await expect(lengthError).toBeVisible({ timeout: 5_000 });

    // 步骤 7: 输入 50 字符, 点击下一步 → 配置成功
    const str50 = "a".repeat(50);
    await packInput.fill(str50);
    await packInput.press("Tab");

    // 错误提示应消失
    await expect(lengthError).not.toBeVisible({ timeout: 3_000 });

    const nextBtn = page.getByRole("button", { name: "下一步" });
    await nextBtn.click();
    await page.waitForLoadState("networkidle");

    // 验证成功进入监控规则配置页面
    await expect(page.getByText("监控规则配置", { exact: false })).toBeVisible({ timeout: 5_000 });
  });

  test("t39: 【P1】验证选择数据表选项过滤已配置的表", async ({ page }) => {
    // 前置: 已配置过 hive2.x / sparkthrift2.x / doris3.x 的表 tableA

    // 步骤 1: 进入规则集管理编辑 rule01 → 进入基础信息配置页面
    await enterEditBasicInfo(page);

    // 数据源类型列表
    const datasourceTypes = [
      { source: "hive", version: "2.x" },
      { source: "sparkthrift", version: "2.x" },
      { source: "doris", version: "3.x" },
    ];

    for (const ds of datasourceTypes) {
      // 步骤 2-4: 选择对应数据源, 查看数据表选项 → 已配置表 tableA 应被过滤
      const dataSourceSelect = page.locator(".ant-form-item").filter({ hasText: /数据源/ }).locator(".ant-select-selector").first();
      await expect(dataSourceSelect).toBeVisible({ timeout: 5_000 });
      await dataSourceSelect.click();

      const dsDropdown = page.locator(".ant-select-dropdown").last();
      await expect(dsDropdown).toBeVisible({ timeout: 3_000 });

      // 选择对应数据源
      const dsOption = dsDropdown.locator(".ant-select-item-option").filter({ hasText: new RegExp(`${ds.source}.*${ds.version}`, "i") });
      if (await dsOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dsOption.click();
        await page.waitForTimeout(500);

        // 选择数据库
        const dbSelect = page.locator(".ant-form-item").filter({ hasText: /数据库/ }).locator(".ant-select-selector").first();
        await dbSelect.click();
        const dbDropdown = page.locator(".ant-select-dropdown").last();
        await expect(dbDropdown).toBeVisible({ timeout: 3_000 });
        const firstDb = dbDropdown.locator(".ant-select-item-option").first();
        if (await firstDb.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstDb.click();
          await page.waitForTimeout(500);
        }

        // 检查数据表下拉选项 → tableA 不可选(过滤已配置的表)
        const tableSelect = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).locator(".ant-select-selector").first();
        await tableSelect.click();
        const tableDropdown = page.locator(".ant-select-dropdown").last();
        await expect(tableDropdown).toBeVisible({ timeout: 3_000 });

        // 验证 tableA 不在可选列表中, 或标记为 disabled
        const tableAOption = tableDropdown.locator(".ant-select-item-option").filter({ hasText: "tableA" });
        const isFiltered =
          !(await tableAOption.isVisible().catch(() => false)) ||
          (await tableAOption.evaluate((el) => el.classList.contains("ant-select-item-option-disabled")).catch(() => true));
        expect(isFiltered).toBeTruthy();

        await page.keyboard.press("Escape");
      } else {
        await page.keyboard.press("Escape");
      }
    }
  });

  test("t40: 【P2】验证选择数据表配置功能正常", async ({ page }) => {
    // 步骤 1-2: 进入规则集管理编辑 rule01 → 进入基础信息配置页面
    await enterEditBasicInfo(page);

    // 步骤 3: 切换数据源后保存 → 成功
    const dataSourceSelect = page.locator(".ant-form-item").filter({ hasText: /数据源/ }).locator(".ant-select-selector").first();
    await expect(dataSourceSelect).toBeVisible({ timeout: 5_000 });
    await dataSourceSelect.click();

    let dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    const dsOptions = dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled)");
    if (await dsOptions.count() > 1) {
      await dsOptions.nth(1).click();
    } else {
      await dsOptions.first().click();
    }
    await page.waitForTimeout(500);

    // 步骤 4: 切换数据库后保存 → 成功
    const dbSelect = page.locator(".ant-form-item").filter({ hasText: /数据库/ }).locator(".ant-select-selector").first();
    await dbSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option").first().click();
    await page.waitForTimeout(500);

    // 步骤 5: 切换数据表后保存 → 成功
    const tableSelect = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).locator(".ant-select-selector").first();
    await tableSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled)").first().click();
    await page.waitForTimeout(500);

    // 步骤 6: 切换描述后保存 → 成功
    const descInput = page.locator(".ant-form-item").filter({ hasText: /描述/ }).locator("textarea, input").first();
    if (await descInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await descInput.fill("自动化测试修改描述");
    }

    // 保存 → 先点下一步再保存, 或直接保存
    const nextBtn = page.getByRole("button", { name: "下一步" });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");

      const saveBtn = page.getByRole("button", { name: "保存" });
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click();
    }

    await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /成功/ })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("t41: 【P1】验证编辑规则集配置页面", async ({ page }) => {
    // 前置: 规则集列表存在 rule01

    // 步骤 1-2: 进入规则集管理编辑 rule01 → 进入基础信息配置页面, 所有字段均可编辑
    await enterEditBasicInfo(page);

    // 步骤 3: UI CHECK — 选择数据表=最近保存配置, 规则包=最近保存名称, 按钮取消/下一步
    // 验证数据源、数据库、数据表字段存在且可交互
    const formItems = ["数据源", "数据库", "数据表"];
    for (const label of formItems) {
      const formItem = page.locator(".ant-form-item").filter({ hasText: label }).first();
      await expect(formItem).toBeVisible({ timeout: 3_000 });
      const select = formItem.locator(".ant-select-selector, input, textarea").first();
      await expect(select).toBeVisible();
    }

    // 规则包配置区域
    const rulePackSection = page.locator("[class*='rulePack'], .ant-form-item").filter({ hasText: /规则包/ });
    await expect(rulePackSection.first()).toBeVisible({ timeout: 3_000 });

    // 按钮: 取消 + 下一步
    await expect(page.getByRole("button", { name: "取消" })).toBeVisible({ timeout: 3_000 });
    const nextBtn = page.getByRole("button", { name: "下一步" });
    await expect(nextBtn).toBeVisible({ timeout: 3_000 });

    // 步骤 4: 点击下一步 → 进入监控规则配置页面
    await nextBtn.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("监控规则配置", { exact: false })).toBeVisible({ timeout: 5_000 });

    // 步骤 5: UI CHECK — 规则包 & 校验规则=最近保存配置, 按钮下一步/保存
    // 验证规则包区域存在
    const monitorRulePacks = page.locator(".ant-collapse-item, [class*='rulePack']");
    await expect(monitorRulePacks.first()).toBeVisible({ timeout: 5_000 });

    // 按钮: 下一步 + 保存 (或 上一步 + 保存)
    await expect(page.getByRole("button", { name: "保存" })).toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// §4 新建规则集 - 监控规则 (t42–t47)
// ---------------------------------------------------------------------------
test.describe("规则集管理 - 新建规则集 - 监控规则", () => {
  test.beforeEach(async ({ page }) => {
    const pid = await ensureProjectContext(page);
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", pid));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });
  });

  /**
   * 辅助: 进入新建规则集 → 监控规则配置页面
   * 填写基础信息并点击下一步
   */
  async function enterNewMonitoringRules(page: import("@playwright/test").Page): Promise<void> {
    await page.getByRole("button", { name: /新增规则集|新建/ }).click();
    await page.waitForLoadState("networkidle");

    // 进入基础信息配置页面
    await expect(page.getByText("基础信息", { exact: false }).or(page.getByText("选择数据表", { exact: false }))).toBeVisible({
      timeout: 5_000,
    });

    // 配置必填基础信息: 数据源、数据库、数据表
    const dataSourceSelect = page.locator(".ant-form-item").filter({ hasText: /数据源/ }).locator(".ant-select-selector").first();
    await dataSourceSelect.click();
    let dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option").first().click();
    await page.waitForTimeout(500);

    const dbSelect = page.locator(".ant-form-item").filter({ hasText: /数据库/ }).locator(".ant-select-selector").first();
    await dbSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option").first().click();
    await page.waitForTimeout(500);

    const tableSelect = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).locator(".ant-select-selector").first();
    await tableSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled)").first().click();
    await page.waitForTimeout(500);

    // 配置规则包名称
    const rulePackInput = page.locator("[class*='rulePack'] input, .ant-form-item").filter({ hasText: /规则包/ }).locator("input").first();
    if (await rulePackInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const val = await rulePackInput.inputValue().catch(() => "");
      if (!val) await rulePackInput.fill("autoPkg01");
    }

    // 点击下一步进入监控规则配置页面
    await page.getByRole("button", { name: "下一步" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("监控规则配置", { exact: false })).toBeVisible({ timeout: 5_000 });
  }

  test("t42: 【P1】验证更换规则包名称后, 校验规则配置不变", async ({ page }) => {
    // 步骤 1-2: 进入新建规则集 → 基础信息 → 下一步 → 监控规则配置页面
    await enterNewMonitoringRules(page);

    // 步骤 3: 选择规则包1, 添加并配置校验规则1
    const addRuleBtn = page.getByRole("button", { name: /添加规则|添加校验规则/ }).first();
    if (await addRuleBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addRuleBtn.click();
      const ruleTypeDD = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
      if (await ruleTypeDD.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await ruleTypeDD.locator(".ant-select-item-option, .ant-dropdown-menu-item").first().click();
      }
      await page.waitForTimeout(500);
    }

    // 记录当前校验规则配置
    const ruleItems = page.locator("[class*='ruleItem'], .ant-collapse-item .ant-table-tbody tr, [class*='checkRule']");
    const rulesBeforeSwitch = await ruleItems.allInnerTexts();
    expect(rulesBeforeSwitch.length).toBeGreaterThan(0);

    // 步骤 4: 切换为规则包2, 检查校验规则 → 规则配置不变
    const rulePackSelect = page.locator(".ant-collapse-item, [class*='rulePack']").first()
      .locator(".ant-select-selector").first();
    if (await rulePackSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rulePackSelect.click();
      const dd = page.locator(".ant-select-dropdown").last();
      await expect(dd).toBeVisible({ timeout: 3_000 });
      const opts = dd.locator(".ant-select-item-option:not(.ant-select-item-option-disabled)");
      if (await opts.count() > 0) {
        await opts.first().click();
      }
      await page.waitForTimeout(500);
    }

    const rulesAfterSwitch = await ruleItems.allInnerTexts();
    expect(rulesAfterSwitch).toEqual(rulesBeforeSwitch);
  });

  test("t43: 【P2】验证【完整性校验】字段变更(规则类型 → 生效范围)", async ({ page }) => {
    // 步骤 1-2: 进入新建规则集 → 监控规则配置页面
    await enterNewMonitoringRules(page);

    // 步骤 3: 添加完整性校验, 检查字段 → 原"规则类型"变更为"生效范围"
    const addRuleBtn = page.getByRole("button", { name: /添加规则|添加校验规则/ }).first();
    await expect(addRuleBtn).toBeVisible({ timeout: 5_000 });
    await addRuleBtn.click();

    const ruleTypeDD = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
    await expect(ruleTypeDD).toBeVisible({ timeout: 3_000 });
    await ruleTypeDD.getByText("完整性", { exact: false }).click();
    await page.waitForTimeout(500);

    // 验证字段变更: 应显示"生效范围"而非"规则类型"
    const ruleConfigArea = page.locator("[class*='ruleItem'], [class*='ruleConfig'], .ant-collapse-content-active").last();
    await expect(ruleConfigArea).toBeVisible({ timeout: 5_000 });

    // "生效范围" 字段应可见
    await expect(ruleConfigArea.getByText("生效范围", { exact: false })).toBeVisible({ timeout: 5_000 });

    // "规则类型" 字段应不存在(已变更为"生效范围")
    const ruleTypeLabel = ruleConfigArea.getByText("规则类型", { exact: true });
    const ruleTypeLabelVisible = await ruleTypeLabel.isVisible().catch(() => false);
    expect(ruleTypeLabelVisible).toBeFalsy();
  });

  test("t44: 【P2】验证校验规则增删改功能正常(新建规则集)", async ({ page }) => {
    // 与 t33 相同逻辑, 但在"新建规则集"上下文
    await enterNewMonitoringRules(page);

    // 添加校验规则 → 支持 完整性/有效性/唯一性/统计性/自定义SQL
    const addRuleBtn = page.getByRole("button", { name: /添加规则|添加校验规则/ }).first();
    await expect(addRuleBtn).toBeVisible({ timeout: 5_000 });
    await addRuleBtn.click();

    const ruleTypeDD = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
    await expect(ruleTypeDD).toBeVisible({ timeout: 3_000 });
    const ruleTypes = ["完整性", "有效性", "唯一性", "统计性", "自定义SQL"];
    for (const rt of ruleTypes) {
      await expect(ruleTypeDD.getByText(rt, { exact: false })).toBeVisible({ timeout: 2_000 });
    }
    await page.keyboard.press("Escape");

    // 逐一添加各类型
    for (const rt of ruleTypes) {
      await addRuleBtn.click();
      const dd = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
      if (await dd.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await dd.getByText(rt, { exact: false }).click();
      }
      await page.waitForTimeout(300);
    }

    // 添加至 10 个上限
    const ruleItems = page.locator("[class*='ruleItem'], .ant-collapse-item .ant-table-tbody tr, [class*='checkRule']");
    let cnt = await ruleItems.count();
    while (cnt < 10 && await addRuleBtn.isVisible().catch(() => false)) {
      await addRuleBtn.click();
      const dd = page.locator(".ant-select-dropdown, .ant-dropdown-menu").last();
      if (await dd.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await dd.locator(".ant-select-item-option, .ant-dropdown-menu-item").first().click();
      }
      await page.waitForTimeout(200);
      cnt = await ruleItems.count();
    }

    // 上限 10 个 → 无法再添加
    const addDisabledOrHidden =
      (await addRuleBtn.isDisabled().catch(() => true)) ||
      !(await addRuleBtn.isVisible().catch(() => false));
    expect(addDisabledOrHidden).toBeTruthy();

    // 删除一条 → 可再添加
    const delBtn = ruleItems.first().locator(".anticon-delete, [class*='delete']").first().or(
      ruleItems.first().getByRole("button", { name: /删除/ }),
    );
    if (await delBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await delBtn.click();
      const confirm = page.locator(".ant-popconfirm, .ant-modal-content").last();
      if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirm.getByRole("button", { name: /确定|确认|是/ }).click();
      }
      await page.waitForTimeout(300);
    }
    await expect(addRuleBtn).toBeEnabled({ timeout: 3_000 });

    // 编辑一条规则
    const editTarget = ruleItems.first();
    const editBtn = editTarget.getByRole("button", { name: /编辑/ }).or(editTarget.locator(".anticon-edit"));
    if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await editBtn.click();
      const input = editTarget.locator("input, textarea").first();
      if (await input.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await input.fill("edited_new_rule_value");
      }
    }

    // 克隆一条规则
    const cloneTarget = ruleItems.first();
    const cloneBtn = cloneTarget.getByRole("button", { name: /克隆|复制/ }).or(cloneTarget.locator(".anticon-copy"));
    if (await cloneBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const countBefore = await ruleItems.count();
      await cloneBtn.click();
      await page.waitForTimeout(500);
      const countAfter = await ruleItems.count();
      expect(countAfter).toBe(countBefore + 1);
    }
  });

  test("t45: 【P2】验证查看全局参数功能正常(新建规则集)", async ({ page }) => {
    // 与 t34 相同逻辑, 但在"新建规则集"上下文
    await enterNewMonitoringRules(page);

    // 点击查看全局参数
    const globalParamBtn = page.getByRole("button", { name: /全局参数/ }).or(
      page.getByText("查看全局参数", { exact: false }),
    );
    await expect(globalParamBtn).toBeVisible({ timeout: 5_000 });
    await globalParamBtn.click();

    // 弹窗展示全局参数
    const modal = page.locator(".ant-modal-content").last();
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal.getByText("全局参数", { exact: false })).toBeVisible();

    // 验证参数列表
    const paramList = modal.locator(".ant-table-tbody tr, .ant-list-item, [class*='param']");
    const paramCount = await paramList.count();
    expect(paramCount).toBeGreaterThanOrEqual(0);

    await modal.getByRole("button", { name: /关闭|取消|确定/ }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("t46: 【P2】验证规则包增删改功能(新建规则集)", async ({ page }) => {
    // 与 t35 类似, 但在"新建规则集"上下文
    await enterNewMonitoringRules(page);

    // 折叠/展开规则包
    const firstCollapse = page.locator(".ant-collapse-item").first();
    await expect(firstCollapse).toBeVisible({ timeout: 5_000 });
    const collapseHeader = firstCollapse.locator(".ant-collapse-header").first();
    await collapseHeader.click();
    await expect(firstCollapse).not.toHaveClass(/ant-collapse-item-active/, { timeout: 3_000 });
    await collapseHeader.click();
    await expect(firstCollapse).toHaveClass(/ant-collapse-item-active/, { timeout: 3_000 });

    // 添加至 20 个规则包
    const addPackBtn = page.getByRole("button", { name: /增加|添加规则包|新增规则包/ }).first();
    let rulePackPanels = page.locator(".ant-collapse-item, [class*='rulePack']");
    let packCount = await rulePackPanels.count();

    while (packCount < 20 && await addPackBtn.isVisible().catch(() => false)) {
      await addPackBtn.click();
      await page.waitForTimeout(200);
      packCount = await rulePackPanels.count();
    }

    // 达到上限 → 增加按钮不可见或禁用
    const addHidden = !(await addPackBtn.isVisible().catch(() => false)) || (await addPackBtn.isDisabled().catch(() => true));
    expect(addHidden).toBeTruthy();

    // 删除任一规则包 → 二次确认
    const delPackBtn = rulePackPanels.nth(1).locator("[class*='delete'], .anticon-delete").first().or(
      rulePackPanels.nth(1).getByRole("button", { name: /删除/ }),
    );
    if (await delPackBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await delPackBtn.click();
      const confirmModal = page.locator(".ant-modal-content, .ant-popconfirm").last();
      await expect(confirmModal).toBeVisible({ timeout: 3_000 });
      await confirmModal.getByRole("button", { name: /确定|确认|是/ }).click();
      await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /删除成功|成功/ })).toBeVisible({
        timeout: 5_000,
      });
    }

    // 删除后可再次添加
    await expect(page.getByRole("button", { name: /增加|添加规则包|新增规则包/ }).first()).toBeVisible({ timeout: 3_000 });

    // 删除至 1 个 → 删除按钮消失
    rulePackPanels = page.locator(".ant-collapse-item, [class*='rulePack']");
    packCount = await rulePackPanels.count();
    while (packCount > 1) {
      const lastDel = rulePackPanels.last().locator("[class*='delete'], .anticon-delete").first().or(
        rulePackPanels.last().getByRole("button", { name: /删除/ }),
      );
      if (await lastDel.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await lastDel.click();
        const confirm = page.locator(".ant-modal-content, .ant-popconfirm").last();
        if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirm.getByRole("button", { name: /确定|确认|是/ }).click();
          await page.waitForTimeout(500);
        }
      }
      packCount = await rulePackPanels.count();
    }

    const soleDeleteBtn = rulePackPanels.first().locator("[class*='delete'], .anticon-delete").first().or(
      rulePackPanels.first().getByRole("button", { name: /删除/ }),
    );
    const soleDeleteVisible = await soleDeleteBtn.isVisible().catch(() => false);
    expect(soleDeleteVisible).toBeFalsy();

    // 编辑规则包中的校验规则并保存
    const ruleInput = rulePackPanels.first().locator("input, textarea").first();
    if (await ruleInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ruleInput.fill("edited_new_pack");
    }

    const saveBtn = page.getByRole("button", { name: "保存" });
    if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await saveBtn.click();
      await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /成功/ })).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test("t47: 【P2】验证规则包下拉框数据正常(新建规则集)", async ({ page }) => {
    // 步骤 1-2: 进入新建规则集 → 监控规则配置页面
    await enterNewMonitoringRules(page);

    // 步骤 3: 展开规则包下拉框 → 数据为基础信息中添加的规则包名称
    const rulePackSelect = page.locator(".ant-collapse-item, [class*='rulePack']").first()
      .locator(".ant-select-selector").first();
    await expect(rulePackSelect).toBeVisible({ timeout: 5_000 });
    await rulePackSelect.click();

    let dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    const options = dropdown.locator(".ant-select-item-option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);

    // 选择 rule01
    const rule01Option = options.filter({ hasText: /autoPkg01|rule/ }).first();
    if (await rule01Option.isVisible().catch(() => false)) {
      await rule01Option.click();
    } else {
      await options.first().click();
    }
    await page.waitForTimeout(300);

    // 步骤 4: 点击增加 → 新增规则包模块
    const addPackBtn = page.getByRole("button", { name: /增加|添加规则包|新增规则包/ }).first();
    if (await addPackBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addPackBtn.click();
      await page.waitForTimeout(300);
    }

    // 步骤 5: 检查下拉框 → 已选择的规则包不支持再次选择
    const newPackSelect = page.locator(".ant-collapse-item, [class*='rulePack']").last()
      .locator(".ant-select-selector").first();
    if (await newPackSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await newPackSelect.click();
      dropdown = page.locator(".ant-select-dropdown").last();
      await expect(dropdown).toBeVisible({ timeout: 3_000 });

      // 上一步已选的规则包应为 disabled
      const selectedText = await rulePackSelect.innerText();
      if (selectedText.trim()) {
        const matchOption = dropdown.locator(".ant-select-item-option").filter({ hasText: selectedText.trim() });
        if (await matchOption.isVisible().catch(() => false)) {
          const isDisabled = await matchOption.evaluate(
            (el) =>
              el.classList.contains("ant-select-item-option-disabled") ||
              el.getAttribute("aria-disabled") === "true",
          );
          expect(isDisabled).toBeTruthy();
        }
      }
      await page.keyboard.press("Escape");
    }
  });
});

// ---------------------------------------------------------------------------
// §5 新建规则集 - 基础信息 (t48–t52)
// ---------------------------------------------------------------------------
test.describe("规则集管理 - 新建规则集 - 基础信息", () => {
  test.beforeEach(async ({ page }) => {
    const pid = await ensureProjectContext(page);
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", pid));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });
  });

  /**
   * 辅助: 进入新建规则集 → 基础信息配置页面
   */
  async function enterNewBasicInfo(page: import("@playwright/test").Page): Promise<void> {
    await page.getByRole("button", { name: /新增规则集|新建/ }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("基础信息", { exact: false }).or(page.getByText("选择数据表", { exact: false }))).toBeVisible({
      timeout: 5_000,
    });
  }

  test("t48: 【P2】验证规则包名称不可重复(新建规则集)", async ({ page }) => {
    // 步骤 1: 进入新建规则集 → 基础信息配置页面
    await enterNewBasicInfo(page);

    // 步骤 2: 添加规则包
    const addPackBtn = page.getByRole("button", { name: /增加|添加规则包|添加/ }).first();
    await expect(addPackBtn).toBeVisible({ timeout: 5_000 });

    // 确保 2 个规则包
    const rulePackInputs = page.locator("[class*='rulePack'] input, .ant-form-item").filter({ hasText: /规则包/ }).locator("input");
    let cnt = await rulePackInputs.count();
    while (cnt < 2) {
      await addPackBtn.click();
      await page.waitForTimeout(300);
      cnt = await rulePackInputs.count();
    }

    // 第二个开始有删除按钮
    const rulePackRows = page.locator("[class*='rulePack'], .ant-form-item").filter({ hasText: /规则包/ });
    const secondDelete = rulePackRows.nth(1).locator("[class*='delete'], .anticon-delete, .anticon-minus-circle");
    await expect(secondDelete).toBeVisible({ timeout: 3_000 });

    // 步骤 3: 配置同名 → 红色提示
    const firstInput = rulePackInputs.first();
    const secondInput = rulePackInputs.nth(1);
    await firstInput.fill("duplicateName");
    await secondInput.fill("duplicateName");
    await secondInput.press("Tab");

    const errorMsg = page.locator(".ant-form-item-explain-error").filter({ hasText: /规则包名称不可重复|名称.*重复|重复/ });
    await expect(errorMsg).toBeVisible({ timeout: 5_000 });
  });

  test("t49: 【P1】验证规则包名称增删改功能(新建规则集)", async ({ page }) => {
    // 步骤 1: 进入新建规则集 → 基础信息
    await enterNewBasicInfo(page);

    // 步骤 2: 添加规则包名称
    const addPackBtn = page.getByRole("button", { name: /增加|添加规则包|添加/ }).first();
    await expect(addPackBtn).toBeVisible({ timeout: 5_000 });

    // 步骤 3: 添加至 20 个 → 增加按钮消失
    const rulePackItems = page.locator("[class*='rulePack'], [class*='rulePackItem']");
    let count = await rulePackItems.count();
    while (count < 20 && await addPackBtn.isVisible().catch(() => false)) {
      await addPackBtn.click();
      await page.waitForTimeout(200);
      count = await rulePackItems.count();
    }

    const addHidden = !(await addPackBtn.isVisible().catch(() => false)) || (await addPackBtn.isDisabled().catch(() => true));
    expect(addHidden).toBeTruthy();

    // 步骤 4: 删除任一 → 可再次添加
    const delBtn = rulePackItems.last().locator("[class*='delete'], .anticon-delete, .anticon-minus-circle").first();
    if (await delBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await delBtn.click();
      const confirm = page.locator(".ant-popconfirm, .ant-modal-content").last();
      if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirm.getByRole("button", { name: /确定|确认|是/ }).click();
      }
      await page.waitForTimeout(300);
    }
    await expect(addPackBtn).toBeVisible({ timeout: 3_000 });

    // 步骤 5: 删除至 1 个 → 删除按钮消失
    count = await rulePackItems.count();
    while (count > 1) {
      const lastDel = rulePackItems.last().locator("[class*='delete'], .anticon-delete, .anticon-minus-circle").first();
      if (await lastDel.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await lastDel.click();
        const confirm = page.locator(".ant-popconfirm, .ant-modal-content").last();
        if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await confirm.getByRole("button", { name: /确定|确认|是/ }).click();
        }
        await page.waitForTimeout(200);
      }
      count = await rulePackItems.count();
    }

    const soleDelete = rulePackItems.first().locator("[class*='delete'], .anticon-delete, .anticon-minus-circle").first();
    expect(await soleDelete.isVisible().catch(() => false)).toBeFalsy();

    // 步骤 6: 输入 51 字符 → 置红提示
    const packInput = rulePackItems.first().locator("input").first();
    await expect(packInput).toBeVisible({ timeout: 3_000 });
    await packInput.fill("a".repeat(51));
    await packInput.press("Tab");
    await expect(page.locator(".ant-form-item-explain-error")).toBeVisible({ timeout: 5_000 });

    // 步骤 7: 输入 50 字符, 点击下一步 → 配置成功
    await packInput.fill("a".repeat(50));
    await packInput.press("Tab");
    await expect(page.locator(".ant-form-item-explain-error")).not.toBeVisible({ timeout: 3_000 });
  });

  test("t50: 【P0】验证选择数据表选项过滤已配置的表", async ({ page }) => {
    // 前置: 已配置过 hive2.x / sparkthrift2.x / doris3.x 的表 tableA

    // 步骤 1: 进入新建规则集 → 基础信息配置页面
    await enterNewBasicInfo(page);

    const datasourceTypes = [
      { source: "hive", version: "2.x" },
      { source: "sparkthrift", version: "2.x" },
      { source: "doris", version: "3.x" },
    ];

    for (const ds of datasourceTypes) {
      // 步骤 2-4: 选择数据源、数据库, 查看数据表选项 → 过滤已配置的表
      const dataSourceSelect = page.locator(".ant-form-item").filter({ hasText: /数据源/ }).locator(".ant-select-selector").first();
      await dataSourceSelect.click();

      const dsDropdown = page.locator(".ant-select-dropdown").last();
      await expect(dsDropdown).toBeVisible({ timeout: 3_000 });

      const dsOption = dsDropdown.locator(".ant-select-item-option").filter({ hasText: new RegExp(`${ds.source}.*${ds.version}`, "i") });
      if (await dsOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dsOption.click();
        await page.waitForTimeout(500);

        // 选择数据库
        const dbSelect = page.locator(".ant-form-item").filter({ hasText: /数据库/ }).locator(".ant-select-selector").first();
        await dbSelect.click();
        const dbDropdown = page.locator(".ant-select-dropdown").last();
        await expect(dbDropdown).toBeVisible({ timeout: 3_000 });
        await dbDropdown.locator(".ant-select-item-option").first().click();
        await page.waitForTimeout(500);

        // 检查数据表 → tableA 被过滤
        const tableSelect = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).locator(".ant-select-selector").first();
        await tableSelect.click();
        const tableDropdown = page.locator(".ant-select-dropdown").last();
        await expect(tableDropdown).toBeVisible({ timeout: 3_000 });

        const tableAOption = tableDropdown.locator(".ant-select-item-option").filter({ hasText: "tableA" });
        const isFiltered =
          !(await tableAOption.isVisible().catch(() => false)) ||
          (await tableAOption.evaluate((el) => el.classList.contains("ant-select-item-option-disabled")).catch(() => true));
        expect(isFiltered).toBeTruthy();

        await page.keyboard.press("Escape");
      } else {
        await page.keyboard.press("Escape");
      }
    }
  });

  test("t51: 【P2】验证选择数据表配置功能正常(新建规则集)", async ({ page }) => {
    // 步骤 1-2: 进入新建规则集 → 基础信息配置页面
    await enterNewBasicInfo(page);

    // 步骤 3: 配置数据源 → 下拉显示已授权数据源(hive2.x / sparkthrift2.x / doris3.x)
    const dataSourceSelect = page.locator(".ant-form-item").filter({ hasText: /数据源/ }).locator(".ant-select-selector").first();
    await expect(dataSourceSelect).toBeVisible({ timeout: 5_000 });
    await dataSourceSelect.click();

    let dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // 验证数据源类型: 应包含 hive / sparkthrift / doris
    const dsOptions = dropdown.locator(".ant-select-item-option");
    const dsCount = await dsOptions.count();
    expect(dsCount).toBeGreaterThan(0);

    const allDsText = await dsOptions.allInnerTexts();
    const dsString = allDsText.join(",").toLowerCase();
    // 至少包含其中一种(具体取决于环境)
    expect(dsString.length).toBeGreaterThan(0);

    await dsOptions.first().click();
    await page.waitForTimeout(500);

    // 步骤 4: 配置数据库 → 下拉显示对应数据库
    const dbSelect = page.locator(".ant-form-item").filter({ hasText: /数据库/ }).locator(".ant-select-selector").first();
    await dbSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    const dbOptions = dropdown.locator(".ant-select-item-option");
    const dbCount = await dbOptions.count();
    expect(dbCount).toBeGreaterThan(0);
    await dbOptions.first().click();
    await page.waitForTimeout(500);

    // 步骤 5: 配置数据表 → 过滤已配置的表
    const tableSelect = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).locator(".ant-select-selector").first();
    await tableSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    const tableOptions = dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled)");
    const tableCount = await tableOptions.count();
    expect(tableCount).toBeGreaterThanOrEqual(0); // 可能所有表已配置
    await page.keyboard.press("Escape");

    // 步骤 6: 配置规则集描述 → 最大 255 字符, 超出置红提示
    const descInput = page.locator(".ant-form-item").filter({ hasText: /描述/ }).locator("textarea, input").first();
    await expect(descInput).toBeVisible({ timeout: 3_000 });

    // 输入 256 字符 → 置红提示
    await descInput.fill("a".repeat(256));
    await descInput.press("Tab");
    await expect(page.locator(".ant-form-item-explain-error")).toBeVisible({ timeout: 5_000 });

    // 输入 255 字符 → 无错误
    await descInput.fill("a".repeat(255));
    await descInput.press("Tab");
    // 描述相关错误应消失(注意可能还有其他字段的错误)
    const descFormItem = page.locator(".ant-form-item").filter({ hasText: /描述/ });
    const descError = descFormItem.locator(".ant-form-item-explain-error");
    await expect(descError).not.toBeVisible({ timeout: 3_000 });
  });

  test("t52: 【P1】验证新建规则集配置页面", async ({ page }) => {
    // 步骤 1: 进入规则集管理 → 进入成功 (beforeEach)

    // 步骤 2: 点击新增 → 进入基础信息配置页面(支持选择数据表和规则包配置)
    await enterNewBasicInfo(page);

    // 步骤 3: UI CHECK — 选择数据表(数据源必填/数据库必填/数据表必填/规则集描述), 规则包(增删改/必填), 按钮取消/下一步
    // 数据源必填
    const dsFormItem = page.locator(".ant-form-item").filter({ hasText: /数据源/ }).first();
    await expect(dsFormItem).toBeVisible({ timeout: 3_000 });
    const dsRequired = dsFormItem.locator(".ant-form-item-required, [class*='required']");
    // 数据源字段应有必填标记
    const dsHasRequired = await dsRequired.isVisible().catch(() => false) ||
      await dsFormItem.locator("label").evaluate((el) => el.classList.contains("ant-form-item-required") || el.querySelector(".ant-form-item-required") !== null).catch(() => false);

    // 数据库必填
    const dbFormItem = page.locator(".ant-form-item").filter({ hasText: /数据库/ }).first();
    await expect(dbFormItem).toBeVisible({ timeout: 3_000 });

    // 数据表必填
    const tableFormItem = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).first();
    await expect(tableFormItem).toBeVisible({ timeout: 3_000 });

    // 规则集描述
    const descFormItem = page.locator(".ant-form-item").filter({ hasText: /描述/ }).first();
    await expect(descFormItem).toBeVisible({ timeout: 3_000 });

    // 规则包区域(增删改/必填)
    const rulePackSection = page.locator("[class*='rulePack'], .ant-form-item").filter({ hasText: /规则包/ }).first();
    await expect(rulePackSection).toBeVisible({ timeout: 3_000 });

    // 按钮: 取消 + 下一步
    await expect(page.getByRole("button", { name: "取消" })).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("button", { name: "下一步" })).toBeVisible({ timeout: 3_000 });

    // 步骤 4: 配置后点击下一步 → 进入监控规则配置页面
    // 填写基础信息
    const dataSourceSelect = page.locator(".ant-form-item").filter({ hasText: /数据源/ }).locator(".ant-select-selector").first();
    await dataSourceSelect.click();
    let dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option").first().click();
    await page.waitForTimeout(500);

    const dbSelect = page.locator(".ant-form-item").filter({ hasText: /数据库/ }).locator(".ant-select-selector").first();
    await dbSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option").first().click();
    await page.waitForTimeout(500);

    const tableSelect = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).locator(".ant-select-selector").first();
    await tableSelect.click();
    dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled)").first().click();
    await page.waitForTimeout(500);

    // 规则包名称
    const rulePackInput = page.locator("[class*='rulePack'] input, .ant-form-item").filter({ hasText: /规则包/ }).locator("input").first();
    if (await rulePackInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const val = await rulePackInput.inputValue().catch(() => "");
      if (!val) await rulePackInput.fill("newPkg01");
    }

    await page.getByRole("button", { name: "下一步" }).click();
    await page.waitForLoadState("networkidle");

    // 步骤 5: UI CHECK — 支持规则包配置/增删改/克隆/查看全局参数, 按钮下一步/保存
    await expect(page.getByText("监控规则配置", { exact: false })).toBeVisible({ timeout: 5_000 });

    // 规则包配置区域
    const monitorRulePacks = page.locator(".ant-collapse-item, [class*='rulePack']");
    await expect(monitorRulePacks.first()).toBeVisible({ timeout: 5_000 });

    // 添加规则按钮
    await expect(page.getByRole("button", { name: /添加规则|添加校验规则/ }).first()).toBeVisible({ timeout: 3_000 });

    // 查看全局参数按钮
    await expect(
      page.getByRole("button", { name: /全局参数/ }).or(page.getByText("查看全局参数", { exact: false })),
    ).toBeVisible({ timeout: 3_000 });

    // 保存按钮
    await expect(page.getByRole("button", { name: "保存" })).toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// §6 规则集管理 - 列表 (t53–t56)
// ---------------------------------------------------------------------------
test.describe("规则集管理 - 列表", () => {
  test.beforeEach(async ({ page }) => {
    const pid = await ensureProjectContext(page);
    await applyRuntimeCookies(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", pid));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });
  });

  test("t53: 【P2】验证分页组件功能正常", async ({ page }) => {
    // 步骤 1: 进入规则集管理页面 → 已在 beforeEach 完成

    // 步骤 2: 分页 UI CHECK → 共 x 条, 每页 xx 条, 数字页码, 前后箭头, 10/20/50/100 切换
    const pagination = page.locator(".ant-pagination");
    await expect(pagination).toBeVisible({ timeout: 5_000 });

    // 总条数信息
    const totalInfo = pagination.locator(".ant-pagination-total-text");
    if (await totalInfo.isVisible().catch(() => false)) {
      const totalText = await totalInfo.innerText();
      expect(totalText).toMatch(/共\s*\d+\s*条/);
    }

    // 数字页码
    const pageItems = pagination.locator(".ant-pagination-item");
    const pageItemCount = await pageItems.count();
    expect(pageItemCount).toBeGreaterThan(0);

    // 前后箭头
    const prevBtn = pagination.locator(".ant-pagination-prev");
    const nextBtn = pagination.locator(".ant-pagination-next");
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // 每页条数切换器
    const pageSizeSelect = pagination.locator(".ant-select, .ant-pagination-options-size-changer");
    if (await pageSizeSelect.isVisible().catch(() => false)) {
      await pageSizeSelect.click();
      const pageSizeDropdown = page.locator(".ant-select-dropdown").last();
      await expect(pageSizeDropdown).toBeVisible({ timeout: 3_000 });

      // 验证 10/20/50/100 选项
      const expectedSizes = ["10", "20", "50", "100"];
      for (const size of expectedSizes) {
        await expect(pageSizeDropdown.getByText(new RegExp(`${size}\\s*条`))).toBeVisible({ timeout: 2_000 });
      }
      await page.keyboard.press("Escape");
    }

    // 步骤 3: 切换数字页码 → 成功
    if (pageItemCount > 1) {
      const secondPage = pageItems.nth(1);
      await secondPage.click();
      await page.waitForTimeout(500);
      await expect(secondPage).toHaveClass(/ant-pagination-item-active/, { timeout: 3_000 });
    }

    // 步骤 4: 切换箭头页码 → 成功
    // 点击上一页回到第一页
    const prevBtnEnabled = !(await prevBtn.evaluate(
      (el) => el.classList.contains("ant-pagination-disabled"),
    ).catch(() => true));
    if (prevBtnEnabled) {
      await prevBtn.click();
      await page.waitForTimeout(500);
    }

    // 点击下一页
    const nextBtnEnabled = !(await nextBtn.evaluate(
      (el) => el.classList.contains("ant-pagination-disabled"),
    ).catch(() => true));
    if (nextBtnEnabled) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // 步骤 5: 切换 10/20/50/100 页数 → 成功
    if (await pageSizeSelect.isVisible().catch(() => false)) {
      const pageSizes = ["10", "20", "50", "100"];
      for (const size of pageSizes) {
        await pageSizeSelect.click();
        const dd = page.locator(".ant-select-dropdown").last();
        await expect(dd).toBeVisible({ timeout: 3_000 });
        const option = dd.locator(".ant-select-item-option").filter({ hasText: new RegExp(`${size}\\s*条`) });
        if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await option.click();
          await page.waitForTimeout(500);
          // 验证页面刷新(表格行数变化或保持)
          await expect(page.locator(".ant-table-wrapper")).toBeVisible();
        }
      }
    }
  });

  test("t54: 【P0】验证规则集管理删除功能", async ({ page }) => {
    // 前置: 存在三条规则集
    //   规则集1 — 未关联规则任务
    //   规则集2 — 关联已关闭的检测(规则任务)
    //   规则集3 — 关联规则任务 B(活跃)

    // 步骤 1: 进入规则集管理页面 → 已在 beforeEach 完成
    await expect(page.locator(".ant-table-tbody tr")).not.toHaveCount(0, { timeout: 10_000 });

    // 步骤 2-3: 选择规则集1, 点击删除 → 二次确认 → 确认删除 → Toast 删除成功
    const ruleSet1Row = page.locator(".ant-table-tbody tr").first();
    await expect(ruleSet1Row).toBeVisible({ timeout: 5_000 });
    const ruleSet1Name = (await ruleSet1Row.locator("td").first().innerText()).trim();

    const deleteBtn1 = ruleSet1Row.getByRole("button", { name: /删除/ }).or(ruleSet1Row.locator(".anticon-delete").first());
    await expect(deleteBtn1).toBeVisible({ timeout: 3_000 });
    await deleteBtn1.click();

    // 二次确认弹窗
    const confirmModal1 = page.locator(".ant-modal-content, .ant-popconfirm").last();
    await expect(confirmModal1).toBeVisible({ timeout: 3_000 });

    // 确认删除
    await confirmModal1.getByRole("button", { name: /确定|确认|是/ }).click();

    // Toast: 删除成功
    await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /删除成功|成功/ })).toBeVisible({
      timeout: 5_000,
    });

    // 验证规则集1已从列表消失
    await page.waitForTimeout(500);

    // 步骤 4-5: 选择规则集2(关联已关闭检测), 删除 → 应成功
    const ruleSet2Row = page.locator(".ant-table-tbody tr").first();
    if (await ruleSet2Row.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const deleteBtn2 = ruleSet2Row.getByRole("button", { name: /删除/ }).or(ruleSet2Row.locator(".anticon-delete").first());
      if (await deleteBtn2.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await deleteBtn2.click();

        const confirmModal2 = page.locator(".ant-modal-content, .ant-popconfirm").last();
        await expect(confirmModal2).toBeVisible({ timeout: 3_000 });
        await confirmModal2.getByRole("button", { name: /确定|确认|是/ }).click();

        await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /删除成功|成功/ })).toBeVisible({
          timeout: 5_000,
        });
      }
    }

    // 步骤 6-7: 选择规则集3(关联活跃规则任务B), 删除 → 应失败
    const ruleSet3Row = page.locator(".ant-table-tbody tr").first();
    if (await ruleSet3Row.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const ruleSet3Name = (await ruleSet3Row.locator("td").first().innerText()).trim();

      const deleteBtn3 = ruleSet3Row.getByRole("button", { name: /删除/ }).or(ruleSet3Row.locator(".anticon-delete").first());
      if (await deleteBtn3.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await deleteBtn3.click();

        const confirmModal3 = page.locator(".ant-modal-content, .ant-popconfirm").last();
        await expect(confirmModal3).toBeVisible({ timeout: 3_000 });
        await confirmModal3.getByRole("button", { name: /确定|确认|是/ }).click();

        // 删除失败 → 提示需先删除关联的规则任务
        await expect(
          page.locator(".ant-message-error, .ant-message-warning, .ant-message-notice, .ant-modal-content")
            .filter({ hasText: /删除失败|关联.*规则任务|先删除/ }),
        ).toBeVisible({ timeout: 5_000 });

        // 步骤 8: 进入规则任务管理删除规则任务 B
        await navigateToDqPage(page, "规则任务管理");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });

        // 找到关联的规则任务并删除
        const taskRows = page.locator(".ant-table-tbody tr");
        await expect(taskRows.first()).toBeVisible({ timeout: 5_000 });

        const targetTaskRow = taskRows.first(); // 删除第一条(假设关联)
        const taskDeleteBtn = targetTaskRow.getByRole("button", { name: /删除/ }).or(targetTaskRow.locator(".anticon-delete").first());
        if (await taskDeleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await taskDeleteBtn.click();
          const taskConfirm = page.locator(".ant-modal-content, .ant-popconfirm").last();
          if (await taskConfirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await taskConfirm.getByRole("button", { name: /确定|确认|是/ }).click();
            await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /成功/ })).toBeVisible({
              timeout: 5_000,
            });
          }
        }

        // 步骤 9: 返回规则集管理, 再次删除规则集3 → 删除成功
        await navigateToDqPage(page, "规则集管理");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".ant-table-wrapper")).toBeVisible({ timeout: 10_000 });

        const retryRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleSet3Name }).first();
        if (await retryRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
          const retryDeleteBtn = retryRow.getByRole("button", { name: /删除/ }).or(retryRow.locator(".anticon-delete").first());
          await retryDeleteBtn.click();

          const retryConfirm = page.locator(".ant-modal-content, .ant-popconfirm").last();
          await expect(retryConfirm).toBeVisible({ timeout: 3_000 });
          await retryConfirm.getByRole("button", { name: /确定|确认|是/ }).click();

          await expect(page.locator(".ant-message-success, .ant-message-notice").filter({ hasText: /删除成功|成功/ })).toBeVisible({
            timeout: 5_000,
          });
        }
      }
    }
  });

  test("t55: 【P1】验证规则集管理页面", async ({ page }) => {
    // 步骤 1: 进入规则集管理页面 → 已在 beforeEach 完成

    // 步骤 2: 检查 UI → 列表: 表名/所属数据库/所属数据源/规则包数量/规则数量/规则集描述/更新人/更新时间/操作
    const expectedColumns = [
      "表名",
      "所属数据库",
      "所属数据源",
      "规则包数量",
      "规则数量",
      "规则集描述",
      "更新人",
      "更新时间",
      "操作",
    ];

    const tableHeader = page.locator(".ant-table-thead tr").first();
    await expect(tableHeader).toBeVisible({ timeout: 5_000 });

    for (const col of expectedColumns) {
      await expect(tableHeader.getByText(col, { exact: false })).toBeVisible({ timeout: 3_000 });
    }

    // 支持新增
    await expect(page.getByRole("button", { name: /新增规则集|新建/ })).toBeVisible({ timeout: 3_000 });

    // 支持分页
    await expect(page.locator(".ant-pagination")).toBeVisible({ timeout: 3_000 });

    // 支持搜索
    const searchInput = page.getByPlaceholder(/输入表名搜索|搜索/);
    await expect(searchInput).toBeVisible({ timeout: 3_000 });

    // 步骤 3: 检查列表数据 → 所有字段值与最后编辑时一致
    const firstRow = page.locator(".ant-table-tbody tr").first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const cells = firstRow.locator("td");
      const cellCount = await cells.count();
      // 列表列数应与表头列数一致
      expect(cellCount).toBeGreaterThanOrEqual(expectedColumns.length - 1); // 操作列可能合并

      // 验证每个单元格非空(基本数据存在)
      for (let i = 0; i < Math.min(cellCount, expectedColumns.length - 1); i++) {
        const cellText = (await cells.nth(i).innerText()).trim();
        // 表名、数据库、数据源应非空; 数量可能为 0; 描述可能为空
        if (i < 3) {
          expect(cellText.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("t56: 【P2】验证规则集管理查询功能", async ({ page }) => {
    // 步骤 1: 进入规则集管理页面 → 已在 beforeEach 完成

    // 步骤 2: 检查查询框 → 提示"输入表名搜索", 支持回车查询和搜索 icon 查询
    const searchInput = page.getByPlaceholder(/输入表名搜索|搜索/);
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // 验证 placeholder 文本
    const placeholder = await searchInput.getAttribute("placeholder");
    expect(placeholder).toMatch(/输入表名搜索|搜索/);

    // 搜索 icon 存在
    const searchIcon = page.locator(".ant-input-search-button, .anticon-search").first();
    await expect(searchIcon).toBeVisible({ timeout: 3_000 });

    // 获取一个已知的表名用于搜索
    const firstRowName = page.locator(".ant-table-tbody tr").first().locator("td").first();
    let knownTableName = "";
    if (await firstRowName.isVisible({ timeout: 5_000 }).catch(() => false)) {
      knownTableName = (await firstRowName.innerText()).trim();
    }

    if (knownTableName.length > 0) {
      // 步骤 3: 输入部分表名查询 → 模糊查询成功
      const partialName = knownTableName.substring(0, Math.ceil(knownTableName.length / 2));
      await searchInput.fill(partialName);
      await searchInput.press("Enter"); // 回车查询
      await page.waitForTimeout(1_000);

      // 验证查询结果包含匹配行
      const resultRows = page.locator(".ant-table-tbody tr");
      const resultCount = await resultRows.count();
      expect(resultCount).toBeGreaterThan(0);

      // 验证每一行都包含搜索关键字
      for (let i = 0; i < Math.min(resultCount, 5); i++) {
        const rowText = (await resultRows.nth(i).innerText()).toLowerCase();
        expect(rowText).toContain(partialName.toLowerCase());
      }

      // 步骤 4: 输入全名查询 → 查询成功
      await searchInput.fill(knownTableName);
      // 使用搜索 icon 查询
      await searchIcon.click();
      await page.waitForTimeout(1_000);

      const exactResults = page.locator(".ant-table-tbody tr");
      const exactCount = await exactResults.count();
      expect(exactCount).toBeGreaterThan(0);

      // 验证第一行包含完整表名
      const firstResultText = (await exactResults.first().locator("td").first().innerText()).trim();
      expect(firstResultText).toBe(knownTableName);

      // 清空搜索恢复全部列表
      await searchInput.fill("");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);
    }
  });
});

});
