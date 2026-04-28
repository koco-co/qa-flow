// META: {"id":"t44","priority":"P1","title":"【P1】验证筛选导出三种筛选组合的行为一致性（数据源类型单筛 / key 名模糊单筛 / 组合筛）"}
//
// 已知产品 Bug（用户自测发现）：
//   Bug A：仅按"数据源类型"筛选后导出 → 实际导出全量数据（应只导出筛选结果）
//   Bug C："key 名 + 数据源类型"组合筛选后导出 → 导出结果未遵循组合条件
//   正常 B：仅按"key 名"模糊筛选后导出 → 只导出匹配记录（行为正确）
//
// 预期：子场景 A / C 的断言会失败（暴露 Bug），子场景 B 断言应通过。
//
import { test, expect } from "../../fixtures/step-screenshot";
import {
  gotoJsonConfigPage,
  addKey,
  deleteKey,
  searchKey,
  clearSearch,
} from "./json-config-helpers";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

// ── helpers ─────────────────────────────────────────────────────────────────

async function waitTableLoaded(page: import("@playwright/test").Page) {
  await page
    .locator(".ant-spin-spinning")
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => undefined);
  await page
    .waitForLoadState("networkidle", { timeout: 3000 })
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

/** 通过列头 filter 图标下拉选择数据源类型筛选 */
async function applyDataSourceFilter(
  page: import("@playwright/test").Page,
  typeName: string,
): Promise<void> {
  const filterBtn = page
    .locator(".ant-table-thead")
    .getByRole("button", { name: "filter" });
  await filterBtn.waitFor({ state: "visible", timeout: 10000 });
  await filterBtn.click();

  const dropdown = page
    .locator(".ant-table-filter-dropdown:visible")
    .last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });
  await dropdown
    .locator(".ant-dropdown-menu-item")
    .filter({ hasText: typeName })
    .first()
    .click();
  await dropdown.getByRole("button", { name: /确\s*定/ }).first().click();
  await waitTableLoaded(page);
}

/** 重置数据源类型筛选 */
async function clearDataSourceFilter(
  page: import("@playwright/test").Page,
): Promise<void> {
  const filterBtn = page
    .locator(".ant-table-thead")
    .getByRole("button", { name: "filter" });
  if (!(await filterBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }
  await filterBtn.click();

  const dropdown = page
    .locator(".ant-table-filter-dropdown:visible")
    .last();
  await dropdown.waitFor({ state: "visible", timeout: 5000 });
  const resetBtn = dropdown
    .getByRole("button", { name: /重\s*置/ })
    .first();
  if (await resetBtn.isEnabled().catch(() => false)) {
    await resetBtn.click();
  }
  await dropdown.getByRole("button", { name: /确\s*定/ }).first().click();
  await waitTableLoaded(page);
}

/**
 * 点击【导出】→ 在 Popconfirm 中确认 → 等待文件下载并保存到 savePath。
 * 返回 download 对象。
 */
async function triggerExport(
  page: import("@playwright/test").Page,
  savePath: string,
): Promise<void> {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    (async () => {
      await page.getByRole("button", { name: /^导\s*出$/ }).click();
      const popconfirm = page
        .locator(".ant-popconfirm")
        .filter({ hasText: "请确认是否导出列表数据" });
      await popconfirm.waitFor({ state: "visible", timeout: 5000 });
      const confirmBtn = popconfirm
        .getByRole("button", { name: /确\s*认/ })
        .first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      } else {
        await popconfirm.locator("button.ant-btn-primary").first().click();
      }
    })(),
  ]);
  await download.saveAs(savePath);
}

/**
 * 读取 xlsx 第一个 sheet 的数据行（跳过表头行 1）。
 * 返回字符串二维数组，空行跳过。
 * 列索引（0-based）：0=key, 1=中文名称, 2=value格式, 3=数据源类型
 */
async function readExportedRows(filePath: string): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const rows: string[][] = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const rowValues: string[] = [];
    sheet.getRow(i).eachCell((cell) => {
      const value =
        typeof cell.value === "object" &&
        cell.value !== null &&
        "result" in cell.value
          ? String(cell.value.result ?? "").trim()
          : String(cell.value ?? "").trim();
      rowValues.push(value);
    });
    if (rowValues.some(Boolean)) {
      rows.push(rowValues);
    }
  }
  return rows;
}

// ── test ─────────────────────────────────────────────────────────────────────

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test(
    "【P1】验证筛选导出三种筛选组合的行为一致性（数据源类型单筛 / key 名模糊单筛 / 组合筛）",
    { tag: "@serial" },
    async ({ page, step }) => {
      test.setTimeout(300000);

      // 前缀设计：两条 Hive2.x key + 两条 SparkThrift2.x key
      // 子场景 B / C 用 hivePrefix 做模糊搜索，可精准定位 hiveKey1/hiveKey2
      const ts = Date.now();
      const hiveKey1 = `t44hive_${ts}_1`;
      const hiveKey2 = `t44hive_${ts}_2`;
      const sparkKey1 = `t44spark_${ts}_1`;
      const sparkKey2 = `t44spark_${ts}_2`;
      const hivePrefix = `t44hive_${ts}`;

      const savePathA = path.join("/tmp", `t44_scA_${ts}.xlsx`);
      const savePathB = path.join("/tmp", `t44_scB_${ts}.xlsx`);
      const savePathC = path.join("/tmp", `t44_scC_${ts}.xlsx`);

      try {
        // ── 步骤1: 进入页面 ──────────────────────────────────────────────────
        await step(
          "步骤1: 进入 json 格式校验管理页面 → 页面正常加载，列表展示数据",
          async () => {
            await gotoJsonConfigPage(page);
            const table = page.locator(".ant-table");
            await table.waitFor({ state: "visible", timeout: 15000 });
            await waitTableLoaded(page);
            await expect(table).toBeVisible();
          },
          page.locator(".ant-table"),
        );

        // ── 步骤2: 前置数据准备 ───────────────────────────────────────────────
        await step(
          "步骤2: 新增两种数据源类型（Hive2.x × 2 条，SparkThrift2.x × 2 条）共 4 条测试数据 → 数据创建成功",
          async () => {
            await addKey(page, hiveKey1, { dataSourceType: "Hive2.x" });
            await addKey(page, hiveKey2, { dataSourceType: "Hive2.x" });
            await addKey(page, sparkKey1, { dataSourceType: "SparkThrift2.x" });
            await addKey(page, sparkKey2, { dataSourceType: "SparkThrift2.x" });
            await gotoJsonConfigPage(page);
            await waitTableLoaded(page);

            // 验证 4 条数据均可搜索到（简要抽查 hiveKey1 / sparkKey1）
            await searchKey(page, hiveKey1);
            await expect(
              page
                .locator(".ant-table-row")
                .filter({ hasText: hiveKey1 })
                .first(),
            ).toBeVisible({ timeout: 10000 });
            await clearSearch(page);
          },
        );

        // ── 步骤3: 子场景 A ── 数据源类型单筛后导出 ─────────────────────────
        // 【已知 Bug】仅筛选数据源类型 = Hive2.x 后导出，实际导出全量数据
        // 断言：导出文件中所有行数据源类型应为 Hive2.x，且不包含 sparkKey1/sparkKey2
        // Bug 存在时：spark 记录也会出现，以下断言将失败（预期失败，暴露 Bug）
        const hiveFilterRows = page.locator(".ant-table-tbody .ant-table-row");
        await step(
          "步骤3(子场景A): 仅筛选数据源类型=Hive2.x 后导出 → 导出文件应仅包含 Hive2.x 类型记录（已知 Bug：实际导出全量数据，此断言预期失败）",
          async () => {
            await applyDataSourceFilter(page, "Hive2.x");

            // 验证列表已过滤：应只显示 Hive2.x 记录
            const rowCount = await hiveFilterRows.count();
            expect(rowCount).toBeGreaterThan(0);

            // 触发导出并保存
            await triggerExport(page, savePathA);

            // 读取导出文件并断言
            expect(fs.existsSync(savePathA)).toBe(true);
            const rows = await readExportedRows(savePathA);
            expect(rows.length).toBeGreaterThan(0);

            // 断言：导出文件中必须包含 Hive2.x 的测试数据
            expect(rows.some((r) => r[0] === hiveKey1)).toBe(true);
            expect(rows.some((r) => r[0] === hiveKey2)).toBe(true);

            // 断言：导出文件中不应包含 SparkThrift2.x 的测试数据
            // 【预期失败（Bug A）】: 若导出了全量数据，以下两行断言会失败
            expect(rows.some((r) => r[0] === sparkKey1)).toBe(false);
            expect(rows.some((r) => r[0] === sparkKey2)).toBe(false);

            // 断言：导出文件中所有记录的数据源类型列应为 Hive2.x
            // 列索引 3 = 数据源类型（依据导出列顺序：key/中文名称/value格式/数据源类型/...）
            for (const row of rows) {
              if (row[0] === hiveKey1 || row[0] === hiveKey2) {
                expect(row[3]).toBe("Hive2.x");
              }
            }
          },
          hiveFilterRows.first(),
        );

        // 清除数据源类型筛选，恢复完整列表
        await clearDataSourceFilter(page);
        await clearSearch(page);

        // ── 步骤4: 子场景 B ── key 名模糊单筛后导出 ─────────────────────────
        // 【预期正常】仅按 hivePrefix 搜索，只导出匹配记录
        const searchFilterRows = page.locator(
          ".ant-table-tbody .ant-table-row",
        );
        await step(
          "步骤4(子场景B): 仅用 key 名前缀 t44hive_<ts> 模糊搜索后导出 → 导出文件应仅包含匹配 key 的记录（预期正常通过）",
          async () => {
            await searchKey(page, hivePrefix);

            // 验证列表：应只展示 hiveKey1 / hiveKey2
            const rowCount = await searchFilterRows.count();
            expect(rowCount).toBeGreaterThan(0);

            await triggerExport(page, savePathB);

            expect(fs.existsSync(savePathB)).toBe(true);
            const rows = await readExportedRows(savePathB);
            expect(rows.length).toBeGreaterThan(0);

            // 断言：导出文件中必须包含 hiveKey1 / hiveKey2
            expect(rows.some((r) => r[0] === hiveKey1)).toBe(true);
            expect(rows.some((r) => r[0] === hiveKey2)).toBe(true);

            // 断言：导出文件中不包含 spark 测试数据（key 不含 hivePrefix）
            expect(rows.some((r) => r[0] === sparkKey1)).toBe(false);
            expect(rows.some((r) => r[0] === sparkKey2)).toBe(false);

            // 断言：所有导出行的 key 列均包含 hivePrefix
            for (const row of rows) {
              expect(row[0]).toContain(hivePrefix);
            }
          },
          searchFilterRows.first(),
        );

        // 清除 key 名搜索
        await clearSearch(page);

        // ── 步骤5: 子场景 C ── 组合筛选（key 名 + 数据源类型）后导出 ────────
        // 【已知 Bug】组合筛选后导出，结果未遵循组合条件
        // 组合条件：key 前缀 = hivePrefix（只含 Hive 类型）+ 数据源类型 = Hive2.x
        // 预期导出：两条 hiveKey，且每行 key 包含 hivePrefix、数据源类型为 Hive2.x
        const comboRows = page.locator(".ant-table-tbody .ant-table-row");
        await step(
          "步骤5(子场景C): key 名前缀搜索 + 数据源类型=Hive2.x 组合筛选后导出 → 导出文件应同时满足两个条件（已知 Bug：组合条件未正确应用，此断言预期失败）",
          async () => {
            // 先设置 key 名搜索
            await searchKey(page, hivePrefix);
            // 再叠加数据源类型筛选
            await applyDataSourceFilter(page, "Hive2.x");

            // 验证组合筛选结果
            const rowCount = await comboRows.count();
            expect(rowCount).toBeGreaterThan(0);

            await triggerExport(page, savePathC);

            expect(fs.existsSync(savePathC)).toBe(true);
            const rows = await readExportedRows(savePathC);
            expect(rows.length).toBeGreaterThan(0);

            // 断言：导出必须包含 hiveKey1 / hiveKey2
            expect(rows.some((r) => r[0] === hiveKey1)).toBe(true);
            expect(rows.some((r) => r[0] === hiveKey2)).toBe(true);

            // 断言：不包含 spark 数据（key 不匹配前缀）
            expect(rows.some((r) => r[0] === sparkKey1)).toBe(false);
            expect(rows.some((r) => r[0] === sparkKey2)).toBe(false);

            // 断言：每行的 key 列包含 hivePrefix，且数据源类型列为 Hive2.x
            // 【预期失败（Bug C）】: 若组合条件未正确导出，会触发以下断言失败
            for (const row of rows) {
              expect(row[0]).toContain(hivePrefix);
              expect(row[3]).toBe("Hive2.x");
            }
          },
          comboRows.first(),
        );
      } finally {
        // ── 清理 ───────────────────────────────────────────────────────────
        await clearDataSourceFilter(page).catch(() => undefined);
        await clearSearch(page).catch(() => undefined);
        await deleteKey(page, hiveKey1).catch(() => undefined);
        await deleteKey(page, hiveKey2).catch(() => undefined);
        await deleteKey(page, sparkKey1).catch(() => undefined);
        await deleteKey(page, sparkKey2).catch(() => undefined);
        for (const p of [savePathA, savePathB, savePathC]) {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      }
    },
  );
});
