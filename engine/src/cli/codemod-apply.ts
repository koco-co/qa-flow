import { Command } from "commander";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { transformNodeTestToBunTest } from "../codemod/node-test-to-bun-test.ts";
import { repoRoot } from "../lib/paths.ts";

function findTestFiles(root: string, out: string[]): void {
  try {
    const st = statSync(root);
    if (st.isFile() && root.endsWith(".test.ts")) {
      const content = readFileSync(root, "utf8");
      if (content.includes('from "node:test"')) out.push(root);
      return;
    }
    if (!st.isDirectory()) return;
    if (root.includes("/node_modules/") || root.includes("/dist/")) return;
    for (const e of readdirSync(root, { withFileTypes: true })) {
      findTestFiles(join(root, e.name), out);
    }
  } catch { /* skip */ }
}

export function registerCodemodApply(program: Command): void {
  program
    .command("codemod:node-test")
    .description("Convert engine test files from node:test to bun:test (P7.5)")
    .option("--apply", "write changes (default: dry-run)", false)
    .option("--scope <p>", "scan path", join(repoRoot(), "engine"))
    .action((opts: { apply: boolean; scope: string }) => {
      const files: string[] = [];
      findTestFiles(opts.scope, files);
      let changed = 0;
      for (const f of files) {
        const before = readFileSync(f, "utf8");
        const after = transformNodeTestToBunTest(before);
        if (after !== before) {
          changed++;
          if (opts.apply) writeFileSync(f, after);
          console.log(`${opts.apply ? "[wrote]" : "[dry]"} ${f.replace(repoRoot(), ".")}`);
        }
      }
      console.log(`\n[codemod:node-test] candidates=${files.length} changed=${changed} apply=${opts.apply}`);
    });
}
