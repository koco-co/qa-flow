export type ExecutorType = "direct" | "subagent";
export type ModelTier = "haiku" | "sonnet" | "opus";
export type GateLevel = "light" | "heavy";
export type GateFailAction = "block" | "warn";

export interface SubagentConfig {
  agentRef: string;
  model?: ModelTier;
}

export interface GateConfig {
  level: GateLevel;
  checklist: string[];
  onFail: GateFailAction;
  maxRetries: number;
}

export interface WorkflowStep {
  id: string;
  executor: ExecutorType;
  subagentConfig?: SubagentConfig;
  gateAfter?: GateConfig;
  dependsOn: string[];
}

export interface WorkflowState {
  workflow: string;
  project: string;
  prdSlug: string;
  completedSteps: string[];
  currentStep: string;
  artifacts: Record<string, string>;
  failedAttempts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}
