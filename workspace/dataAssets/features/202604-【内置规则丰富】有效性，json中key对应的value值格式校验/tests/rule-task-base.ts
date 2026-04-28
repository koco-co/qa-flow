import "./test-data";

const mod = await import("../有效性-取值范围枚举范围规则/rule-task-helpers");

export const executeTaskFromList = mod.executeTaskFromList;
export const getQualityReportRuleRow = mod.getQualityReportRuleRow;
export const getTableRowByTaskName = mod.getTableRowByTaskName;
export const getTaskDetailRuleCard = mod.getTaskDetailRuleCard;
export const gotoQualityReport = mod.gotoQualityReport;
export const gotoRuleTaskList = mod.gotoRuleTaskList;
export const gotoValidationResults = mod.gotoValidationResults;
export const openQualityReportDetail = mod.openQualityReportDetail;
export const openQualityReportRuleDetail = mod.openQualityReportRuleDetail;
export const waitForTaskInstanceFinished = mod.waitForTaskInstanceFinished;
