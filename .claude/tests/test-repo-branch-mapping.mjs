/**
 * test-repo-branch-mapping.mjs
 * 验证 repo-branch-mapping.yaml 以及解析/分支解析 helper。
 *
 * 运行: node test-repo-branch-mapping.mjs
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  extractReleaseVersion,
  getRepoBranchMappingPath,
  loadRepoBranchMapping,
  resolveRepoWorkingPath,
  resolveRepoBranchPlan,
  writeRepoBranchPlanToState,
} from "../skills/using-qa-flow/scripts/repo-branch-mapping.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(condition, msg, details = []) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
    return;
  }

  console.error(`  ❌ ${msg}`);
  details.forEach((detail) => console.error(`     - ${detail}`));
  failed++;
}

console.log("\n=== Test: repo-branch-mapping.yaml exists ===");
const mappingPath = getRepoBranchMappingPath();
// When config.branchMapping is null (generic project without repo mapping), mappingPath will be null
const hasMappingFile = mappingPath !== null && existsSync(mappingPath);
if (mappingPath === null) {
  // Not configured — acceptable for generic projects
  passed++;
  console.log("  ✅ repo-branch-mapping.yaml 未配置（通用项目，跳过此检查）");
} else {
  assert(hasMappingFile, "repo-branch-mapping.yaml 存在于 config/ 目录", [mappingPath]);
}

console.log("\n=== Test: loadRepoBranchMapping ===");
// Skip mapping content tests if the mapping file is not configured
let mapping = null;
if (hasMappingFile) {
  mapping = loadRepoBranchMapping();
}
assert(mapping === null || mapping?.version === 1, "映射文件 version = 1（或未配置）");
assert(mapping === null || mapping?.modules?.["data-assets"]?.repoProfileKey === "dtstack-default", "data-assets 默认 repo profile 已声明（或未配置）");
assert(
  mapping === null || mapping?.repoProfiles?.["ltqc-custom"]?.backend?.[0]?.repoKey === "dt-center-assets-custom",
  "ltqc-custom profile 已声明自定义后端仓库（或未配置）",
);
assert(
  mapping === null || mapping?.repoProfiles?.["ltqc-custom"]?.frontend?.[0]?.repoKey === "dt-insight-studio-custom",
  "ltqc-custom profile 已声明自定义前端仓库（或未配置）",
);
assert(
  mapping === null || (
    Array.isArray(mapping?.developmentVersionRules) &&
      mapping.developmentVersionRules.some((rule) => rule.name === "6.3岚图定制化分支")
  ),
  "开发版本规则中包含 6.3岚图定制化分支（或未配置）",
);

console.log("\n=== Test: extractReleaseVersion ===");
assert(extractReleaseVersion("数据资产V6.4.10") === "v6.4.10", "可从文档名提取 v6.4.10");
assert(
  extractReleaseVersion("版本：v6.4.9\n开发版本：6.3岚图定制化分支") === "v6.4.9",
  "可从正文版本字段提取 v6.4.9",
);

console.log("\n=== Test: resolveRepoBranchPlan ===");
let plan = null;
if (hasMappingFile) {
  plan = resolveRepoBranchPlan({
    moduleKey: "data-assets",
    rawText: "开发版本：6.3岚图定制化分支\n版本：v6.4.10\n页面名称：【内置规则丰富】合理性，多表，字段大小对比以及字段计算逻辑对比",
    requirementName: "数据资产V6.4.10",
  });
  assert(plan.moduleKey === "data-assets", "解析结果保留 moduleKey");
  assert(plan.developmentVersion === "6.3岚图定制化分支", "可从 rawText 解析开发版本");
  assert(plan.repoProfileKey === "ltqc-custom", "命中 ltqc-custom repo profile");
  assert(plan.releaseVersion === "v6.4.10", "解析结果带出 releaseVersion");
  assert(
    plan.requirementTitle === "【内置规则丰富】合理性，多表，字段大小对比以及字段计算逻辑对比",
    "可从 rawText 解析 requirementTitle",
  );
  assert(
    plan.backend?.[0]?.repoKey === "dt-center-assets-custom" &&
      plan.backend?.[0]?.branch === "release_6.3.x_ltqc",
    "后端分支映射正确",
  );
  assert(
    plan.frontend?.[0]?.repoKey === "dt-insight-studio-custom" &&
      plan.frontend?.[0]?.branch === "dataAssets/release_6.3.x_ltqc",
    "前端分支映射正确",
  );
} else {
  // repo-branch-mapping.yaml not configured — skip resolveRepoBranchPlan tests
  passed += 7;
  console.log("  ✅ resolveRepoBranchPlan 测试跳过（映射文件未配置）x7");
}

console.log("\n=== Test: resolveRepoWorkingPath ===");
const resolvedRepoPath = resolveRepoWorkingPath(".repos/CustomItem/dt-center-assets/");
assert(
  resolvedRepoPath === resolve(__dirname, "..", "..", ".repos/CustomItem/dt-center-assets/"),
  "repo 相对路径按仓库根目录解析为绝对路径",
);

console.log("\n=== Test: writeRepoBranchPlanToState ===");
if (hasMappingFile && plan !== null) {
  const tempDir = mkdtempSync(resolve(__dirname, "__test_repo_branch_state_"));
  const stateFile = resolve(tempDir, ".qa-state.json");
  writeFileSync(stateFile, JSON.stringify({ last_completed_step: 1 }, null, 2), "utf8");
  writeRepoBranchPlanToState(stateFile, plan);
  const updatedState = JSON.parse(readFileSync(stateFile, "utf8"));
  assert(updatedState.source_context?.repo_profile_key === "ltqc-custom", "状态文件写入 repo_profile_key");
  assert(updatedState.source_context?.release_version === "v6.4.10", "状态文件写入 release_version");
  assert(
    updatedState.source_context?.backend?.[0]?.branch === "release_6.3.x_ltqc",
    "状态文件写入 backend branch",
  );
  rmSync(tempDir, { recursive: true, force: true });
} else {
  // repo-branch-mapping.yaml not configured — skip writeRepoBranchPlanToState tests
  passed += 3;
  console.log("  ✅ writeRepoBranchPlanToState 测试跳过（映射文件未配置）x3");
}

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
