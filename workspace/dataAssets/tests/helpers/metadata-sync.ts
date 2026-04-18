// metadata-sync.ts — split from test-setup.ts

import type { Page } from "@playwright/test";

import { applyRuntimeCookies, buildDataAssetsUrl } from "./env-setup";

type RuntimeEnv = Record<string, string | undefined>;
type ProjectListResponse = { data?: Array<{ id?: number | string }> };

/**
 * 创建并执行元数据同步任务（周期同步 + 临时同步）
 *
 * 实际弹窗结构（来自 page snapshot）:
 *   - "* 数据源" 单选 combobox
 *   - 表格行: 数据库(combobox) | 数据表(combobox) | 数据表过滤 | 操作
 *   - 底部按钮: 取消 | 临时同步 | 下一步
 *
 * @param datasourceName 数据源名称（如含 Doris 的数据源）
 */
export async function syncMetadata(
  page: Page,
  datasourceName?: string,
  database?: string,
  tableName?: string,
): Promise<void> {
  const readSyncErrorText = async (): Promise<string> => {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    return bodyText.replace(/\s+/g, " ").trim();
  };

  // 导航到元数据同步
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/metaDataSync"));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 点击新增周期同步任务
  const addBtn = page
    .getByRole("button", { name: /新增周期同步任务/ })
    .or(page.locator("button").filter({ hasText: /新增.*同步/ }))
    .first();
  await addBtn.click();
  await page.waitForTimeout(2000);

  // 等待弹窗出现
  const modal = page.locator(".ant-modal:visible, dialog:visible").first();
  await modal.waitFor({ state: "visible", timeout: 10000 });

  // 选择数据源（弹窗中的第一个 combobox: "* 数据源"）
  if (datasourceName) {
    const dsCombobox = modal.locator(".ant-select").first();
    if (await dsCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dsCombobox.locator(".ant-select-selector").click();
      await page.waitForTimeout(500);
      const dsOption = page
        .locator(".ant-select-dropdown:visible .ant-select-item-option")
        .filter({ hasText: new RegExp(datasourceName, "i") })
        .first();
      if (await dsOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dsOption.click();
        await page.waitForTimeout(1000);
      } else {
        // fallback: 选第一个选项
        const firstOption = page
          .locator(".ant-select-dropdown:visible .ant-select-item-option")
          .first();
        if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstOption.click();
          await page.waitForTimeout(1000);
        }
        await page.keyboard.press("Escape");
      }
    }
  }

  // 选择数据库（表格行中的第一个 combobox）
  const dbCombobox = modal.locator(".ant-table-row .ant-select").first();
  if (await dbCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await dbCombobox.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const dbOptions = page.locator(".ant-select-dropdown:visible .ant-select-item-option");
    if (database) {
      const dbOption = dbOptions.filter({ hasText: database }).first();
      if (!(await dbOption.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(
          `Failed to load metadata databases for ${datasourceName ?? "datasource"}: ${await readSyncErrorText()}`,
        );
      }
      await dbOption.click();
    } else {
      // 选第一个可用数据库
      const firstDb = dbOptions.first();
      if (!(await firstDb.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(`No metadata database options are available: ${await readSyncErrorText()}`);
      }
      await firstDb.click();
    }
    await page.waitForTimeout(1000);
  }

  // 选择数据表（表格行中的第二个 combobox）
  const tableCombobox = modal.locator(".ant-table-row .ant-select").nth(1);
  if (await tableCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tableCombobox.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const tableOptions = page.locator(".ant-select-dropdown:visible .ant-select-item-option");
    if (tableName) {
      const tblOption = tableOptions.filter({ hasText: tableName }).first();
      if (!(await tblOption.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(
          `Failed to load metadata tables for ${database ?? "database"}: ${await readSyncErrorText()}`,
        );
      }
      await tblOption.click();
    } else {
      // 选第一个可用数据表
      const firstTbl = tableOptions.first();
      if (!(await firstTbl.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(`No metadata table options are available: ${await readSyncErrorText()}`);
      }
      await firstTbl.click();
    }
    await page.waitForTimeout(1000);
  }

  // 点击"临时同步"按钮
  const syncNowBtn = modal
    .getByRole("button", { name: /临时同步/ })
    .or(modal.locator("button").filter({ hasText: /临时同步/ }))
    .first();
  if (await syncNowBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await syncNowBtn.click();
    await page.waitForTimeout(3000);
  }

  if (await modal.isVisible().catch(() => false)) {
    throw new Error(`Metadata sync dialog did not submit: ${await readSyncErrorText()}`);
  }

  // 等待同步完成（最多120秒）
  await page.waitForLoadState("networkidle");
  try {
    await page.waitForFunction(
      () => {
        const statusEls = document.querySelectorAll(
          '[class*="status"], .ant-tag, .ant-badge-status-text',
        );
        for (let i = 0; i < statusEls.length; i++) {
          if (/运行中|同步中|进行中/.test(statusEls[i].textContent ?? "")) return false;
        }
        return true;
      },
      { timeout: 120000 },
    );
  } catch {
    // timeout acceptable
  }
  await page.waitForTimeout(2000);
}
