/**
 * Agent 模型分层策略 — 参考 sisyphus-autoflow 的 Haiku/Sonnet/Opus 分配。
 * Skill 在派发 Sub-Agent 时可引用此映射来指定 model 参数。
 */

export type ModelTier = "haiku" | "sonnet" | "opus";

export interface AgentModelConfig {
  tier: ModelTier;
  description: string;
}

/** 按任务类型推荐模型 */
export const MODEL_RECOMMENDATIONS: Record<string, AgentModelConfig> = {
  // 轻量任务 → Haiku (快速、低成本)
  "format-check": {
    tier: "haiku",
    description: "格式合规检查 — 规则匹配型任务",
  },
  "xmind-ops": {
    tier: "haiku",
    description: "XMind 读写操作 — 结构化数据处理",
  },
  "prd-frontmatter": { tier: "haiku", description: "PRD frontmatter 规范化" },
  "state-management": { tier: "haiku", description: "状态文件读写" },

  // 标准任务 → Sonnet (平衡速度与质量)
  transform: { tier: "sonnet", description: "PRD 结构化转换" },
  enhance: {
    tier: "sonnet",
    description: "PRD 增强（图片识别、要点提取）",
  },
  writer: { tier: "sonnet", description: "测试用例编写 Sub-Agent" },
  "bug-report": { tier: "sonnet", description: "Bug 报告分析（后端/前端）" },
  "conflict-report": { tier: "sonnet", description: "合并冲突分析" },
  "hotfix-case-gen": { tier: "sonnet", description: "Hotfix 用例生成" },
  standardize: { tier: "sonnet", description: "历史用例标准化" },

  // 复杂推理 → Opus (最深推理能力)
  analyze: {
    tier: "opus",
    description: "测试点规划 — 需要全局需求理解",
  },
  reviewer: { tier: "opus", description: "质量审查 — 多维度交叉验证" },
  architect: { tier: "opus", description: "架构分析 — 系统级决策" },
};

export function getModelTier(taskType: string): ModelTier {
  return MODEL_RECOMMENDATIONS[taskType]?.tier ?? "sonnet";
}
