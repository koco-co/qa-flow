// META: {"id":"t12","priority":"P1","title":"【P1】验证key名模糊搜索功能（含子层级key命中）"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  expandRow,
  deleteKey,
  searchKey,
  clearSearch,
} from "./json-config-helpers";

/** 精确匹配 key 列文本的行定位器（对抗脏数据：key 列第一个 td 的 cell 精确匹配） */
function rowByExactKey(page: import("@playwright/test").Page, keyName: string) {
  // key 列 cell 的文本内容与 keyName 完全一致（排除子行误命中）
  return page
    .locator(".ant-table-row")
    .filter({ has: page.locator("td").filter({ hasText: new RegExp(`^${keyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) });
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证key名模糊搜索功能（含子层级key命中）", { tag: "@serial" }, async ({ page, step }) => {
    const orderInfo = uniqueName("orderInfo");
    const orderStatus = uniqueName("orderStatus");

    try {
      await step(
        "步骤0: 创建父 key orderInfo 及子层级 orderStatus → 前置数据准备完成",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, orderInfo);
          await searchKey(page, orderInfo);
          await addChildKey(page, orderInfo, orderStatus);
          await clearSearch(page);
        },
      );

      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面 → 页面正常加载，列表显示所有第一层级数据",
        async () => {
          await gotoJsonConfigPage(page);
          await expect(page.locator(".ant-table")).toBeVisible({ timeout: 10000 });
        },
      );

      await step(
        `步骤2: 在搜索框输入 ${orderInfo} 并点击搜索 → 列表仅显示 key 包含 ${orderInfo} 的第一层级记录`,
        async () => {
          await searchKey(page, orderInfo);
          // 等待搜索结果行数稳定到1条（避免旧行未清除时过早遍历）
          const rows = page.locator(".ant-table-row");
          await expect(rows).toHaveCount(1, { timeout: 15000 });
          // 验证唯一行的 key 列精确匹配 orderInfo
          const keyCell = rows.nth(0).locator("td").nth(1);
          const cellText = (await keyCell.textContent()) ?? "";
          expect(cellText.trim()).toBe(orderInfo);
        },
      );

      await step(
        `步骤3: 清空搜索框后重新输入 ${orderStatus} 并再次点击搜索 → 列表展示命中子层级的父级记录 ${orderInfo}`,
        async () => {
          await clearSearch(page);
          await searchKey(page, orderStatus);
          // 子级搜索时，父行 orderInfo 应出现在结果列表
          const parentRow = rowByExactKey(page, orderInfo);
          await expect(parentRow.first()).toBeVisible({ timeout: 15000 });
        },
        rowByExactKey(page, orderInfo).first(),
      );

      await step(
        `步骤4: 点击父行「+」展开子层级 → 可见 ${orderStatus} 子层级记录`,
        async () => {
          await expandRow(page, orderInfo);
          const childRow = rowByExactKey(page, orderStatus);
          await expect(childRow.first()).toBeVisible({ timeout: 10000 });
          await expect(childRow.first()).toContainText(orderStatus);
        },
        rowByExactKey(page, orderStatus).first(),
      );

      await step(
        "步骤5: 清空搜索框 → 列表恢复显示，搜索输入框为空",
        async () => {
          await clearSearch(page);
          await expect(page.locator(".dt-search input").first()).toHaveValue("", { timeout: 5000 });
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 10000 });
        },
      );
    } finally {
      await clearSearch(page).catch(() => undefined);
      await deleteKey(page, orderInfo).catch(() => undefined);
    }
  });
});
