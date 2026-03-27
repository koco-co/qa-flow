/**
 * test-workflow-doc-validator.mjs
 * 校验工作流文档与脚本实现的关键契约，避免目录/文档漂移在 npm test 中漏检
 *
 * 运行: node test-workflow-doc-validator.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const claudeRoot = resolve(repoRoot, ".claude");
const skillsRoot = resolve(claudeRoot, "skills");
const agentsRoot = resolve(claudeRoot, "agents");
const claudeMdPath = resolve(repoRoot, "CLAUDE.md");
const prdEnhancerSkillPath = resolve(skillsRoot, "prd-enhancer", "SKILL.md");
const prdTemplatePath = resolve(skillsRoot, "prd-enhancer", "references", "prd-template.md");
const xmindRulePath = resolve(claudeRoot, "rules", "xmind-output.md");
const jsonToXmindPath = resolve(__dirname, "json-to-xmind.mjs");
const readmePath = resolve(repoRoot, "README.md");
const directoryNamingPath = resolve(claudeRoot, "rules", "directory-naming.md");
const lanhuPlanPath = resolve(repoRoot, "docs", "蓝湖PRD自动化导入方案.md");

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
  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(fullPath, predicate, acc);
    } else if (predicate(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function relativePath(filePath) {
  return relative(repoRoot, filePath) || filePath;
}

function findLineMatches(filePaths, matcher) {
  const issues = [];
  for (const filePath of filePaths) {
    const lines = readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (matcher.test(line)) {
        issues.push(
          `${relativePath(filePath)}:${index + 1} → ${line.trim()}`,
        );
      }
      matcher.lastIndex = 0;
    });
  }
  return issues;
}

function collectClaudeHeadings() {
  const headings = new Set();
  const lines = readFileSync(claudeMdPath, "utf8").split("\n");
  let activeFence = null;
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (activeFence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === activeFence.char &&
        fenceMatch[1].length >= activeFence.length
      ) {
        activeFence = null;
      }
      continue;
    }
    if (fenceMatch) {
      activeFence = {
        char: fenceMatch[1][0],
        length: fenceMatch[1].length,
      };
      continue;
    }
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (match) headings.add(match[1].trim());
  }
  return headings;
}

function collectHeadingReferences(filePaths) {
  const refs = [];
  const refPattern = /CLAUDE\.md「([^」]+)」/g;
  for (const filePath of filePaths) {
    const lines = readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(refPattern)) {
        refs.push({
          filePath,
          lineNumber: index + 1,
          heading: match[1].trim(),
        });
      }
    });
  }
  return refs;
}

const skillDocs = walkFiles(skillsRoot, (filePath) => basename(filePath) === "SKILL.md");
const promptDocs = walkFiles(
  skillsRoot,
  (filePath) =>
    filePath.endsWith(".md") &&
    relative(skillsRoot, filePath).split(/[\\/]/).includes("prompts"),
);
const agentDocs = walkFiles(agentsRoot, (filePath) => filePath.endsWith(".md"));
const activeDocs = [...skillDocs, ...promptDocs, ...agentDocs];
const repoFacingDocs = [
  claudeMdPath,
  readmePath,
  directoryNamingPath,
  lanhuPlanPath,
  ...activeDocs,
];

console.log("\n=== Test: active Skill / prompt 文档不得回退到 archive-cases/ ===");
const legacyArchiveCasesRefs = findLineMatches(activeDocs, /archive-cases\//g);
assert(
  legacyArchiveCasesRefs.length === 0,
  "active Skill / prompt 文档未使用过时的 archive-cases/ 目录",
  legacyArchiveCasesRefs,
);

console.log("\n=== Test: PRD enhancer 文档示例不得出现重复 assets 路径 ===");
const repeatedAssetsIssues = findLineMatches(
  [prdEnhancerSkillPath, prdTemplatePath],
  /assets(?:\/assets){3,}\//g,
);
assert(
  repeatedAssetsIssues.length === 0,
  "PRD enhancer 文档示例未出现 assets/assets/assets/assets 之类错误路径",
  repeatedAssetsIssues,
);

console.log("\n=== Test: repo-facing 文档不得残留 WorkSpaces / 外置 lanhu 路径 / zentao-cases ===");
const staleIdentityOrLanhuRefs = findLineMatches(
  repoFacingDocs,
  /WorkSpaces\/|WorkSpaces 根目录|~\/Tools\/lanhu-mcp|\/Users\/poco\/Documents\/DTStack\/WorkSpaces|zentao-cases\//g,
);
assert(
  staleIdentityOrLanhuRefs.length === 0,
  "repo-facing 文档已移除 WorkSpaces、~/Tools/lanhu-mcp、绝对 WorkSpaces 路径和 zentao-cases 旧引用",
  staleIdentityOrLanhuRefs,
);

console.log("\n=== Test: Skill 中的 CLAUDE.md 章节引用必须存在 ===");
const claudeHeadings = collectClaudeHeadings();
assert(
  claudeHeadings.has("快速开始"),
  "CLAUDE.md 真实标题会被正常提取",
);
assert(
  !claudeHeadings.has("生成测试用例（完整流程）"),
  "CLAUDE.md 标题提取会跳过 fenced code block 内的 # 行",
);
const headingRefs = collectHeadingReferences(skillDocs);
const missingHeadingRefs = headingRefs
  .filter(({ heading }) => !claudeHeadings.has(heading))
  .map(
    ({ filePath, lineNumber, heading }) =>
      `${relativePath(filePath)}:${lineNumber} → CLAUDE.md「${heading}」`,
  );
assert(
  headingRefs.length > 0,
  "已扫描到 Skill 中的 CLAUDE.md 章节引用",
);
assert(
  missingHeadingRefs.length === 0,
  "所有 Skill 中的 CLAUDE.md 章节引用都能解析到真实标题",
  missingHeadingRefs,
);

console.log("\n=== Test: latest-output.xmind 文档有脚本实现支撑 ===");
const claudeMdContent = readFileSync(claudeMdPath, "utf8");
const xmindRuleContent = readFileSync(xmindRulePath, "utf8");
const jsonToXmindContent = readFileSync(jsonToXmindPath, "utf8");
assert(
  claudeMdContent.includes("latest-output.xmind"),
  "CLAUDE.md 记录了 latest-output.xmind 工作流",
);
assert(
  xmindRuleContent.includes("latest-output.xmind"),
  ".claude/rules/xmind-output.md 记录了 latest-output.xmind 工作流",
);
assert(
  jsonToXmindContent.includes("const LATEST_OUTPUT_PATH = resolve(REPO_ROOT, 'latest-output.xmind')"),
  "json-to-xmind.mjs 定义了仓库根目录 latest-output.xmind 目标",
);
assert(
  jsonToXmindContent.includes("function refreshLatestOutput(outputPath)"),
  "json-to-xmind.mjs 提供了 latest-output.xmind 刷新逻辑",
);
assert(
  jsonToXmindContent.includes("symlinkSync(linkTarget, LATEST_OUTPUT_PATH)"),
  "json-to-xmind.mjs 通过符号链接刷新 latest-output.xmind",
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
