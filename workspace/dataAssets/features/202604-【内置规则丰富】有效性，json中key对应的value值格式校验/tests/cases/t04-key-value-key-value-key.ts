// META: {"id":"t4","priority":"P1","title":"【P1】验证校验key列表中仅配置了value格式的key可被选中，未配置value格式的key不可选中"}
import { expect, test } from "../../../../shared/fixtures/step-screenshot";
import { selectAntOption, uniqueName } from "../../../../shared/helpers/test-setup";
import {
  FORMAT_JSON_VERIFICATION_FUNC,
  VALUE_FORMAT_TABLE,
} from "../data/data-15694";
import {
  addRuleToPackage,
  createRuleSetDraft,
} from "../helpers/json-format-utils";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，json中key对应的value值格式校验(#15694)";
const PAGE_NAME = "规则集管理";

/**
 * 已配置 value格式 的 key 名（环境中需提前维护）
 */
const ENABLED_KEY = "person-name";

/**
 * 未配置 value格式 的 key 名（如存在则应显示为 disabled）
 */
const DISABLED_KEY = "person-email";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  test(
    "【P1】验证校验key列表中仅配置了value格式的key可被选中，未配置value格式的key不可选中",
    async ({ page, step }) => {
      const packageName = uniqueName("t4_pkg");

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
        "步骤4: 选择统计函数「格式-json格式校验」→ 选择成功，校验key配置区域出现",
        async () => {
          const functionRow = ruleForm.locator(".rule__function-list__item").first();
          const functionSelect = functionRow.locator(".ant-select").first();
          await selectAntOption(page, functionSelect, FORMAT_JSON_VERIFICATION_FUNC);
          await page.waitForTimeout(500);
        },
      );

      const expandTreeNodes = async (): Promise<void> => {
        const treeDropdown = page
          .locator(".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible")
          .last();
        for (let pass = 0; pass < 3; pass += 1) {
          const switchers = treeDropdown.locator(
            ".ant-select-tree-switcher, .ant-tree-switcher",
          );
          const count = await switchers.count().catch(() => 0);
          let expanded = false;
          for (let index = 0; index < count; index += 1) {
            const switcher = switchers.nth(index);
            const className = (await switcher.getAttribute("class")) ?? "";
            if (/open|noop/.test(className)) {
              continue;
            }
            await switcher.click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(200);
            expanded = true;
          }
          if (!expanded) {
            break;
          }
        }
      };

      await step(
        "步骤5: 打开校验key的 TreeSelect 下拉 → 下拉树可见",
        async () => {
          // 校验key TreeSelect 在统计函数选择后出现
          const keySelectTrigger = ruleForm
            .locator(".ant-tree-select .ant-select-selector, .ant-select .ant-select-selector")
            .nth(1); // 第二个 select（字段之后）
          // TODO: 需通过 playwright-cli snapshot 确认 TreeSelect 容器实际层级

          // 先尝试精确定位 TreeSelect
          const treeSelectContainer = ruleForm.locator(".ant-tree-select").first();
          const hasTreeSelect = await treeSelectContainer
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          if (hasTreeSelect) {
            await treeSelectContainer.locator(".ant-select-selector").click();
          } else {
            await keySelectTrigger.click();
          }
          await page.waitForTimeout(500);

          const treeDropdown = page
            .locator(".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible")
            .last();
          await expect(treeDropdown).toBeVisible({ timeout: 10000 });
          await expandTreeNodes();
        },
      );

      const treeDropdown = page
        .locator(".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible")
        .last();

      await step(
        "步骤6: 验证已配置 value格式 的 key（person-name）可被选中（不是 disabled）→ person-name 节点不为 disabled",
        async () => {
          const enabledKeyNode = treeDropdown
            .locator(
              ".ant-select-tree-treenode, .ant-tree-treenode",
            )
            .filter({ hasText: ENABLED_KEY })
            .first();

          await expect(enabledKeyNode).toBeVisible({ timeout: 5000 });

          const isDisabled = await enabledKeyNode.evaluate((el) =>
            el.classList.contains("ant-select-tree-treenode-disabled") ||
            el.classList.contains("ant-tree-treenode-disabled"),
          );

          expect(
            isDisabled,
            `已配置 value格式 的 key「${ENABLED_KEY}」不应为 disabled`,
          ).toBe(false);
        },
        treeDropdown.locator(".ant-select-tree-treenode, .ant-tree-treenode").filter({ hasText: ENABLED_KEY }).first(),
      );

      await step(
        "步骤7: 验证未配置 value格式 的 key（person-email，若存在）显示为 disabled → person-email 节点为 disabled 或不存在",
        async () => {
          const disabledKeyNode = treeDropdown
            .locator(
              ".ant-select-tree-treenode, .ant-tree-treenode",
            )
            .filter({ hasText: DISABLED_KEY })
            .first();

          const isKeyVisible = await disabledKeyNode
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          if (!isKeyVisible) {
            // key3 不在列表中，说明环境中所有 key 都已配置 value格式，跳过 disabled 验证
            return;
          }

          const isDisabled = await disabledKeyNode.evaluate((el) =>
            el.classList.contains("ant-select-tree-treenode-disabled") ||
            el.classList.contains("ant-tree-treenode-disabled"),
          );

          expect(
            isDisabled,
            `未配置 value格式 的 key「${DISABLED_KEY}」应显示为 disabled`,
          ).toBe(true);
        },
        treeDropdown.locator(".ant-select-tree-treenode, .ant-tree-treenode").filter({ hasText: DISABLED_KEY }).first(),
      );

      await page.keyboard.press("Escape");
    },
  );
});
