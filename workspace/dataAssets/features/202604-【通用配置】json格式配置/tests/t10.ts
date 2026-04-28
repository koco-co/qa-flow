// META: {"id":"t10","priority":"P1","title":"【P1】验证单个删除含子层级的key会联动删除子层级数据"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  searchKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证单个删除含子层级的key会联动删除子层级数据", async ({ page, step }) => {
    const deleteParent = uniqueName("delParent");
    const deleteChild = uniqueName("delChild");

    // 前置：创建父 key 及其子层级
    await step("步骤0: 新增父 key 及子层级 → 前置数据准备完成", async () => {
      await gotoJsonConfigPage(page);
      await addKey(page, deleteParent);
      const parentRow = page
        .locator(".ant-table-row")
        .filter({ hasText: deleteParent })
        .first();
      let parentReady = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await searchKey(page, deleteParent);
        parentReady = await parentRow.isVisible({ timeout: 5000 }).catch(() => false);
        if (parentReady) {
          break;
        }
        await gotoJsonConfigPage(page);
      }
      expect(parentReady).toBe(true);
      await addChildKey(page, deleteParent, deleteChild);
    });

    // 步骤1：刷新页面，搜索 deleteParent，确认列表正常加载，deleteParent 显示在列表中
    const table = page.locator(".ant-table");
     await step(
       "步骤1: 进入json格式校验管理页面 → 页面正常加载，deleteParent 记录在列表中显示「+」图标",
        async () => {
          const parentRow = page
            .locator(".ant-table-row")
            .filter({ hasText: deleteParent })
            .first();
          let parentVisible = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            await gotoJsonConfigPage(page);
            await table.waitFor({ state: "visible", timeout: 15000 });
            // 全量回归下页面首轮加载后列表偶发未稳定，限定重进页面+重搜一次兜底
            await searchKey(page, deleteParent);
            parentVisible = await parentRow.isVisible({ timeout: 5000 }).catch(() => false);
            if (parentVisible) {
              break;
            }
          }
          expect(parentVisible).toBe(true);
          await expect(parentRow).toBeVisible({ timeout: 10000 });
       },
       page.locator(".ant-table-row").filter({ hasText: deleteParent }).first(),
     );

    // 步骤2：在 deleteParent 行点击操作列【删除】按钮，确认 Popconfirm 弹出
    const popconfirm = page
      .locator(".ant-popover:visible, .ant-popconfirm:visible")
      .last();
    await step(
      "步骤2: 在 deleteParent 行点击【删除】按钮 → 弹出确认弹窗，提示文本包含「请确认是否删除key信息」或「联动删除」",
      async () => {
        // 等待 ant-spin 遮罩消失，避免拦截 pointer events
        await page
          .locator(".ant-spin.ant-spin-spinning")
          .waitFor({ state: "detached", timeout: 15000 })
          .catch(() => undefined);

        const parentRow = page
          .locator(".ant-table-row")
          .filter({ hasText: deleteParent })
          .first();
        await expect(parentRow).toBeVisible({ timeout: 10000 });

        const deleteBtn = parentRow
          .locator(".ant-btn-link")
          .filter({ hasText: "删除" })
          .first();
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        await deleteBtn.click({ timeout: 10000 });

        await popconfirm.waitFor({ state: "visible", timeout: 5000 });
        await expect(popconfirm).toContainText(
          /请确认是否删除key信息|联动删除/,
          { timeout: 5000 },
        );
      },
      popconfirm,
    );

    // 步骤3：点击 Popconfirm 的【确认】按钮，等待响应，断言 deleteParent 和 deleteChild 均已删除
    const parentRowLocator = page
      .locator(".ant-table-row")
      .filter({ hasText: deleteParent });
    await step(
      "步骤3: 点击确认按钮 → 弹窗关闭，列表刷新，deleteParent 消失，搜索 deleteChild 结果为空",
      async () => {
        await popconfirm.locator(".ant-btn-primary").first().click();
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);

        // 断言父 key 行已从列表中消失
        await expect(parentRowLocator).toHaveCount(0, { timeout: 10000 });

        // 搜索子 key，断言结果为空（联动删除验证）
        await searchKey(page, deleteChild);
        const childRowLocator = page
          .locator(".ant-table-row")
          .filter({ hasText: deleteChild });
        await expect(childRowLocator).toHaveCount(0, { timeout: 10000 });
      },
      table,
    );
  });
});
