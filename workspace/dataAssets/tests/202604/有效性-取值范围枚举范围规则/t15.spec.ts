// META: {"id":"t15","priority":"P0","title":"【P0】验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询展示正确"}
import { test, expect } from "../../fixtures/step-screenshot";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "./test-data";
import {
  ensureRuleTasks,
  executeTaskFromList,
  waitForTaskMonitorReady,
  waitForTaskInstanceFinished,
  openTaskInstanceDetail,
  getTaskDetailRuleCard,
} from "./rule-task-helpers";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? ".auth/dataAssets/session-ltqc.json",
});
test.setTimeout(3600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(
    `【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则任务管理 - ${datasource.reportName}`,
    () => {
      test.beforeAll(() => {
        setCurrentDatasource(datasource);
      });

      test.beforeEach(() => {
        setCurrentDatasource(datasource);
      });

      test.afterAll(() => {
        clearCurrentDatasource();
      });

      test(
        "【P0】验证执行含取值范围&枚举范围且关系规则的任务后校验结果查询展示正确",
        async ({ page, step }) => {
          // 前置条件：任务 task_15695_and 已关联规则集 ruleset_15695_and（且关系规则）

          // 步骤1：进入规则任务管理页面，确保任务已就绪
          await step(
            "步骤1: 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 → 规则任务管理页面正常打开，列表加载完成，无报错",
            async () => {
              // ensureRuleTasks 内部完成：
              //   1) 创建规则集 ruleset_15695_and（若不存在）
              //   2) 创建任务 task_15695_and（若不存在）
              //   3) 导航到规则任务管理页面
              await ensureRuleTasks(page, ["task_15695_and"]);
              await waitForTaskMonitorReady(page, "task_15695_and", 30000);
            },
          );

          // 步骤2：点击表名展开抽屉，在抽屉中点击【立即执行】，
          //         等待执行完成，进入校验结果查询，断言外层状态「校验异常」
          let instanceRow = page
            .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
            .first();

          await step(
            "步骤2: 在规则任务列表中点击任务 task_15695_and 对应行的【表名】展开抽屉弹窗，在抽屉中点击【立即执行】按钮，等待任务执行完成（最长等待 120 秒），进入【数据质量 → 校验结果查询】页面查看最新记录 → 校验结果查询列表中出现该任务的最新执行记录，整条记录的状态列显示「校验异常」",
            async () => {
              // executeTaskFromList 已实现：API 立即执行 或 UI点击表名→抽屉→立即执行
              await executeTaskFromList(page, "task_15695_and");
              // waitForTaskInstanceFinished 导航到【校验结果查询】页并轮询直到任务完成
              instanceRow = await waitForTaskInstanceFinished(
                page,
                "task_15695_and",
                120000,
              );
              // Archive MD Step 2 expected：状态列显示「校验异常」
              await expect(instanceRow).toContainText("校验异常");
            },
            instanceRow,
          );

          // 步骤3：在校验结果查询列表中点击该任务记录的表名，展开详情抽屉，
          //         在【监控报告】Tab 下验证顶部统计按钮和规则卡片内容（6 项断言）
          await step(
            "步骤3: 在校验结果查询列表中，点击该任务记录对应的【表名】展开详情抽屉，抽屉顶部显示任务名，在【监控报告】Tab 下查看规则未通过统计按钮和有效性校验卡片内容 → 监控报告 Tab 下显示：1)顶部统计按钮「校验未通过(1)」 2)字段列「score」 3)统计函数列「取值范围&枚举范围」 4)取值范围列「期望值 >1 且 <10」 5)枚举值列「in 1,2,3」关系列「且」 6)强弱规则列「强规则」，卡片右上角显示「查看明细」与「查看趋势」",
            async () => {
              // openTaskInstanceDetail 点击实例行的第一个按钮（表名链接），
              // 等待 /monitorRecord/detailReport 响应，返回已可见的 .dtc-drawer 定位器
              const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
              await expect(detailDrawer).toBeVisible({ timeout: 15000 });

              // 断言 1：抽屉顶部统计按钮显示「校验未通过(1)」
              // Archive MD Step 3 expected: 顶部显示统计按钮「校验未通过(1)」
              await expect(detailDrawer).toContainText("校验未通过", { timeout: 15000 });

              // 定位规则名称为「取值范围&枚举范围」的规则卡片
              const targetRuleCard = getTaskDetailRuleCard(detailDrawer, "取值范围&枚举范围");
              await expect(targetRuleCard).toBeVisible({ timeout: 20000 });

              // 断言 2：字段列显示「score」
              await expect(targetRuleCard).toContainText("score");

              // 断言 3：统计函数列显示「取值范围&枚举范围」
              await expect(targetRuleCard).toContainText("取值范围&枚举范围");

              // 断言 4：取值范围列显示「期望值 >1 且 <10」
              await expect(targetRuleCard).toContainText("期望值 >1 且 <10");

              // 断言 5：枚举值列显示「in 1,2,3」，取值范围和枚举值关系列显示「且」
              await expect(targetRuleCard).toContainText("in 1,2,3");
              await expect(targetRuleCard).toContainText("且");

              // 断言 6：强弱规则列显示「强规则」，卡片右上角显示「查看明细」与「查看趋势」操作链接
              await expect(targetRuleCard).toContainText("强规则");
              await expect(targetRuleCard).toContainText("查看明细");
              await expect(targetRuleCard).toContainText("查看趋势");
            },
            page.locator(".dtc-drawer:visible").last(),
          );

          // 步骤4：切换至 doris3.x 数据源，重复以上步骤（由 ACTIVE_DATASOURCES 循环覆盖）
          // 当 QA_DATASOURCE_MATRIX 包含 doris3.x 时，循环会自动创建第二个 describe 块。
          // 此处无需手动切换，结构由 for...of ACTIVE_DATASOURCES 保证。
        },
      );
    },
  );
}
