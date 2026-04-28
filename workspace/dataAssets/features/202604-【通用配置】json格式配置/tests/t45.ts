// META: {"id":"t45","priority":"P1","title":"【P1】验证编辑页与新增页表单结构保持一致（字段顺序、必填项、title 拼接中文名称）"}
import { test, expect } from "../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../shared/helpers/test-setup";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  addKey,
  deleteKey,
  searchKey,
  ensureRowVisibleByKey,
} from "./json-config-helpers";

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证编辑页与新增页表单结构保持一致（字段顺序、必填项、title 拼接中文名称）", async ({
    page,
    step,
  }) => {
    const keyName = uniqueName("structCmp");
    const chineseName = "结构对比测试";

    // 用于记录采集到的表单结构信息
    let addFieldLabels: string[] = [];
    let addRequiredLabels: string[] = [];
    let addModalTitle = "";

    let editFieldLabels: string[] = [];
    let editRequiredLabels: string[] = [];
    let editModalTitle = "";

    try {
      // 步骤1：进入 json 格式配置页面
      await step(
        "步骤1: 进入 json 格式校验管理页面 → 页面正常加载，列表展示",
        async () => {
          await gotoJsonConfigPage(page);
          await expect(
            page.locator(".json-format-check").first(),
          ).toBeVisible({ timeout: 15000 });
        },
      );

      // 步骤2：前置新增一条 key 作为编辑目标
      await step(
        "步骤2: 新增一条 key 作为编辑目标 → 新增成功，key 在列表中可见",
        async () => {
          await addKey(page, keyName, { chineseName });
          const newRow = await ensureRowVisibleByKey(page, keyName, 15000);
          await expect(newRow).toBeVisible({ timeout: 10000 });
          await expect(newRow).toContainText(chineseName);
        },
        page.locator(".ant-table-row").filter({ hasText: keyName }).first(),
      );

      // 步骤3：打开「新增」弹窗，采集表单结构
      const addModal = await (async () => {
        await clickHeaderButton(page, "新增");
        return waitModal(page);
      })();

      await step(
        "步骤3: 打开「新增」弹窗，采集字段顺序、必填项、弹窗 title → 采集完成",
        async () => {
          await expect(addModal).toBeVisible({ timeout: 10000 });

          // 采集弹窗 title
          const titleEl = addModal.locator(".ant-modal-title").first();
          await expect(titleEl).toBeVisible({ timeout: 5000 });
          addModalTitle = (await titleEl.textContent()) ?? "";

          // 采集所有 form-item label 文本（按 DOM 顺序）
          const labelEls = addModal.locator(
            ".ant-form-item .ant-form-item-label label",
          );
          const labelCount = await labelEls.count();
          const labels: string[] = [];
          const required: string[] = [];
          for (let i = 0; i < labelCount; i++) {
            const el = labelEls.nth(i);
            const text = ((await el.textContent()) ?? "").trim().replace(/^\*\s*/, "");
            if (text) {
              labels.push(text);
              // 必填项：label 含 ant-form-item-required class，或内部有 * 文本节点
              const isRequired = await el
                .evaluate((node) => {
                  return (
                    node.classList.contains("ant-form-item-required") ||
                    node.closest(".ant-form-item-label")?.querySelector(".ant-form-item-required") !== null
                  );
                })
                .catch(() => false);
              if (isRequired) {
                required.push(text);
              }
            }
          }
          addFieldLabels = labels;
          addRequiredLabels = required;

          // 断言新增弹窗 title 为「新建」（根据用例预期：新增 title = "新增" 或 "新建"）
          await expect(titleEl).toBeVisible();
          await expect(titleEl).toContainText(/新[增建]/);
        },
        addModal,
      );

      // 步骤4：关闭「新增」弹窗
      await step(
        "步骤4: 关闭「新增」弹窗 → 弹窗关闭",
        async () => {
          const closeBtn = addModal
            .locator(".ant-modal-close, button[aria-label='Close']")
            .first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click();
          } else {
            await page.keyboard.press("Escape");
          }
          await addModal
            .waitFor({ state: "hidden", timeout: 5000 })
            .catch(() => undefined);
          await expect(
            page.locator(".ant-modal-wrap:visible"),
          ).toHaveCount(0, { timeout: 5000 });
        },
      );

      // 步骤5：找到刚建的 key，点击「编辑」，打开编辑弹窗并采集表单结构
      await step(
        "步骤5: 点击刚新建 key 的「编辑」按钮，打开编辑弹窗，采集字段顺序、必填项、title → 编辑弹窗打开，title 格式为「编辑 - {中文名称}」",
        async () => {
          await searchKey(page, keyName);
          const row = page
            .locator(".ant-table-row")
            .filter({ hasText: keyName })
            .first();
          await expect(row).toBeVisible({ timeout: 10000 });

          const editBtn = row
            .locator(".ant-btn-link")
            .filter({ hasText: "编辑" })
            .first();
          await expect(editBtn).toBeVisible({ timeout: 5000 });
          await editBtn.click();

          const editModal = await waitModal(page);
          await expect(editModal).toBeVisible({ timeout: 10000 });

          // 采集弹窗 title
          const titleEl = editModal.locator(".ant-modal-title").first();
          await expect(titleEl).toBeVisible({ timeout: 5000 });
          editModalTitle = (await titleEl.textContent()) ?? "";

          // 断言编辑 title 包含「编辑」和中文名称
          await expect(titleEl).toContainText("编辑");
          await expect(titleEl).toContainText(chineseName);

          // 采集编辑弹窗的字段标签（按 DOM 顺序）
          const labelEls = editModal.locator(
            ".ant-form-item .ant-form-item-label label",
          );
          const labelCount = await labelEls.count();
          const labels: string[] = [];
          const required: string[] = [];
          for (let i = 0; i < labelCount; i++) {
            const el = labelEls.nth(i);
            const text = ((await el.textContent()) ?? "").trim().replace(/^\*\s*/, "");
            if (text) {
              labels.push(text);
              const isRequired = await el
                .evaluate((node) => {
                  return (
                    node.classList.contains("ant-form-item-required") ||
                    node.closest(".ant-form-item-label")?.querySelector(".ant-form-item-required") !== null
                  );
                })
                .catch(() => false);
              if (isRequired) {
                required.push(text);
              }
            }
          }
          editFieldLabels = labels;
          editRequiredLabels = required;

          // 关闭编辑弹窗
          const closeBtn = editModal
            .locator(".ant-modal-close, button[aria-label='Close']")
            .first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click();
          } else {
            await page.keyboard.press("Escape");
          }
          await editModal
            .waitFor({ state: "hidden", timeout: 5000 })
            .catch(() => undefined);
        },
      );

      // 步骤6：断言编辑弹窗与新增弹窗的表单结构完全一致
      await step(
        "步骤6: 比对新增弹窗与编辑弹窗的字段顺序、必填项、title 格式 → 字段顺序一致、必填项集合一致、新增 title 含「新建/新增」、编辑 title 格式为「编辑 - {中文名称}」",
        async () => {
          // 断言字段顺序数组一致（编辑页 == 新增页）
          expect(editFieldLabels).toEqual(addFieldLabels);

          // 断言必填项集合一致
          expect(editRequiredLabels.sort()).toEqual(addRequiredLabels.sort());

          // 断言新增 title 含「新增」或「新建」
          expect(addModalTitle).toMatch(/新[增建]/);

          // 断言编辑 title 格式为「编辑 - {中文名称}」
          expect(editModalTitle).toContain("编辑");
          expect(editModalTitle).toContain(chineseName);
          // 精确格式：「编辑 - 结构对比测试」
          expect(editModalTitle).toMatch(new RegExp(`编辑\\s*-\\s*${chineseName}`));
        },
      );
    } finally {
      // 清理测试数据
      await searchKey(page, keyName).catch(() => undefined);
      await deleteKey(page, keyName).catch(() => undefined);
    }
  });
});
