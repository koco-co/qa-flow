/**
 * test-harness-contracts.mjs
 * 验证 Harness Phase 1 的控制平面 contract：
 * - .claude/config.json 提供 harness 路径入口
 * - .claude/harness/ 下的 workflow / delegate / contract 文件存在
 * - load-config.mjs 可统一读取 Harness manifests
 */
import { existsSync } from "fs";
import { resolve } from "path";
import {
  loadConfig,
  getWorkspaceRoot,
  getHarnessPaths,
  loadHarnessContracts,
  loadHarnessDelegates,
  loadHarnessWorkflow,
} from "./load-config.mjs";
import { validateHarnessManifests } from "./validate-harness-manifests.mjs";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

console.log("\n=== Test: harness config paths ===");
const config = loadConfig();
assert(config.harness?.root === ".claude/harness/", "config.harness.root 配置正确");
assert(
  config.harness?.workflowDir === ".claude/harness/workflows/",
  "config.harness.workflowDir 配置正确",
);
assert(
  config.harness?.delegates === ".claude/harness/delegates.json",
  "config.harness.delegates 配置正确",
);
assert(
  config.harness?.contracts === ".claude/harness/contracts.json",
  "config.harness.contracts 配置正确",
);
assert(
  config.harness?.workflows?.testCaseGeneration === ".claude/harness/workflows/test-case-generation.json",
  "config.harness.workflows.testCaseGeneration 配置正确",
);
assert(
  config.harness?.workflows?.codeAnalysis === ".claude/harness/workflows/code-analysis.json",
  "config.harness.workflows.codeAnalysis 配置正确",
);

console.log("\n=== Test: harness files exist ===");
const root = getWorkspaceRoot();
const harnessPaths = getHarnessPaths();
assert(harnessPaths.root === resolve(root, ".claude/harness"), "getHarnessPaths.root 指向 .claude/harness");
assert(existsSync(harnessPaths.root), ".claude/harness 目录存在");
assert(existsSync(harnessPaths.workflowDir), ".claude/harness/workflows 目录存在");
assert(existsSync(harnessPaths.delegates), "delegates.json 存在");
assert(existsSync(harnessPaths.contracts), "contracts.json 存在");
assert(
  existsSync(harnessPaths.workflows.testCaseGeneration),
  "test-case-generation workflow manifest 存在",
);
assert(
  existsSync(harnessPaths.workflows.codeAnalysis),
  "code-analysis workflow manifest 存在",
);

console.log("\n=== Test: harness contracts ===");
const contracts = loadHarnessContracts();
assert(contracts.state?.file === ".qa-state.json", "contracts.state.file 指向 .qa-state.json");
assert(
  contracts.shortcuts?.latestXmind === config.shortcuts?.latestXmind,
  "contracts.latestXmind 与 config.shortcuts 对齐",
);
assert(
  contracts.shortcuts?.latestEnhancedPrd === config.shortcuts?.latestEnhancedPrd,
  "contracts.latestEnhancedPrd 与 config.shortcuts 对齐",
);
assert(
  contracts.shortcuts?.latestBugReport === config.shortcuts?.latestBugReport,
  "contracts.latestBugReport 与 config.shortcuts 对齐",
);
assert(
  contracts.shortcuts?.latestConflictReport === config.shortcuts?.latestConflictReport,
  "contracts.latestConflictReport 与 config.shortcuts 对齐",
);
assert(
  contracts.qualityGates?.reviewer?.autoFixBelowIssueRate === 0.15,
  "reviewer auto-fix 阈值为 0.15",
);
assert(
  contracts.qualityGates?.reviewer?.blockAboveIssueRate === 0.4,
  "reviewer block 阈值为 0.4",
);

console.log("\n=== Test: harness delegates ===");
const delegates = loadHarnessDelegates();
assert(
  delegates.lanhuMcpRuntime?.entry === ".claude/scripts/lanhu-mcp-runtime.mjs",
  "lanhuMcpRuntime delegate 入口正确",
);
assert(
  delegates.prdEnhancer?.entry === ".claude/skills/prd-enhancer/SKILL.md",
  "prdEnhancer delegate 入口正确",
);
assert(
  delegates.caseWriter?.entry === ".claude/agents/case-writer.md",
  "caseWriter delegate 入口正确",
);
assert(
  delegates.caseReviewer?.entry === ".claude/agents/case-reviewer.md",
  "caseReviewer delegate 入口正确",
);
assert(
  delegates.codeAnalyzer?.entry === ".claude/agents/code-analyzer.md",
  "codeAnalyzer delegate 入口正确",
);
assert(
  delegates.xmindConverter?.entry === ".claude/skills/xmind-converter/SKILL.md",
  "xmindConverter delegate 入口正确",
);

console.log("\n=== Test: test-case-generation workflow ===");
const testCaseWorkflow = loadHarnessWorkflow("testCaseGeneration");
assert(testCaseWorkflow.id === "test-case-generation", "workflow id 正确");
assert(
  Array.isArray(testCaseWorkflow.entryInputs) &&
    testCaseWorkflow.entryInputs.includes("lanhu-url") &&
    testCaseWorkflow.entryInputs.includes("story-path"),
  "test-case-generation 支持 lanhu-url / story-path 入口",
);
assert(
  testCaseWorkflow.steps.some((step) => step.id === "prd-enhancer"),
  "test-case-generation 包含 prd-enhancer step",
);
assert(
  testCaseWorkflow.steps.some((step) => step.id === "writer" && step.resumePoint === true),
  "writer step 声明为 resumePoint",
);
assert(
  testCaseWorkflow.steps.some((step) => step.id === "reviewer" && step.failureMode === "block"),
  "reviewer step failureMode 为 block",
);
assert(
  testCaseWorkflow.outputs.some((output) => output.shortcut === "latest-prd-enhanced.md"),
  "test-case-generation 声明 latest-prd-enhanced.md 输出",
);
assert(
  testCaseWorkflow.outputs.some((output) => output.shortcut === "latest-output.xmind"),
  "test-case-generation 声明 latest-output.xmind 输出",
);

console.log("\n=== Test: code-analysis workflow ===");
const codeAnalysisWorkflow = loadHarnessWorkflow("codeAnalysis");
assert(codeAnalysisWorkflow.id === "code-analysis", "code-analysis workflow id 正确");
assert(
  Array.isArray(codeAnalysisWorkflow.entryInputs) &&
    codeAnalysisWorkflow.entryInputs.includes("curl-log") &&
    codeAnalysisWorkflow.entryInputs.includes("conflict-log"),
  "code-analysis 支持 curl-log / conflict-log 入口",
);
assert(
  codeAnalysisWorkflow.steps.some((step) => step.id === "branch-sync"),
  "code-analysis 包含 branch-sync step",
);
assert(
  codeAnalysisWorkflow.steps.some((step) => step.id === "html-report" && step.failureMode === "block"),
  "code-analysis html-report step failureMode 为 block",
);
assert(
  codeAnalysisWorkflow.outputs.some((output) => output.shortcut === "latest-bug-report.html"),
  "code-analysis 声明 latest-bug-report.html 输出",
);
assert(
  codeAnalysisWorkflow.outputs.some((output) => output.shortcut === "latest-conflict-report.html"),
  "code-analysis 声明 latest-conflict-report.html 输出",
);

console.log("\n=== Test: validateHarnessManifests ===");
const harnessValidationErrors = validateHarnessManifests();
assert(harnessValidationErrors.length === 0, "Harness manifest validator 通过");
if (harnessValidationErrors.length > 0) {
  harnessValidationErrors.forEach((message) => console.error(`     - ${message}`));
}

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
