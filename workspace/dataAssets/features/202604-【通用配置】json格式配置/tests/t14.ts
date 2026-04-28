// META: {"id":"t14","priority":"P1","title":"【P1】验证5层层级展开下钻及展开图标显示逻辑"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  expandRow,
  deleteKey,
  searchKey,
  ensureRowVisibleByKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证5层层级展开下钻及展开图标显示逻辑", async ({ page, step }) => {
    test.setTimeout(600000);
    const rootKey   = uniqueName("rootKey");
    const level2Key = uniqueName("level2Key");
    const level3Key = uniqueName("level3Key");
    const level4Key = uniqueName("level4Key");
    const level5Key = uniqueName("level5Key");
    const leafKey   = uniqueName("leafKey");

    // 前置：创建 5 层嵌套结构 + 独立叶子节点
    await step("步骤0: 创建5层嵌套结构及独立叶子节点 → 前置数据准备完成", async () => {
      await gotoJsonConfigPage(page);
      // 第1层
      await addKey(page, rootKey);
      await searchKey(page, rootKey);
      await expect(
        page.locator(".ant-table-row").filter({ hasText: rootKey }).first(),
      ).toBeVisible({ timeout: 15000 });
      // 第2-5层逐层新增子层级（每次新增子层级前需保证父节点行可见）
      await addChildKey(page, rootKey,   level2Key);
      // level2Key 在 rootKey 未展开状态下可能不在视图中；addChildKey 通过行文本定位，
      // 需要先展开父节点才能点到子节点的"新增子层级"按钮
      await searchKey(page, rootKey);
      await expect(
        page.locator(".ant-table-row").filter({ hasText: rootKey }).first(),
      ).toBeVisible({ timeout: 15000 });
      await expandRow(page, rootKey);
      await expect(
        page.locator(".ant-table-row").filter({ hasText: level2Key }).first(),
      ).toBeVisible({ timeout: 15000 });
      await addChildKey(page, level2Key, level3Key);
      await expandRow(page, level2Key);
      await addChildKey(page, level3Key, level4Key);
      await expandRow(page, level3Key);
      await addChildKey(page, level4Key, level5Key);
      // 重新导航到页面以确保 UI 状态干净，再新增独立叶子节点
      await gotoJsonConfigPage(page);
      await addKey(page, leafKey);
    });

    // 刷新页面，确保从干净状态开始验证
    await step("步骤0: 刷新页面并等待列表加载 → 页面回到干净状态", async () => {
      await gotoJsonConfigPage(page);
    });

    // 步骤1：断言展开图标显示逻辑
    // 注意：源码中展开图标由 key 列自定义渲染，有子节点时渲染 collapsed/expanded 图标，无子节点时渲染 spaced 占位符
    await step(
      "步骤1: 验证展开图标显示逻辑 → rootKey行有「+」图标，leafKey行无「+」图标",
      async () => {
        // 先搜索 rootKey 确保可见，然后断言其展开图标（有子节点，展开图标为 collapsed/expanded，非 spaced）
        const rootRow = await ensureRowVisibleByKey(page, rootKey, 20000);
        await expect(rootRow).toBeVisible({ timeout: 10000 });
        // Ant Design 固定列场景下图标元素可能有隐藏副本，用 count() 验证存在
        const rootExpandIconCount = await page
          .locator(".ant-table-row")
          .filter({ hasText: rootKey })
          .locator(".ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)")
          .count();
        expect(rootExpandIconCount).toBeGreaterThan(0);

        // 再搜索 leafKey，断言其为占位符图标（无子节点）
        const leafRow = await ensureRowVisibleByKey(page, leafKey, 20000);
        await expect(leafRow).toBeVisible({ timeout: 10000 });
        // leafKey 是叶子节点，无子节点，展开图标为占位符（spaced），不可点击
        // 用 count() > 0 验证 spaced 图标存在（Ant Design 固定列场景下 spaced 元素可能被 visibility:hidden 的影子副本干扰）
        const leafSpacedIconCount = await page
          .locator(".ant-table-row")
          .filter({ hasText: leafKey })
          .locator(".ant-table-row-expand-icon-spaced")
          .count();
        expect(leafSpacedIconCount).toBeGreaterThan(0);

        // 搜索 rootKey 为后续展开步骤做准备
        await ensureRowVisibleByKey(page, rootKey, 20000);
      },
    );

    // 步骤2：展开 rootKey，仅显示第2层
    // 搜索 rootKey 后，树结构数据会回显 rootKey 及其所有子节点，但子节点默认折叠

    await step(
      "步骤2: 点击rootKey展开 → 仅显示level2Key，level2Key行有「+」图标",
      async () => {
        const rootRow2 = page.locator(".ant-table-row").filter({ hasText: rootKey }).first();
        await expect(rootRow2).toBeVisible({ timeout: 10000 });
        await expandRow(page, rootKey);
        await page.waitForTimeout(500);
        // level2Key 行应出现（展开后可见）
        const level2Row = page.locator(".ant-table-row").filter({ hasText: level2Key }).first();
        await expect(level2Row).toBeVisible({ timeout: 5000 });
        // level2Key 有子节点，展开图标为 collapsed，用 count() 避免固定列影子副本干扰
        const level2ExpandIconCount = await page
          .locator(".ant-table-row")
          .filter({ hasText: level2Key })
          .locator(".ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)")
          .count();
        expect(level2ExpandIconCount).toBeGreaterThan(0);
      },
    );

    // 步骤3：展开 level2Key，仅显示第3层
    await step(
      "步骤3: 点击level2Key展开 → 仅显示level3Key，level3Key行有「+」图标",
      async () => {
        await expandRow(page, level2Key);
        await page.waitForTimeout(500);
        const level3Row = page.locator(".ant-table-row").filter({ hasText: level3Key }).first();
        await expect(level3Row).toBeVisible({ timeout: 5000 });
        // level3Key 有子节点，展开图标为 collapsed
        const level3ExpandIconCount = await page
          .locator(".ant-table-row")
          .filter({ hasText: level3Key })
          .locator(".ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)")
          .count();
        expect(level3ExpandIconCount).toBeGreaterThan(0);
      },
    );

    // 步骤4：展开 level3Key，仅显示第4层
    await step(
      "步骤4: 点击level3Key展开 → 仅显示level4Key，level4Key行有「+」图标",
      async () => {
        await expandRow(page, level3Key);
        await page.waitForTimeout(500);
        const level4Row = page.locator(".ant-table-row").filter({ hasText: level4Key }).first();
        await expect(level4Row).toBeVisible({ timeout: 5000 });
        // level4Key 有子节点，展开图标为 collapsed
        const level4ExpandIconCount = await page
          .locator(".ant-table-row")
          .filter({ hasText: level4Key })
          .locator(".ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)")
          .count();
        expect(level4ExpandIconCount).toBeGreaterThan(0);
      },
    );

    // 步骤5：展开 level4Key，显示第5层，且 level5Key 无展开图标（最末层级，无子节点）
    const level5Row = page.locator(".ant-table-row").filter({ hasText: level5Key }).first();

    await step(
      "步骤5: 点击level4Key展开 → 显示level5Key，level5Key行无「+」图标（最末层级）",
      async () => {
        await expandRow(page, level4Key);
        await page.waitForTimeout(500);
        await expect(level5Row).toBeVisible({ timeout: 5000 });
        // 第5层为最末层级，无子节点，图标应为占位符（spaced），用 count() 验证存在
        const level5SpacedCount = await page
          .locator(".ant-table-row")
          .filter({ hasText: level5Key })
          .locator(".ant-table-row-expand-icon-spaced")
          .count();
        expect(level5SpacedCount).toBeGreaterThan(0);
      },
      level5Row,
    );

    // 清理：删除根节点（级联删除所有子层级）和独立叶子节点
    await deleteKey(page, rootKey);
    await deleteKey(page, leafKey);
  });
});
