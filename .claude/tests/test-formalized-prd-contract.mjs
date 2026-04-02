/**
 * test-formalized-prd-contract.mjs
 * 校验 DTStack formalize 阶段不再在 cases/requirements 下持久化 formalized 产物
 *
 * 运行: node test-formalized-prd-contract.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const requirementsRoot = resolve(repoRoot, "cases", "requirements");
const stepPrdFormalizePath = resolve(
  repoRoot,
  ".claude",
  "skills",
  "test-case-generator",
  "prompts",
  "step-prd-formalize.md",
);
const stepPrdEnhancerPath = resolve(
  repoRoot,
  ".claude",
  "skills",
  "test-case-generator",
  "prompts",
  "step-prd-enhancer.md",
);
const prdEnhancerSkillPath = resolve(
  repoRoot,
  ".claude",
  "skills",
  "prd-enhancer",
  "SKILL.md",
);

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

function walkFiles(dir, predicate, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc; // directory does not exist, skip
  }
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(fullPath, predicate, acc);
      continue;
    }
    if (predicate(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function toRelativeList(paths) {
  return paths.map((filePath) => relative(repoRoot, filePath));
}

console.log("\n=== Test: active requirements 目录不得保留 formalized PRD 文件 ===");
const activeFormalizedFiles = walkFiles(
  requirementsRoot,
  (filePath) => filePath.endsWith(".md") && filePath.includes("formalized") && !filePath.includes("/.trash/"),
);
assert(
  activeFormalizedFiles.length === 0,
  "非 .trash requirements 目录下不再保留 formalized PRD 文件",
  toRelativeList(activeFormalizedFiles),
);

console.log("\n=== Test: active .qa-state 不得再引用 formalized_prd ===");
const stateFilesWithFormalizedRef = walkFiles(
  requirementsRoot,
  (filePath) =>
    filePath.endsWith(".json") &&
    !filePath.includes("/.trash/") &&
    readFileSync(filePath, "utf8").includes('"formalized_prd"'),
);
assert(
  stateFilesWithFormalizedRef.length === 0,
  "非 .trash 状态文件不再持久化 formalized_prd 字段",
  toRelativeList(stateFilesWithFormalizedRef),
);

console.log("\n=== Test: step-prd-formalize 必须声明 formalized 结果不落 cases/prds ===");
const stepPrdFormalizeContent = readFileSync(stepPrdFormalizePath, "utf8");
assert(
  !stepPrdFormalizeContent.includes("PRD-XX-<功能名>-formalized.md"),
  "step-prd-formalize 不再声明 PRD-*-formalized.md 为稳定输出",
);
assert(
  stepPrdFormalizeContent.includes("不在 `cases/prds` 下持久化 formalized.md") ||
  stepPrdFormalizeContent.includes("不在 `cases/requirements` 下持久化 formalized.md"),
  "step-prd-formalize 明确 formalized 结果不在 requirements 目录持久化",
);

console.log("\n=== Test: prd-enhancer 输入必须改为临时 formalize 结果 ===");
const stepPrdEnhancerContent = readFileSync(stepPrdEnhancerPath, "utf8");
const prdEnhancerSkillContent = readFileSync(prdEnhancerSkillPath, "utf8");
assert(
  stepPrdEnhancerContent.includes("临时整理结果或 formalize 摘要"),
  "step-prd-enhancer 改为消费临时 formalize 结果",
);
assert(
  prdEnhancerSkillContent.includes("不要求在 requirements 目录保留 formalized 文件"),
  "prd-enhancer Skill 明确不要求保留 formalized 文件",
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
