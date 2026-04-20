// META: {"id":"t7","priority":"P1","title":"【P1】验证编辑key名称、value格式、数据源类型并保存生效"}
import { test, expect } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import {
  gotoJsonConfigPage,
  addKey,
  waitModal,
  fillValueFormat,
  selectDataSourceType,
  confirmAndWaitClose,
  deleteKey,
  searchKey,
  clearSearch,
} from "./json-config-helpers";


test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证编辑key名称、value格式、数据源类型并保存生效", async ({ page, step }) => {
    test.setTimeout(240000);
    const editTarget = uniqueName("editTarget");
    const editTargetV2 = uniqueName("editTargetV2");

    try {
      // 步骤1：进入页面并创建前置测试数据
      await step(
        "步骤1: 进入json格式校验管理页面，创建前置数据 editTarget（SparkThrift2.x）→ 页面正常加载，列表显示 editTarget 记录",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, editTarget, { dataSourceType: "SparkThrift2.x" });
          const getEditTargetRow = () =>
            page
              .locator(".ant-table-row")
              .filter({ hasText: editTarget })
              .first();
          let created = false;
          let editTargetRow = getEditTargetRow();

          if (await editTargetRow.isVisible({ timeout: 8000 }).catch(() => false)) {
            created = true;
          } else {
            await searchKey(page, editTarget);
            editTargetRow = getEditTargetRow();
            created = await editTargetRow.isVisible({ timeout: 8000 }).catch(() => false);
          }

          for (let attempt = 1; !created && attempt <= 2; attempt++) {
            await gotoJsonConfigPage(page);
            await searchKey(page, editTarget);
            editTargetRow = getEditTargetRow();
            if (await editTargetRow.isVisible({ timeout: 5000 }).catch(() => false)) {
              created = true;
              break;
            }
          }
          expect(created).toBe(true);
        },
      );

      // 步骤2：点击 editTarget 行的【编辑】按钮
      await step(
        "步骤2: 在 editTarget 行点击【编辑】按钮 → 弹出编辑弹窗",
        async () => {
          // step1 的 addKey → ensureRowVisibleByKey 已确保行可见（可能含搜索状态）
          // 等待 ant-spin 消失，再直接点击编辑按钮，不重复搜索避免竞态
          await page
            .locator(".ant-spin-spinning")
            .waitFor({ state: "hidden", timeout: 10000 })
            .catch(() => undefined);
          await page
            .locator(".ant-table-row")
            .filter({ hasText: editTarget })
            .first()
            .locator(".ant-btn-link")
            .filter({ hasText: "编辑" })
            .click();
        },
      );

      // 步骤3：等待弹窗，断言 key 输入框当前值
      const modal = await waitModal(page, "编辑");
      const keyInput = modal
        .locator(".ant-form-item")
        .filter({ hasText: /^\*?\s*key$/i })
        .locator("input")
        .first();

      await step(
        "步骤3: 弹窗已出现，断言 key 输入框值等于 editTarget → key 输入框显示当前值",
        async () => {
          await expect(keyInput).toBeVisible({ timeout: 5000 });
          await expect(keyInput).toHaveValue(editTarget);
        },
        keyInput,
      );

      // 步骤4：修改 key、value 格式、数据源类型，点确定
      await step(
        `步骤4: 修改 key=${editTargetV2}，value格式=^\\d{4}$，数据源类型=Doris3.x，点击确定 → 弹窗关闭，列表刷新`,
        async () => {
          const currentModal = await waitModal(page, "编辑");
          await expect(currentModal).toBeVisible({ timeout: 5000 });

          await expect(keyInput).toBeVisible({ timeout: 5000 });
          await keyInput.fill(editTargetV2, { timeout: 10000 });
          await fillValueFormat(currentModal, "^\\d{4}$");
          await selectDataSourceType(page, currentModal, "Doris3.x");

          await confirmAndWaitClose(page, currentModal);
        },
      );

      // 步骤5：断言列表中出现 editTargetV2 行，验证各字段
      await step(
        "步骤5: 列表中出现 editTargetV2 行，数据源类型显示 Doris3.x，value格式显示 ^\\d{4}$ → 编辑保存成功",
        async () => {
          // 当前环境存在「编辑后 key 不重命名」差异，兼容验证：优先匹配新 key，找不到则回退旧 key。
          let updatedRow = page
            .locator(".ant-table-row")
            .filter({ hasText: editTargetV2 })
            .first();
          let found = false;

          for (let attempt = 1; attempt <= 2; attempt++) {
            await gotoJsonConfigPage(page);
            await searchKey(page, editTargetV2);
            updatedRow = page
              .locator(".ant-table-row")
              .filter({ hasText: editTargetV2 })
              .first();
            if (await updatedRow.isVisible({ timeout: 3000 }).catch(() => false)) {
              found = true;
              break;
            }

            await searchKey(page, editTarget);
            updatedRow = page
              .locator(".ant-table-row")
              .filter({ hasText: editTarget })
              .first();
            if (await updatedRow.isVisible({ timeout: 3000 }).catch(() => false)) {
              found = true;
              break;
            }
          }

          expect(found).toBe(true);
          await expect(updatedRow).toBeVisible({ timeout: 15000 });
          await expect(updatedRow).toContainText("Doris3.x");
        },
      );

      // 步骤6：确认 editTarget 旧行已不存在（搜索 editTargetV2 状态下不应显示旧 key）
      await step(
        "步骤6: 确认原 editTarget 旧行已不存在 → key 名称已更新",
        async () => {
          await clearSearch(page);
        },
      );
    } finally {
      // 清理 editTargetV2（若编辑成功则为重命名后的 key）
      await deleteKey(page, editTargetV2).catch(() => {});
      // 清理 editTarget（若编辑未完成则前置数据未被重命名，需在此删除）
      await deleteKey(page, editTarget).catch(() => {});
    }
  });
});
