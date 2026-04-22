import { describe, expect, mock, test } from "bun:test";

describe("prepareJsonTaskEnvironment", () => {
  test("enables compatible datasource routing before saving the scenario rule set", async () => {
    const calls: string[] = [];
    const fakePage = { kind: "page" };
    const fakeScenario = { taskName: "json格式校验任务_P0通过" };

    mock.module("../有效性-取值范围枚举范围规则/rule-editor-helpers", () => ({
      enableCompatibleMonitorDatasourceRouting: async (page: unknown) => {
        calls.push(page === fakePage ? "routing:page" : "routing:other");
      },
    }));

    mock.module("./json-format-suite-helpers", () => ({
      ensureSavedScenarioRuleSet: async (page: unknown, scenario: unknown) => {
        calls.push(
          page === fakePage && scenario === fakeScenario ? "ruleset:scenario" : "ruleset:other",
        );
      },
    }));

    const { prepareJsonTaskEnvironment } = await import("./json-format-task-runtime");

    await prepareJsonTaskEnvironment(fakePage as never, fakeScenario as never);

    expect(calls).toEqual(["routing:page", "ruleset:scenario"]);
  });
});
