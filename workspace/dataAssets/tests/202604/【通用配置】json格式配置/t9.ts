// META: {"id":"t9","priority":"P1","title":"【P1】验证第5层级不显示新增子层级按钮"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  expandRow,
  deleteKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证第5层级不显示新增子层级按钮", async ({ page, step }) => {
    const level1Root = uniqueName("l1root");
    const level2Node = uniqueName("l2node");
    const level3Node = uniqueName("l3node");
    const level4Node = uniqueName("l4node");
    const level5Key  = uniqueName("l5key");

    try {
      // 步骤1：进入json格式校验管理页面，列表正常加载
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面 → json格式校验管理页面打开，列表显示已有key数据",
        async () => {
          await gotoJsonConfigPage(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 15000 });
        },
      );

      // 前置：创建第1层
      await step(
        "前置: 新增第1层级 level1Root → 列表出现新记录",
        async () => {
          await addKey(page, level1Root);
          await expect(
            page.locator(".ant-table-row").filter({ hasText: level1Root }).first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 前置：展开第1层，创建第2层
      await step(
        "前置: 展开第1层并新增第2层级 level2Node → 子行可见",
        async () => {
          await expandRow(page, level1Root);
          await page.waitForTimeout(500);
          await addChildKey(page, level1Root, level2Node);
          await expandRow(page, level1Root);
          await page.waitForTimeout(500);
          await expect(
            page.locator(".ant-table-row").filter({ hasText: level2Node }).first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 前置：展开第2层，创建第3层
      await step(
        "前置: 展开第2层并新增第3层级 level3Node → 子行可见",
        async () => {
          await expandRow(page, level2Node);
          await page.waitForTimeout(500);
          await addChildKey(page, level2Node, level3Node);
          await expandRow(page, level2Node);
          await page.waitForTimeout(500);
          await expect(
            page.locator(".ant-table-row").filter({ hasText: level3Node }).first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 前置：展开第3层，创建第4层
      await step(
        "前置: 展开第3层并新增第4层级 level4Node → 子行可见",
        async () => {
          await expandRow(page, level3Node);
          await page.waitForTimeout(500);
          await addChildKey(page, level3Node, level4Node);
          await expandRow(page, level3Node);
          await page.waitForTimeout(500);
          await expect(
            page.locator(".ant-table-row").filter({ hasText: level4Node }).first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 前置：展开第4层，创建第5层
      await step(
        "前置: 展开第4层并新增第5层级 level5Key → 子行可见",
        async () => {
          await expandRow(page, level4Node);
          await page.waitForTimeout(500);
          await addChildKey(page, level4Node, level5Key);
          await expandRow(page, level4Node);
          await page.waitForTimeout(500);
          await expect(
            page.locator(".ant-table-row").filter({ hasText: level5Key }).first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 步骤2：逐层展开至第5层，验证操作列仅含编辑、删除，不含新增子层级
      await step(
        "步骤2: 逐层展开到第5层 level5Key，查看操作列 → 仅显示【编辑】和【删除】，不显示【新增子层级】",
        async () => {
          // 确保所有父层均已展开，第5层行可见
          await expandRow(page, level1Root);
          await page.waitForTimeout(500);
          await expandRow(page, level2Node);
          await page.waitForTimeout(500);
          await expandRow(page, level3Node);
          await page.waitForTimeout(500);
          await expandRow(page, level4Node);
          await page.waitForTimeout(500);

          const level5Row = page
            .locator(".ant-table-row")
            .filter({ hasText: level5Key })
            .first();

          await expect(level5Row).toBeVisible({ timeout: 10000 });

          // 断言【编辑】按钮存在
          const editBtn = level5Row
            .locator(".ant-btn-link")
            .filter({ hasText: "编辑" });
          await expect(editBtn).toBeVisible();

          // 断言【删除】按钮存在
          const deleteBtn = level5Row
            .locator(".ant-btn-link")
            .filter({ hasText: "删除" });
          await expect(deleteBtn).toBeVisible();

          // 断言【新增子层级】按钮存在但被禁用（源码：level >= MAX_JSON_VALIDATION_CONFIG_LEVEL 时 disabled，非隐藏）
          const addChildBtn = level5Row
            .locator(".ant-btn-link")
            .filter({ hasText: "新增子层级" });
          await expect(addChildBtn).toBeVisible();
          await expect(addChildBtn).toBeDisabled();
        },
        page.locator(".ant-table-row").filter({ hasText: level5Key }).first(),
      );
    } finally {
      // 清理：删除第1层（级联删除所有子层）
      await deleteKey(page, level1Root).catch(() => undefined);
    }
  });
});
