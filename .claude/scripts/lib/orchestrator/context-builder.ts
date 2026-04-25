import type { WorkflowStep } from "./types.ts";

export interface BuildContextParams {
  step: WorkflowStep;
  previousArtifacts: Record<string, string>;
  project: string;
  prdSlug: string;
  instructionMd: string;
}

/**
 * 为 subagent 构建上下文 prompt 字符串。
 * 包含：指令、前置产物路径、项目路径。
 */
export function buildSubagentContext(params: BuildContextParams): string {
  const lines: string[] = [
    `## 任务: ${params.step.id}`,
    ``,
    `## 项目: ${params.project}`,
    `PRD: ${params.prdSlug}`,
    ``,
    `## 指令`,
    params.instructionMd,
    ``,
  ];

  const prevKeys = Object.keys(params.previousArtifacts);
  if (prevKeys.length > 0) {
    lines.push(`## 前置产物`, ``);
    for (const key of prevKeys) {
      lines.push(`- ${key}: \`${params.previousArtifacts[key]}\``);
    }
    lines.push(``);
  }

  return lines.join("\n");
}
