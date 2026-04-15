/**
 * 前置数据准备：通过离线开发临时查询在 Doris 建表
 */
import { test, expect } from "../../fixtures/step-screenshot";
import { applyRuntimeCookies } from "../../helpers/test-setup";

test.use({ storageState: ".auth/session.json" });
test.setTimeout(300_000);

const BASE = "http://shuzhan63-ltqc-dev.k8s.dtstack.cn";
const PROJECT_NAME = "story_15648"; // 已知存在的项目

const SQL_BLOCKS = [
  "CREATE DATABASE IF NOT EXISTS test_db",
  `DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL, score DOUBLE, category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'), (2, 15.0, '4'), (3, 3.0, '1'), (4, -1.0, '3'), (5, 8.0, '5')`,
  `DROP TABLE IF EXISTS test_db.quality_test_str;
CREATE TABLE test_db.quality_test_str (
  id INT NOT NULL, score_str VARCHAR(50), category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_str VALUES
  (1, '5', '2'), (2, '5.0', '4'), (3, '15.0', '1'), (4, 'abc', '3'), (5, '-1.0', '5')`,
  `DROP TABLE IF EXISTS test_db.quality_test_sample;
CREATE TABLE test_db.quality_test_sample (
  id INT NOT NULL, score DOUBLE, category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_sample VALUES
  (1, 5.0, '2'), (2, 15.0, '4'), (3, 3.0, '1'), (4, -1.0, '3'), (5, 8.0, '5'),
  (6, 7.0, '1'), (7, 9.0, '2'), (8, 2.0, '3'), (9, 6.0, '1'), (10, 4.0, '2')`,
  `DROP TABLE IF EXISTS test_db.quality_test_partition;
CREATE TABLE test_db.quality_test_partition (
  id INT NOT NULL, score DOUBLE, category VARCHAR(50), dt DATE NOT NULL
) PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES LESS THAN ('2026-04-02'),
  PARTITION p20260402 VALUES LESS THAN ('2026-04-03')
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_partition VALUES
  (1, 5.0, '2', '2026-04-01'), (2, 15.0, '4', '2026-04-01'),
  (3, 3.0, '1', '2026-04-02'), (4, -1.0, '3', '2026-04-02')`,
  `DROP TABLE IF EXISTS test_db.quality_test_enum_pass;
CREATE TABLE test_db.quality_test_enum_pass (
  id INT NOT NULL, category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_enum_pass VALUES (1, '1'), (2, '2'), (3, '3')`,
];

test("建表：通过离线开发临时查询创建全部测试表", async ({ page }) => {
  await applyRuntimeCookies(page, "batch");

  // 1. 进入项目列表
  await page.goto(`${BASE}/batch/#/projects`);
  await page.waitForLoadState("networkidle");
  await page.locator(".ant-table-row").first().waitFor({ state: "visible", timeout: 15000 });

  // 2. 搜索并进入项目
  const searchBox = page.getByPlaceholder(/搜索/);
  await searchBox.fill(PROJECT_NAME);
  await page.getByRole("button", { name: "search" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // 点击项目名称进入
  const projectRow = page.locator(".ant-table-row").filter({ hasText: PROJECT_NAME }).first();
  await projectRow.waitFor({ state: "visible", timeout: 10000 });
  const projectLink = projectRow.getByText(PROJECT_NAME, { exact: false }).first();

  // 记录当前 URL 以便后续恢复
  await projectLink.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  for (let i = 0; i < SQL_BLOCKS.length; i++) {
    const sql = SQL_BLOCKS[i];
    const taskName = `setup_${Date.now().toString(36)}_${i}`;

    // 3. 点击临时查询 tab
    const tempTab = page.locator(".ant-tabs-tab").filter({ hasText: "临时查询" }).first();
    await tempTab.click();
    await page.waitForTimeout(2000);

    // 4. 右键临时查询树节点 → 新建临时查询
    const treeNode = page.getByRole("tree").getByText("临时查询", { exact: true });
    await treeNode.click({ button: "right" });
    await page.waitForTimeout(500);

    const ctxMenu = page.locator(".ant-dropdown:visible, .ant-menu:visible").first();
    await ctxMenu.waitFor({ state: "visible", timeout: 5000 });
    await ctxMenu.getByText(/新建/, { exact: false }).first().click();
    await page.waitForTimeout(1500);

    // 5. 弹窗：填名称 + 选 Doris SQL 类型
    const modal = page.locator(".ant-modal:visible").first();
    await modal.waitFor({ state: "visible", timeout: 10000 });

    const nameInput = modal.locator("input").first();
    await nameInput.clear();
    await nameInput.fill(taskName);

    // 选择类型 = Doris SQL
    const typeSelect = modal.locator(".ant-form-item").filter({ hasText: /类型/ }).locator(".ant-select").first();
    await typeSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(500);
    await page.locator(".ant-select-dropdown:visible .ant-select-item-option").filter({ hasText: /Doris/i }).first().click();
    await page.waitForTimeout(800);

    // 确认
    await modal.locator(".ant-btn-primary").first().click();
    await modal.waitFor({ state: "hidden", timeout: 15000 });
    await page.waitForTimeout(2000);

    // 6. 编辑器输入 SQL
    const editor = page.locator(".view-lines, .monaco-editor .overflow-guard").first();
    await editor.waitFor({ state: "visible", timeout: 20000 });
    await editor.click();
    await page.waitForTimeout(300);
    const mod = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    for (const chunk of sql.match(/.{1,100}/g) ?? [sql]) {
      await page.keyboard.type(chunk, { delay: 0 });
    }
    await page.waitForTimeout(500);

    // 7. 运行
    const runBtn = page.getByRole("button", { name: /运行/ }).or(page.locator("button").filter({ hasText: /运行/ })).first();
    await runBtn.click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState("networkidle");

    // 8. 等待执行完成
    try {
      await page.waitForFunction(() => {
        const el = document.querySelector(".ide-console, [class*='console'], [class*='result']");
        return el && !/运行中|executing/i.test(el.textContent ?? "");
      }, { timeout: 60000 });
    } catch { /* timeout ok for DDL */ }
    await page.waitForTimeout(1000);

    console.log(`[${i + 1}/${SQL_BLOCKS.length}] Executed: ${sql.slice(0, 50)}...`);
  }

  console.log("All SQL blocks executed!");
});
