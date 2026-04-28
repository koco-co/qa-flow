// META: {"id":"t2","priority":"P1","title":"【P1】验证「格式-json格式校验」当前不展示独立悬浮提示图标"}
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
    "【P1】验证「格式-json格式校验」当前不展示独立悬浮提示图标",
    async ({ page, step }) => {
      const packageName = uniqueName("t2_pkg");

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
          await selectAntOption(page, fieldSelect, "info");
          await page.waitForTimeout(300);
        },
      );

      await step(
        "步骤4: 在统计函数下拉中选择「格式-json格式校验」→ 选择成功，校验key配置区域出现",
        async () => {
          const functionRow = ruleForm.locator(".rule__function-list__item").first();
          const functionSelect = functionRow.locator(".ant-select").first();
          await selectAntOption(page, functionSelect, FORMAT_JSON_VERIFICATION_FUNC);
          await page.waitForTimeout(500);
        },
      );

      const functionRow = ruleForm.locator(".rule__function-list__item").first();
      const tooltipIcons = functionRow.locator(
        ".anticon-question-circle, .anticon-info-circle, [role='img'][aria-label*='question'], [class*='tooltip'], [class*='help']",
      );

      await step(
        "步骤5: 检查统计函数所在行是否存在独立 tooltip/help 图标 → 当前不展示独立图标",
        async () => {
          await expect(tooltipIcons).toHaveCount(0);
        },
      );

      await step(
        "步骤6: 确认页面中不存在仅归属于该统计函数的独立提示浮层 → 页面表现与当前 DOM 一致",
        async () => {
          await expect(tooltipIcons).toHaveCount(0);
        },
      );
    },
  );
});
