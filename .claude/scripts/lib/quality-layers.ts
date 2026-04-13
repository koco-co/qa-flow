/**
 * 分层质量评估框架 — 改编自 sisyphus-autoflow 的 L1-L5 断言分层。
 * 用于 reviewer 节点对生成用例的多维度质量评估。
 */

export type QualityLayer = "L1" | "L2" | "L3" | "L4" | "L5";

export interface QualityCheck {
  layer: QualityLayer;
  id: string;
  description: string;
  severity: "error" | "warning" | "info";
}

export interface QualityResult {
  check: QualityCheck;
  passed: boolean;
  detail?: string;
}

/**
 * L1: 格式合规 — 用例结构是否符合规范
 * L2: 结构完整 — 必填字段、步骤连贯性
 * L3: 数据准确 — 优先级、标签、预期结果合理性
 * L4: 业务覆盖 — 需求追溯、边界场景、异常路径
 * L5: AI 增强 — 隐含需求推断、交叉功能影响
 */
export const QUALITY_CHECKS: QualityCheck[] = [
  // L1: 格式合规
  {
    layer: "L1",
    id: "L1-01",
    description: "用例标题不为空且不超过 80 字符",
    severity: "error",
  },
  {
    layer: "L1",
    id: "L1-02",
    description: "步骤与预期结果成对出现",
    severity: "error",
  },
  {
    layer: "L1",
    id: "L1-03",
    description: "优先级为 P0/P1/P2 之一",
    severity: "error",
  },
  {
    layer: "L1",
    id: "L1-04",
    description: "无重复用例标题",
    severity: "warning",
  },

  // L2: 结构完整
  {
    layer: "L2",
    id: "L2-01",
    description: "每个模块至少包含 1 个用例",
    severity: "error",
  },
  {
    layer: "L2",
    id: "L2-02",
    description: "步骤描述为可操作的动作（以动词开头）",
    severity: "warning",
  },
  {
    layer: "L2",
    id: "L2-03",
    description: "预期结果为可验证的状态描述",
    severity: "warning",
  },
  {
    layer: "L2",
    id: "L2-04",
    description: "前置条件若存在则描述完整",
    severity: "info",
  },

  // L3: 数据准确
  {
    layer: "L3",
    id: "L3-01",
    description: "P0 用例占比 10-30%",
    severity: "warning",
  },
  {
    layer: "L3",
    id: "L3-02",
    description: "正向/反向场景均有覆盖",
    severity: "warning",
  },
  {
    layer: "L3",
    id: "L3-03",
    description: "边界值场景已包含（若适用）",
    severity: "info",
  },

  // L4: 业务覆盖
  {
    layer: "L4",
    id: "L4-01",
    description: "每条 PRD 功能点至少有 1 个用例覆盖",
    severity: "error",
  },
  {
    layer: "L4",
    id: "L4-02",
    description: "异常路径和错误提示已覆盖",
    severity: "warning",
  },
  {
    layer: "L4",
    id: "L4-03",
    description: "权限与角色差异已考虑（若适用）",
    severity: "info",
  },

  // L5: AI 增强
  {
    layer: "L5",
    id: "L5-01",
    description: "隐含的关联功能影响已识别",
    severity: "info",
  },
  {
    layer: "L5",
    id: "L5-02",
    description: "数据一致性场景已推断",
    severity: "info",
  },
  {
    layer: "L5",
    id: "L5-03",
    description: "并发/性能相关场景已考虑（若适用）",
    severity: "info",
  },
];

export function getChecksByLayer(layer: QualityLayer): QualityCheck[] {
  return QUALITY_CHECKS.filter((c) => c.layer === layer);
}

export function summarizeResults(results: QualityResult[]): {
  total: number;
  passed: number;
  failed: number;
  errorCount: number;
  warningCount: number;
  deviationRate: number;
} {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const errorCount = results.filter((r) => !r.passed && r.check.severity === "error").length;
  const warningCount = results.filter((r) => !r.passed && r.check.severity === "warning").length;
  const deviationRate = total > 0 ? failed / total : 0;
  return { total, passed, failed, errorCount, warningCount, deviationRate };
}
