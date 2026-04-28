// META: {"id":"t4","priority":"P1","title":"【P1】验证新增key时key字段输入恰好255字符边界值可成功提交"}
import { test, expect } from "../../../shared/fixtures/step-screenshot";
import {
  gotoJsonConfigPage,
  addKey,
  deleteKey,
  searchKey,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证新增key时key字段输入恰好255字符边界值可成功提交", async ({ page, step }) => {
    const key255 = "a".repeat(255);
    // 搜索关键词：255 个 a 中取前 20 位，足够唯一且避免全量传入搜索框引发性能问题
    const searchKeyword = key255.slice(0, 20);

    try {
      await step("步骤1: 进入json格式校验管理页面 → 页面正常加载，列表显示已有数据行", async () => {
        await gotoJsonConfigPage(page);
        await expect(
          page.locator(".ant-table-row").first(),
        ).toBeVisible({ timeout: 15000 });
        // 先清理可能残留的同名 key，避免后端报唯一键冲突导致弹窗无法关闭
        await deleteKey(page, searchKeyword).catch(() => undefined);
        // 清理后回到默认列表状态
        await gotoJsonConfigPage(page);
        await expect(
          page.locator(".ant-table-row").first(),
        ).toBeVisible({ timeout: 15000 });
      });

      await step(
        "步骤2: 点击新增按钮，填写key（255个字母a），数据源类型保持默认SparkThrift2.x，点确定 → 弹窗关闭，列表刷新",
        async () => {
          await addKey(page, key255);
          // addKey 内部已等待弹窗关闭 + networkidle；此处仅确认弹窗已消失
          await page.locator(".ant-modal:visible").waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
        },
      );

      await step(
        "步骤3: 列表中出现包含255字符key的记录 → 提交成功",
        async () => {
          // 主动搜索确认记录已写入（表格数据量大需分页，直接搜索更可靠）
          await searchKey(page, searchKeyword);
          const newRow = page
            .locator(".ant-table-row")
            .filter({ hasText: searchKeyword })
            .first();
          await expect(newRow).toBeVisible({ timeout: 15000 });
        },
      );
    } finally {
      await deleteKey(page, searchKeyword);
    }
  });
});
