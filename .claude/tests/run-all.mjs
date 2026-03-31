#!/usr/bin/env node
import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const testFiles = readdirSync(__dirname)
  .filter((name) => name.startsWith("test-") && name.endsWith(".mjs"))
  .sort();

let failed = 0;

for (const testFile of testFiles) {
  console.log(`\n=== Running ${testFile} ===`);
  const result = spawnSync(process.execPath, [resolve(__dirname, testFile)], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if ((result.status ?? 1) !== 0) {
    failed++;
  }
}

console.log("\n══════════════════════════════════════");
console.log(
  failed === 0
    ? `全部通过: ${testFiles.length}/${testFiles.length}`
    : `执行完成: ${testFiles.length} 个测试文件，失败 ${failed} 个`,
);
console.log("══════════════════════════════════════");

process.exit(failed === 0 ? 0 : 1);
