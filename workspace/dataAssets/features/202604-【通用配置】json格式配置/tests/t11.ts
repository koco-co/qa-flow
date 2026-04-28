// META: {"id":"t11","priority":"P1","title":"【P1】验证批量删除多条key（含子层级）"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  gotoJsonConfigPage,
  addKey,
  addChildKey,
  searchKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证批量删除多条key（含子层级）", async ({ page, step }) => {
    const sharedPrefix = `batchDel_${Date.now()}`;
    const batchKey1 = `${sharedPrefix}_k1`;
    const batchKey1Child = `${sharedPrefix}_k1c`;
    const batchKey2 = `${sharedPrefix}_k2`;

    // 前置：创建 batchKey1 及其子层级、batchKey2
    await step("步骤0: 新增 batchKey1（含子层级 batchKey1Child）和 batchKey2 → 前置数据准备完成", async () => {
      await gotoJsonConfigPage(page);
      await addKey(page, batchKey1);
      const key1Row = page
        .locator(".ant-table-row")
        .filter({ hasText: batchKey1 })
        .first();
      let key1Ready = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await searchKey(page, batchKey1);
        key1Ready = await key1Row.isVisible({ timeout: 5000 }).catch(() => false);
        if (key1Ready) {
          break;
        }
        await gotoJsonConfigPage(page);
      }
      expect(key1Ready).toBe(true);
      await addChildKey(page, batchKey1, batchKey1Child);
      await addKey(page, batchKey2);
    });

    // 步骤1：刷新页面，分别搜索两条记录，确认前置数据已可查询
    const table = page.locator(".ant-table");
    await step(
      "步骤1: 进入【数据质量 → 通用配置】页面，等待列表加载完成 → json格式校验管理页面打开，列表显示已有key数据",
      async () => {
        const ensureKeyVisible = async (keyName: string) => {
          let visible = false;
          const keyRow = page
            .locator(".ant-table-row")
            .filter({ hasText: keyName })
            .first();
          for (let attempt = 1; attempt <= 3; attempt++) {
            await searchKey(page, keyName);
            visible = await keyRow.isVisible({ timeout: 5000 }).catch(() => false);
            if (visible) {
              break;
            }
          }
          expect(visible).toBe(true);
        };

        for (let attempt = 1; attempt <= 2; attempt++) {
          await gotoJsonConfigPage(page);
          await table.waitFor({ state: "visible", timeout: 15000 });
          try {
            await ensureKeyVisible(batchKey1);
            await ensureKeyVisible(batchKey2);
            break;
          } catch (error) {
            if (attempt === 2) {
              throw error;
            }
          }
        }
      },
      table,
    );

    // 步骤2：分别搜索并勾选 batchKey1 / batchKey2，断言批量操作栏出现
    const batchDeleteBtn = page.getByRole("button", { name: /^批量删除$/ });
    await step(
      "步骤2: 在列表中勾选 batchKey1 和 batchKey2 两行的行选择框 → 两行均显示勾选状态，列表上方出现批量操作栏",
      async () => {
        // 等待表格 spin 消失后再操作复选框
        await page
          .locator(".ant-spin-spinning")
          .waitFor({ state: "hidden", timeout: 10000 })
          .catch(() => undefined);

        // 搜索并勾选 batchKey1 行
        await searchKey(page, batchKey1);
        const key1Row = page
          .locator(".ant-table-row")
          .filter({ hasText: batchKey1 })
          .first();
        await expect(key1Row).toBeVisible({ timeout: 10000 });
        await key1Row
          .locator(".ant-checkbox-input, .ant-checkbox input")
          .check({ force: true });

        // 搜索并勾选 batchKey2 行；页面 selectedKeys 会跨搜索条件保留
        await searchKey(page, batchKey2);
        const key2Row = page
          .locator(".ant-table-row")
          .filter({ hasText: batchKey2 })
          .first();
        await expect(key2Row).toBeVisible({ timeout: 10000 });
        await key2Row
          .locator(".ant-checkbox-input, .ant-checkbox input")
          .check({ force: true });

        // 断言批量操作栏中【批量删除】按钮可见
        await expect(batchDeleteBtn).toBeVisible({ timeout: 5000 });
      },
      batchDeleteBtn,
    );

    // 步骤3：点击【批量删除】按钮，断言确认 Popconfirm 弹出
    // 实际 DOM：批量删除使用 Popconfirm（渲染为 tooltip role），确认按钮文本为"删 除"
    const popconfirm = page.locator("[role=tooltip]").filter({ hasText: /是否批量删除key信息/ });
    await step(
      "步骤3: 点击【批量删除】按钮 → 弹出确认弹窗，提示文本为「是否批量删除key信息?」",
      async () => {
        // 等待 ant-spin 消失后再点击批量删除
        await page
          .locator(".ant-spin-spinning")
          .waitFor({ state: "hidden", timeout: 10000 })
          .catch(() => undefined);
        await batchDeleteBtn.click();

        // 等待 Popconfirm 出现（渲染为 tooltip）
        await popconfirm.waitFor({ state: "visible", timeout: 10000 });
        await expect(popconfirm).toContainText(/联动删除/, { timeout: 5000 });
      },
    );

    // 步骤4：点击 Popconfirm 内"删 除"按钮，等待响应，断言两条记录消失
    const key1Rows = page
      .locator(".ant-table-row")
      .filter({ hasText: batchKey1 });
    const key2Rows = page
      .locator(".ant-table-row")
      .filter({ hasText: batchKey2 });
    await step(
      "步骤4: 点击确认弹窗中的【删除】按钮，等待接口响应完成 → 弹窗关闭，batchKey1、batchKey2 均从列表消失，batchKey1Child 也不再存在",
      async () => {
        // 点击 Popconfirm 内的"删 除"按钮（主操作按钮）
        const deleteOkBtn = popconfirm
          .getByRole("button", { name: /删\s*除/ })
          .first();
        await deleteOkBtn.click();
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);

        // 等待 Popconfirm 关闭
        await popconfirm
          .waitFor({ state: "hidden", timeout: 10000 })
          .catch(() => undefined);

        // 分别搜索并断言 batchKey1 / batchKey2 已消失
        await searchKey(page, batchKey1);
        await expect(key1Rows).toHaveCount(0, { timeout: 10000 });
        await searchKey(page, batchKey2);
        await expect(key2Rows).toHaveCount(0, { timeout: 10000 });

        // 搜索 batchKey1Child，断言结果为空（联动删除验证）
        await searchKey(page, batchKey1Child);
        const childRows = page
          .locator(".ant-table-row")
          .filter({ hasText: batchKey1Child });
        await expect(childRows).toHaveCount(0, { timeout: 10000 });
      },
      table,
    );
  });
});
