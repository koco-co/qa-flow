// META: {"id":"t15","priority":"P1","title":"【P1】验证规则配置参数卡片完整展示所有字段"}
import { expect, test } from "../../fixtures/step-screenshot";
import { expectAntMessage } from "../../helpers/test-setup";
import {
  addAndConfigureKeyRangeRule,
  createRuleSetDraft,
  deleteRuleSetsByTableName,
  gotoRuleSetList,
  saveRuleSet,
} from "./key-range-utils";
import { KEY_RANGE_TABLE, QUALITY_PROJECT_ID } from "./data-15693";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";
const PAGE_NAME = "规则集管理";
const PACKAGE_NAME = "key范围校验参数卡片包";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  test.afterEach(async ({ browser }) => {
    const cleanupPage = await browser.newPage({ storageState: ".auth/session.json" });
    try {
      await cleanupPage.goto("about:blank");
      await cleanupPage.evaluate((pid) => {
        sessionStorage.setItem("X-Valid-Project-ID", String(pid));
      }, QUALITY_PROJECT_ID);
      await deleteRuleSetsByTableName(cleanupPage, KEY_RANGE_TABLE);
    } finally {
      await cleanupPage.close();
    }
  });

  test("【P1】验证规则配置参数卡片完整展示所有字段", async ({ page, step }) => {
    // 步骤1：进入规则集管理页面
    await step(
      "步骤1: 进入规则集管理页面 → 规则集列表正常加载",
      async () => {
        await gotoRuleSetList(page);
        const tableBody = page.locator(".ant-table-tbody, .ant-empty, [class*='empty']");
        await expect(tableBody.first()).toBeVisible({ timeout: 15000 });
      },
      page.locator(".ant-table-tbody"),
    );

    // 步骤2：新建规则集草稿，进入 Step2
    await step(
      "步骤2: 新建规则集并进入 Step2 监控规则 → 规则包区域可见",
      async () => {
        await createRuleSetDraft(page, KEY_RANGE_TABLE, [PACKAGE_NAME]);
        const packageSection = page
          .locator(".ruleSetMonitor__package")
          .filter({ hasText: PACKAGE_NAME })
          .first();
        await expect(packageSection).toBeVisible({ timeout: 15000 });
      },
      page.locator(".ruleSetMonitor__package").filter({ hasText: PACKAGE_NAME }).first(),
    );

    // 步骤3：添加完整性校验 - key范围校验规则，配置完整参数（字段:info, 方法:包含, 内容:key1, 强规则）
    const ruleForm = await (async () => {
      let capturedForm: import("@playwright/test").Locator | null = null;
      await step(
        "步骤3: 添加 key范围校验 规则并完整配置（字段 info、方法包含、内容 key1、强规则） → 规则配置填写完成",
        async () => {
          const form = await addAndConfigureKeyRangeRule(page, PACKAGE_NAME, {
            field: "info",
            method: "包含",
            keyNames: ["key1"],
            ruleStrength: "强规则",
          });
          capturedForm = form;

          // 验证字段已选中 "info"
          const fieldFormItem = form
            .locator(".ant-form-item")
            .filter({ hasText: /字段/ })
            .first();
          const fieldSelect = fieldFormItem.locator(".ant-select").first();
          await expect(fieldSelect).toContainText("info", { timeout: 5000 });

          // 验证规则强弱已选中 "强规则"
          const strengthFormItem = form
            .locator(".ant-form-item")
            .filter({ hasText: /强弱规则/ })
            .first();
          await expect(strengthFormItem).toContainText("强规则", { timeout: 5000 });
        },
        page.locator(".ruleForm").last(),
      );
      return capturedForm;
    })();

    // 步骤4：保存规则集，等待保存成功
    await step(
      "步骤4: 点击保存规则集 → 保存成功，跳转至列表页或出现成功提示",
      async () => {
        await saveRuleSet(page);

        // 验证跳转至列表页或成功提示
        const isBackToList = await page
          .locator(".ant-table-tbody")
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isBackToList) {
          const dataRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          const newRow = dataRows.filter({ hasText: KEY_RANGE_TABLE }).first();
          await expect(newRow).toBeVisible({ timeout: 15000 });
        } else {
          await expectAntMessage(page, /成功/, 10000);
        }
      },
      page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
        .filter({ hasText: KEY_RANGE_TABLE })
        .first(),
    );

    // 步骤5：在规则包中找到刚保存的规则，验证参数卡片展示所有配置字段
    await step(
      "步骤5: 查看规则配置参数卡片 → 卡片中完整展示字段名(info)、统计函数名(key范围校验)、校验方法(包含)、校验内容(key1)、强弱规则(强规则)",
      async () => {
        // 保存后规则表单折叠为参数卡片；定位规则包中的卡片区域
        // 可能需要重新打开规则集编辑页
        const isOnListPage = await page
          .locator(".ant-table-tbody")
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (isOnListPage) {
          // 在列表中找到该规则集并点击编辑
          const dataRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          const targetRow = dataRows.filter({ hasText: KEY_RANGE_TABLE }).first();
          await expect(targetRow).toBeVisible({ timeout: 10000 });
          await targetRow.getByRole("button", { name: "编辑" }).click();
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(1000);

          // 进入 Step2
          const firstPackage = page.locator(".ruleSetMonitor__package").first();
          const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();
          const isStep2Visible = async () =>
            (await firstPackage.isVisible().catch(() => false)) ||
            (await newPackageBtn.isVisible().catch(() => false));

          if (!(await isStep2Visible())) {
            const nextBtn = page.getByRole("button", { name: "下一步" }).first();
            if (await nextBtn.isVisible().catch(() => false)) {
              await nextBtn.click();
              await page.waitForTimeout(1000);
            }
          }
        }

        // 定位规则包区域
        const packageSection = page
          .locator(".ruleSetMonitor__package")
          .filter({ hasText: PACKAGE_NAME })
          .first();
        await expect(packageSection).toBeVisible({ timeout: 10000 });

        // 规则保存后以卡片/折叠形式展示（.ruleForm 或 .rule__card 或 .ruleCard）
        // TODO: 需通过 playwright-cli snapshot 确认实际卡片容器选择器
        const ruleCard = packageSection
          .locator(
            ".ruleForm, .rule__card, .ruleCard, [class*='ruleCard'], [class*='rule-card']",
          )
          .first();
        await expect(ruleCard).toBeVisible({ timeout: 10000 });

        // 验证卡片中包含字段名 "info"
        await expect(ruleCard).toContainText("info", { timeout: 5000 });

        // 验证卡片中包含统计函数名 "key范围校验"
        await expect(ruleCard).toContainText("key范围校验", { timeout: 5000 });

        // 验证卡片中包含校验方法 "包含"
        await expect(ruleCard).toContainText("包含", { timeout: 5000 });

        // 验证卡片中包含校验内容 "key1"
        await expect(ruleCard).toContainText("key1", { timeout: 5000 });

        // 验证卡片中包含强弱规则 "强规则"
        await expect(ruleCard).toContainText("强规则", { timeout: 5000 });
      },
      page
        .locator(".ruleSetMonitor__package")
        .filter({ hasText: PACKAGE_NAME })
        .locator(".ruleForm, .rule__card, .ruleCard, [class*='ruleCard']")
        .first(),
    );
  });
});
