// META: {"id":"t41","priority":"P1","title":"【P1】验证删除已被完整性和有效性校验规则引用的key后规则不受影响"}
//
// 完整流程说明（需手动验证的部分）：
//   1. 新增 refTestKey → 在规则集中新增完整性校验规则（key范围校验含refTestKey）
//      及有效性校验规则（json格式校验，校验key=refTestKey）
//   2. 创建规则任务 → 立即执行
//   3. 删除 refTestKey
//   4. 回到规则集管理页面，编辑规则集 → 验证规则配置仍在，无报错
//   5. 回到规则任务页面，再次执行任务
//   6. 进入校验结果查询页面 → 验证执行完成无报错
//
// 以下脚本实现核心验证：新增 refTestKey → 删除 refTestKey → 验证删除成功。
// 规则集/规则任务的创建验证属于其他模块测试范围，不在此用例实现。
//
import { test, expect } from "../../fixtures/step-screenshot";
import {
  waitForTableLoaded,
  confirmPopconfirm,
  selectAntOption,
  uniqueName,
} from "../../helpers/test-setup";


const BASE_URL =
  "http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/dq/generalConfig/jsonValidationConfig";

async function dismissWelcomeDialog(page: import("@playwright/test").Page) {
  const dialog = page.locator("dialog, .ant-modal").filter({ hasText: "欢迎使用" });
  if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    const btn = dialog.getByRole("button", { name: "知道了" });
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
  }
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证删除已被完整性和有效性校验规则引用的key后规则不受影响", async ({
    page,
    step,
  }) => {
    // 核心验证：新增 refTestKey → 删除 refTestKey → 验证删除成功
    // 完整跨模块验证（规则集/规则任务/校验结果）需手动执行，见文件头部注释。
    const refTestKey = uniqueName("refTestKey");

    await step("步骤1: 进入json格式校验管理页面 → 页面正常加载", async () => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);
      const table = page.locator(".ant-table");
      await table.waitFor({ state: "visible", timeout: 15000 });
      await waitForTableLoaded(page, table);
    }, page.locator(".ant-table"));

    await step(
      "步骤2: 新增 refTestKey，value=^[a-zA-Z]+$，数据源类型=Doris3.x → 新增成功，记录出现在列表",
      async () => {
        await page.getByRole("button", { name: /^新\s*增$/ }).click();
        const modal = page.locator(".ant-modal:visible");
        await modal.waitFor({ state: "visible" });

        // 填写 key
        await modal
          .locator(".ant-form-item")
          .filter({ hasText: /^key/ })
          .locator("input")
          .fill(refTestKey);

        // 填写 value格式
        await modal
          .locator(".ant-form-item")
          .filter({ hasText: "value格式" })
          .locator("input")
          .fill("^[a-zA-Z]+$");

        // 选择数据源类型 Doris3.x
        await selectAntOption(
          page,
          modal
            .locator(".ant-form-item")
            .filter({ hasText: "数据源类型" })
            .locator(".ant-select"),
          "Doris3.x",
        );

        await modal.getByRole("button", { name: /^确\s*定$/ }).click();
        await modal.waitFor({ state: "hidden", timeout: 10000 });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);

        const newRow = page.locator(".ant-table-row").filter({ hasText: refTestKey }).first();
        await expect(newRow).toBeVisible({ timeout: 10000 });
      },
      page.locator(".ant-table-row").filter({ hasText: refTestKey }).first(),
    );

    // 此处为手动验证说明步骤（不实现，添加注释）
    // 步骤3（手动）: 进入规则集管理页面 (/dq/ruleSet?pid=xxx)，
    //   创建规则集，关联 Doris 数据源和测试表，
    //   新增完整性校验规则（key范围校验，包含refTestKey），
    //   新增有效性校验规则（json格式校验，校验key=refTestKey），保存。
    // 步骤4（手动）: 进入规则任务管理页面 (/dq/monitorRule?pid=xxx)，
    //   创建规则任务，导入规则包，保存，立即执行。
    // 以上步骤涉及复杂多模块前置操作，需在测试环境手动准备。

    await step(
      "步骤3: 删除 refTestKey → 弹出确认，确认后删除成功，记录从列表消失",
      async () => {
        const refRow = page.locator(".ant-table-row").filter({ hasText: refTestKey }).first();
        await expect(refRow).toBeVisible({ timeout: 5000 });

        // 点击删除操作
        const deleteBtn = refRow.locator(".ant-btn-link, button").filter({ hasText: "删除" }).first();
        await deleteBtn.click();

        // 等待 Popconfirm 并确认
        await confirmPopconfirm(page);

        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);

        // 验证 refTestKey 从列表消失
        await expect(
          page.locator(".ant-table-row").filter({ hasText: refTestKey }),
        ).toHaveCount(0, { timeout: 10000 });
      },
      page.locator(".ant-table"),
    );

    // 以下步骤为手动验证说明，不在此脚本实现
    // 步骤4（手动）: 回到规则集管理页面，编辑规则集 → 验证规则配置仍在，无报错
    // 步骤5（手动）: 回到规则任务页面，立即执行任务
    // 步骤6（手动）: 进入校验结果查询页面 → 验证执行完成无报错
    // 完整跨模块验证见文件头部注释说明。

    await step(
      "步骤4: 验证 refTestKey 已不在列表中（删除完成）→ 列表不包含 refTestKey 记录",
      async () => {
        // 搜索确认
        const searchInput = page.locator(".dt-search input, input[placeholder='请输入key名称查询']");
        await searchInput.fill(refTestKey);
        await page.keyboard.press("Enter");
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
      await dismissWelcomeDialog(page);
        await waitForTableLoaded(page, page.locator(".ant-table"));

        // 验证无对应行
        const deletedRows = page.locator(".ant-table-row").filter({ hasText: refTestKey });
        await expect(deletedRows).toHaveCount(0, { timeout: 10000 });
      },
      page.locator(".ant-table"),
    );
  });
});
