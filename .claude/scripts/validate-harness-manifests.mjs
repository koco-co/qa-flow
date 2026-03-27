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
  loadHarnessHooks,
  loadHarnessWorkflow,
  resolveWorkspacePath,
} from "./load-config.mjs";
import { validateOutputNamingContracts } from "./output-naming-contracts.mjs";

const ALLOWED_DELEGATE_KINDS = new Set(["script", "skill", "agent"]);

export function validateHarnessManifests() {
  const errors = [];
  const config = loadConfig();
  const harness = getHarnessConfig();
  const harnessPaths = getHarnessPaths();
  const delegates = loadHarnessDelegates();
  const hooks = loadHarnessHooks();
  const contracts = loadHarnessContracts();

  if (!harness || !harnessPaths || !delegates || !hooks || !contracts) {
    return ["Harness config / paths / delegates / hooks / contracts 未完整加载"];
  }

  const requiredFiles = [
    harnessPaths.root,
    harnessPaths.workflowDir,
    harnessPaths.delegates,
    harnessPaths.hooks,
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
  const hookSets = {
    prechecks: new Set(Object.keys(hooks.prechecks ?? {})),
    conditions: new Set(Object.keys(hooks.conditions ?? {})),
    recovery: new Set(Object.keys(hooks.recovery ?? {})),
    convergence: new Set(Object.keys(hooks.convergence ?? {})),
  };

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
      for (const precheck of step.precheck ?? []) {
        if (!hookSets.prechecks.has(precheck)) {
          errors.push(`workflow step precheck 未注册: ${workflowName} -> ${step.id} -> ${precheck}`);
        }
      }
      for (const condition of step.skippableWhen ?? []) {
        if (!hookSets.conditions.has(condition)) {
          errors.push(`workflow step skippableWhen 条件未注册: ${workflowName} -> ${step.id} -> ${condition}`);
        }
      }
      if (step.parallel === true && !step.convergenceHook) {
        errors.push(`parallel workflow step 缺少 convergenceHook: ${workflowName} -> ${step.id}`);
      }
      if (step.convergenceHook && !hookSets.convergence.has(step.convergenceHook)) {
        errors.push(`workflow step convergenceHook 未注册: ${workflowName} -> ${step.id} -> ${step.convergenceHook}`);
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
      for (const [condition, dependencies] of Object.entries(step.modeDependencies ?? {})) {
        if (!hookSets.conditions.has(condition)) {
          errors.push(`workflow modeDependencies 条件未注册: ${workflowName} -> ${step.id} -> ${condition}`);
        }
        for (const dependency of dependencies) {
          if (!stepIds.has(dependency)) {
            errors.push(`workflow modeDependencies 依赖不存在: ${workflowName} -> ${step.id} -> ${condition} -> ${dependency}`);
          }
          if (dependency === step.id) {
            errors.push(`workflow modeDependencies 不能依赖自身: ${workflowName} -> ${step.id} -> ${condition}`);
          }
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
  for (const [name, recoveryHook] of Object.entries(contracts.recovery ?? {})) {
    if (!hookSets.recovery.has(recoveryHook)) {
      errors.push(`contracts.recovery 未注册: ${name} -> ${recoveryHook}`);
    }
  }

  errors.push(...validateOutputNamingContracts(contracts, config));

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
