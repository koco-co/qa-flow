import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const scriptPath = resolve(
  repoRoot,
  ".claude/skills/setup/scripts/init-wizard.ts",
);

test("init-wizard source references /kata init (not /using-kata init)", () => {
  const src = readFileSync(scriptPath, "utf8");
  assert.doesNotMatch(
    src,
    /\/using-kata init/,
    "init-wizard.ts must not contain stale /using-kata init hint",
  );
  assert.match(
    src,
    /\/kata init/,
    "init-wizard.ts should hint users to run /kata init",
  );
});
