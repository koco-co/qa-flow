import { Command } from "commander";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { transformNodeTestToBunTest } from "../codemod/node-test-to-bun-test.ts";
import { stripMatcherMessage } from "../codemod/strip-matcher-message.ts";
import { repoRoot } from "../lib/paths.ts";

function findTestFiles(root: string, out: string[], indicator: RegExp): void {
  try {
    const st = statSync(root);
    if (st.isFile() && root.endsWith(".test.ts")) {
      const content = readFileSync(root, "utf8");
      if (indicator.test(content)) out.push(root);
      return;
    }
    if (!st.isDirectory()) return;
    if (root.includes("/node_modules/") || root.includes("/dist/")) return;
    for (const e of readdirSync(root, { withFileTypes: true })) {
      findTestFiles(join(root, e.name), out, indicator);
    }
  } catch {
    /* skip */
  }
}

export function registerCodemodApply(program: Command): void {
  program
    .command("codemod:node-test")
    .description("Transform engine test files (P7.5 node:test→bun:test, P7.6 strip-msg)")
    .option("--apply", "write changes (default: dry-run)", false)
    .option("--scope <p>", "scan path", join(repoRoot(), "engine"))
    .option("--mode <m>", "transformation mode (node-test|strip-msg)", "node-test")
    .action((opts: { apply: boolean; scope: string; mode: string }) => {
      const isStrip = opts.mode === "strip-msg";
      const transform = isStrip ? stripMatcherMessage : transformNodeTestToBunTest;
      const indicator = isStrip ? /\.(toBe|toEqual|toMatch|toThrow)\([^)]*,/ : /from "node:test"/;

      const files: string[] = [];
      findTestFiles(opts.scope, files, indicator);
      let changed = 0;
      for (const f of files) {
        const before = readFileSync(f, "utf8");
        const after = transform(before);
        if (after !== before) {
          changed++;
          if (opts.apply) writeFileSync(f, after);
          console.log(`${opts.apply ? "[wrote]" : "[dry]"} ${f.replace(repoRoot(), ".")}`);
        }
      }
      console.log(
        `\n[codemod:node-test --mode ${opts.mode}] candidates=${files.length} changed=${changed} apply=${opts.apply}`,
      );
    });
}
