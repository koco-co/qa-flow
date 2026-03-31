/**
 * test-latest-link-utils.mjs
 * 验证仓库根目录快捷链接工具只会刷新显式指定的 latest-* 入口
 *
 * 运行: node test-latest-link-utils.mjs
 */
import {
  writeFileSync,
  existsSync,
  lstatSync,
  readlinkSync,
  rmSync,
} from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { refreshLatestLink } from "../shared/scripts/latest-link-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const runId = `${process.pid}-${Date.now()}`;
const targetOne = resolve(__dirname, `__latest_link_target_one_${runId}.txt`);
const targetTwo = resolve(__dirname, `__latest_link_target_two_${runId}.txt`);
const targetThree = resolve(__dirname, `__latest_link_target_three_${runId}.txt`);
const helperLinkName = `__latest_link_alias_${runId}.txt`;
const helperLink = resolve(repoRoot, helperLinkName);
const cliLinkName = `__latest_link_cli_${runId}.txt`;
const cliLink = resolve(repoRoot, cliLinkName);

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

function cleanup() {
  rmSync(targetOne, { force: true });
  rmSync(targetTwo, { force: true });
  rmSync(targetThree, { force: true });
  rmSync(helperLink, { force: true });
  rmSync(cliLink, { force: true });
  rmSync(resolve(repoRoot, basename(targetOne)), { force: true });
  rmSync(resolve(repoRoot, basename(targetTwo)), { force: true });
  rmSync(resolve(repoRoot, basename(targetThree)), { force: true });
}

process.on("exit", cleanup);
cleanup();

console.log("\n=== Test: refreshLatestLink ===");
writeFileSync(targetOne, "one", "utf8");
refreshLatestLink(targetOne, helperLinkName);
assert(existsSync(helperLink), "首次刷新后在根目录创建显式命名的快捷链接");
assert(!existsSync(resolve(repoRoot, basename(targetOne))), "不会额外创建与源文件 basename 同名的链接");
if (existsSync(helperLink)) {
  const stat = lstatSync(helperLink);
  assert(stat.isSymbolicLink(), "快捷链接是符号链接");
  if (stat.isSymbolicLink()) {
    assert(resolve(repoRoot, readlinkSync(helperLink)) === targetOne, "首次刷新指向第一个目标文件");
  }
}

writeFileSync(targetTwo, "two", "utf8");
refreshLatestLink(targetTwo, helperLinkName);
assert(existsSync(helperLink), "第二次刷新后复用同一个显式命名的快捷链接");
assert(!existsSync(resolve(repoRoot, basename(targetTwo))), "第二次刷新也不会创建 basename 同名链接");
if (existsSync(helperLink)) {
  const stat = lstatSync(helperLink);
  assert(stat.isSymbolicLink(), "第二次快捷链接仍是符号链接");
  if (stat.isSymbolicLink()) {
    assert(resolve(repoRoot, readlinkSync(helperLink)) === targetTwo, "第二次刷新指向第二个目标文件");
  }
}

console.log("\n=== Test: refresh-latest-link CLI ===");
writeFileSync(targetThree, "three", "utf8");
const cliResult = spawnSync(
  "node",
  [
    resolve(__dirname, "../shared/scripts/refresh-latest-link.mjs"),
    targetThree,
    cliLinkName,
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);
assert(cliResult.status === 0, "CLI 支持传入显式链接名");
assert(cliResult.stdout.includes(cliLinkName), "CLI 输出包含显式链接名");
assert(existsSync(cliLink), "CLI 在根目录创建显式命名的快捷链接");
assert(!existsSync(resolve(repoRoot, basename(targetThree))), "CLI 也不会创建 basename 同名链接");
if (existsSync(cliLink)) {
  const stat = lstatSync(cliLink);
  assert(stat.isSymbolicLink(), "CLI 创建的快捷链接是符号链接");
  if (stat.isSymbolicLink()) {
    assert(resolve(repoRoot, readlinkSync(cliLink)) === targetThree, "CLI 快捷链接指向目标文件");
  }
}

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
