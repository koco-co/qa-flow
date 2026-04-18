// batch-sql.ts — split from test-setup.ts

import type { Page } from "@playwright/test";

import { applyRuntimeCookies, buildOfflineUrl } from "./env-setup";

type RuntimeEnv = Record<string, string | undefined>;
type ProjectListResponse = { data?: Array<{ id?: number | string }> };

/**
 * 在离线开发(batch)中按名称选择指定项目
 *
 * 流程:
 *   1. 进入 /batch/ 项目列表
 *   2. 在搜索框中搜索项目名称
 *   3. 点击匹配的项目卡片进入
 */
export async function selectBatchProject(page: Page, projectName: string): Promise<void> {
  await applyRuntimeCookies(page, "batch");

  await page.goto(buildOfflineUrl("/projects"));
  await page.waitForURL(/#\/projects$/, { timeout: 30000 });

  const projectTable = page.locator(".projects-table").first();
  await projectTable.waitFor({ state: "visible", timeout: 30000 });

  const targetRow = projectTable.locator(".ant-table-row").filter({ hasText: projectName }).first();
  await targetRow.waitFor({ state: "visible", timeout: 30000 });

  const projectLink = targetRow.getByText(projectName, { exact: true }).first();
  await projectLink.click();

  await page.waitForURL(/#\/offline\/task/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await page
    .locator(".org-tree-select-wrap, .ant-select-selection-item")
    .filter({ hasText: projectName })
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(3000);
}

/**
 * 通过离线开发「临时查询」执行 Doris SQL
 *
 * @param projectName 项目名称，默认 "env_rebuild_test"
 *
 * 流程:
 *   1. /batch/ → 搜索并选择指定项目
 *   2. 点击左侧"临时查询"垂直 tab
 *   3. 展开"临时查询"树节点 → 右键 → "新建临时查询"
 *   4. 弹窗中填写名称, 选择"Doris SQL"类型, 确认
 *   5. 编辑器中输入 SQL
 *   6. 点击"运行"
 *   7. 等待执行完成
 */
export async function executeSqlViaBatchDoris(
  page: Page,
  sqlContent: string,
  taskName?: string,
  projectName = "env_rebuild_test",
): Promise<{ resultText: string }> {
  const name = taskName ?? `auto_sql_${Date.now().toString(36)}`;

  await openBatchDorisEditor(page, name, projectName);
  return runSqlInCurrentBatchEditor(page, sqlContent);
}

export async function executeSqlSequenceViaBatchDoris(
  page: Page,
  sqlStatements: readonly string[],
  taskNamePrefix?: string,
  projectName = "env_rebuild_test",
): Promise<ReadonlyArray<{ statement: string; resultText: string }>> {
  const statements = sqlStatements.map((sql) => sql.trim()).filter(Boolean);
  const name = taskNamePrefix ?? `auto_sql_sequence_${Date.now().toString(36)}`;
  await openBatchDorisEditor(page, name, projectName);

  const results: Array<{ statement: string; resultText: string }> = [];
  for (const statement of statements) {
    const { resultText } = await runSqlInCurrentBatchEditor(page, statement);
    results.push({ statement, resultText });
  }

  return results;
}

async function openBatchDorisEditor(
  page: Page,
  name: string,
  projectName: string,
): Promise<void> {
  // 1. 进入指定项目
  await selectBatchProject(page, projectName);

  // 2. 点击左侧"临时查询"垂直 tab
  const tempQueryTab = page.locator(".ant-tabs-tab, [role='tab']").filter({ hasText: "临时查询" }).first();
  await tempQueryTab.waitFor({ state: "visible", timeout: 30000 });
  await tempQueryTab.click();
  await page
    .locator(".ant-tabs-tab-active")
    .filter({ hasText: "临时查询" })
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(3000);

  // 3. 右键"临时查询"树节点
  const treeNode = page
    .locator(".folder-item.folderTreeNodeItem")
    .filter({ hasText: "临时查询" })
    .first();
  await treeNode.waitFor({ state: "visible", timeout: 30000 });
  await treeNode.click({ button: "right" });
  await page.waitForTimeout(500);

  // 4. 点击"新建临时查询"上下文菜单
  const newQueryMenu = page
    .locator(".ant-dropdown-menu-item, [role='menuitem']")
    .filter({ hasText: "新建临时查询" })
    .first();
  await newQueryMenu.waitFor({ state: "visible", timeout: 30000 });
  await newQueryMenu.click();
  await page.waitForTimeout(1500);

  // 5. 处理新建临时查询弹窗
  const modal = page.locator(".ant-modal:visible").first();
  await modal.waitFor({ state: "visible", timeout: 30000 });

  const nameInput = modal.locator("input").first();
  await nameInput.clear();
  await nameInput.fill(name);

  const typeSelect = modal
    .locator(".ant-form-item")
    .filter({ hasText: "临时查询类型" })
    .locator(".ant-select")
    .first();
  await typeSelect.locator(".ant-select-selector").click();
  await page.waitForTimeout(500);
  await page
    .locator(".ant-select-dropdown:visible .ant-select-item-option")
    .filter({ hasText: /Doris\s*SQL/i })
    .first()
    .click();
  await page.waitForTimeout(800);

  const clusterSelect = modal
    .locator(".ant-form-item")
    .filter({ hasText: "集群名称" })
    .locator(".ant-select")
    .first();
  if (await clusterSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clusterSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    const clusterOption = page
      .locator(".ant-select-dropdown:visible .ant-select-item-option")
      .filter({ hasText: /doris/i })
      .first();
    if (await clusterOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clusterOption.click();
    } else {
      await page.locator(".ant-select-dropdown:visible .ant-select-item-option").first().click();
    }
    await page.waitForTimeout(500);
  }

  const okBtn = modal.locator(".ant-btn-primary").first();
  await okBtn.click();
  const editorTab = page.locator(".ant-tabs-tab, [role='tab']").filter({ hasText: name }).first();
  await Promise.race([
    modal.waitFor({ state: "hidden", timeout: 15000 }),
    editorTab.waitFor({ state: "visible", timeout: 15000 }),
  ]).catch(() => undefined);
  if (await modal.isVisible().catch(() => false)) {
    const closeBtn = modal.locator(".ant-modal-close").first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click().catch(() => undefined);
      await modal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
    }
  }
  await editorTab.waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(2000);
}

async function runSqlInCurrentBatchEditor(
  page: Page,
  sqlContent: string,
): Promise<{ resultText: string }> {
  const requiresDdlConfirm = /^(TRUNCATE|DROP|CREATE|ALTER)\b/i.test(sqlContent.trim());
  await confirmBatchDdlModal(page);
  const editorArea = page.locator(".view-lines, .monaco-editor .overflow-guard").first();
  await editorArea.waitFor({ state: "visible", timeout: 20000 });
  await editorArea.click();
  await page.waitForTimeout(300);

  // Ctrl+A 全选 → Delete 清空 → 输入新 SQL
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+a`);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);

  // 分块键盘输入 SQL (每块 100 字符以提高可靠性)
  const chunks = sqlContent.match(/.{1,100}/g) ?? [sqlContent];
  for (const chunk of chunks) {
    await page.keyboard.type(chunk, { delay: 0 });
  }
  await page.waitForTimeout(500);

  // 8. 点击运行按钮
  const runBtn = page
    .getByRole("button", { name: /运行/ })
    .or(page.locator("button").filter({ hasText: /运行/ }))
    .first();
  if (await runBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await runBtn.click();
    await confirmBatchDdlModal(page, requiresDdlConfirm);
  }
  await page.waitForTimeout(5000);

  // 9. 等待执行结果 (最多等 120 秒)
  await page.waitForLoadState("networkidle");

  let resultText = "";
  const resultArea = page.locator(".ide-console.batch-ide-console").first();
  if (await resultArea.isVisible({ timeout: 15000 }).catch(() => false)) {
    try {
      await page.waitForFunction(
        () => {
          const el = document.querySelector(".ide-console.batch-ide-console");
          return el && !/运行中|executing/i.test(el.textContent ?? "");
        },
        { timeout: 120000 },
      );
    } catch {
      // timeout acceptable for DDL
    }
    resultText = await resultArea.innerText().catch(() => "");
    if (/执行失败|运行失败|语法错误|exception|error/i.test(resultText)) {
      throw new Error(`SQL execution failed: ${resultText.slice(0, 500)}`);
    }
  }
  await page.waitForTimeout(2000);

  return { resultText };
}

async function confirmBatchDdlModal(page: Page, required = false): Promise<void> {
  const ddlModal = page
    .locator("#JS_ddl_confirm_modal, .ant-modal, dialog")
    .filter({ hasText: /执行的语句中包含DDL语句/ })
    .first();

  const modalVisible = await ddlModal
    .waitFor({ state: "visible", timeout: required ? 5000 : 3000 })
    .then(() => true)
    .catch(() => false);
  if (!modalVisible) {
    return;
  }

  const clicked = await page.evaluate(() => {
    const modal = document.querySelector("#JS_ddl_confirm_modal");
    if (!modal) return false;

    const checkbox = Array.from(
      modal.querySelectorAll("label, .ant-checkbox-wrapper, [role='checkbox']"),
    ).find((node) => /不再提示/.test(node.textContent ?? ""));
    (checkbox as HTMLElement | undefined)?.click();

    const confirmBtn = Array.from(modal.querySelectorAll("button")).find((node) =>
      /执\s*行|确\s*认/.test(node.textContent ?? ""),
    );
    (confirmBtn as HTMLButtonElement | undefined)?.click();
    return Boolean(confirmBtn);
  });

  if (!clicked) {
    const confirmBtn = ddlModal
      .locator("button")
      .filter({ hasText: /执\s*行|确\s*认/ })
      .last();
    await confirmBtn.click();
  }
  await ddlModal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
}
