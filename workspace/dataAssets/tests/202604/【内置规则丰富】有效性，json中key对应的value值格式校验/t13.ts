// META: {"id":"t13","priority":"P1","title":"【P1】验证保存后规则配置参数展示区域各字段内容正确"}
import { expect, test } from "../../fixtures/step-screenshot";
import { expectAntMessage, uniqueName } from "../../helpers/test-setup";
import {
  FORMAT_JSON_VERIFICATION_FUNC,
  VALUE_FORMAT_TABLE,
} from "./data-15694";
import {
  addRuleToPackage,
  configureJsonFormatRule,
  createRuleSetDraft,
  getRulePackageSection,
  saveRuleSet,
} from "./json-format-utils";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，json中key对应的value值格式校验(#15694)";
const PAGE_NAME = "规则集管理";

/** 已配置 value格式 的 key（来自 test-data-15694 注释说明） */
const VERIFIED_KEY = "person-name";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  test(
    "【P1】验证保存后规则配置参数展示区域各字段内容正确",
    async ({ page, step }) => {
      const packageName = uniqueName("t13_pkg");

      await step(
        "步骤1: 导航到新建规则集页面，创建规则集草稿并进入监控规则步骤 → 页面正常加载",
        async () => {
          await createRuleSetDraft(page, VALUE_FORMAT_TABLE, [packageName]);
        },
      );

      let ruleForm: Awaited<ReturnType<typeof addRuleToPackage>>;
      await step("步骤2: 在规则包中添加有效性校验规则 → 规则表单渲染可见", async () => {
        ruleForm = await addRuleToPackage(page, packageName, "有效性校验");
        await expect(ruleForm).toBeVisible();
      });

      await step(
        `步骤3: 完整配置规则：字段=info，统计函数=格式-json格式校验，校验key=[${VERIFIED_KEY}]，强规则 → 配置成功`,
        async () => {
          await configureJsonFormatRule(page, ruleForm, {
            field: "info",
            keyNames: [VERIFIED_KEY],
            ruleStrength: "强规则",
          });
        },
      );

      await step(
        "步骤4: 保存规则集（行内保存或页面底部保存）→ 保存成功，返回规则集列表或显示成功提示",
        async () => {
          // 尝试点击规则行内的【保存】按钮（若存在）
          const inlineRowSaveBtn = ruleForm
            .getByRole("button", { name: /保\s*存/ })
            .first();

          const inlineSaveBtnVisible = await inlineRowSaveBtn
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          if (inlineSaveBtnVisible) {
            await inlineRowSaveBtn.click();
            await page.waitForTimeout(500);
            // 等待行内保存成功提示，若有
            await expectAntMessage(page, /成功/, 5000).catch(() => undefined);
          } else {
            // 使用页面级保存
            await saveRuleSet(page);
          }
        },
      );

      await step(
        "步骤5: 进入规则集列表，找到刚保存的规则集，点击编辑重新进入监控规则页 → 成功进入编辑页",
        async () => {
          // 保存后可能已跳转到列表，也可能还在编辑页
          const onListPage = await page
            .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
            .first()
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          if (!onListPage) {
            // 尝试用全局保存跳转到列表
            const pageBottomSaveBtn = page
              .getByRole("button", { name: /保\s*存/ })
              .last();
            const pageBottomSaveBtnVisible = await pageBottomSaveBtn
              .isVisible({ timeout: 2000 })
              .catch(() => false);

            if (pageBottomSaveBtnVisible) {
              await saveRuleSet(page);
            }
          }

          // 确认已在列表，找到目标规则集行并点击编辑
          const tableRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await tableRows.first().waitFor({ state: "visible", timeout: 15000 });

          const targetRow = tableRows.filter({ hasText: VALUE_FORMAT_TABLE }).first();
          const editBtn = targetRow
            .getByRole("button", { name: /编辑/ })
            .or(targetRow.locator("a", { hasText: /编辑/ }))
            .first();
          await editBtn.waitFor({ state: "visible", timeout: 10000 });
          await editBtn.click();
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(1000);
        },
      );

      await step(
        "步骤6: 在监控规则步骤中找到规则包，验证规则配置参数展示区域包含：字段名 info、统计函数「格式-json格式校验」、校验key person-name、强规则 → 各字段内容正确",
        async () => {
          // 确保进入监控规则步骤
          const nextBtn = page.getByRole("button", { name: "下一步" }).first();
          const nextBtnVisible = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);
          if (nextBtnVisible) {
            await nextBtn.click();
            await page.waitForTimeout(1000);
          }

          const packageSection = await getRulePackageSection(page, packageName);

          // 规则参数展示区域：折叠后的摘要行，或展开后的表单内容
          // 优先查找 .ruleForm 中的摘要/参数展示区域
          const ruleSummary = packageSection
            .locator(".ruleForm, .rule__summary, .rule__params, .ruleSetMonitor__ruleItem")
            .first();

          await expect(ruleSummary).toBeVisible({ timeout: 10000 });

          // 验证字段名 "info"
          await expect(ruleSummary).toContainText("info", { timeout: 5000 });

          // 验证统计函数「格式-json格式校验」
          await expect(ruleSummary).toContainText(FORMAT_JSON_VERIFICATION_FUNC, { timeout: 5000 });

          // 验证校验key "person-name"
          await expect(ruleSummary).toContainText(VERIFIED_KEY, { timeout: 5000 });

          // 验证强规则
          await expect(ruleSummary).toContainText("强规则", { timeout: 5000 });
        },
        // highlight: 规则包内第一个规则表单
        page
          .locator(".ruleSetMonitor__package")
          .filter({ hasText: packageName })
          .locator(".ruleForm, .ruleSetMonitor__ruleItem")
          .first(),
      );
    },
  );
});
