import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it, expect } from "bun:test";

const TMP_DIR = join(tmpdir(), `kata-rule-loader-test-${process.pid}`);
const GLOBAL_RULES_DIR = join(TMP_DIR, "global-rules");
const WORKSPACE_DIR = join(TMP_DIR, "workspace");

function runLoader(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["rule-loader", ...args],
      {
        cwd: resolve(import.meta.dirname, "../.."),
        encoding: "utf8",
        env: {
          ...process.env,
          WORKSPACE_DIR,
          QA_RULES_DIR: GLOBAL_RULES_DIR,
          ...extraEnv,
        },
      },
    );
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

function writeGlobalRule(filename: string, content: string): void {
  mkdirSync(GLOBAL_RULES_DIR, { recursive: true });
  writeFileSync(join(GLOBAL_RULES_DIR, filename), content, "utf8");
}

function writeProjectRule(project: string, filename: string, content: string): void {
  const dir = join(WORKSPACE_DIR, project, "rules");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content, "utf8");
}

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("rule-loader.ts load — project overrides global", () => {
  it("project-level value overrides global value for same key", () => {
    writeGlobalRule(
      "case-writing.md",
      "# 用例编写偏好\n> 优先级说明\nrule_a: global_value\nrule_b: global_only\n",
    );
    writeProjectRule(
      "myProject",
      "case-writing.md",
      "# 用例编写偏好\nrule_a: project_value\n",
    );

    const { stdout, code } = runLoader(["load", "--project", "myProject"]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as Record<string, Record<string, string>>;
    expect("case-writing" in result).toBeTruthy();
    expect(result["case-writing"]["rule_a"]).toBe("project_value");
    expect(result["case-writing"]["rule_b"]).toBe("global_only");
  });
});

describe("rule-loader.ts load — falls back to global when no project rules", () => {
  it("uses global rules when project has no rule files", () => {
    writeGlobalRule(
      "xmind-structure.md",
      "# XMind 结构偏好\n> 优先级说明\niteration_id: 42\nroot_title_template: test-template\n",
    );
    // no project rules for this project

    const { stdout, code } = runLoader(["load", "--project", "emptyProject"]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as Record<string, Record<string, string>>;
    expect("xmind-structure" in result).toBeTruthy();
    expect(result["xmind-structure"]["iteration_id"]).toBe("42");
    expect(result["xmind-structure"]["root_title_template"]).toBe("test-template");
  });
});

describe("rule-loader.ts load — empty when no rule files exist", () => {
  it("returns empty object when no global and no project rules exist", () => {
    const { stdout, code } = runLoader(["load", "--project", "ghostProject"], {
      QA_RULES_DIR: join(TMP_DIR, "nonexistent-global"),
    });
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as Record<string, unknown>;
    expect(result).toEqual({});
  });
});

describe("rule-loader.ts load — parse rules", () => {
  it("skips lines starting with #, >, (, and blank lines", () => {
    writeGlobalRule(
      "test-rules.md",
      [
        "# heading line",
        "> priority explanation",
        "(some parenthetical)",
        "",
        "valid_key: valid_value",
        "another_key: another_value",
      ].join("\n"),
    );

    const { stdout, code } = runLoader(["load", "--project", "parseProject"]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as Record<string, Record<string, string>>;
    expect("test-rules" in result).toBeTruthy();
    expect(result["test-rules"]["valid_key"]).toBe("valid_value");
    expect(result["test-rules"]["another_key"]).toBe("another_value");
    expect(!("#" in result["test-rules"]).toBeTruthy(), "# lines should be skipped");
    expect(!(">" in result["test-rules"]).toBeTruthy(), "> lines should be skipped");
  });

  it("uses filename without .md as the output key", () => {
    writeGlobalRule("my-rule-file.md", "some_key: some_value\n");

    const { stdout, code } = runLoader(["load", "--project", "keyProject"]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as Record<string, unknown>;
    expect("my-rule-file" in result).toBeTruthy();
  });
});

describe("rule-loader.ts load — multiple rule files merged", () => {
  it("output contains keys for all rule files found", () => {
    writeGlobalRule("alpha.md", "key1: val1\n");
    writeGlobalRule("beta.md", "key2: val2\n");

    const { stdout, code } = runLoader(["load", "--project", "multiProject"]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as Record<string, unknown>;
    expect("alpha" in result).toBeTruthy();
    expect("beta" in result).toBeTruthy();
  });
});
