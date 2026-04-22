// META: {"id":"t3","priority":"P1","title":"【P1】验证当前 DOM 下「格式-json格式校验」在 INT 与 json/string 字段下均可见"}
import { expect, test } from "../../fixtures/step-screenshot";
import { selectAntOption, uniqueName } from "../../helpers/test-setup";
import {
  FORMAT_JSON_VERIFICATION_FUNC,
  VALUE_FORMAT_TABLE,
} from "./data-15694";
import { addRuleToPackage, createRuleSetDraft } from "./json-format-utils";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，json中key对应的value值格式校验(#15694)";
const PAGE_NAME = "规则集管理";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  test(
    "【P1】验证当前 DOM 下「格式-json格式校验」在 INT 与 json/string 字段下均可见",
    async ({ page, step }) => {
      const packageName = uniqueName("t3_pkg");

      await step("步骤1: 导航到新建规则集页面并创建草稿 → 进入监控规则步骤", async () => {
        await createRuleSetDraft(page, VALUE_FORMAT_TABLE, [packageName]);
      });

      let ruleForm: Awaited<ReturnType<typeof addRuleToPackage>>;
      await step("步骤2: 在规则包中添加有效性校验规则 → 规则表单渲染", async () => {
        ruleForm = await addRuleToPackage(page, packageName, "有效性校验");
        await expect(ruleForm).toBeVisible();
      });

      const fieldSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /字段/ })
        .locator(".ant-select")
        .first();

      await step(
        "步骤3: 选择 INT 类型字段（id）→ 字段选择成功",
        async () => {
          await selectAntOption(page, fieldSelect, "id");
          await page.waitForTimeout(300);
        },
      );

      const functionRow = ruleForm.locator(".rule__function-list__item").first();
      const functionSelect = functionRow.locator(".ant-select").first();

      await step(
        "步骤4: 打开统计函数下拉，验证 INT 类型字段下仍可看到「格式-json格式校验」→ 该选项可见",
        async () => {
          const dropdown = page.locator(".ant-select-dropdown:visible").last();
          await functionSelect.locator(".ant-select-selector").click();
          await page.waitForTimeout(500);

          await expect(dropdown).toBeVisible({ timeout: 10000 });

          const optionTexts: string[] = await dropdown
            .locator(".ant-select-item-option")
            .evaluateAll((items) =>
              items.map((el) => el.textContent?.trim() ?? ""),
            );

          const jsonFormatOption = dropdown
            .locator(".ant-select-item-option")
            .filter({ hasText: FORMAT_JSON_VERIFICATION_FUNC })
            .first();

          const isVisible = await jsonFormatOption
            .isVisible({ timeout: 2000 })
            .catch(() => false);

          expect(
            isVisible,
            `INT 类型字段下应能看到「格式-json格式校验」，当前选项：${optionTexts.join(", ")}`,
          ).toBe(true);
        },
      );

      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      await step(
        "步骤5: 切换为 json/string 类型字段（info）→ 字段切换成功",
        async () => {
          await selectAntOption(page, fieldSelect, "info");
          await page.waitForTimeout(300);
        },
      );

      const jsonFormatOptionAfterSwitch = page
        .locator(".ant-select-dropdown:visible .ant-select-item-option")
        .filter({ hasText: FORMAT_JSON_VERIFICATION_FUNC })
        .first();

      await step(
        "步骤6: 再次打开统计函数下拉，验证切换到 json/string 类型字段后「格式-json格式校验」仍然出现 → 选项可用",
        async () => {
          await functionSelect.locator(".ant-select-selector").click();
          await page.waitForTimeout(500);

          const updatedDropdown = page.locator(".ant-select-dropdown:visible").last();
          await expect(updatedDropdown).toBeVisible({ timeout: 10000 });

          const jsonFormatOpt = updatedDropdown
            .locator(".ant-select-item-option")
            .filter({ hasText: FORMAT_JSON_VERIFICATION_FUNC })
            .first();

          await expect(
            jsonFormatOpt,
            `json/string 类型字段下，下拉列表应包含「格式-json格式校验」`,
          ).toBeVisible({ timeout: 5000 });

          const isDisabled = await jsonFormatOpt.evaluate((el) =>
            el.classList.contains("ant-select-item-option-disabled"),
          );
          expect(
            isDisabled,
            `json/string 类型字段下，「格式-json格式校验」不应为 disabled`,
          ).toBe(false);
        },
        jsonFormatOptionAfterSwitch,
      );

      await page.keyboard.press("Escape");
    },
  );
});
