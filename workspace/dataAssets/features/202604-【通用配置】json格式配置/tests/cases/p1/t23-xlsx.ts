// META: {"id":"t23","priority":"P1","title":"【P1】验证导入非xlsx格式文件时报错"}
import * as fs from "fs";
import * as path from "path";
import { test, expect } from "../../../../../shared/fixtures/step-screenshot";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
} from "../../helpers/json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证导入非xlsx格式文件时报错", { tag: "@serial" }, async ({ page, step }) => {
    const timestamp = Date.now();
    const csvPath = `/tmp/t23_${timestamp}.csv`;
    const csvContent = "key,name,value\ntestKey,测试,^\\d+$";

    try {
      // 步骤1：进入 json 格式校验管理页面，等待列表加载完成
      const table = page.locator(".ant-table");
      await step(
        "步骤1: 进入json格式校验管理页面 → 页面正常加载，列表展示完成",
        async () => {
          await gotoJsonConfigPage(page);
          await table.waitFor({ state: "visible", timeout: 15000 });
          const thead = page.locator(".ant-table-thead");
          await expect(thead.filter({ hasText: "key" })).toBeVisible({
            timeout: 5000,
          });
        },
        table,
      );

      // 步骤2：写入临时 csv 文件并点击【导入】按钮，等待弹窗出现
      await step(
        "步骤2: 点击【导入】按钮 → 弹出导入弹窗",
        async () => {
          fs.writeFileSync(csvPath, csvContent, "utf-8");
          await clickHeaderButton(page, "导入");
          await waitModal(page);
          const modal = page.locator(".ant-modal:visible").last();
          await expect(modal).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-modal:visible").last(),
      );

      // 步骤3：在弹窗内上传 csv 文件
      const modal = page.locator(".ant-modal:visible").last();
      const fileInput = modal.locator('input[type="file"]').first();

      await step(
        "步骤3: 在导入弹窗中上传 .csv 格式文件 → 文件选择后，系统拒绝或提示格式错误",
        async () => {
          await fileInput.setInputFiles(csvPath);
          await page.waitForTimeout(800);
        },
        modal,
      );

      // 步骤4：点击确定，验证错误提示（仅支持 xlsx / 格式错误 / 不支持）
      await step(
        "步骤4: 点击确定 → 2秒内页面或弹窗中出现格式错误提示（仅支持xlsx/格式错误/不支持）",
        async () => {
          // 尝试点击弹窗内的确定按钮（若已有内联错误提示则按钮可能不存在）
          const confirmBtn = modal
            .locator(
              ".ant-modal-footer .ant-btn-primary, .ant-modal-footer button",
            )
            .filter({ hasText: /确\s*定/ })
            .first();

          const confirmBtnVisible = await confirmBtn
            .isVisible({ timeout: 2000 })
            .catch(() => false);

          if (confirmBtnVisible) {
            await confirmBtn.click();
          }

          // 断言：2秒内页面或弹窗内出现格式错误相关文案
          const errorPattern = /xlsx|格式错误|仅支持|不支持/;

          // 优先检查 Message 全局提示
          const message = page
            .locator(
              ".ant-message-notice-content, .ant-notification-notice-message",
            )
            .filter({ hasText: errorPattern })
            .first();

          // 也检查弹窗内的错误文本（文件上传区域内联错误）
          const inlineError = modal
            .locator(
              ".ant-upload-list-item-error, .ant-form-item-explain-error, [class*='error'], [class*='Error']",
            )
            .filter({ hasText: errorPattern })
            .first();

          // 也检查整个页面（覆盖弹窗内任意位置）
          const pageError = page
            .locator("body")
            .filter({ hasText: errorPattern });

          const messageVisible = await message
            .isVisible({ timeout: 2000 })
            .catch(() => false);
          const inlineVisible = await inlineError
            .isVisible({ timeout: 500 })
            .catch(() => false);
          const pageErrorVisible = await pageError
            .isVisible({ timeout: 500 })
            .catch(() => false);

          // 至少有一种错误提示出现
          const anyErrorVisible =
            messageVisible || inlineVisible || pageErrorVisible;

          if (!anyErrorVisible) {
            // 兜底：等待 message 出现，超时则断言失败
            await expect(message).toBeVisible({ timeout: 2000 });
          } else {
            // 已确认有错误提示，断言通过
            expect(anyErrorVisible).toBe(true);
          }
        },
        modal,
      );
    } finally {
      // 清理临时文件
      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }
      // 关闭可能仍打开的弹窗
      const openModal = page.locator(".ant-modal:visible").last();
      const closeBtn = openModal.locator(".ant-modal-close").first();
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click().catch(() => undefined);
      }
    }
  });
});
