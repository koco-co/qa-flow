// META: {"id":"t2","priority":"P0","title":"【P0】验证导入正确文件全流程（重复则跳过）"}
import { expect, test } from "../../fixtures/step-screenshot";
import { uniqueName } from "../../helpers/test-setup";
import * as path from "path";
import * as os from "os";
import {
  gotoJsonConfigPage,
  clickHeaderButton,
  waitModal,
  buildImportXlsx,
  ensureRowVisibleByKey,
  deleteKey,
  expandRow,
  searchKey,
} from "./json-config-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

const SUITE_NAME = "【通用配置】json格式配置(#15696)";
const PAGE_NAME = "json格式校验管理";

test.describe(`${SUITE_NAME} - ${PAGE_NAME}`, () => {
  // 使用 uniqueName 避免跨 run 冲突；子层级 key 名直接命名即可（服务端按父子关系隔离）
  const importKey1 = uniqueName("json_cfg_imp1");
  const importKey2 = uniqueName("json_cfg_imp2");
  const subImportKey = "subImport1";

  test.afterEach(async ({ page }) => {
    // 清理创建的测试数据
    await deleteKey(page, importKey1).catch(() => undefined);
    await deleteKey(page, importKey2).catch(() => undefined);
  });

  test("验证导入正确文件全流程（重复则跳过）", async ({ page, step }) => {
    let xlsxPath!: string;

    await step("步骤0: 准备符合模板格式的 XLSX 导入文件（5个Sheet）", async () => {
      xlsxPath = path.join(os.tmpdir(), `json_import_${Date.now()}.xlsx`);
      await buildImportXlsx(
        xlsxPath,
        // 一层数据：[key, 中文名称, value格式]
        [
          [importKey1, "导入键一", "^[a-z]+$"],
          [importKey2, "导入键二", ""],
        ],
        // 二层数据：[第一层级key名, key, 中文名称, value格式]
        [
          [importKey1, subImportKey, "子导入键一", "^\\d+$"],
        ],
      );
    });

    await step("步骤1: 进入json格式校验管理页面，等待列表加载完成", async () => {
      await gotoJsonConfigPage(page);
      await expect(page.locator(".json-format-check")).toBeVisible({ timeout: 15000 });
    });

    let modal!: import("@playwright/test").Locator;

    await step("步骤2: 点击【导入】按钮，验证导入弹窗出现", async () => {
      await clickHeaderButton(page, "导入");
      modal = await waitModal(page, "导入");

      // 验证弹窗内含：重复处理规则、数据源类型、上传文件
      await expect(modal).toContainText("重复处理规则");
      await expect(modal).toContainText("数据源类型");
      await expect(modal).toContainText("上传");
    });

    await step("步骤3: 确认重复处理规则为「重复则跳过」（默认），数据源类型保持 sparkthrift2.x，上传 XLSX 文件，点击确定", async () => {
      // 确认「重复则跳过」radio 已选中（默认）
      const skipRadio = modal.locator(".ant-radio-wrapper").filter({ hasText: "重复则跳过" }).first();
      await expect(skipRadio).toBeVisible({ timeout: 5000 });
      const skipRadioInput = skipRadio.locator("input[type='radio']");
      await expect(skipRadioInput).toBeChecked({ timeout: 5000 });

      // 验证数据源类型显示 sparkthrift2.x（默认值）
      const dsSelect = modal.locator(".ant-form-item").filter({ hasText: "数据源类型" }).locator(".ant-select-selection-item").first();
      await expect(dsSelect).toContainText(/sparkthrift2/i, { timeout: 5000 });

      // 上传文件
      const fileInput = modal.locator("input[type='file']").first();
      await fileInput.setInputFiles(xlsxPath);

      // 等待文件出现在上传列表中
      const uploadedFile = modal.locator(".ant-upload-list-item").first();
      await expect(uploadedFile).toBeVisible({ timeout: 10000 });

      // 点击确定
      const confirmBtn = modal.getByRole("button", { name: /确\s*定/ }).first();
      await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
      await confirmBtn.click();

      // 等待弹窗关闭
      await page.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    });

    await step("步骤4: 验证导入的 key 数据出现在列表中（一层+子层级）", async () => {
      // 验证 importKey1 出现在列表第一层级
      const row1 = await ensureRowVisibleByKey(page, importKey1, 20000);
      await expect(row1).toBeVisible();
      await expect(row1).toContainText("导入键一");
      await expect(row1).toContainText("^[a-z]+$");

      // 验证 importKey2 出现在列表第一层级
      const row2 = await ensureRowVisibleByKey(page, importKey2, 20000);
      await expect(row2).toBeVisible();
      await expect(row2).toContainText("导入键二");

      // 验证 importKey1 下有子层级 subImport1
      await searchKey(page, importKey1);
      await expandRow(page, importKey1);
      const subRow = page.locator(".ant-table-row").filter({ hasText: subImportKey }).first();
      await expect(subRow).toBeVisible({ timeout: 10000 });
      await expect(subRow).toContainText("子导入键一");
    });
  });
});
