// META: {"id":"t1","priority":"P1","title":"【P1】验证规则配置页「统计规则」下拉框中「格式-json格式校验」选项位置在自定义正则上方"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../shared/helpers/test-setup";
import {
  FORMAT_JSON_VERIFICATION_FUNC,
  VALUE_FORMAT_TABLE,
} from "../data/data-15694";
import { addRuleToPackage, createRuleSetDraft } from "../helpers/json-format-utils";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，json中key对应的value值格式校验(#15694)";
const PAGE_NAME = "规则集管理";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  test(
    "【P1】验证规则配置页「统计规则」下拉框中「格式-json格式校验」选项位置在自定义正则上方",
    async ({ page, step }) => {
      const packageName = uniqueName("t1_pkg");

      await step("步骤1: 导航到新建规则集页面并创建草稿 → 进入监控规则步骤", async () => {
        await createRuleSetDraft(page, VALUE_FORMAT_TABLE, [packageName]);
      });

      let ruleForm: Awaited<ReturnType<typeof addRuleToPackage>>;
      await step("步骤2: 在规则包中添加有效性校验规则 → 规则表单渲染", async () => {
        ruleForm = await addRuleToPackage(page, packageName, "有效性校验");
        await expect(ruleForm).toBeVisible();
      });

      await step(
        "步骤3: 选择 json/string 类型字段（info）→ 字段选择成功",
        async () => {
          const fieldSelect = ruleForm
            .locator(".ant-form-item")
            .filter({ hasText: /字段/ })
            .locator(".ant-select")
            .first();
          await fieldSelect.locator(".ant-select-selector").click();
          await page.waitForTimeout(500);
          const infoOption = page
            .locator(".ant-select-dropdown:visible .ant-select-item-option")
            .filter({ hasText: /^info$/ })
            .first();
          if (await infoOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await infoOption.click();
          } else {
            // fallback：选第一个 json/string 类型字段
            await page
              .locator(".ant-select-dropdown:visible .ant-select-item-option")
              .first()
              .click();
          }
          await page.waitForTimeout(300);
        },
      );

      await step(
        "步骤4: 打开统计函数（统计规则）下拉列表，获取所有选项文本 → 下拉列表可见",
        async () => {
          const functionRow = ruleForm.locator(".rule__function-list__item").first();
          const functionSelect = functionRow.locator(".ant-select").first();
          await functionSelect.locator(".ant-select-selector").click();
          await page.waitForTimeout(500);

          const dropdown = page.locator(".ant-select-dropdown:visible").last();
          await expect(dropdown).toBeVisible({ timeout: 10000 });
        },
      );

      const dropdown = page.locator(".ant-select-dropdown:visible").last();

      await step(
        "步骤5: 验证「格式-json格式校验」的 index 在「自定义正则」之前 → 位置正确",
        async () => {
          const optionTexts = new Set<string>();
          const holder = dropdown.locator(".rc-virtual-list-holder").first();

          for (let pass = 0; pass < 25; pass += 1) {
            const visibleTexts = await dropdown
              .locator(".ant-select-item-option")
              .evaluateAll((items) =>
                items
                  .map((el) => el.textContent?.trim() ?? "")
                  .filter(Boolean),
              );
            visibleTexts.forEach((text) => optionTexts.add(text));

            const sizeBeforeScroll = optionTexts.size;
            await holder.evaluate((el) => {
              el.scrollTop += 240;
            });
            await page.waitForTimeout(300);

            const scrolledTexts = await dropdown
              .locator(".ant-select-item-option")
              .evaluateAll((items) =>
                items
                  .map((el) => el.textContent?.trim() ?? "")
                  .filter(Boolean),
              );
            scrolledTexts.forEach((text) => optionTexts.add(text));

            if (optionTexts.size === sizeBeforeScroll) {
              break;
            }
          }

          const allOptionTexts = [...optionTexts];

          const jsonFormatIndex = allOptionTexts.findIndex((text) =>
            text.includes(FORMAT_JSON_VERIFICATION_FUNC),
          );
          const customRegexIndex = allOptionTexts.findIndex((text) =>
            text.includes("自定义正则"),
          );

          expect(
            jsonFormatIndex,
            `「格式-json格式校验」未找到，当前选项：${allOptionTexts.join(", ")}`,
          ).toBeGreaterThanOrEqual(0);

          expect(
            customRegexIndex,
            `「自定义正则」未找到，当前选项：${allOptionTexts.join(", ")}`,
          ).toBeGreaterThanOrEqual(0);

          expect(
            jsonFormatIndex,
            `「格式-json格式校验」(index=${jsonFormatIndex}) 应在「自定义正则」(index=${customRegexIndex}) 之前`,
          ).toBeLessThan(customRegexIndex);
        },
        dropdown,
      );

      await page.keyboard.press("Escape");
    },
  );
});
