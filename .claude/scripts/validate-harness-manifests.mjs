/**
 * validate-harness-manifests.mjs
 * 校验 Harness manifests 的基础一致性：
 * - 文件引用存在
 * - delegate 引用可解析
 * - step 依赖有效
 * - output shortcut 符合 contract
 */
import { existsSync } from "fs";
import {
  loadConfig,
  getHarnessConfig,
  getHarnessPaths,
  loadHarnessContracts,
  loadHarnessDelegates,
  loadHarnessWorkflow,
  resolveWorkspacePath,
} from "./load-config.mjs";

const ALLOWED_DELEGATE_KINDS = new Set(["script", "skill", "agent"]);

export function validateHarnessManifests() {
  const errors = [];
  const config = loadConfig();
  const harness = getHarnessConfig();
  const harnessPaths = getHarnessPaths();
  const delegates = loadHarnessDelegates();
  const contracts = loadHarnessContracts();

  if (!harness || !harnessPaths || !delegates || !contracts) {
    return ["Harness config / paths / delegates / contracts 未完整加载"];
  }

  const requiredFiles = [
    harnessPaths.root,
    harnessPaths.workflowDir,
    harnessPaths.delegates,
    harnessPaths.contracts,
    ...Object.values(harnessPaths.workflows),
  ];
  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) {
      errors.push(`缺失 Harness 文件或目录: ${filePath}`);
    }
  }

  for (const [delegateId, delegate] of Object.entries(delegates)) {
    if (!ALLOWED_DELEGATE_KINDS.has(delegate.kind)) {
      errors.push(`delegate.kind 非法: ${delegateId} -> ${delegate.kind}`);
    }
    if (!delegate.entry) {
      errors.push(`delegate.entry 缺失: ${delegateId}`);
      continue;
    }
    const entryPath = resolveWorkspacePath(delegate.entry);
    if (!existsSync(entryPath)) {
      errors.push(`delegate.entry 不存在: ${delegateId} -> ${delegate.entry}`);
    }
  }

  const shortcutValues = new Set(Object.values(config.shortcuts ?? {}));
  for (const [workflowName, workflowPath] of Object.entries(harness.workflows ?? {})) {
    if (!existsSync(resolveWorkspacePath(workflowPath))) {
      errors.push(`workflow manifest 不存在: ${workflowName} -> ${workflowPath}`);
      continue;
    }

    const workflow = loadHarnessWorkflow(workflowName);
    if (!workflow?.id) {
      errors.push(`workflow.id 缺失: ${workflowName}`);
    }
    if (!Array.isArray(workflow?.steps) || workflow.steps.length === 0) {
      errors.push(`workflow.steps 为空: ${workflowName}`);
      continue;
    }
    if (!Array.isArray(workflow?.outputs) || workflow.outputs.length === 0) {
      errors.push(`workflow.outputs 为空: ${workflowName}`);
    }

    const stepIds = new Set();
    let resumePointCount = 0;
    for (const step of workflow.steps) {
      if (!step.id) {
        errors.push(`workflow step 缺少 id: ${workflowName}`);
        continue;
      }
      if (stepIds.has(step.id)) {
        errors.push(`workflow step id 重复: ${workflowName} -> ${step.id}`);
      }
      stepIds.add(step.id);

      if (!delegates[step.delegate]) {
        errors.push(`workflow step 引用了不存在的 delegate: ${workflowName} -> ${step.id} -> ${step.delegate}`);
      }
      if (step.resumePoint === true) {
        resumePointCount++;
      }
    }

    if (resumePointCount === 0) {
      errors.push(`workflow 未声明任何 resumePoint: ${workflowName}`);
    }

    for (const step of workflow.steps) {
      for (const dependency of step.dependsOn ?? []) {
        if (!stepIds.has(dependency)) {
          errors.push(`workflow step 依赖不存在: ${workflowName} -> ${step.id} dependsOn ${dependency}`);
        }
        if (dependency === step.id) {
          errors.push(`workflow step 不能依赖自身: ${workflowName} -> ${step.id}`);
        }
      }
    }

    for (const output of workflow.outputs ?? []) {
      if (output.shortcut && !shortcutValues.has(output.shortcut)) {
        errors.push(`workflow output shortcut 未在 config.shortcuts 中声明: ${workflowName} -> ${output.shortcut}`);
      }
    }
  }

  if (contracts.state?.file !== ".qa-state.json") {
    errors.push("contracts.state.file 必须为 .qa-state.json");
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateHarnessManifests();
  if (errors.length === 0) {
    console.log("✅ Harness manifests valid");
    process.exit(0);
  }

  console.error("❌ Harness manifests invalid");
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
