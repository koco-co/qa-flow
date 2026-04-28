import type { Page } from "@playwright/test";
import { enableCompatibleMonitorDatasourceRouting } from "../../../202604-有效性-取值范围枚举范围规则/tests/helpers/rule-editor-helpers";
import { ensureSavedScenarioRuleSet } from "./json-format-suite-helpers";
import type { JsonRuleScenario } from "../data/test-data";

export async function prepareJsonTaskEnvironment(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<void> {
  await enableCompatibleMonitorDatasourceRouting(page);
  await ensureSavedScenarioRuleSet(page, scenario);
}
