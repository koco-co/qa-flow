// META: {"id":"t26","priority":"P1","title":"验证仅配置枚举值in校验不通过时质量报告详情说明包含越界值数量统计"}
import { expect, test } from "../../fixtures/step-screenshot";
import { ACTIVE_DATASOURCES, clearCurrentDatasource, setCurrentDatasource } from "./test-data";
import {
  ensureQualityReportsReady,
  getQualityReportRuleRow,
  openQualityReportDetail,
  openQualityReportRuleDetail,
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
    test("验证仅配置枚举值in校验不通过时质量报告详情说明包含越界值数量统计", async ({
      page,
      step,
    }) => {
      // 前置：任务 task_15695_enum_fail 已执行完成，校验结果为不通过
      // 前置：category 字段不在枚举值 '1,2,3' 内的数据：id=2(category=4)、id=5(category=5)，共 2 条越界

      // 步骤1：进入数据质量报告页面
      await step(
        "步骤1: 进入【数据质量 → 数据质量报告】页面 → 质量报告页面打开，报告列表加载完成",
        async () => {
          await ensureQualityReportsReady(page, ["task_15695_enum_fail"]);
          const tableRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
          await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
        },
      );

      // 步骤2：找到 task_15695_enum_fail 对应枚举值规则行，查看详情说明列
      await step(
        "步骤2: 找到任务 task_15695_enum_fail 对应的枚举值规则行，查看详情说明列内容 → 详情说明含越界值数量统计「约定范围外的值的数量总计为2个」",
        async () => {
          await openQualityReportDetail(page, "task_15695_enum_fail");
          const ruleRow = getQualityReportRuleRow(page, "枚举值");
          await expect(ruleRow).toBeVisible({ timeout: 10000 });
          await expect(ruleRow).toContainText("字段枚举值存在约定范围外的值", { timeout: 5000 });
          await expect(ruleRow).toContainText(/约定范围外的值(?:的)?数量总计为2个/, {
            timeout: 5000,
          });
          await expect(ruleRow).toContainText(/枚举值in\s*'1,2,3'/, { timeout: 5000 });
          await expect(ruleRow.getByRole("button", { name: "查看详情" })).toBeVisible({
            timeout: 5000,
          });

          const dataDrawer = await openQualityReportRuleDetail(page, ruleRow);
          await expect(dataDrawer.getByRole("button", { name: "下载明细" })).toBeVisible({
            timeout: 5000,
          });
        },
        page.locator(".qualityInspection").first(),
      );
    });
  });
}
