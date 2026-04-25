import type { WorkflowStep, GateConfig } from "../orchestrator/types.ts";

export const testCaseGenSteps: WorkflowStep[] = [
  { id: "init", executor: "direct", dependsOn: [] },
  {
    id: "probe",
    executor: "subagent",
    subagentConfig: { agentRef: "source-facts-agent", model: "haiku" },
    dependsOn: ["init"],
  },
  {
    id: "discuss",
    executor: "subagent",
    subagentConfig: { agentRef: "writer-agent", model: "sonnet" },
    dependsOn: ["probe"],
  },
  {
    id: "analyze",
    executor: "subagent",
    subagentConfig: { agentRef: "analyze-agent", model: "sonnet" },
    dependsOn: ["discuss"],
  },
  {
    id: "write",
    executor: "subagent",
    subagentConfig: { agentRef: "writer-agent", model: "sonnet" },
    dependsOn: ["analyze"],
  },
  {
    id: "review",
    executor: "subagent",
    subagentConfig: { agentRef: "reviewer-agent", model: "opus" },
    dependsOn: ["write"],
  },
  { id: "format-check", executor: "direct", dependsOn: ["review"] },
  { id: "output", executor: "direct", dependsOn: ["format-check"] },
];

export const testCaseGenGates: Record<string, GateConfig> = {
  R1: {
    level: "light",
    checklist: ["源码分析覆盖所有关键页面/API"],
    onFail: "block",
    maxRetries: 1,
  },
  R2: {
    level: "heavy",
    checklist: ["歧义全解决", "Ten 维度完整", "决策有记录"],
    onFail: "block",
    maxRetries: 1,
  },
  R3: {
    level: "light",
    checklist: ["文件齐全", "路径规范", "报告生成"],
    onFail: "warn",
    maxRetries: 0,
  },
};
