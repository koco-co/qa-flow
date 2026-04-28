import { test, expect } from "bun:test";
import { readFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rewriteSharedImports } from "../../src/migration/import-fix.ts";

test("rewriteSharedImports: ../../fixtures/X -> ../../../shared/fixtures/X", () => {
  const tmp = mkdtempSync(join(tmpdir(), "import-fix-"));
  const fxRoot = join(import.meta.dirname, "fixtures/import-fix-source");
  cpSync(fxRoot, tmp, { recursive: true });
  try {
    const result = rewriteSharedImports(join(tmp, "feature-1/tests"));
    expect(result.filesScanned).toBe(2);
    expect(result.rewriteCount).toBe(3); // 2 fixtures + 1 helpers (covers both with-trailing-path and bare-helpers)
    const t1 = readFileSync(join(tmp, "feature-1/tests/t1.ts"), "utf8");
    expect(t1).toContain('from "../../../shared/fixtures/step-screenshot"');
    expect(t1).toContain('from "../../../shared/helpers/test-setup"');
    expect(t1).toContain('from "../../../shared/helpers"'); // bare helpers/index
    expect(t1).not.toContain('from "../../fixtures/');
    expect(t1).not.toContain('from "../../helpers');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("rewriteSharedImports: idempotent", () => {
  const tmp = mkdtempSync(join(tmpdir(), "import-fix-"));
  const fxRoot = join(import.meta.dirname, "fixtures/import-fix-source");
  cpSync(fxRoot, tmp, { recursive: true });
  try {
    const r1 = rewriteSharedImports(join(tmp, "feature-1/tests"));
    const r2 = rewriteSharedImports(join(tmp, "feature-1/tests"));
    expect(r1.rewriteCount).toBe(3);
    expect(r2.rewriteCount).toBe(0); // already rewritten
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("rewriteSharedImports: leaves unrelated relative imports alone", () => {
  const tmp = mkdtempSync(join(tmpdir(), "import-fix-"));
  const fxRoot = join(import.meta.dirname, "fixtures/import-fix-source");
  cpSync(fxRoot, tmp, { recursive: true });
  try {
    rewriteSharedImports(join(tmp, "feature-1/tests"));
    const full = readFileSync(join(tmp, "feature-1/tests/full-spec-content.ts"), "utf8");
    expect(full).toContain('import "./t1.ts"'); // ./tN.ts imports unchanged
    expect(full).toContain('import "./t2.ts"');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
