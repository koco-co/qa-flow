/**
 * test-output-convention-migration.mjs
 * 校验仓库输出产物已迁移到新命名 / 快捷链接约定
 *
 * 运行: node test-output-convention-migration.mjs
 */
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const xmindRoot = resolve(repoRoot, "cases", "xmind");
const requirementsRoot = resolve(repoRoot, "cases", "requirements");

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

function rel(paths) {
  return paths.map((filePath) => relative(repoRoot, filePath));
}

function pathEntryExists(filePath) {
  try {
    lstatSync(filePath);
    return true;
  } catch {
    return false;
  }
}

console.log("\n=== Test: cases/xmind 不再保留日期前缀文件名 ===");
const datedXmindFiles = walkFiles(
  xmindRoot,
  (filePath) => /\b20\d{4}-.+\.xmind$/.test(filePath),
);
assert(
  datedXmindFiles.length === 0,
  "cases/xmind 下不再保留 20YYYY- 前缀的历史 xmind 文件",
  rel(datedXmindFiles),
);

console.log("\n=== Test: 根目录不再保留动态 basename xmind 链接 ===");
const rootDynamicXmindLinks = readdirSync(repoRoot)
  .map((entry) => resolve(repoRoot, entry))
  .filter((filePath) => /20\d{4}-.+\.xmind$/.test(filePath))
  .filter((filePath) => {
    try {
      return lstatSync(filePath).isSymbolicLink();
    } catch {
      return false;
    }
  });
assert(
  rootDynamicXmindLinks.length === 0,
  "仓库根目录不再保留按实际文件名创建的动态 xmind 链接",
  rel(rootDynamicXmindLinks),
);

console.log("\n=== Test: legacy-output.xmind 不再作为主流程根链接残留 ===");
const legacyOutputPath = resolve(repoRoot, "legacy-output.xmind");
assert(
  !pathEntryExists(legacyOutputPath),
  "legacy-output.xmind 已从仓库根目录移除",
  [relative(repoRoot, legacyOutputPath)],
);

console.log("\n=== Test: latest-output.xmind 快捷链接已从仓库根目录移除 ===");
const latestOutputPath = resolve(repoRoot, "latest-output.xmind");
// 快捷链接机制已废弃，latest-output.xmind 不应存在于仓库根目录
assert(
  !pathEntryExists(latestOutputPath),
  "latest-output.xmind 快捷链接已从仓库根目录移除",
  [relative(repoRoot, latestOutputPath)],
);

console.log("\n=== Test: 全量活跃 state 的 output_xmind 已切到无日期前缀 ===");
const targetStatePaths = walkFiles(
  requirementsRoot,
  (filePath) => basename(filePath).startsWith(".qa-state") && filePath.endsWith(".json"),
);
const badStatePaths = [];
const missingArchivePaths = [];
for (const statePath of targetStatePaths) {
  const data = JSON.parse(readFileSync(statePath, "utf8"));
  const outputXmind = String(data.output_xmind || "");
  if (!outputXmind) continue;
  const absoluteOutputPath = resolve(repoRoot, outputXmind);
  if (/\/20\d{4}-.+\.xmind$/.test(outputXmind) || !existsSync(absoluteOutputPath)) {
    badStatePaths.push(`${relative(repoRoot, statePath)} -> ${outputXmind}`);
  }
  const archiveMdPath = String(data.archive_md_path || "");
  if (archiveMdPath && !existsSync(resolve(repoRoot, archiveMdPath))) {
    missingArchivePaths.push(`${relative(repoRoot, statePath)} -> ${archiveMdPath}`);
  }
}
assert(
  badStatePaths.length === 0,
  "全量活跃 state 的 output_xmind 已更新为真实存在的无日期前缀文件",
  badStatePaths,
);
assert(
  missingArchivePaths.length === 0,
  "全量活跃 state 的 archive_md_path 都指向真实存在的归档文件",
  missingArchivePaths,
);

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
