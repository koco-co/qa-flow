import { type Locator, expect, type Page } from "@playwright/test";

import { QUALITY_PROJECT_ID, getCurrentDatasource, resolveVariantName } from "../data/test-data";

type RangeConfig = {
  firstOperator?: string;
  firstValue?: string;
  condition?: "且" | "或";
  secondOperator?: string;
  secondValue?: string;
};

type RangeEnumConfig = {
  field: string;
  functionName?: string;
  range?: RangeConfig;
  enumOperator?: string;
  enumValues?: string[];
  relation?: "且" | "或";
  ruleStrength?: "强规则" | "弱规则";
  description?: string;
  filter?: {
    columnName: string;
    operator: string;
    threshold: string;
  };
};

type OfflineRuleSet = {
  key: string;
  tableName: string;
  packages: Array<{
    name: string;
    rules: RangeEnumConfig[];
  }>;
};

type OfflineState = {
  ruleSets: OfflineRuleSet[];
  executedTasks: Set<string>;
  readyReports: Set<string>;
};

type OfflineTaskDefinition = {
  statusText: string;
  ruleName: string;
  ruleType: string;
  strength: "强规则" | "弱规则";
  description: string;
  canViewDetail: boolean;
  detailRows?: Array<Record<string, string>>;
  detailRuleText?: string;
  tooltip?: string;
  tooltipLinkText?: string;
  tooltipDetailText?: string;
  reportRuleName?: string;
  reportDescription?: string;
  reportStatus?: string;
  reportHasDetail?: boolean;
};

const OFFLINE_ORIGIN = "http://offline.qa";
const installedOfflinePages = new WeakSet<Page>();
const pageStates = new WeakMap<Page, OfflineState>();

const RULESET_ROW_FALLBACKS: Record<string, string> = {
  ruleset_15695_and: "quality_test_num",
  ruleset_15695_enum: "quality_test_num",
  ruleset_15695_enum_orig: "quality_test_num",
  ruleset_15695_filter: "quality_test_num",
  ruleset_15695_notin: "quality_test_num",
  ruleset_15695_or: "quality_test_num",
  ruleset_15695_range: "quality_test_num",
  ruleset_15695_str: "quality_test_str",
};

const RANGE_AND_RULE: RangeEnumConfig = {
  field: "score",
  range: {
    firstOperator: ">",
    firstValue: "1",
    condition: "且",
    secondOperator: "<",
    secondValue: "10",
  },
  enumOperator: "in",
  enumValues: ["1", "2", "3"],
  relation: "且",
  ruleStrength: "强规则",
  description: "score取值范围1到10且枚举值in 1,2,3",
};

const RANGE_OR_RULE: RangeEnumConfig = {
  field: "score",
  range: {
    firstOperator: ">",
    firstValue: "1",
  },
  enumOperator: "in",
  enumValues: ["-1"],
  relation: "或",
  ruleStrength: "强规则",
  description: "score取值范围>1或枚举值in -1",
};

const RANGE_ONLY_RULE: RangeEnumConfig = {
  field: "score",
  functionName: "取值范围",
  range: {
    firstOperator: ">=",
    firstValue: "0",
  },
  ruleStrength: "强规则",
  description: "score取值范围>=0",
};

const ENUM_IN_RULE: RangeEnumConfig = {
  field: "category",
  functionName: "枚举值",
  enumOperator: "in",
  enumValues: ["1", "2", "3"],
  ruleStrength: "强规则",
  description: "category枚举值in 1,2,3",
};

const ENUM_NOT_IN_RULE: RangeEnumConfig = {
  field: "category",
  functionName: "枚举值",
  enumOperator: "not in",
  enumValues: ["4", "5"],
  ruleStrength: "强规则",
  description: "category枚举值not in 4,5",
};

const ORIGINAL_ENUM_RULE: RangeEnumConfig = {
  field: "score",
  functionName: "枚举值",
  enumOperator: "in",
  enumValues: ["5", "15"],
  ruleStrength: "强规则",
  description: "score枚举值in 5,15",
};

const STRING_RULE: RangeEnumConfig = {
  field: "score_str",
  range: {
    firstOperator: ">",
    firstValue: "1",
    condition: "且",
    secondOperator: "<",
    secondValue: "10",
  },
  enumOperator: "in",
  enumValues: ["5", "5.5", "15"],
  relation: "且",
  ruleStrength: "强规则",
  description: "score_str取值范围1到10且枚举值in 5,5.5,15",
};

const RULESET_PACKAGE_SEEDS: Record<string, RangeEnumConfig | null> = {
  且关系校验包: RANGE_AND_RULE,
  或关系校验包: RANGE_OR_RULE,
  仅取值范围包: RANGE_ONLY_RULE,
  仅枚举值包: ENUM_IN_RULE,
  notin校验包: ENUM_NOT_IN_RULE,
  原枚举值包: ORIGINAL_ENUM_RULE,
  过滤条件包: null,
  string强转包: STRING_RULE,
};

const TASK_DEFINITIONS: Record<string, OfflineTaskDefinition> = {
  task_15695_and: {
    statusText: "校验未通过",
    ruleName: "取值范围&枚举范围",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "score取值范围1到10且枚举值in 1,2,3",
    canViewDetail: true,
    detailRows: [
      { id: "1", score: "5", category: "2" },
      { id: "2", score: "15", category: "4" },
      { id: "4", score: "-1", category: "3" },
      { id: "5", score: "8", category: "5" },
    ],
    reportRuleName: "取值范围&枚举范围",
    reportDescription: "score取值范围1到10且枚举值in 1,2,3",
    reportStatus: "校验未通过",
    reportHasDetail: true,
  },
  task_15695_or: {
    statusText: "校验通过",
    ruleName: "取值范围&枚举范围",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "score取值范围>1或枚举值in -1",
    detailRuleText: ">1 in -1 或",
    canViewDetail: false,
    reportRuleName: "取值范围&枚举范围",
    reportDescription: ">1；枚举值in -1；或",
    reportStatus: "校验通过",
    reportHasDetail: false,
  },
  task_15695_weak: {
    statusText: "校验未通过",
    ruleName: "取值范围&枚举范围",
    ruleType: "有效性校验",
    strength: "弱规则",
    description: "score取值范围1到10且枚举值in 1,2,3（弱规则）",
    canViewDetail: true,
  },
  task_15695_str: {
    statusText: "校验异常",
    ruleName: "取值范围&枚举范围",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "score_str 字段包含无法转换的异常值",
    canViewDetail: false,
    tooltip: "引擎任务执行失败，请查看异常日志",
    tooltipLinkText: "查看详情",
    tooltipDetailText: "Doris 字段 score_str 存在无法转换的值 abc，任务执行失败。",
  },
  task_15695_sample: {
    statusText: "校验通过",
    ruleName: "取值范围&枚举范围",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "抽样 50% 后执行取值范围&枚举范围校验",
    canViewDetail: false,
  },
  task_15695_partition: {
    statusText: "校验未通过",
    ruleName: "取值范围&枚举范围",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "仅校验 p20260401 分区数据",
    canViewDetail: true,
  },
  task_15695_enum_pass: {
    statusText: "校验通过",
    ruleName: "枚举值",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "category枚举值in 1,2,3",
    canViewDetail: false,
    reportRuleName: "枚举值",
    reportDescription: "字段枚举值不存在约定范围外的值；枚举值in '1,2,3'",
    reportStatus: "校验通过",
    reportHasDetail: false,
  },
  task_15695_enum_fail: {
    statusText: "校验未通过",
    ruleName: "枚举值",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "category枚举值in 1,2,3",
    canViewDetail: true,
    detailRows: [
      { id: "2", category: "4" },
      { id: "5", category: "5" },
    ],
    reportRuleName: "枚举值",
    reportDescription: "字段枚举值存在约定范围外的值；约定范围外的值的数量总计为2个；枚举值in '1,2,3'",
    reportStatus: "校验未通过",
    reportHasDetail: true,
  },
  task_15695_enum_notin_fail: {
    statusText: "校验未通过",
    ruleName: "枚举值",
    ruleType: "有效性校验",
    strength: "强规则",
    description: "category枚举值not in 4,5",
    canViewDetail: true,
    detailRows: [
      { id: "2", category: "4" },
      { id: "5", category: "5" },
    ],
    reportRuleName: "枚举值",
    reportDescription: "枚举值not in '4,5'；约定范围外的值数量总计为2个",
    reportStatus: "校验未通过",
    reportHasDetail: true,
  },
};

function cloneRuleConfig(rule: RangeEnumConfig): RangeEnumConfig {
  return JSON.parse(JSON.stringify(rule)) as RangeEnumConfig;
}

function createInitialState(): OfflineState {
  return {
    ruleSets: [
      {
        key: "ruleset_15695_and",
        tableName: "quality_test_num",
        packages: [{ name: "且关系校验包", rules: [cloneRuleConfig(RANGE_AND_RULE)] }],
      },
      {
        key: "ruleset_15695_or",
        tableName: "quality_test_num",
        packages: [{ name: "或关系校验包", rules: [cloneRuleConfig(RANGE_OR_RULE)] }],
      },
      {
        key: "ruleset_15695_range",
        tableName: "quality_test_num",
        packages: [{ name: "仅取值范围包", rules: [cloneRuleConfig(RANGE_ONLY_RULE)] }],
      },
      {
        key: "ruleset_15695_enum",
        tableName: "quality_test_num",
        packages: [{ name: "仅枚举值包", rules: [cloneRuleConfig(ENUM_IN_RULE)] }],
      },
      {
        key: "ruleset_15695_enum_orig",
        tableName: "quality_test_num",
        packages: [{ name: "原枚举值包", rules: [cloneRuleConfig(ORIGINAL_ENUM_RULE)] }],
      },
      {
        key: "ruleset_15695_notin",
        tableName: "quality_test_num",
        packages: [{ name: "notin校验包", rules: [cloneRuleConfig(ENUM_NOT_IN_RULE)] }],
      },
      {
        key: "ruleset_15695_filter",
        tableName: "quality_test_num",
        packages: [{ name: "过滤条件包", rules: [] }],
      },
      {
        key: "ruleset_15695_str",
        tableName: "quality_test_str",
        packages: [{ name: "string强转包", rules: [cloneRuleConfig(STRING_RULE)] }],
      },
    ],
    executedTasks: new Set<string>(),
    readyReports: new Set<string>(),
  };
}

function getState(page: Page): OfflineState {
  let state = pageStates.get(page);
  if (!state) {
    state = createInitialState();
    pageStates.set(page, state);
  }
  return state;
}

export function isOfflineMode(): boolean {
  const raw = process.env.QA_OFFLINE_MODE?.trim();
  return raw === "1" || raw?.toLowerCase() === "true";
}

export async function ensureOfflineTransport(page: Page): Promise<void> {
  if (!isOfflineMode() || installedOfflinePages.has(page)) {
    return;
  }

  getState(page);
  await page.route(`${OFFLINE_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    const corsHeaders = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "*",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
      return;
    }
    if (url.pathname.startsWith("/__download__/")) {
      const filename = decodeURIComponent(url.pathname.split("/").pop() || "offline.xlsx");
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": "application/octet-stream",
          "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
        body: `offline artifact for ${filename}`,
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: "application/json;charset=UTF-8",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  installedOfflinePages.add(page);
}

function escapeHtml(value: string | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function encodeJson(value: unknown): string {
  return escapeHtml(JSON.stringify(value));
}

function renderSelect(
  options: string[],
  value: string | undefined,
  className: string,
  placeholder = "请选择",
): string {
  return `
    <div class="ant-select ${className}" data-options="${encodeJson(options)}" data-value="${escapeHtml(
      value ?? "",
    )}">
      <div class="ant-select-selector">
        <span class="ant-select-selection-item">${escapeHtml(value || placeholder)}</span>
        <input class="ant-select-selection-search-input" value="" />
      </div>
    </div>
  `;
}

function renderTagSelect(values: string[] | undefined, className: string): string {
  return `
    <div class="ant-select qa-tag-select ${className}">
      <div class="ant-select-selector">
        ${(values ?? [])
          .map((value) => `<span class="ant-tag">${escapeHtml(value)}</span>`)
          .join("")}
        <input class="qa-tag-input" value="" />
      </div>
    </div>
  `;
}

function renderRadioGroup(
  name: string,
  selected: string | undefined,
  values: Array<"且" | "或">,
): string {
  return values
    .map(
      (value) => `
        <label class="ant-radio-wrapper ${selected === value ? "checked" : ""}"><input type="radio" name="${escapeHtml(
          name,
        )}" value="${value}" ${selected === value ? "checked" : ""} /><span>${value}</span></label>
      `,
    )
    .join("");
}

function renderFilterModal(rule: RangeEnumConfig, packageIndex: number, ruleIndex: number): string {
  return `
    <div class="ant-modal qa-filter-modal" data-package-index="${packageIndex}" data-rule-index="${ruleIndex}" style="display:none">
      <div class="ant-modal-content">
        <div class="ant-modal-body">
          <div class="ant-form-item">
            <span>字段</span>
            ${renderSelect(["category", "score"], rule.filter?.columnName, "qa-filter-field")}
          </div>
          <div class="ant-form-item">
            <span>操作符</span>
            ${renderSelect(["in", "not in"], rule.filter?.operator, "qa-filter-operator")}
          </div>
          <div class="ant-form-item">
            <span>阈值</span>
            <input class="qa-filter-threshold" value="${escapeHtml(rule.filter?.threshold ?? "")}" />
          </div>
          <div class="qa-modal-actions">
            <button type="button" class="ant-btn qa-filter-confirm">确定</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRangeEnumFunction(rule: RangeEnumConfig, packageIndex: number, ruleIndex: number): string {
  const functionName = rule.functionName ?? "取值范围&枚举范围";
  if (functionName === "枚举值") {
    return `
      <div class="rule__function-list__item">
        ${renderSelect(["取值范围&枚举范围", "取值范围", "枚举值"], functionName, "qa-function-select")}
        <div class="ant-form-item">
          <span>枚举值</span>
          ${renderSelect(["in", "not in"], rule.enumOperator, "qa-enum-operator")}
          ${renderTagSelect(rule.enumValues, "qa-enum-values")}
        </div>
      </div>
    `;
  }

  if (functionName === "取值范围") {
    return `
      <div class="rule__function-list__item">
        ${renderSelect(["取值范围&枚举范围", "取值范围", "枚举值"], functionName, "qa-function-select")}
        ${renderSelect([">", ">=", "<", "<="], rule.range?.firstOperator, "qa-first-operator")}
        <input placeholder="请输入数值" class="qa-first-value" value="${escapeHtml(
          rule.range?.firstValue ?? "",
        )}" />
        ${renderRadioGroup(`range-${packageIndex}-${ruleIndex}`, rule.range?.condition, ["且", "或"])}
        ${renderSelect([">", ">=", "<", "<="], rule.range?.secondOperator, "qa-second-operator")}
        <input placeholder="请输入数值" class="qa-second-value" value="${escapeHtml(
          rule.range?.secondValue ?? "",
        )}" />
      </div>
    `;
  }

  return `
    <div class="rule__function-list__item">
      ${renderSelect(["取值范围&枚举范围", "取值范围", "枚举值"], functionName, "qa-function-select")}
      ${renderSelect([">", ">=", "<", "<="], rule.range?.firstOperator, "qa-first-operator")}
      <input placeholder="请输入数值" class="qa-first-value" value="${escapeHtml(
        rule.range?.firstValue ?? "",
      )}" />
      ${renderRadioGroup(`range-${packageIndex}-${ruleIndex}`, rule.range?.condition, ["且", "或"])}
      ${renderSelect([">", ">=", "<", "<="], rule.range?.secondOperator, "qa-second-operator")}
      <input placeholder="请输入数值" class="qa-second-value" value="${escapeHtml(
        rule.range?.secondValue ?? "",
      )}" />
      <div class="ant-form-item">
        <span>枚举值</span>
        ${renderSelect(["in", "not in"], rule.enumOperator, "qa-enum-operator")}
        ${renderTagSelect(rule.enumValues, "qa-enum-values")}
      </div>
      <div class="ant-form-item">
        <span>取值范围和枚举值的关系</span>
        ${renderRadioGroup(`relation-${packageIndex}-${ruleIndex}`, rule.relation, ["且", "或"])}
      </div>
    </div>
  `;
}

function renderRuleForm(rule: RangeEnumConfig, packageIndex: number, ruleIndex: number): string {
  const filterSummary = rule.filter
    ? `${rule.filter.columnName} ${rule.filter.operator} ${rule.filter.threshold}`
    : "";

  return `
    <div class="ruleForm" data-package-index="${packageIndex}" data-rule-index="${ruleIndex}">
      <div class="qa-rule-actions">
        <button type="button" class="ant-btn">克隆</button>
        <button type="button" class="ant-btn">
          <span class="ruleForm__icon">删除</span>
        </button>
      </div>
      <div class="ant-form-item">
        <span>字段</span>
        ${renderSelect(["score", "category", "score_str"], rule.field, "qa-field-select")}
      </div>
      ${renderRangeEnumFunction(rule, packageIndex, ruleIndex)}
      <div class="ant-form-item">
        <span>强弱规则</span>
        ${renderSelect(["强规则", "弱规则"], rule.ruleStrength, "qa-strength-select")}
      </div>
      <div class="ant-form-item">
        <input placeholder="请填写规则描述" class="qa-rule-description" value="${escapeHtml(
          rule.description ?? "",
        )}" />
      </div>
      <div class="filterCondition">
        <button type="button" class="ant-btn qa-open-filter">点击配置</button>
        <input
          disabled
          value="${escapeHtml(filterSummary)}"
          data-filter-column="${escapeHtml(rule.filter?.columnName ?? "")}"
          data-filter-operator="${escapeHtml(rule.filter?.operator ?? "")}"
          data-filter-threshold="${escapeHtml(rule.filter?.threshold ?? "")}"
        />
      </div>
      ${renderFilterModal(rule, packageIndex, ruleIndex)}
    </div>
  `;
}

function renderRuleEditorPage(
  rulesetKey: string,
  tableName: string,
  packages: OfflineRuleSet["packages"],
  mode: "add" | "edit",
): string {
  return `
    <div id="qa-rule-editor" data-ruleset-key="${escapeHtml(rulesetKey)}" data-table-name="${escapeHtml(tableName)}" data-mode="${mode}">
      <div class="qa-step-header">
        <button type="button" class="ant-btn">基础信息</button>
        <button type="button" class="ant-btn">监控规则</button>
      </div>
      <div class="qa-step-actions">
        <button type="button" class="ant-btn">上一步</button>
        <button type="button" class="ant-btn">下一步</button>
        <button type="button" class="ant-btn qa-save-btn">保存</button>
      </div>
      <button type="button" class="ant-btn">新增规则包</button>
      ${packages
        .map(
          (pkg, packageIndex) => `
            <section class="ruleSetMonitor__package" data-package-name="${escapeHtml(pkg.name)}">
              <div class="qa-package-title">${escapeHtml(pkg.name)}</div>
              <button type="button" class="ant-btn">添加规则</button>
              ${pkg.rules.map((rule, ruleIndex) => renderRuleForm(rule, packageIndex, ruleIndex)).join("")}
            </section>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRuleSetListPage(state: OfflineState, successText?: string): string {
  return `
    ${successText ? `<div class="ant-message"><div class="ant-message-notice">${escapeHtml(successText)}</div></div>` : ""}
    <table class="ant-table">
      <tbody class="ant-table-tbody">
        ${state.ruleSets
          .map(
            (item) => `
              <tr class="ant-table-row">
                <td>${escapeHtml(item.tableName)}</td>
                <td>${escapeHtml(item.packages.map((pkg) => pkg.name).join("、"))}</td>
                <td><button type="button" class="ant-btn">编辑</button></td>
              </tr>
            `,
          )
          .join("") || `<tr class="ant-empty"><td>暂无数据</td></tr>`}
      </tbody>
    </table>
  `;
}

function renderRuleBasePage(): string {
  return `
    <div class="qa-rule-base">
      <button role="tab" aria-selected="true">内置规则</button>
      <input placeholder="请输入规则名称进行搜索" class="qa-rule-base-search" />
      <button type="button" aria-label="search" class="ant-btn qa-rule-base-search-btn">search</button>
      <button type="button" class="ant-btn qa-rule-base-export-btn">导出规则库</button>
      <div class="ant-popconfirm" style="display:none">
        <div>请确认是否导出规则库</div>
        <button type="button" class="ant-btn ant-btn-primary qa-rule-base-export-confirm">确定</button>
      </div>
      <table class="ant-table">
        <tbody class="ant-table-tbody">
          <tr class="ant-table-row qa-rule-base-row">
            <td>取值范围&枚举范围</td>
            <td>取值范围和枚举范围的联合校验</td>
            <td>有效性校验</td>
            <td>字段</td>
            <td>校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function actualTaskName(baseTaskName: string): string {
  return resolveVariantName(baseTaskName, getCurrentDatasource());
}

function actualReportName(baseTaskName: string): string {
  return `${actualTaskName(baseTaskName)}_report`;
}

function renderTaskListPage(): string {
  return `
    <table class="ant-table">
      <tbody class="ant-table-tbody">
        ${Object.keys(TASK_DEFINITIONS)
          .map(
            (taskName) => `
              <tr class="ant-table-row">
                <td>${escapeHtml(actualTaskName(taskName))}</td>
                <td>已配置</td>
                <td><button type="button" class="ant-btn">执行</button></td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderValidationResultsPage(state: OfflineState): string {
  const rows = Array.from(state.executedTasks);
  return `
    <table class="ant-table">
      <tbody class="ant-table-tbody">
        ${rows
          .map((taskName) => {
            const definition = TASK_DEFINITIONS[taskName];
            return `
              <tr class="ant-table-row">
                <td>
                  <button type="button" class="ant-btn">查看详情</button>
                  <span>${escapeHtml(actualTaskName(taskName))}</span>
                </td>
                <td>2026-04-16 12:00:00</td>
                <td class="qa-status-cell" data-tooltip="${escapeHtml(
                  definition.tooltip ?? "",
                )}" data-tooltip-link="${escapeHtml(definition.tooltipLinkText ?? "")}" data-tooltip-detail="${escapeHtml(
                  definition.tooltipDetailText ?? "",
                )}">
                  ${escapeHtml(definition.statusText)}
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderQualityReportListPage(state: OfflineState): string {
  const rows = Array.from(state.readyReports);
  return `
    <div class="ant-tabs-tab ant-tabs-tab-active">已生成报告</div>
    <table class="ant-table">
      <tbody class="ant-table-tbody">
        ${rows
          .map(
            (taskName) => `
              <tr class="ant-table-row">
                <td>${escapeHtml(actualReportName(taskName))}</td>
                <td>生成成功</td>
                <td><button type="button" class="ant-btn">查看报告</button></td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderQualityReportDetailPage(taskName: string): string {
  const definition = TASK_DEFINITIONS[taskName];
  const ruleName = definition.reportRuleName ?? definition.ruleName;
  return `
    <section class="qualityInspection" data-task-name="${escapeHtml(taskName)}">
      <table class="ant-table">
        <tbody class="ant-table-tbody">
          <tr class="ant-table-row">
            <td>${escapeHtml(ruleName)}</td>
            <td>${escapeHtml(definition.reportDescription ?? definition.description)}</td>
            <td>${escapeHtml(definition.reportStatus ?? definition.statusText)}</td>
            <td>
              ${
                definition.reportHasDetail
                  ? `<button type="button" class="ant-btn">查看详情</button>`
                  : "--"
              }
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderShell(bodyHtml: string): string {
  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <title>qa offline</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 16px; color: #222; }
        .ant-table { width: 100%; border-collapse: collapse; }
        .ant-table td, .ant-table th { border: 1px solid #d9d9d9; padding: 8px; vertical-align: top; }
        .ant-btn { border: 1px solid #1677ff; background: #fff; color: #1677ff; border-radius: 4px; padding: 4px 12px; cursor: pointer; }
        .ant-btn-primary { background: #1677ff; color: #fff; }
        .ant-select { display: inline-block; min-width: 140px; margin-right: 8px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 2px 8px; }
        .ant-select-selector { display: flex; align-items: center; gap: 6px; min-height: 28px; flex-wrap: wrap; }
        .ant-select-selection-search-input, .qa-tag-input, input { border: 0; outline: none; min-width: 24px; }
        .ant-select-dropdown { position: fixed; background: #fff; border: 1px solid #d9d9d9; border-radius: 4px; padding: 4px 0; z-index: 4000; box-shadow: 0 6px 18px rgba(0,0,0,0.15); }
        .ant-select-item-option { padding: 6px 12px; cursor: pointer; }
        .ant-select-item-option:hover { background: #e6f4ff; }
        .ant-radio-wrapper { margin-right: 8px; cursor: pointer; }
        .ant-radio-wrapper.checked { color: #1677ff; font-weight: 600; }
        .ant-tag { display: inline-block; border: 1px solid #91caff; background: #e6f4ff; border-radius: 4px; padding: 2px 6px; margin-right: 4px; }
        .ruleSetMonitor__package, .ruleForm, .ruleView, .qualityInspection, .dtc-drawer, .ant-drawer { border: 1px solid #d9d9d9; border-radius: 6px; padding: 12px; margin-top: 12px; background: #fff; }
        .qa-package-title { font-weight: 600; margin-bottom: 8px; }
        .ant-form-item { margin-bottom: 10px; }
        .qa-rule-actions, .qa-step-actions, .qa-modal-actions { display: flex; gap: 8px; margin-bottom: 8px; }
        .ant-message { margin-bottom: 12px; color: #52c41a; }
        .ant-modal, .ant-popconfirm, .ant-tooltip { position: fixed; z-index: 1200; top: 120px; left: 50%; transform: translateX(-50%); background: #fff; border: 1px solid #d9d9d9; border-radius: 6px; padding: 12px; box-shadow: 0 8px 28px rgba(0,0,0,0.2); }
        .ant-modal-content { min-width: 320px; }
        .dtc-drawer, .ant-drawer { position: relative; }
        .qa-red { color: rgb(249, 108, 91); }
      </style>
    </head>
    <body>
      ${bodyHtml}
      <script>
        (() => {
          let activeDropdown = null;
          const closeDropdown = () => {
            if (activeDropdown) {
              activeDropdown.remove();
              activeDropdown = null;
            }
          };
          const triggerDownload = (filename) => {
            const link = document.createElement('a');
            link.href = '${OFFLINE_ORIGIN}/__download__/' + encodeURIComponent(filename);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
          };
          const getSelectValue = (select) => {
            if (!select) return '';
            const item = select.querySelector('.ant-select-selection-item');
            return item ? item.textContent.trim() : '';
          };
          const setSelectValue = (select, value) => {
            select.dataset.value = value;
            let item = select.querySelector('.ant-select-selection-item');
            if (!item) {
              item = document.createElement('span');
              item.className = 'ant-select-selection-item';
              select.querySelector('.ant-select-selector')?.prepend(item);
            }
            item.textContent = value || '请选择';
          };
          const getCheckedText = (container, offset) => {
            if (!container) return '';
            const radio = Array.from(container.querySelectorAll('.ant-radio-wrapper')).filter((_, index) => index >= offset && index < offset + 2).find((item) => item.classList.contains('checked'));
            return radio ? radio.textContent.trim() : '';
          };
          const getTagValues = (container) => container ? Array.from(container.querySelectorAll('.ant-tag')).map((tag) => tag.textContent.trim()).filter(Boolean) : [];
          window.__qaOfflineCollectEditor = () => {
            const root = document.querySelector('#qa-rule-editor');
            if (!root) return null;
            return {
              tableName: root.dataset.tableName || '',
              mode: root.dataset.mode || 'edit',
              packages: Array.from(root.querySelectorAll('.ruleSetMonitor__package')).map((pkg) => ({
                packageName: pkg.dataset.packageName || '',
                rules: Array.from(pkg.querySelectorAll('.ruleForm')).map((ruleForm) => {
                  const functionRow = ruleForm.querySelector('.rule__function-list__item');
                  const selects = functionRow ? Array.from(functionRow.querySelectorAll('.ant-select')) : [];
                  const inputs = functionRow ? Array.from(functionRow.querySelectorAll('input[placeholder="请输入数值"]')) : [];
                  const functionName = selects[0] ? getSelectValue(selects[0]) : '';
                  const field = getSelectValue(ruleForm.querySelector('.qa-field-select'));
                  const strength = getSelectValue(ruleForm.querySelector('.qa-strength-select'));
                  const description = ruleForm.querySelector('.qa-rule-description')?.value || '';
                  const filterInput = ruleForm.querySelector('.filterCondition input[disabled]');
                  const range = {
                    firstOperator: selects[1] ? getSelectValue(selects[1]) : '',
                    firstValue: inputs[0]?.value || '',
                    condition: getCheckedText(functionRow, 0),
                    secondOperator: selects[2] ? getSelectValue(selects[2]) : '',
                    secondValue: inputs[1]?.value || ''
                  };
                  let enumOperator = '';
                  let enumValues = [];
                  let relation = '';
                  if (functionName === '枚举值') {
                    enumOperator = selects[1] ? getSelectValue(selects[1]) : '';
                    enumValues = getTagValues(functionRow.querySelector('.qa-enum-values'));
                  } else if (functionName === '取值范围&枚举范围') {
                    enumOperator = selects[3] ? getSelectValue(selects[3]) : '';
                    enumValues = getTagValues(functionRow.querySelector('.qa-enum-values'));
                    relation = getCheckedText(functionRow, 2);
                  }
                  return {
                    field,
                    functionName,
                    range,
                    enumOperator,
                    enumValues,
                    relation,
                    ruleStrength: strength,
                    description,
                    filter: filterInput && filterInput.dataset.filterColumn ? {
                      columnName: filterInput.dataset.filterColumn || '',
                      operator: filterInput.dataset.filterOperator || '',
                      threshold: filterInput.dataset.filterThreshold || ''
                    } : null
                  };
                })
              }))
            };
          };
          window.__qaOfflineValidateEditor = () => {
            const payload = window.__qaOfflineCollectEditor();
            if (!payload) return { valid: false, reason: 'missing-editor' };
            for (const pkg of payload.packages) {
              for (const rule of pkg.rules) {
                const functionName = rule.functionName || '取值范围&枚举范围';
                const hasRange = Boolean(rule.range.firstOperator || rule.range.firstValue || rule.range.secondOperator || rule.range.secondValue);
                const hasEnum = Boolean(rule.enumOperator || (rule.enumValues && rule.enumValues.length > 0));
                if (functionName === '取值范围&枚举范围') {
                  if (!hasRange && !hasEnum) return { valid: false, reason: 'missing-all' };
                  if (rule.range.firstValue && !rule.range.firstOperator) return { valid: false, reason: 'missing-range-operator' };
                  if (rule.enumOperator && (!rule.enumValues || rule.enumValues.length === 0)) return { valid: false, reason: 'missing-enum-values' };
                  if (hasRange && hasEnum && !rule.relation) return { valid: false, reason: 'missing-relation' };
                }
                if (functionName === '枚举值' && rule.enumOperator && (!rule.enumValues || rule.enumValues.length === 0)) {
                  return { valid: false, reason: 'missing-enum-values' };
                }
              }
            }
            return { valid: true, payload };
          };
          document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const select = target.closest('.ant-select:not(.qa-tag-select)');
            if (select) {
              event.preventDefault();
              event.stopPropagation();
              closeDropdown();
              const options = JSON.parse(select.dataset.options || '[]');
              const dropdown = document.createElement('div');
              dropdown.className = 'ant-select-dropdown';
              dropdown.style.top = Math.min(window.innerHeight - 200, select.getBoundingClientRect().bottom + 4) + 'px';
              dropdown.style.left = select.getBoundingClientRect().left + 'px';
              dropdown.innerHTML = options.map((option) => '<div class="ant-select-item-option">' + option + '</div>').join('');
              dropdown.addEventListener('click', (dropdownEvent) => {
                dropdownEvent.stopPropagation();
                const option = dropdownEvent.target;
                if (!(option instanceof HTMLElement) || !option.classList.contains('ant-select-item-option')) return;
                setSelectValue(select, option.textContent.trim());
                closeDropdown();
              });
              document.body.appendChild(dropdown);
              activeDropdown = dropdown;
              return;
            }
            if (target.closest('.qa-save-btn')) {
              const result = window.__qaOfflineValidateEditor();
              if (!result.valid) {
                closeDropdown();
              }
              return;
            }
            if (target.closest('.qa-open-filter')) {
              target.closest('.ruleForm')?.querySelector('.qa-filter-modal')?.setAttribute('style', 'display:block');
              return;
            }
            if (target.closest('.qa-filter-confirm')) {
              const modal = target.closest('.qa-filter-modal');
              const ruleForm = modal?.closest('.ruleForm');
              if (modal && ruleForm) {
                const field = getSelectValue(modal.querySelector('.qa-filter-field'));
                const operator = getSelectValue(modal.querySelector('.qa-filter-operator'));
                const threshold = modal.querySelector('.qa-filter-threshold')?.value || '';
                const input = ruleForm.querySelector('.filterCondition input[disabled]');
                if (input) {
                  input.value = [field, operator, threshold].filter(Boolean).join(' ');
                  input.dataset.filterColumn = field;
                  input.dataset.filterOperator = operator;
                  input.dataset.filterThreshold = threshold;
                }
                modal.setAttribute('style', 'display:none');
              }
              return;
            }
            if (target.closest('.qa-rule-base-export-btn')) {
              document.querySelector('.ant-popconfirm')?.setAttribute('style', 'display:block');
              return;
            }
            if (target.closest('.qa-rule-base-export-confirm')) {
              triggerDownload('内置规则库_20260416.xlsx');
              return;
            }
            if (target.closest('[data-download-name]')) {
              triggerDownload(target.closest('[data-download-name]').getAttribute('data-download-name'));
            }
          });
          document.addEventListener('keydown', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (!target.classList.contains('qa-tag-input') || event.key !== 'Enter') return;
            event.preventDefault();
            const value = target.value.trim();
            if (!value) return;
            const tag = document.createElement('span');
            tag.className = 'ant-tag';
            tag.textContent = value;
            target.parentElement?.insertBefore(tag, target);
            target.value = '';
          });
          document.addEventListener('click', (event) => {
            const radio = event.target instanceof HTMLElement ? event.target.closest('.ant-radio-wrapper') : null;
            if (!radio) return;
            const input = radio.querySelector('input[type="radio"]');
            if (!(input instanceof HTMLInputElement)) return;
            document.querySelectorAll('input[name="' + input.name + '"]').forEach((item) => {
              if (!(item instanceof HTMLInputElement)) return;
              item.checked = false;
              item.closest('.ant-radio-wrapper')?.classList.remove('checked');
            });
            input.checked = true;
            radio.classList.add('checked');
          });
          document.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && (target.closest('.ant-select') || target.closest('.ant-select-dropdown'))) {
              return;
            }
            closeDropdown();
          });
          document.addEventListener('mouseover', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement) || !target.classList.contains('qa-status-cell')) return;
            const tooltipText = target.dataset.tooltip;
            if (!tooltipText) return;
            document.querySelectorAll('.ant-tooltip').forEach((node) => node.remove());
            const tooltip = document.createElement('div');
            tooltip.className = 'ant-tooltip';
            tooltip.innerHTML = '<div>' + tooltipText + '</div>' + (target.dataset.tooltipLink ? '<a href="#" class="qa-tooltip-link">' + target.dataset.tooltipLink + '</a>' : '');
            document.body.appendChild(tooltip);
            if (target.dataset.tooltipDetail) {
              tooltip.querySelector('.qa-tooltip-link')?.addEventListener('click', (tooltipEvent) => {
                tooltipEvent.preventDefault();
                const modal = document.createElement('div');
                modal.className = 'ant-modal';
                modal.innerHTML = '<div class="ant-modal-content"><div>' + target.dataset.tooltipDetail + '</div></div>';
                document.body.appendChild(modal);
              });
            }
          }, true);
        })();
      </script>
    </body>
  </html>`;
}

async function renderOfflineView(page: Page, hash: string, bodyHtml: string): Promise<void> {
  await ensureOfflineTransport(page);
  await page.goto("about:blank");
  await page.setContent(renderShell(bodyHtml), { waitUntil: "domcontentloaded" });
  await page.evaluate((nextHash) => {
    location.hash = nextHash;
  }, hash);
  await page.locator("body").waitFor({ state: "visible", timeout: 5000 });
}

function findRuleSet(state: OfflineState, rulesetName: string): OfflineRuleSet | undefined {
  return state.ruleSets.find(
    (item) => item.key === rulesetName || item.tableName === (RULESET_ROW_FALLBACKS[rulesetName] ?? rulesetName),
  );
}

function createSeedRuleSet(
  rulesetName: string,
  requiredPackageNames: string[],
): OfflineRuleSet {
  const tableName = RULESET_ROW_FALLBACKS[rulesetName] ?? rulesetName;
  const packages = requiredPackageNames.map((packageName) => ({
    name: packageName,
    rules: RULESET_PACKAGE_SEEDS[packageName] ? [cloneRuleConfig(RULESET_PACKAGE_SEEDS[packageName]!)] : [],
  }));
  return {
    key: rulesetName,
    tableName,
    packages,
  };
}

export async function gotoOfflineRuleSetList(page: Page, successText?: string): Promise<void> {
  await renderOfflineView(page, `/dq/ruleSet?pid=${QUALITY_PROJECT_ID}`, renderRuleSetListPage(getState(page), successText));
}

export async function gotoOfflineRuleSetCreate(
  page: Page,
  tableName = "",
  requiredPackageNames: string[] = [],
): Promise<void> {
  const packages = requiredPackageNames.map((packageName) => ({ name: packageName, rules: [] as RangeEnumConfig[] }));
  await renderOfflineView(
    page,
    `/dq/ruleSet/add?pid=${QUALITY_PROJECT_ID}`,
    renderRuleEditorPage(tableName || "draft", tableName, packages, "add"),
  );
}

export async function gotoOfflineRuleBase(page: Page): Promise<void> {
  await renderOfflineView(page, "/dq/ruleBase", renderRuleBasePage());
}

export async function deleteOfflineRuleSetsByTableNames(page: Page, tableNames: string[]): Promise<void> {
  const state = getState(page);
  state.ruleSets = state.ruleSets.filter((item) => !tableNames.includes(item.tableName));
  if (page.url().includes("/dq/ruleSet")) {
    await gotoOfflineRuleSetList(page);
  }
}

export async function openOfflineRuleSetEditor(
  page: Page,
  rulesetName: string,
  requiredPackageNames: string[] = [],
): Promise<void> {
  const state = getState(page);
  let ruleSet = findRuleSet(state, rulesetName);
  if (!ruleSet) {
    ruleSet = createSeedRuleSet(rulesetName, requiredPackageNames);
    state.ruleSets.push(ruleSet);
  }
  if (requiredPackageNames.length > 0) {
    for (const packageName of requiredPackageNames) {
      if (!ruleSet.packages.some((pkg) => pkg.name === packageName)) {
        ruleSet.packages.push({
          name: packageName,
          rules: RULESET_PACKAGE_SEEDS[packageName]
            ? [cloneRuleConfig(RULESET_PACKAGE_SEEDS[packageName]!)]
            : [],
        });
      }
    }
  }
  await renderOfflineView(
    page,
    `/dq/ruleSet/edit?pid=${QUALITY_PROJECT_ID}&name=${encodeURIComponent(rulesetName)}`,
    renderRuleEditorPage(ruleSet.key, ruleSet.tableName, ruleSet.packages, "edit"),
  );
}

function getPackageName(packageSection: Locator): Promise<string | null> {
  return packageSection.getAttribute("data-package-name");
}

function defaultRuleForPackage(packageName: string): RangeEnumConfig {
  const seed = RULESET_PACKAGE_SEEDS[packageName];
  return {
    field: seed?.field ?? "score",
    functionName: seed?.functionName ?? "取值范围&枚举范围",
    ruleStrength: "强规则",
    enumValues: [],
    range: {},
    description: "",
  };
}

async function collectEditorPackages(page: Page): Promise<OfflineRuleSet["packages"]> {
  const editor = (await page.evaluate(() => {
    return (window as typeof window & { __qaOfflineCollectEditor?: () => unknown }).__qaOfflineCollectEditor?.();
  })) as
    | {
        packages: Array<{
          packageName: string;
          rules: Array<
            RangeEnumConfig & {
              filter?: RangeEnumConfig["filter"] | null;
            }
          >;
        }>;
      }
    | null;
  if (!editor) {
    return [];
  }
  return editor.packages.map((pkg) => ({
    name: pkg.packageName,
    rules: pkg.rules.map((rule) => ({
      field: rule.field,
      functionName: rule.functionName,
      range: {
        firstOperator: rule.range?.firstOperator || undefined,
        firstValue: rule.range?.firstValue || undefined,
        condition: (rule.range?.condition as "且" | "或" | undefined) || undefined,
        secondOperator: rule.range?.secondOperator || undefined,
        secondValue: rule.range?.secondValue || undefined,
      },
      enumOperator: rule.enumOperator || undefined,
      enumValues: rule.enumValues ?? [],
      relation: (rule.relation as "且" | "或" | undefined) || undefined,
      ruleStrength: (rule.ruleStrength as "强规则" | "弱规则" | undefined) || undefined,
      description: rule.description || undefined,
      filter: rule.filter ?? undefined,
    })),
  }));
}

async function getEditorMeta(page: Page): Promise<{
  rulesetKey: string;
  tableName: string;
  mode: "add" | "edit";
}> {
  return page.evaluate(() => {
    const root = document.querySelector("#qa-rule-editor");
    return {
      rulesetKey: root?.getAttribute("data-ruleset-key") ?? "",
      tableName: root?.getAttribute("data-table-name") ?? "",
      mode: (root?.getAttribute("data-mode") as "add" | "edit" | null) ?? "edit",
    };
  });
}

async function rerenderEditor(page: Page, packages: OfflineRuleSet["packages"]): Promise<void> {
  const meta = await getEditorMeta(page);
  await renderOfflineView(
    page,
    `/dq/ruleSet/${meta.mode === "add" ? "add" : "edit"}?pid=${QUALITY_PROJECT_ID}`,
    renderRuleEditorPage(meta.rulesetKey || meta.tableName, meta.tableName, packages, meta.mode),
  );
}

export async function addOfflineRuleToPackage(page: Page, packageName: string): Promise<Locator> {
  const packages = await collectEditorPackages(page);
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  if (!targetPackage) {
    throw new Error(`Offline package "${packageName}" not found`);
  }
  targetPackage.rules.push(defaultRuleForPackage(packageName));
  await rerenderEditor(page, packages);
  const packageSection = page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first();
  const ruleForms = packageSection.locator(".ruleForm");
  return ruleForms.nth((await ruleForms.count()) - 1);
}

export async function setOfflineRuleFieldAndFunction(
  page: Page,
  packageName: string,
  ruleIndex: number,
  field: string,
  functionName: string,
): Promise<Locator> {
  const packages = await collectEditorPackages(page);
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  const targetRule = targetPackage?.rules[ruleIndex];
  if (!targetRule) {
    throw new Error(`Offline rule ${packageName}[${ruleIndex}] not found`);
  }
  targetRule.field = field;
  targetRule.functionName = functionName;
  if (functionName === "枚举值") {
    targetRule.range = {};
  }
  if (functionName === "取值范围") {
    targetRule.enumOperator = undefined;
    targetRule.enumValues = [];
    targetRule.relation = undefined;
  }
  await rerenderEditor(page, packages);
  return page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first()
    .locator(".ruleForm")
    .nth(ruleIndex)
    .locator(".rule__function-list__item")
    .first();
}

export async function configureOfflineRule(
  page: Page,
  packageName: string,
  ruleIndex: number,
  config: RangeEnumConfig,
): Promise<Locator> {
  const packages = await collectEditorPackages(page);
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  const targetRule = targetPackage?.rules[ruleIndex];
  if (!targetRule) {
    throw new Error(`Offline rule ${packageName}[${ruleIndex}] not found`);
  }
  targetPackage!.rules[ruleIndex] = {
    ...targetRule,
    ...cloneRuleConfig(config),
  };
  await rerenderEditor(page, packages);
  return page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first()
    .locator(".ruleForm")
    .nth(ruleIndex)
    .locator(".rule__function-list__item")
    .first();
}

function buildSavePayload(editor: Awaited<ReturnType<typeof collectEditorPackages>>, tableName: string) {
  return {
    tableName,
    packages: editor.map((pkg) => ({
      packageName: pkg.name,
      rules: pkg.rules.map((rule) => ({
        columnName: rule.field,
        functionName: rule.functionName ?? "取值范围&枚举范围",
        relation: rule.relation,
        ruleStrength: rule.ruleStrength,
        description: rule.description,
        standardRuleList: [
          {
            functionId: rule.functionName ?? "取值范围&枚举范围",
            threshold: [...(rule.enumValues ?? [])].join(","),
            filter: rule.filter
              ? JSON.stringify({
                  conditions: [
                    {
                      columnName: rule.filter.columnName,
                      threshold: rule.filter.threshold,
                    },
                  ],
                })
              : "",
            filterSql: rule.filter
              ? `${rule.filter.columnName} ${rule.filter.operator} (${rule.filter.threshold})`
              : "",
          },
        ],
      })),
    })),
  };
}

export async function saveOfflineRuleSet(page: Page): Promise<void> {
  const validation = (await page.evaluate(() => {
    return (window as typeof window & { __qaOfflineValidateEditor?: () => unknown }).__qaOfflineValidateEditor?.();
  })) as { valid: boolean } | null;
  if (!validation?.valid) {
    throw new Error("Offline rule set validation failed.");
  }

  const packages = await collectEditorPackages(page);
  const { rulesetKey, tableName, mode } = await getEditorMeta(page);
  const payload = buildSavePayload(packages, tableName);

  await page.evaluate(
    async ({ requestUrl, requestBody, projectId }) => {
      await fetch(requestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify(requestBody),
      });
    },
    {
      requestUrl: `${OFFLINE_ORIGIN}/dassets/v1/valid/monitorRuleSet/${mode === "add" ? "add" : "edit"}`,
      requestBody: payload,
      projectId: QUALITY_PROJECT_ID,
    },
  );

  const state = getState(page);
  const existing = state.ruleSets.find((item) => item.key === rulesetKey);
  if (existing) {
    existing.packages = packages;
  } else {
    state.ruleSets.push({
      key: rulesetKey || tableName,
      tableName,
      packages,
    });
  }
  await gotoOfflineRuleSetList(page, "保存成功");
}

export async function cloneOfflineRule(page: Page, packageName: string, ruleIndex: number): Promise<void> {
  const packages = await collectEditorPackages(page);
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  const targetRule = targetPackage?.rules[ruleIndex];
  if (!targetRule) {
    throw new Error(`Offline rule ${packageName}[${ruleIndex}] not found`);
  }
  targetPackage!.rules.splice(ruleIndex + 1, 0, cloneRuleConfig(targetRule));
  await rerenderEditor(page, packages);
}

export async function deleteOfflineRule(page: Page, packageName: string, ruleIndex: number): Promise<void> {
  const packages = await collectEditorPackages(page);
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  if (!targetPackage?.rules[ruleIndex]) {
    throw new Error(`Offline rule ${packageName}[${ruleIndex}] not found`);
  }
  targetPackage.rules.splice(ruleIndex, 1);
  await rerenderEditor(page, packages);
}

export async function gotoOfflineRuleTaskList(page: Page): Promise<void> {
  await renderOfflineView(page, "/dq/rule", renderTaskListPage());
}

export async function gotoOfflineValidationResults(page: Page): Promise<void> {
  await renderOfflineView(page, "/dq/overview", renderValidationResultsPage(getState(page)));
}

export async function gotoOfflineQualityReport(page: Page): Promise<void> {
  await renderOfflineView(page, "/dq/qualityReport?tab=REPORT_GENERATE", renderQualityReportListPage(getState(page)));
}

export async function ensureOfflineTasks(page: Page, taskNames: string[]): Promise<void> {
  const state = getState(page);
  for (const taskName of taskNames) {
    if (!(taskName in TASK_DEFINITIONS)) {
      throw new Error(`Unsupported offline task ${taskName}`);
    }
  }
  if (!page.url().includes("/dq/rule")) {
    await gotoOfflineRuleTaskList(page);
  } else {
    await renderOfflineView(page, "/dq/rule", renderTaskListPage());
  }
  state.executedTasks = new Set(Array.from(state.executedTasks));
}

export async function markOfflineTaskExecuted(page: Page, taskName: string): Promise<void> {
  const state = getState(page);
  state.executedTasks.add(taskName);
}

export async function markOfflineReportReady(page: Page, taskName: string): Promise<void> {
  const state = getState(page);
  state.executedTasks.add(taskName);
  state.readyReports.add(taskName);
}

function findBaseTaskNameByActualName(actualName: string): string | undefined {
  return Object.keys(TASK_DEFINITIONS).find((taskName) =>
    actualName.includes(actualTaskName(taskName)),
  );
}

function renderTaskDetailDrawer(taskName: string): string {
  const definition = TASK_DEFINITIONS[taskName];
  return `
    <div class="dtc-drawer" data-task-name="${escapeHtml(taskName)}">
      <div>${escapeHtml(definition.statusText)}</div>
      <div class="ruleView">
        <div>${escapeHtml(definition.ruleType)}</div>
        <div>${escapeHtml(definition.ruleName)}</div>
        <div>${escapeHtml(definition.strength)}</div>
        <div>${escapeHtml(definition.detailRuleText ?? definition.description)}</div>
        ${definition.canViewDetail ? `<button type="button" class="ant-btn">查看明细</button>` : ""}
      </div>
    </div>
  `;
}

export async function openOfflineTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const rowText = await instanceRow.innerText();
  const taskName = findBaseTaskNameByActualName(rowText);
  if (!taskName) {
    throw new Error(`Cannot resolve offline task detail row: ${rowText}`);
  }
  await page.locator(".dtc-drawer").evaluateAll((nodes) => {
    for (const node of nodes) {
      node.remove();
    }
  }).catch(() => undefined);
  await page.locator("body").evaluate(
    (body, html) => body.insertAdjacentHTML("beforeend", html),
    renderTaskDetailDrawer(taskName),
  );
  const detailDrawer = page.locator(".dtc-drawer:visible").last();
  await expect(detailDrawer).toBeVisible({ timeout: 5000 });
  return detailDrawer;
}

function renderTaskDetailDataDrawer(taskName: string): string {
  const definition = TASK_DEFINITIONS[taskName];
  const rows = definition.detailRows ?? [];
  const highlightScore = rows.length > 0 && "score" in rows[0];
  return `
    <div class="ant-drawer">
      <button type="button" class="ant-btn" data-download-name="${escapeHtml(
        `${actualTaskName(taskName)}_detail.xlsx`,
      )}">下载明细</button>
      <table class="ant-table">
        <thead>
          <tr>
            <th><span>id</span></th>
            ${
              highlightScore
                ? `<th><span class="qa-red" style="color: rgb(249, 108, 91);">score</span></th>`
                : ""
            }
            <th><span>${highlightScore ? "category" : "category"}</span></th>
          </tr>
        </thead>
        <tbody class="ant-table-tbody">
          ${rows
            .map(
              (row) => `
                <tr class="ant-table-row">
                  <td><span>${escapeHtml(row.id)}</span></td>
                  ${
                    highlightScore
                      ? `<td><span style="color: rgb(249, 108, 91);">${escapeHtml(row.score)}</span></td>`
                      : ""
                  }
                  <td><span>${escapeHtml(row.category)}</span></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export async function openOfflineTaskRuleDetailDataDrawer(page: Page, detailDrawer: Locator): Promise<Locator> {
  const taskName = await detailDrawer.getAttribute("data-task-name");
  if (!taskName) {
    throw new Error("Offline task detail drawer is missing task name");
  }
  await page.locator("body").evaluate(
    (body, html) => body.insertAdjacentHTML("beforeend", html),
    renderTaskDetailDataDrawer(taskName),
  );
  const dataDrawer = page.locator(".ant-drawer:visible").last();
  await expect(dataDrawer).toBeVisible({ timeout: 5000 });
  return dataDrawer;
}

export async function openOfflineQualityReportDetail(page: Page, taskName: string): Promise<Locator> {
  await renderOfflineView(page, "/dq/qualityReportDetail", renderQualityReportDetailPage(taskName));
  const qualityInspection = page.locator(".qualityInspection").first();
  await expect(qualityInspection).toBeVisible({ timeout: 5000 });
  return qualityInspection;
}

export async function openOfflineQualityReportRuleDetail(page: Page, taskName: string): Promise<Locator> {
  await page.locator("body").evaluate(
    (body, html) => body.insertAdjacentHTML("beforeend", html),
    renderTaskDetailDataDrawer(taskName),
  );
  const dataDrawer = page.locator(".ant-drawer:visible").last();
  await expect(dataDrawer).toBeVisible({ timeout: 5000 });
  return dataDrawer;
}
