// META: {"id":"t12","priority":"P1","title":"【P1】验证key名模糊搜索功能（含子层级key命中）"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  searchKey,
  clearSearch,
  expandRow,
  deleteKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证key名模糊搜索功能（含子层级key命中）", async ({ page, step }) => {
    // uniqueName 保证全局唯一，前缀 orderInfo / orderStatus 作为搜索基础
    const orderInfo = uniqueName("orderInfo");
    const orderStatus = uniqueName("orderStatus");

    try {
      // 前置：进入页面，创建父 key 及子层级
      await step(
        "前置步骤: 创建父 key orderInfo 及子层级 orderStatus → 前置数据准备完成",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, orderInfo);
          await addChildKey(page, orderInfo, orderStatus);
        },
      );

      // 步骤1：刷新进入页面，等待列表加载完成
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 → 页面正常加载，列表显示所有第一层级数据",
        async () => {
          await gotoJsonConfigPage(page);
          const parentRow = page
            .locator(".ant-table-row")
            .filter({ hasText: orderInfo })
            .first();
          await expect(parentRow).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ant-table-row").filter({ hasText: orderInfo }).first(),
      );

      // 步骤2：搜索 orderInfo（父层级 key），验证结果仅显示含 orderInfo 的行
      await step(
        `步骤2: 在搜索框中输入 ${orderInfo}，等待搜索结果返回 → 列表仅显示key包含 orderInfo 的第一层级记录，其他记录被过滤`,
        async () => {
          await searchKey(page, orderInfo);

          // 断言 orderInfo 父行可见
          const parentRow = page
            .locator(".ant-table-row")
            .filter({ hasText: orderInfo })
            .first();
          await expect(parentRow).toBeVisible({ timeout: 10000 });

          // 断言搜索结果中至少包含 orderInfo
          await expect(parentRow).toContainText(orderInfo);

          // 断言所有可见行均包含 orderInfo（搜索词），不含无关记录
          const allRows = page.locator(".ant-table-row");
          const rowCount = await allRows.count();
          for (let i = 0; i < rowCount; i++) {
            const rowText = await allRows.nth(i).textContent();
            if (rowText && !rowText.includes(orderInfo)) {
              // 存在不含 orderInfo 的行则报错
              throw new Error(
                `搜索 ${orderInfo} 后发现不相关行: "${rowText.trim().slice(0, 80)}"`,
              );
            }
          }
        },
        page.locator(".ant-table-row").filter({ hasText: orderInfo }).first(),
      );

      // 步骤3：清空搜索，改搜子层级 key orderStatus，验证父记录 orderInfo 命中可见
      await step(
        `步骤3: 清空搜索框，重新输入 ${orderStatus}（子层级key名），等待搜索结果返回 → 列表展示命中子层级的父级记录 orderInfo`,
        async () => {
          await clearSearch(page);
          await searchKey(page, orderStatus);

          // 断言父行 orderInfo 可见（子层级命中，父记录显示在列表中）
          const parentRow = page
            .locator(".ant-table-row")
            .filter({ hasText: orderInfo })
            .first();
          await expect(parentRow).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-row").filter({ hasText: orderInfo }).first(),
      );

      // 步骤3续：展开父行，断言子层级 orderStatus 行可见
      await step(
        `步骤3（续）: 点击父行「+」展开子层级 → 可见 orderStatus 子层级记录`,
        async () => {
          await expandRow(page, orderInfo);

          const childRow = page
            .locator(".ant-table-row")
            .filter({ hasText: orderStatus })
            .first();
          await expect(childRow).toBeVisible({ timeout: 10000 });
          await expect(childRow).toContainText(orderStatus);
        },
        page.locator(".ant-table-row").filter({ hasText: orderStatus }).first(),
      );

      // 步骤4：清空搜索，验证列表恢复
      await step(
        "步骤4: 清空搜索框，等待列表恢复 → 列表恢复显示所有第一层级数据，orderInfo 行仍可见",
        async () => {
          await clearSearch(page);

          // 列表总量可能超过一页（>10条），清空后 orderInfo 不一定在当前页。
          // 用搜索确认记录依然存在（验证清空+再搜索均正常）。
          await searchKey(page, orderInfo);
          const parentRow = page
            .locator(".ant-table-row")
            .filter({ hasText: orderInfo })
            .first();
          await expect(parentRow).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-row").filter({ hasText: orderInfo }).first(),
      );
    } finally {
      // 清理：删除父 key（级联删除子层级 orderStatus）
      await deleteKey(page, orderInfo).catch(() => undefined);
    }
  });
});
