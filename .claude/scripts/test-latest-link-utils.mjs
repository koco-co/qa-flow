/**
 * test-latest-link-utils.mjs
 * 验证仓库根目录快捷链接工具能创建并刷新 latest-* 符号链接
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
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { refreshLatestLink } from "./latest-link-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const runId = `${process.pid}-${Date.now()}`;
const targetOne = resolve(__dirname, `__latest_link_target_one_${runId}.txt`);
const targetTwo = resolve(__dirname, `__latest_link_target_two_${runId}.txt`);
const latestLink = resolve(repoRoot, "latest-test-output.txt");

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
  rmSync(latestLink, { force: true });
}

process.on("exit", cleanup);
cleanup();

console.log("\n=== Test: refreshLatestLink ===");
writeFileSync(targetOne, "one", "utf8");
refreshLatestLink(targetOne, "latest-test-output.txt");
assert(existsSync(latestLink), "首次刷新后创建 latest-test-output.txt");
if (existsSync(latestLink)) {
  const stat = lstatSync(latestLink);
  assert(stat.isSymbolicLink(), "latest-test-output.txt 是符号链接");
  if (stat.isSymbolicLink()) {
    assert(resolve(repoRoot, readlinkSync(latestLink)) === targetOne, "首次刷新指向第一个目标文件");
  }
}

writeFileSync(targetTwo, "two", "utf8");
refreshLatestLink(targetTwo, "latest-test-output.txt");
assert(existsSync(latestLink), "第二次刷新后仍存在 latest-test-output.txt");
if (existsSync(latestLink)) {
  const stat = lstatSync(latestLink);
  assert(stat.isSymbolicLink(), "第二次刷新后仍为符号链接");
  if (stat.isSymbolicLink()) {
    assert(resolve(repoRoot, readlinkSync(latestLink)) === targetTwo, "第二次刷新指向第二个目标文件");
  }
}

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
