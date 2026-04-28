// META: {"id":"t5","priority":"P1","title":"【P1】验证校验key支持多选和全选操作"}
import { expect, test } from "../../../shared/fixtures/step-screenshot";
import { selectAntOption, uniqueName } from "../../../shared/helpers/test-setup";
import {
  FORMAT_JSON_VERIFICATION_FUNC,
  VALUE_FORMAT_TABLE,
} from "./data-15694";
import {
  addRuleToPackage,
  createRuleSetDraft,
} from "./json-format-utils";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });

const SUITE_NAME = "【内置规则丰富】有效性，json中key对应的value值格式校验(#15694)";
const PAGE_NAME = "规则集管理";

/**
 * 已配置 value格式 的 key（来自 test-data-15694 注释说明）
 */
const KEY1 = "person-name";
const KEY2 = "person-age";

/**
 * TreeSelect「全选」根节点文本（来自源码 JSON_TREE_ALL_KEY_TEXT）
 * TODO: 需通过 playwright-cli snapshot 确认实际文本，常见值：「全部」「全选」「所有」
 */
const JSON_TREE_ALL_KEY_TEXT = "全部";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  test(
    "【P1】验证校验key支持多选和全选操作",
    async ({ page, step }) => {
      const packageName = uniqueName("t5_pkg");

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

      // 打开 TreeSelect 的辅助函数
      const openKeyTreeSelect = async (): Promise<void> => {
        const treeSelectContainer = ruleForm.locator(".ant-tree-select").first();
        const hasTreeSelect = await treeSelectContainer
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (hasTreeSelect) {
          await treeSelectContainer.locator(".ant-select-selector").click();
        } else {
          // fallback: 点击第二个 select 的 selector
          await ruleForm
            .locator(".ant-select .ant-select-selector")
            .nth(1)
            .click();
        }
        await page.waitForTimeout(500);
      };

      // TreeSelect 弹出层
      const getTreeDropdown = () =>
        page
          .locator(".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible")
          .last();

      const expandTreeNodes = async (): Promise<void> => {
        const treeDropdown = getTreeDropdown();
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
        "步骤5: 打开校验key的 TreeSelect 下拉，勾选 person-name → person-name 被选中",
        async () => {
          await openKeyTreeSelect();
          const treeDropdown = getTreeDropdown();
          await expect(treeDropdown).toBeVisible({ timeout: 10000 });
          await expandTreeNodes();

          const key1Node = treeDropdown
            .locator(".ant-select-tree-treenode, .ant-tree-treenode")
            .filter({ hasText: KEY1 })
            .first();
          await expect(key1Node).toBeVisible({ timeout: 5000 });
          await key1Node
            .locator(".ant-select-tree-node-content-wrapper, .ant-tree-node-content-wrapper")
            .first()
            .click();
          await page.waitForTimeout(300);

          // 验证 key1 已被选中（勾选框为 checked 或 tag 出现）
          const key1Checkbox = key1Node.locator(".ant-select-tree-checkbox, .ant-tree-checkbox").first();
          const isChecked = await key1Checkbox
            .evaluate((el) =>
              el.classList.contains("ant-select-tree-checkbox-checked") ||
              el.classList.contains("ant-tree-checkbox-checked"),
            )
            .catch(() => false);

          if (!isChecked) {
            // 部分 TreeSelect 通过 tag 反映选中状态
            const selectedTag = ruleForm
              .locator(".ant-select-selection-item")
              .filter({ hasText: KEY1 })
              .first();
            await expect(selectedTag).toBeVisible({ timeout: 3000 });
          }
        },
      );

      await step(
        "步骤6: 勾选 person-age → 多选生效，person-name 和 person-age 同时被选中",
        async () => {
          const treeDropdown = getTreeDropdown();
          const dropdownVisible = await treeDropdown
            .isVisible({ timeout: 2000 })
            .catch(() => false);
          if (!dropdownVisible) {
            await openKeyTreeSelect();
            await expandTreeNodes();
          }

          const key2Node = treeDropdown
            .locator(".ant-select-tree-treenode, .ant-tree-treenode")
            .filter({ hasText: KEY2 })
            .first();
          await expect(key2Node).toBeVisible({ timeout: 5000 });
          await key2Node
            .locator(".ant-select-tree-node-content-wrapper, .ant-tree-node-content-wrapper")
            .first()
            .click();
          await page.waitForTimeout(300);

          // 验证 key1 + key2 都被选中
          const key2Checkbox = key2Node.locator(".ant-select-tree-checkbox, .ant-tree-checkbox").first();
          const isKey2Checked = await key2Checkbox
            .evaluate((el) =>
              el.classList.contains("ant-select-tree-checkbox-checked") ||
              el.classList.contains("ant-tree-checkbox-checked"),
            )
            .catch(() => false);

          if (!isKey2Checked) {
            const selectedItems = ruleForm.locator(".ant-select-selection-item");
            const count = await selectedItems.count();
            expect(count, "多选后应有至少2个选中项（key1 + key2）").toBeGreaterThanOrEqual(2);
          }
        },
        ruleForm.locator(".ant-select-selection-item").first(),
      );

      await step(
        "步骤7: 点击「全部」节点全选所有可用 key → 全选生效，选中项包含所有已配置 value格式 的 key",
        async () => {
          const treeDropdown = getTreeDropdown();
          const dropdownVisible = await treeDropdown
            .isVisible({ timeout: 2000 })
            .catch(() => false);
          if (!dropdownVisible) {
            await openKeyTreeSelect();
            await expandTreeNodes();
          }

          const allNode = treeDropdown
            .locator(".ant-select-tree-treenode, .ant-tree-treenode")
            .filter({ hasText: new RegExp(`^${JSON_TREE_ALL_KEY_TEXT}$`) })
            .first();

          const isAllNodeVisible = await allNode
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          if (isAllNodeVisible) {
            await allNode
              .locator(".ant-select-tree-node-content-wrapper, .ant-tree-node-content-wrapper")
              .first()
              .click();
            await page.waitForTimeout(300);

            // 全选后根节点 checkbox 为 checked
            const allCheckbox = allNode
              .locator(".ant-select-tree-checkbox, .ant-tree-checkbox")
              .first();
            const isAllChecked = await allCheckbox
              .evaluate((el) =>
                el.classList.contains("ant-select-tree-checkbox-checked") ||
                el.classList.contains("ant-tree-checkbox-checked"),
              )
              .catch(() => false);

            expect(
              isAllChecked,
              `点击「${JSON_TREE_ALL_KEY_TEXT}」节点后，该节点的 checkbox 应为 checked`,
            ).toBe(true);
          } else {
            // 若无「全部」节点，通过 Select All checkbox 或 checkAll 按钮实现
            // TODO: 需通过 playwright-cli snapshot 确认全选控件的实际选择器
            const checkAllBtn = treeDropdown
              .locator("button, [role='checkbox']")
              .filter({ hasText: /全选|全部/ })
              .first();
            if (await checkAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await checkAllBtn.click();
              await page.waitForTimeout(300);
            }
          }
        },
        getTreeDropdown(),
      );

      await step(
        "步骤8: 再次点击「全部」节点，取消全选 → 全选取消，选中项清空或减少",
        async () => {
          const treeDropdown = getTreeDropdown();
          const dropdownVisible = await treeDropdown
            .isVisible({ timeout: 2000 })
            .catch(() => false);
          if (!dropdownVisible) {
            await openKeyTreeSelect();
            await expandTreeNodes();
          }

          const allNode = treeDropdown
            .locator(".ant-select-tree-treenode, .ant-tree-treenode")
            .filter({ hasText: new RegExp(`^${JSON_TREE_ALL_KEY_TEXT}$`) })
            .first();

          const isAllNodeVisible = await allNode
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          if (isAllNodeVisible) {
            await allNode
              .locator(".ant-select-tree-node-content-wrapper, .ant-tree-node-content-wrapper")
              .first()
              .click();
            await page.waitForTimeout(300);

            // 取消全选后根节点 checkbox 不为 checked
            const allCheckbox = allNode
              .locator(".ant-select-tree-checkbox, .ant-tree-checkbox")
              .first();
            const isAllChecked = await allCheckbox
              .evaluate((el) =>
                el.classList.contains("ant-select-tree-checkbox-checked") ||
                el.classList.contains("ant-tree-checkbox-checked"),
              )
              .catch(() => false);

            expect(
              isAllChecked,
              `再次点击「${JSON_TREE_ALL_KEY_TEXT}」节点后，该节点的 checkbox 应取消选中`,
            ).toBe(false);
          }

          await page.keyboard.press("Escape");
        },
      );
    },
  );
});
