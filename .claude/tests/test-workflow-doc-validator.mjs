/**
 * test-workflow-doc-validator.mjs
 * 校验工作流文档与脚本实现的关键契约，避免目录/文档漂移在 npm test 中漏检
 *
 * 运行: node test-workflow-doc-validator.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
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
const archiveFormatPath = resolve(claudeRoot, "rules", "archive-format.md");
const archiveSkillPath = resolve(skillsRoot, "archive-converter", "SKILL.md");
const archiveSkillRuleMirrorPath = resolve(skillsRoot, "archive-converter", "rules", "archive-format.md");
const xmindSkillPath = resolve(skillsRoot, "xmind-converter", "SKILL.md");
const xmindStructureSpecPath = resolve(skillsRoot, "xmind-converter", "references", "xmind-structure-spec.md");
const jsonToXmindPath = resolve(skillsRoot, "xmind-converter", "scripts", "json-to-xmind.mjs");
const codeAnalysisSkillPath = resolve(skillsRoot, "code-analysis-report", "SKILL.md");
const codeAnalyzerPromptPath = resolve(skillsRoot, "code-analysis-report", "prompts", "code-analyzer.md");
const backendAnalysisFlowPath = resolve(skillsRoot, "code-analysis-report", "references", "backend-analysis-flow.md");
const frontendAnalysisFlowPath = resolve(skillsRoot, "code-analysis-report", "references", "frontend-analysis-flow.md");
const conflictAnalysisFlowPath = resolve(skillsRoot, "code-analysis-report", "references", "conflict-analysis-flow.md");
const hotfixCaseFlowPath = resolve(skillsRoot, "code-analysis-report", "references", "hotfix-case-flow.md");
const readmePath = resolve(repoRoot, "README.md");
const directoryNamingPath = resolve(claudeRoot, "rules", "directory-naming.md");
const repoSafetyPath = resolve(claudeRoot, "rules", "repo-safety.md");
const globalTestCaseWritingPath = resolve(claudeRoot, "rules", "test-case-writing.md");
const testsPackagePath = resolve(claudeRoot, "tests", "package.json");
const testsRunnerPath = resolve(claudeRoot, "tests", "run-all.mjs");
const testCaseGeneratorSkillPath = resolve(skillsRoot, "test-case-generator", "SKILL.md");
const skillTestCaseWritingPath = resolve(skillsRoot, "test-case-generator", "rules", "test-case-writing.md");
const stepParseInputPath = resolve(skillsRoot, "test-case-generator", "prompts", "step-parse-input.md");
const stepPrdEnhancerPath = resolve(skillsRoot, "test-case-generator", "prompts", "step-prd-enhancer.md");
const stepArchivePath = resolve(skillsRoot, "test-case-generator", "prompts", "step-archive.md");
const stepXmindPath = resolve(skillsRoot, "test-case-generator", "prompts", "step-xmind.md");
const stepSourceSyncPath = resolve(skillsRoot, "test-case-generator", "prompts", "step-source-sync.md");
const stepReqElicitPath = resolve(skillsRoot, "test-case-generator", "prompts", "step-req-elicit.md");
const sourceRepoSetupPath = resolve(skillsRoot, "using-qa-flow", "prompts", "source-repo-setup.md");
const elicitationDimensionsPath = resolve(skillsRoot, "test-case-generator", "references", "elicitation-dimensions.md");
const intermediateFormatPath = resolve(skillsRoot, "test-case-generator", "references", "intermediate-format.md");

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

function stripMirrorNotice(content) {
  return content.replace(/^> .*?\n\n/s, "").trim();
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
const agentDocs = existsSync(agentsRoot)
  ? walkFiles(agentsRoot, (filePath) => filePath.endsWith(".md"))
  : [];
const activeDocs = [...skillDocs, ...promptDocs, ...agentDocs];
const repoFacingDocs = [
  claudeMdPath,
  readmePath,
  directoryNamingPath,
  ...activeDocs,
].filter((filePath) => existsSync(filePath));

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
const archiveSkillContent = readFileSync(archiveSkillPath, "utf8");
const xmindRuleContent = readFileSync(xmindRulePath, "utf8");
const xmindSkillContent = readFileSync(xmindSkillPath, "utf8");
const xmindStructureSpecContent = readFileSync(xmindStructureSpecPath, "utf8");
const jsonToXmindContent = readFileSync(jsonToXmindPath, "utf8");
const stepXmindContent = readFileSync(stepXmindPath, "utf8");
const directoryNamingContent = readFileSync(directoryNamingPath, "utf8");
assert(
  claudeMdContent.includes("latest-output.xmind"),
  "CLAUDE.md 记录了 latest-output.xmind 工作流",
);
assert(
  xmindRuleContent.includes("latest-output.xmind"),
  ".claude/rules/xmind-output.md 记录了 latest-output.xmind 工作流",
);
assert(
  xmindRuleContent.includes("<功能名>.xmind") &&
    !xmindRuleContent.includes("YYYYMM-<功能名>.xmind") &&
    !xmindRuleContent.includes("可继续保留读取"),
  ".claude/rules/xmind-output.md 已切换到无日期前缀命名",
);
assert(
  xmindSkillContent.includes("<功能名>.xmind") &&
    xmindSkillContent.includes("Story-YYYYMMDD.xmind"),
  "xmind-converter Skill 已切换到新命名 contract",
);
assert(
  xmindStructureSpecContent.includes("<功能名>.xmind") &&
    xmindStructureSpecContent.includes("Story-YYYYMMDD.xmind"),
  "xmind 结构参考文档已切换到新命名 contract",
);
assert(
  jsonToXmindContent.includes("function refreshLatestOutput(outputPath)") &&
    jsonToXmindContent.includes("RESERVED_OUTPUT_NAME"),
  "json-to-xmind.mjs 提供 latest-output.xmind 刷新逻辑",
);
assert(
  !jsonToXmindContent.includes("legacyLinkPath"),
  "json-to-xmind.mjs 不再创建根目录同名快捷链接",
);
assert(
  stepXmindContent.includes("latest-output.xmind") &&
    !stepXmindContent.includes("与实际文件同名"),
  "step-xmind prompt 已切换到固定 latest-output.xmind 快捷链接",
);
assert(
  !directoryNamingContent.includes("不做强制迁移"),
  "directory-naming.md 已移除“历史不迁移”的旧口径",
);

console.log("\n=== Test: Task 6 相关 Skill / references 必须使用 repo 根相对路径 ===");
const codeAnalysisSkillContent = readFileSync(codeAnalysisSkillPath, "utf8");
const hotfixCaseFlowContent = readFileSync(hotfixCaseFlowPath, "utf8");
const archiveSkillRuleMirrorContent = readFileSync(archiveSkillRuleMirrorPath, "utf8");
const archiveFormatContent = readFileSync(archiveFormatPath, "utf8");
assert(
  archiveSkillContent.includes(".claude/rules/archive-format.md"),
  "archive-converter Skill 使用 repo 根相对路径引用 archive-format",
);
assert(
  stripMirrorNotice(archiveSkillRuleMirrorContent) === archiveFormatContent.trim(),
  "archive-converter skill 内镜像规则已同步到最新 Archive frontmatter 口径",
);
assert(
  xmindSkillContent.includes(".claude/rules/xmind-output.md") &&
    xmindSkillContent.includes(".claude/skills/xmind-converter/references/xmind-structure-spec.md"),
  "xmind-converter Skill 使用 repo 根相对路径引用 rules 与 references",
);
assert(
  codeAnalysisSkillContent.includes(".claude/skills/code-analysis-report/references/bug-report-template.md") &&
    codeAnalysisSkillContent.includes(".claude/skills/code-analysis-report/references/hotfix-case-writing.md"),
  "code-analysis-report Skill 使用 repo 根相对路径引用 references",
);
assert(
  hotfixCaseFlowContent.includes(".claude/skills/code-analysis-report/references/hotfix-case-writing.md"),
  "hotfix-case-flow 使用 repo 根相对路径引用 hotfix-case-writing",
);

console.log("\n=== Test: code-analysis-report 快捷链接命令必须显式传参 ===");
const codeAnalyzerPromptContent = readFileSync(codeAnalyzerPromptPath, "utf8");
const backendAnalysisFlowContent = readFileSync(backendAnalysisFlowPath, "utf8");
const frontendAnalysisFlowContent = readFileSync(frontendAnalysisFlowPath, "utf8");
const conflictAnalysisFlowContent = readFileSync(conflictAnalysisFlowPath, "utf8");
assert(
  backendAnalysisFlowContent.includes('"reports/bugs/{date}/{BugTitle}.html"') &&
    backendAnalysisFlowContent.includes('"latest-bug-report.html"'),
  "backend-analysis-flow 显式传入 latest-bug-report.html 快捷链接参数",
);
assert(
  frontendAnalysisFlowContent.includes('"reports/bugs/{date}/{BugTitle}.html"') &&
    frontendAnalysisFlowContent.includes('"latest-bug-report.html"'),
  "frontend-analysis-flow 显式传入 latest-bug-report.html 快捷链接参数",
);
assert(
  conflictAnalysisFlowContent.includes('"reports/conflicts/{date}/{description}.html"') &&
    conflictAnalysisFlowContent.includes('"latest-conflict-report.html"'),
  "conflict-analysis-flow 显式传入 latest-conflict-report.html 快捷链接参数",
);
assert(
  codeAnalyzerPromptContent.includes("latest-bug-report.html") &&
    codeAnalyzerPromptContent.includes("latest-conflict-report.html"),
  "code-analyzer prompt 显式说明快捷链接命令参数",
);
assert(
  !codeAnalyzerPromptContent.includes("## 两种工作模式") &&
    [
      "模式 A：后端 Bug 分析",
      "模式 B：合并冲突分析",
      "模式 C：前端报错分析",
      "模式 D：信息不足补料",
      "模式 E：Hotfix 用例生成",
    ].every((heading) => codeAnalyzerPromptContent.includes(heading)),
  "code-analyzer prompt 已与 code-analysis-report 的模式集合保持一致",
);
assert(
  frontendAnalysisFlowContent.includes("git branch --show-current") &&
    frontendAnalysisFlowContent.includes("等待用户确认当前分支是否正确") &&
    codeAnalyzerPromptContent.includes("等待确认后再继续"),
  "前端报错分析在未提供分支时会先展示当前分支并等待确认",
);
assert(
  codeAnalyzerPromptContent.includes("模式 A：后端 Bug 分析")
    && codeAnalyzerPromptContent.includes("若用户未提供分支，先输出当前仓库 / remote / branch / latest commit，等待确认后再继续"),
  "后端 Bug 分析在未提供分支时会先展示当前分支并等待确认",
);
assert(
  codeAnalyzerPromptContent.includes("模式 B：合并冲突分析")
    && codeAnalyzerPromptContent.includes("若仓库 / 分支可定位，先执行只读同步"),
  "合并冲突分析在仓库上下文可定位时会先同步当前分支",
);

console.log("\n=== Test: .claude/tests 统一入口必须完整 ===");
assert(existsSync(testsPackagePath), ".claude/tests/package.json 已存在");
assert(existsSync(testsRunnerPath), ".claude/tests/run-all.mjs 已存在");

console.log("\n=== Test: repo-facing 文档目录树不得残留旧的 .claude/scripts/ 描述 ===");
const staleClaudeScriptsTreeRefs = findLineMatches(
  [readmePath, directoryNamingPath],
  /scripts\/\s+# Node\.js/g,
);
assert(
  staleClaudeScriptsTreeRefs.length === 0,
  "README.md 与 directory-naming.md 已移除旧的 .claude/scripts/ 目录树描述",
  staleClaudeScriptsTreeRefs,
);

console.log("\n=== Test: test-case-generator prompt 不得硬编码可配置路径 ===");
const hardcodedPromptPathRefs = findLineMatches(
  [stepParseInputPath, stepSourceSyncPath, stepReqElicitPath],
  /\.claude\/skills\/using-qa-flow\/scripts\/refresh-lanhu-cookie\.py|config\/repo-branch-mapping\.yaml/g,
);
assert(
  hardcodedPromptPathRefs.length === 0,
  "test-case-generator prompt 已移除 refresh-lanhu-cookie.py 与 repo-branch-mapping.yaml 的硬编码路径",
  hardcodedPromptPathRefs,
);

console.log("\n=== Test: 权威 Skill / rules / references 不得绕过 repoBranchMapping 配置字段 ===");
const hardcodedMappingAuthorityRefs = findLineMatches(
  [
    directoryNamingPath,
    repoSafetyPath,
    globalTestCaseWritingPath,
    testCaseGeneratorSkillPath,
    skillTestCaseWritingPath,
    sourceRepoSetupPath,
    elicitationDimensionsPath,
  ],
  /config\/repo-branch-mapping\.yaml/g,
).filter((match) => !match.includes("repoBranchMapping"));
assert(
  hardcodedMappingAuthorityRefs.length === 0,
  "权威 Skill / rules / references 已统一改为通过 repoBranchMapping 配置字段定位映射文件",
  hardcodedMappingAuthorityRefs,
);

console.log("\n=== Test: PRD 增强快捷链接必须显式指定 latest-prd-enhanced.md ===");
const prdEnhancerSkillContent = readFileSync(prdEnhancerSkillPath, "utf8");
const stepPrdEnhancerContent = readFileSync(stepPrdEnhancerPath, "utf8");
assert(
  prdEnhancerSkillContent.includes('refresh-latest-link.mjs "<enhanced-path>" latest-prd-enhanced.md'),
  "prd-enhancer Skill 使用显式 latest-prd-enhanced.md 快捷链接命令",
);
assert(
  stepPrdEnhancerContent.includes('refresh-latest-link.mjs "<实际enhanced.md路径>" latest-prd-enhanced.md'),
  "step-prd-enhancer 使用显式 latest-prd-enhanced.md 快捷链接命令",
);

console.log("\n=== Test: waiting verification 状态必须使用 archive step ID ===");
const staleNumericArchiveRefs = findLineMatches(
  [stepParseInputPath, intermediateFormatPath],
  /last_completed_step:\s*9\b/g,
);
assert(
  staleNumericArchiveRefs.length === 0,
  "awaiting_verification 相关说明不再使用过期的数字 step ID 9",
  staleNumericArchiveRefs,
);

console.log("\n=== Test: archive 成功态只能在归档文件真实落盘后写入 ===");
const stepArchiveContent = readFileSync(stepArchivePath, "utf8");
assert(
  !stepArchiveContent.includes("json-to-archive-md.mjs 失败") || !stepArchiveContent.includes("不阻断"),
  "step-archive 不再把 archive 生成失败定义为非阻断",
);
assert(
  stepArchiveContent.includes("archive 文件真实落盘后") &&
    stepArchiveContent.includes("才允许写入 `archive_md_path`"),
  "step-archive 明确要求 archive 落盘成功后再写状态",
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
