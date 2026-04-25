import { getDb } from "../db/client.ts";

const RATES: Record<string, { input: number; output: number }> = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = RATES[model] ?? RATES.haiku;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

export function recordAiCost(params: {
  workflow: string;
  project: string;
  step: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}): void {
  const cost = estimateCost(params.model, params.inputTokens, params.outputTokens);
  getDb()
    .prepare(
      `
    INSERT INTO ai_costs (workflow, project, step, model, input_tokens, output_tokens, duration_ms, estimated_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      params.workflow,
      params.project,
      params.step,
      params.model,
      params.inputTokens,
      params.outputTokens,
      params.durationMs,
      cost,
    );
}
