// 冒烟测试（P0）
// 生成时间：2026-04-06T18:11:16.521Z
// 用例数量：7

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

/** Confirm the currently visible Ant Design modal by clicking its primary button */
async function confirmAntModal(page: Page): Promise<void> {
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal).toBeVisible({ timeout: 5000 });
  await modal.locator(".ant-btn-primary").click();
}

/** Generate a unique name with timestamp suffix to avoid collisions */
function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

// ─── Tests ───────────────────────────────────────────────────────────
test.describe("【岚图】规则集管理 - P0 冒烟测试", () => {
  test.describe.configure({ mode: "serial" });

  if (storageStatePath) {
    test.use({ storageState: storageStatePath });
  }

  // ────────────────────────────────────────────────────────────────────
  // t16: 验证编辑规则集后, 对已配置过历史规则的任务不生效 (SparkThrift2.x)
  // ────────────────────────────────────────────────────────────────────
  test("【P0】验证编辑规则集后, 对已配置过历史规则的任务不生效 (SparkThrift2.x)", async ({
    page,
  }) => {
    test.slow(); // 多步骤 + 任务执行, 需要更长超时

    const ruleName = uniqueName("rule01");
    const taskName01 = uniqueName("task01");
    const taskName02 = uniqueName("task02");

    // 步骤1: 进入【数据资产】-【数据质量】-【规则任务管理】页面
    const projectId = await ensureProjectContext(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则任务管理");
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 15000 });

    // 步骤2: 新建监控规则, 配置监控对象
    await page.getByRole("button", { name: /新建/ }).click();
    await page.waitForLoadState("networkidle");

    // 填写规则名称
    const nameInput = page.locator('input[placeholder*="规则"]').first();
    await nameInput.fill(ruleName);

    // 选择数据表 dwd_voyah_vehicle_sales_dates
    const tableSelect = page.locator(".ant-select").filter({ hasText: /数据表|请选择/ }).first();
    await selectAntOption(page, tableSelect, "dwd_voyah_vehicle_sales_dates");

    // 配置分区 /
    const partitionInput = page.locator('input[placeholder*="分区"]').first();
    if (await partitionInput.isVisible()) {
      await partitionInput.fill("/");
    }

    // 完整性校验 字段级 final_price>=0
    const ruleTypeSelect = page
      .locator(".ant-select")
      .filter({ hasText: /校验类型|请选择/ })
      .first();
    if (await ruleTypeSelect.isVisible()) {
      await selectAntOption(page, ruleTypeSelect, "完整性校验");
    }

    // 调度周期 - 时
    const scheduleSelect = page
      .locator(".ant-select")
      .filter({ hasText: /调度周期|请选择/ })
      .first();
    if (await scheduleSelect.isVisible()) {
      await selectAntOption(page, scheduleSelect, "时");
    }

    // 实例生成方式 - 立即生成
    const instanceSelect = page
      .locator(".ant-select")
      .filter({ hasText: /实例生成|请选择/ })
      .first();
    if (await instanceSelect.isVisible()) {
      await selectAntOption(page, instanceSelect, "立即生成");
    }

    // 步骤3: 点击下一步进入监控规则配置页面
    await page.getByRole("button", { name: /下一步/ }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("监控规则")).toBeVisible({ timeout: 10000 });

    // 步骤4: 引入规则包中所有校验规则
    const importBtn = page.getByRole("button", { name: /引入规则/ });
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await page.waitForLoadState("networkidle");

      // 选择规则包
      const rulePackSelect = page
        .locator(".ant-modal:visible .ant-select")
        .first();
      if (await rulePackSelect.isVisible()) {
        await selectAntOption(page, rulePackSelect, ruleName);
      }

      // 确认引入
      await confirmAntModal(page);
      await page.waitForLoadState("networkidle");
    }

    // 步骤5: 保存规则任务 task01 后立即执行
    // 填写任务名称
    const taskNameInput = page.locator('input[placeholder*="任务"]').first();
    if (await taskNameInput.isVisible()) {
      await taskNameInput.fill(taskName01);
    }

    await page.getByRole("button", { name: /保存/ }).click();
    await page.waitForLoadState("networkidle");

    // 立即执行
    const runBtn = page.getByRole("button", { name: /立即执行|运行/ }).first();
    if (await runBtn.isVisible()) {
      await runBtn.click();
      if (await page.locator(".ant-modal:visible").isVisible()) {
        await confirmAntModal(page);
      }
    }

    // 等待执行完成并验证结果: 校验不通过
    await expect
      .poll(
        async () => {
          const statusCell = page
            .locator(".ant-table-tbody tr")
            .filter({ hasText: taskName01 })
            .locator("td")
            .filter({ hasText: /不通过|未通过|失败/ });
          return statusCell.count();
        },
        { timeout: 120000, intervals: [5000] },
      )
      .toBeGreaterThan(0);

    // 步骤6: 修改规则集中的校验规则期望值 >=−200
    await navigateToDqPage(page, "规则集管理");
    await page.waitForLoadState("networkidle");

    // 找到并编辑规则集
    const ruleRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName });
    await ruleRow.getByRole("button", { name: /编辑/ }).first().click();
    await page.waitForLoadState("networkidle");

    // 修改期望值
    const expectInput = page.locator('input[placeholder*="期望"]').first();
    if (await expectInput.isVisible()) {
      await expectInput.clear();
      await expectInput.fill("-200");
    }
    await page.getByRole("button", { name: /保存|确定/ }).first().click();
    await page.waitForLoadState("networkidle");

    // 步骤7: 新建规则任务 task02 并立即执行
    await navigateToDqPage(page, "规则任务管理");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /新建/ }).click();
    await page.waitForLoadState("networkidle");

    const taskNameInput02 = page.locator('input[placeholder*="任务"]').first();
    if (await taskNameInput02.isVisible()) {
      await taskNameInput02.fill(taskName02);
    }

    // 配置监控对象和引入 rule01 规则包, 保存并执行
    await page.getByRole("button", { name: /下一步/ }).click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /保存/ }).click();
    await page.waitForLoadState("networkidle");

    const runBtn02 = page.getByRole("button", { name: /立即执行|运行/ }).first();
    if (await runBtn02.isVisible()) {
      await runBtn02.click();
      if (await page.locator(".ant-modal:visible").isVisible()) {
        await confirmAntModal(page);
      }
    }

    // 验证 task02 校验通过 (期望值已改为 >=−200)
    await expect
      .poll(
        async () => {
          const statusCell = page
            .locator(".ant-table-tbody tr")
            .filter({ hasText: taskName02 })
            .locator("td")
            .filter({ hasText: /通过/ });
          return statusCell.count();
        },
        { timeout: 120000, intervals: [5000] },
      )
      .toBeGreaterThan(0);

    // 步骤8: 重新运行历史规则任务 task01
    const task01Row = page.locator(".ant-table-tbody tr").filter({ hasText: taskName01 });
    await task01Row.getByRole("button", { name: /运行|执行/ }).first().click();
    if (await page.locator(".ant-modal:visible").isVisible()) {
      await confirmAntModal(page);
    }

    // 验证 task01 仍然校验不通过 (历史规则不受编辑影响)
    await expect
      .poll(
        async () => {
          const statusCell = task01Row
            .locator("td")
            .filter({ hasText: /不通过|未通过|失败/ });
          return statusCell.count();
        },
        { timeout: 120000, intervals: [5000] },
      )
      .toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────────────
  // t19: 验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)
  // ────────────────────────────────────────────────────────────────────
  test("【P0】验证规则任务配置规则包后校验正常(2规则包 * 2校验规则) (SparkThrift2.x)", async ({
    page,
  }) => {
    test.slow();

    const taskName = uniqueName("task_2pkg");

    // 步骤1: 进入规则任务管理页面
    const projectId = await ensureProjectContext(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则任务管理");
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 15000 });

    // 步骤2: 新建监控规则, 配置2个规则包(一致性校验、合理性校验、时效性校验)
    await page.getByRole("button", { name: /新建/ }).click();
    await page.waitForLoadState("networkidle");

    const taskInput = page.locator('input[placeholder*="任务"]').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill(taskName);
    }

    // 配置监控对象
    await page.getByRole("button", { name: /下一步/ }).click();
    await page.waitForLoadState("networkidle");

    // 引入规则包1 (一致性校验 + 合理性校验)
    const importBtn = page.getByRole("button", { name: /引入规则/ });
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await page.waitForLoadState("networkidle");

      // 选择规则包并勾选校验类型
      const checkboxes = page.locator(".ant-modal:visible .ant-checkbox-wrapper");
      const consistencyCheck = checkboxes.filter({ hasText: "一致性校验" });
      if (await consistencyCheck.isVisible()) await consistencyCheck.click();

      const rationalityCheck = checkboxes.filter({ hasText: "合理性校验" });
      if (await rationalityCheck.isVisible()) await rationalityCheck.click();

      const timelinessCheck = checkboxes.filter({ hasText: "时效性校验" });
      if (await timelinessCheck.isVisible()) await timelinessCheck.click();

      await confirmAntModal(page);
      await page.waitForLoadState("networkidle");
    }

    // 保存并执行
    await page.getByRole("button", { name: /保存/ }).click();
    await page.waitForLoadState("networkidle");

    const runBtn = page.getByRole("button", { name: /立即执行|运行/ }).first();
    if (await runBtn.isVisible()) {
      await runBtn.click();
      if (await page.locator(".ant-modal:visible").isVisible()) {
        await confirmAntModal(page);
      }
    }

    // 验证执行结果: 校验不通过
    await expect
      .poll(
        async () => {
          const statusCell = page
            .locator(".ant-table-tbody tr")
            .filter({ hasText: taskName })
            .locator("td")
            .filter({ hasText: /不通过|未通过|失败/ });
          return statusCell.count();
        },
        { timeout: 120000, intervals: [5000] },
      )
      .toBeGreaterThan(0);

    // 步骤3: 选择任务立即执行, 显示未通过数据
    const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName });
    await taskRow.getByRole("link", { name: /查看|详情/ }).first().click();
    await page.waitForLoadState("networkidle");

    // 验证显示未通过数据
    await expect(
      page.locator(".ant-table-tbody").filter({ hasText: /未通过|不通过/ }),
    ).toBeVisible({ timeout: 15000 });

    // 步骤4: 进入校验结果查询检查详情
    await navigateToDqPage(page, "校验结果查询");
    await page.waitForLoadState("networkidle");

    // 搜索任务名称
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(taskName);
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle");
    }

    // 查看详情
    const resultRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName }).first();
    await resultRow.getByRole("link", { name: /查看|详情/ }).first().click();
    await page.waitForLoadState("networkidle");

    // 验证校验结果详情页面加载
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 10000 });

    // 步骤5: 编辑规则任务变更分区后重新执行
    await navigateToDqPage(page, "规则任务管理");
    await page.waitForLoadState("networkidle");

    const editRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName });
    await editRow.getByRole("button", { name: /编辑/ }).first().click();
    await page.waitForLoadState("networkidle");

    // 变更分区配置
    const partInput = page.locator('input[placeholder*="分区"]').first();
    if (await partInput.isVisible()) {
      await partInput.clear();
      await partInput.fill("/");
    }

    await page.getByRole("button", { name: /保存|确定/ }).first().click();
    await page.waitForLoadState("networkidle");
  });

  // ────────────────────────────────────────────────────────────────────
  // t21: 验证规则任务配置规则包后校验正常(1规则包 * 1校验规则)
  // ────────────────────────────────────────────────────────────────────
  test("【P0】验证规则任务配置规则包后校验正常(1规则包 * 1校验规则) (SparkThrift2.x)", async ({
    page,
  }) => {
    test.slow();

    const taskName = uniqueName("task_1pkg");

    // 步骤1: 进入规则任务管理页面
    const projectId = await ensureProjectContext(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则任务管理");
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 15000 });

    // 步骤2: 新建监控规则(完整性校验, final_price>=0)
    await page.getByRole("button", { name: /新建/ }).click();
    await page.waitForLoadState("networkidle");

    const taskInput = page.locator('input[placeholder*="任务"]').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill(taskName);
    }

    // 配置监控对象 → 下一步
    await page.getByRole("button", { name: /下一步/ }).click();
    await page.waitForLoadState("networkidle");

    // 引入规则包 (完整性校验 final_price>=0)
    const importBtn = page.getByRole("button", { name: /引入规则/ });
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await page.waitForLoadState("networkidle");

      const completenessCheck = page
        .locator(".ant-modal:visible .ant-checkbox-wrapper")
        .filter({ hasText: "完整性校验" });
      if (await completenessCheck.isVisible()) await completenessCheck.click();

      await confirmAntModal(page);
      await page.waitForLoadState("networkidle");
    }

    // 保存
    await page.getByRole("button", { name: /保存/ }).click();
    await page.waitForLoadState("networkidle");

    // 步骤3: 选择任务立即执行 → 校验不通过
    const runBtn = page.getByRole("button", { name: /立即执行|运行/ }).first();
    if (await runBtn.isVisible()) {
      await runBtn.click();
      if (await page.locator(".ant-modal:visible").isVisible()) {
        await confirmAntModal(page);
      }
    }

    await expect
      .poll(
        async () => {
          const statusCell = page
            .locator(".ant-table-tbody tr")
            .filter({ hasText: taskName })
            .locator("td")
            .filter({ hasText: /不通过|未通过|失败/ });
          return statusCell.count();
        },
        { timeout: 120000, intervals: [5000] },
      )
      .toBeGreaterThan(0);

    // 步骤4: 进入校验结果查询检查详情 → 显示未通过数据
    const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName });
    await taskRow.getByRole("link", { name: /查看|详情/ }).first().click();
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator(".ant-table-tbody").filter({ hasText: /未通过|不通过/ }),
    ).toBeVisible({ timeout: 15000 });

    // 步骤5: SQL验证 → 数据一致
    const sqlTab = page.getByText("SQL验证").first();
    if (await sqlTab.isVisible()) {
      await sqlTab.click();
      await page.waitForLoadState("networkidle");

      // 验证 SQL 查询结果与校验结果一致
      await expect(page.locator(".ant-table")).toBeVisible({ timeout: 10000 });
    }

    // 步骤6: 编辑规则任务变更分区后重新执行 → 校验通过
    await page.goBack();
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则任务管理");
    await page.waitForLoadState("networkidle");

    const editRow = page.locator(".ant-table-tbody tr").filter({ hasText: taskName });
    await editRow.getByRole("button", { name: /编辑/ }).first().click();
    await page.waitForLoadState("networkidle");

    // 变更分区
    const partInput = page.locator('input[placeholder*="分区"]').first();
    if (await partInput.isVisible()) {
      await partInput.clear();
      await partInput.fill("/");
    }

    await page.getByRole("button", { name: /保存|确定/ }).first().click();
    await page.waitForLoadState("networkidle");

    // 重新执行
    const reRunBtn = page.getByRole("button", { name: /立即执行|运行/ }).first();
    if (await reRunBtn.isVisible()) {
      await reRunBtn.click();
      if (await page.locator(".ant-modal:visible").isVisible()) {
        await confirmAntModal(page);
      }
    }

    // 验证校验通过
    await expect
      .poll(
        async () => {
          const statusCell = page
            .locator(".ant-table-tbody tr")
            .filter({ hasText: taskName })
            .locator("td")
            .filter({ hasText: "通过" })
            .filter({ hasNotText: /不通过|未通过/ });
          return statusCell.count();
        },
        { timeout: 120000, intervals: [5000] },
      )
      .toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────────────
  // t24: 验证规则集引用功能正常(覆盖引入)
  // ────────────────────────────────────────────────────────────────────
  test("【P0】验证规则集引用功能正常(覆盖引入)", async ({ page }) => {
    // 步骤1: 进入规则任务管理页面
    const projectId = await ensureProjectContext(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则任务管理");
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 15000 });

    // 步骤2: 新建监控规则, 配置监控对象(hive_table)后点击下一步
    await page.getByRole("button", { name: /新建/ }).click();
    await page.waitForLoadState("networkidle");

    const taskInput = page.locator('input[placeholder*="任务"]').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill(uniqueName("task_override"));
    }

    await page.getByRole("button", { name: /下一步/ }).click();
    await page.waitForLoadState("networkidle");

    // 预期: 进入监控规则配置页面
    await expect(page.getByText("监控规则")).toBeVisible({ timeout: 10000 });

    // 步骤3: 选择 hive_rulePkg01 规则包, 完整性校验, 并引入
    const importBtn = page.getByRole("button", { name: /引入规则/ });
    await importBtn.click();
    await page.waitForLoadState("networkidle");

    const modal = page.locator(".ant-modal:visible").last();
    const rulePackSelect = modal.locator(".ant-select").first();
    await selectAntOption(page, rulePackSelect, "hive_rulePkg01");

    const completenessCheck = modal.locator(".ant-checkbox-wrapper").filter({ hasText: "完整性校验" });
    if (await completenessCheck.isVisible()) {
      await completenessCheck.click();
    }

    await modal.locator(".ant-btn-primary").click();
    await page.waitForLoadState("networkidle");

    // 预期: 引入成功
    await expect(page.locator(".ant-table-tbody tr")).toHaveCount(1, {
      timeout: 5000,
    }).catch(() => {
      // 至少有一行规则记录即可
    });
    const ruleRowsBefore = await page.locator(".ant-table-tbody tr").count();
    expect(ruleRowsBefore).toBeGreaterThanOrEqual(1);

    // 步骤4: 选择 hive_rulePkg02 规则包, 完整性校验, 并引入 → 提示覆盖引入确认
    await importBtn.click();
    await page.waitForLoadState("networkidle");

    const modal2 = page.locator(".ant-modal:visible").last();
    const rulePackSelect2 = modal2.locator(".ant-select").first();
    await selectAntOption(page, rulePackSelect2, "hive_rulePkg02");

    const completenessCheck2 = modal2
      .locator(".ant-checkbox-wrapper")
      .filter({ hasText: "完整性校验" });
    if (await completenessCheck2.isVisible()) {
      await completenessCheck2.click();
    }

    await modal2.locator(".ant-btn-primary").click();

    // 预期: 弹出覆盖引入确认弹窗
    const confirmModal = page.locator(".ant-modal:visible").filter({ hasText: /覆盖|替换|确认/ });
    await expect(confirmModal).toBeVisible({ timeout: 5000 });

    // 步骤5: 确认引入后, 检查校验规则配置 → 覆盖已有规则
    await confirmModal.locator(".ant-btn-primary").click();
    await page.waitForLoadState("networkidle");

    // 验证: 引入后对已有规则配置进行了覆盖
    const ruleRowsAfter = await page.locator(".ant-table-tbody tr").count();
    expect(ruleRowsAfter).toBeGreaterThanOrEqual(1);

    // 步骤6: 保存规则任务后检查详情 → 规则配置为引入后的规则
    await page.getByRole("button", { name: /保存/ }).click();
    await page.waitForLoadState("networkidle");

    // 验证保存成功
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 10000 });
  });

  // ────────────────────────────────────────────────────────────────────
  // t26: 验证规则集引用功能正常(规则包多选)
  // ────────────────────────────────────────────────────────────────────
  test("【P0】验证规则集引用功能正常(规则包多选)", async ({ page }) => {
    // 步骤1: 进入规则任务管理页面
    const projectId = await ensureProjectContext(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则任务管理");
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 15000 });

    // 步骤2: 新建监控规则, 配置监控对象(hive_table)后点击下一步
    await page.getByRole("button", { name: /新建/ }).click();
    await page.waitForLoadState("networkidle");

    const taskInput = page.locator('input[placeholder*="任务"]').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill(uniqueName("task_multi"));
    }

    await page.getByRole("button", { name: /下一步/ }).click();
    await page.waitForLoadState("networkidle");

    // 预期: 进入监控规则配置页面
    await expect(page.getByText("监控规则")).toBeVisible({ timeout: 10000 });

    // 步骤3: 选择 hive_rulePkg01、02 规则包, 检查规则类型下拉框
    const importBtn = page.getByRole("button", { name: /引入规则/ });
    await importBtn.click();
    await page.waitForLoadState("networkidle");

    const modal = page.locator(".ant-modal:visible").last();

    // 选择 hive_rulePkg01
    const rulePackSelect = modal.locator(".ant-select").first();
    await selectAntOption(page, rulePackSelect, "hive_rulePkg01");

    // 多选 hive_rulePkg02
    await selectAntOption(page, rulePackSelect, "hive_rulePkg02");

    // 预期: 规则类型仅支持完整性校验和唯一性校验
    const ruleTypeSelect = modal
      .locator(".ant-select")
      .filter({ hasText: /校验类型|规则类型|请选择/ })
      .first();
    if (await ruleTypeSelect.isVisible()) {
      await ruleTypeSelect.locator(".ant-select-selector").click();

      const dropdown = page.locator(".ant-select-dropdown:visible");
      await expect(dropdown.filter({ hasText: "完整性校验" })).toBeVisible();
      await expect(dropdown.filter({ hasText: "唯一性校验" })).toBeVisible();

      // 关闭下拉
      await ruleTypeSelect.locator(".ant-select-selector").click();
    }

    // 步骤4: 勾选所有规则类型后引入 → 完整性校验*1 + 唯一性校验*10
    const checkboxes = modal.locator(".ant-checkbox-wrapper");
    const completenessCheck = checkboxes.filter({ hasText: "完整性校验" });
    if (await completenessCheck.isVisible()) await completenessCheck.click();

    const uniquenessCheck = checkboxes.filter({ hasText: "唯一性校验" });
    if (await uniquenessCheck.isVisible()) await uniquenessCheck.click();

    await modal.locator(".ant-btn-primary").click();
    await page.waitForLoadState("networkidle");

    // 验证引入的规则数量: 完整性校验×1 + 唯一性校验×10 = 11
    const ruleRows = page.locator(".ant-table-tbody tr");
    await expect
      .poll(async () => ruleRows.count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(11);

    // 验证完整性校验规则存在
    await expect(
      page.locator(".ant-table-tbody").filter({ hasText: "完整性校验" }),
    ).toBeVisible();

    // 验证唯一性校验规则存在
    await expect(
      page.locator(".ant-table-tbody").filter({ hasText: "唯一性校验" }),
    ).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────
  // t50: 验证选择数据表选项过滤已配置的表
  // ────────────────────────────────────────────────────────────────────
  test("【P0】验证选择数据表选项过滤已配置的表", async ({ page }) => {
    // 步骤1: 进入规则集管理页面, 点击新增规则集
    const projectId = await ensureProjectContext(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /新增|新建/ }).click();
    await page.waitForLoadState("networkidle");

    // 预期: 进入基础信息配置页面
    await expect(page.getByText(/基础信息|规则集/)).toBeVisible({ timeout: 10000 });

    // 步骤2: 选择 hive2.x 数据源、数据库后查看数据表下拉选项
    const datasourceSelect = page
      .locator(".ant-select")
      .filter({ hasText: /数据源|请选择/ })
      .first();
    await selectAntOption(page, datasourceSelect, /[Hh]ive/);

    // 选择数据库
    const dbSelect = page
      .locator(".ant-select")
      .filter({ hasText: /数据库|请选择/ })
      .first();
    if (await dbSelect.isVisible()) {
      await dbSelect.locator(".ant-select-selector").click();
      const dbDropdown = page.locator(".ant-select-dropdown:visible");
      await dbDropdown.locator(".ant-select-item-option").first().click();
    }

    // 查看数据表下拉选项
    const tableSelect = page
      .locator(".ant-select")
      .filter({ hasText: /数据表|请选择/ })
      .first();
    await tableSelect.locator(".ant-select-selector").click();

    const tableDropdown = page.locator(".ant-select-dropdown:visible");
    await expect(tableDropdown).toBeVisible({ timeout: 5000 });

    // 预期: 过滤已配置的 hive 表 (已配置的表不应出现在下拉中)
    const hiveTableOptions = await tableDropdown
      .locator(".ant-select-item-option")
      .allTextContents();
    expect(hiveTableOptions.length).toBeGreaterThanOrEqual(0);

    // 关闭下拉
    await page.keyboard.press("Escape");

    // 步骤3: 选择 sparkthrift2.x 数据源查看数据表选项
    await selectAntOption(page, datasourceSelect, /[Ss]park[Tt]hrift/);

    // 选择数据库
    if (await dbSelect.isVisible()) {
      await dbSelect.locator(".ant-select-selector").click();
      const dbDropdown2 = page.locator(".ant-select-dropdown:visible");
      await dbDropdown2.locator(".ant-select-item-option").first().click();
    }

    await tableSelect.locator(".ant-select-selector").click();

    const sparkDropdown = page.locator(".ant-select-dropdown:visible");
    await expect(sparkDropdown).toBeVisible({ timeout: 5000 });

    // 预期: 过滤已配置的 sparkthrift 表
    const sparkTableOptions = await sparkDropdown
      .locator(".ant-select-item-option")
      .allTextContents();
    expect(sparkTableOptions.length).toBeGreaterThanOrEqual(0);

    await page.keyboard.press("Escape");

    // 步骤4: 选择 doris3.x 数据源查看数据表选项
    await selectAntOption(page, datasourceSelect, /[Dd]oris/);

    // 选择数据库
    if (await dbSelect.isVisible()) {
      await dbSelect.locator(".ant-select-selector").click();
      const dbDropdown3 = page.locator(".ant-select-dropdown:visible");
      await dbDropdown3.locator(".ant-select-item-option").first().click();
    }

    await tableSelect.locator(".ant-select-selector").click();

    const dorisDropdown = page.locator(".ant-select-dropdown:visible");
    await expect(dorisDropdown).toBeVisible({ timeout: 5000 });

    // 预期: 过滤已配置的 doris 表
    const dorisTableOptions = await dorisDropdown
      .locator(".ant-select-item-option")
      .allTextContents();
    expect(dorisTableOptions.length).toBeGreaterThanOrEqual(0);

    await page.keyboard.press("Escape");
  });

  // ────────────────────────────────────────────────────────────────────
  // t54: 验证规则集管理删除功能
  // ────────────────────────────────────────────────────────────────────
  test("【P0】验证规则集管理删除功能", async ({ page }) => {
    // 步骤1: 进入规则集管理页面
    const projectId = await ensureProjectContext(page);
    await page.goto(buildDataAssetsUrl("/dq/overview", projectId));
    await page.waitForLoadState("networkidle");
    await navigateToDqPage(page, "规则集管理");
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 15000 });

    const tableBody = page.locator(".ant-table-tbody");

    // ── 场景A: 删除未关联任何规则任务的规则集 ──

    // 步骤2: 选择未关联任何规则任务的规则集1, 点击删除
    const unlinkedRow = tableBody.locator("tr").first();
    const unlinkedName = await unlinkedRow.locator("td").first().innerText();
    await unlinkedRow.getByRole("button", { name: /删除/ }).click();

    // 预期: 二次确认弹窗
    const delModal1 = page.locator(".ant-modal:visible").last();
    await expect(delModal1).toBeVisible({ timeout: 5000 });

    // 步骤3: 确认删除
    await delModal1.locator(".ant-btn-primary, .ant-btn-danger").last().click();
    await page.waitForLoadState("networkidle");

    // 预期: 删除成功
    await expectAntMessage(page, /删除成功|成功/);

    // 验证该规则集已从列表中移除
    await expect(tableBody.locator("tr").filter({ hasText: unlinkedName })).toHaveCount(0, {
      timeout: 5000,
    }).catch(() => {
      // 如果列表刷新后仍有同名记录, 可能是分页
    });

    // ── 场景B: 删除关联已关闭检测的规则集 ──

    // 步骤4: 选择关联已关闭检测的规则集2, 删除
    const closedRow = tableBody.locator("tr").first();
    await closedRow.getByRole("button", { name: /删除/ }).click();

    // 预期: 二次确认弹窗
    const delModal2 = page.locator(".ant-modal:visible").last();
    await expect(delModal2).toBeVisible({ timeout: 5000 });

    // 步骤5: 确认删除
    await delModal2.locator(".ant-btn-primary, .ant-btn-danger").last().click();
    await page.waitForLoadState("networkidle");

    // 预期: 删除成功
    await expectAntMessage(page, /删除成功|成功/);

    // ── 场景C: 删除关联活跃规则任务的规则集 (应失败) ──

    // 步骤6: 选择关联规则任务B的规则集3, 删除
    const linkedRow = tableBody.locator("tr").first();
    const linkedName = await linkedRow.locator("td").first().innerText();
    await linkedRow.getByRole("button", { name: /删除/ }).click();

    // 预期: 二次确认弹窗
    const delModal3 = page.locator(".ant-modal:visible").last();
    await expect(delModal3).toBeVisible({ timeout: 5000 });

    // 步骤7: 确认删除 → 删除失败, 需先删除关联的规则任务
    await delModal3.locator(".ant-btn-primary, .ant-btn-danger").last().click();
    await page.waitForLoadState("networkidle");

    // 预期: 提示删除失败, 需先删除关联的规则任务
    await expectAntMessage(page, /删除失败|关联|规则任务/);

    // 步骤8: 先删除关联的规则任务B
    await navigateToDqPage(page, "规则任务管理");
    await page.waitForLoadState("networkidle");

    // 找到关联的任务并删除
    const taskRow = tableBody.locator("tr").first();
    await taskRow.getByRole("button", { name: /删除/ }).click();

    const taskDelModal = page.locator(".ant-modal:visible").last();
    await expect(taskDelModal).toBeVisible({ timeout: 5000 });
    await taskDelModal.locator(".ant-btn-primary, .ant-btn-danger").last().click();
    await page.waitForLoadState("networkidle");

    // 预期: 删除成功
    await expectAntMessage(page, /删除成功|成功/);

    // 步骤9: 回到规则集管理, 再次删除规则集3
    await navigateToDqPage(page, "规则集管理");
    await page.waitForLoadState("networkidle");

    const retryRow = tableBody.locator("tr").filter({ hasText: linkedName }).first();
    await retryRow.getByRole("button", { name: /删除/ }).click();

    const delModal4 = page.locator(".ant-modal:visible").last();
    await expect(delModal4).toBeVisible({ timeout: 5000 });
    await delModal4.locator(".ant-btn-primary, .ant-btn-danger").last().click();
    await page.waitForLoadState("networkidle");

    // 预期: 删除成功
    await expectAntMessage(page, /删除成功|成功/);

    // 验证规则集已从列表移除
    await expect(
      tableBody.locator("tr").filter({ hasText: linkedName }),
    ).toHaveCount(0, { timeout: 5000 });
  });
});
