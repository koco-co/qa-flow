// META: {"id":"t25","priority":"P1","title":"验证仅配置枚举值in校验通过时质量报告详情说明使用枚举值独立说明模板"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureQualityReportsReady,
  getQualityReportRuleRow,
  openQualityReportDetail,
} from "./rule-task-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/session.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 数据质量报告"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证仅配置枚举值in校验通过时质量报告详情说明使用枚举值独立说明模板", async ({
      page,
      step,
    }) => {
      // 前置：任务 task_15695_enum_pass 已执行完成，校验结果为通过
      // 前置：枚举值规则配置：category in '1,2,3'，所有记录均满足

      // 步骤1：进入数据质量报告页面
      await step(
        "步骤1: 进入【数据质量 → 数据质量报告】页面 → 质量报告页面打开，报告列表加载完成",
        async () => {
          await ensureQualityReportsReady(page, ["task_15695_enum_pass"]);
          const tableRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
        },
      );

      // 步骤2：找到 task_15695_enum_pass 对应枚举值规则行，查看详情说明列
      await step(
        "步骤2: 找到任务 task_15695_enum_pass 对应的枚举值规则行，查看详情说明列内容 → 详情说明显示枚举值独立说明模板，不含取值范围说明",
        async () => {
          await openQualityReportDetail(page, "task_15695_enum_pass");
          const ruleRow = getQualityReportRuleRow(page, "枚举值");
          await expect(ruleRow).toBeVisible({ timeout: 10000 });
          await expect(ruleRow).toContainText("字段枚举值不存在约定范围外的值", { timeout: 5000 });
          await expect(ruleRow).toContainText(/枚举值in\s*'1,2,3'/, { timeout: 5000 });
          await expect(ruleRow).toContainText("校验通过", { timeout: 5000 });

          const rowText = await ruleRow.innerText();
          expect(rowText).not.toContain("取值范围");
        },
        page.locator(".qualityInspection").first(),
      );
    });
  });
}
