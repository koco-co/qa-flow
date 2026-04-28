import type { WorkflowStep, GateConfig } from "./orchestrator-types.ts";

export const uiAutotestSteps: WorkflowStep[] = [
  { id: "parse-and-scope", executor: "direct", dependsOn: [] },
  { id: "login", executor: "direct", dependsOn: ["parse-and-scope"] },
  {
    id: "subagent-a",
    executor: "subagent",
    subagentConfig: { agentRef: "subagent-a-agent", model: "sonnet" },
    dependsOn: ["login"],
  },
  { id: "merge", executor: "direct", dependsOn: ["subagent-a"] },
  {
    id: "regression",
    executor: "subagent",
    subagentConfig: { agentRef: "regression-runner-agent", model: "haiku" },
    dependsOn: ["merge"],
  },
  { id: "result-notify", executor: "direct", dependsOn: ["regression"] },
];

export const uiAutotestGates: Record<string, GateConfig> = {
  R1: {
    level: "light",
    checklist: ["选择器合理", "断言与用例一致", "覆盖率达标"],
    onFail: "block",
    maxRetries: 1,
  },
  R2: {
    level: "light",
    checklist: ["通过率达标", "严重失败已转 Bug 报告"],
    onFail: "warn",
    maxRetries: 0,
  },
};
