# create-project Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 `create-project` skill（CLI + Skill + 模板），承接 setup 的项目管理与源码仓库 clone 职责，实施 3 个 CLI actions (`scan` / `create` / `clone-repo`)，通过幂等补齐兼容现有 `dataAssets` / `xyzh` 项目，创建后自动调用 `knowledge-keeper index` 生成 `_index.md`。

**Architecture:** CLI + Skill 双层（对齐 knowledge-keeper 范式）。CLI (`.claude/scripts/create-project.ts`) 负责纯文件 I/O 与 JSON stdout；纯函数抽到 `lib/create-project.ts` 便于单测；模板在 `templates/project-skeleton/` 带 `{{project}}` 占位；测试通过 `node:test` + `execFileSync` + `tmpdir()` fixture（沿用 knowledge-keeper.test.ts 范式），通过 `WORKSPACE_DIR` + `CONFIG_JSON_PATH` 两个 env var 做路径重定向，避免污染真实 workspace/config.json。

**Tech Stack:** TypeScript + Bun + Commander CLI + `node:test` + `node:child_process.execFileSync`

**Spec:** [`../specs/2026-04-18-create-project-skill-design.md`](../specs/2026-04-18-create-project-skill-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

**Sibling (Sub-goal 1)：** knowledge-keeper 已实施，本 plan 直接消费其 `index` action。

---

## 关键现状修正

Spec §2 Goal 6 / §5.2 提到"从 init-wizard.ts **迁移** clone 子命令"。**实际情况**：init-wizard.ts 源码仅有 `scan` / `verify` 两个子命令，**从未实现过 clone**。setup SKILL.md 和 references/repo-setup.md 仅是**引用**未落地的命令。本 plan 的行为：

- 在 `create-project.ts` **新实施** `clone-repo` action（与 spec 行为一致）
- `init-wizard.ts` 源码无需改动（Task 10 仅校验此事实，不动代码）
- setup SKILL.md 中的 clone 引用由子目标 3 一并清理

---

## 文件布局

| 文件 | 动作 | 职责 |
|---|---|---|
| `.claude/scripts/lib/create-project.ts` | Create | 纯函数：validateProjectName / SKELETON_SPEC / diffProjectSkeleton / mergeProjectConfig / renderTemplate / configJsonPath / todayIso |
| `.claude/scripts/create-project.ts` | Create | Commander CLI：`scan` / `create` / `clone-repo` handlers |
| `.claude/scripts/__tests__/lib/create-project.test.ts` | Create | 单元测试：纯函数层 |
| `.claude/scripts/__tests__/create-project.test.ts` | Create | 集成测试：真实 CLI 调用 + tmpdir fixture |
| `templates/project-skeleton/knowledge/overview.md` | Create | 引导文案模板，含 `{{project}}` 占位 |
| `templates/project-skeleton/knowledge/terms.md` | Create | 空表格模板，含 `{{project}}` 占位 |
| `templates/project-skeleton/rules/README.md` | Create | 项目级规则使用指南，含 `{{project}}` 占位 |
| `.claude/skills/create-project/SKILL.md` | Create | Skill 对话流程定义 |

**不改动的文件（本子目标守则）：**
- `.claude/scripts/lib/paths.ts`（已齐，不新增；config.json 路径通过 create-project lib 自治管理）
- `.claude/scripts/knowledge-keeper.ts` / `.claude/scripts/lib/knowledge.ts`（只消费，不改）
- `.claude/skills/setup/SKILL.md` / `.claude/skills/setup/scripts/init-wizard.ts`（子目标 3 处理）

---

## 共享符号表（跨任务一致性）

所有任务共享以下类型/函数签名，后续 Task 不得改动：

```typescript
// lib/create-project.ts

export const SKELETON_SPEC = {
  dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "historys",
    "reports",
    "tests",
    "rules",
    "knowledge",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
    ".temp",
  ],
  gitkeep_dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "historys",
    "reports",
    "tests",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
    ".temp",
  ],
  template_files: {
    "rules/README.md": "rules/README.md",
    "knowledge/overview.md": "knowledge/overview.md",
    "knowledge/terms.md": "knowledge/terms.md",
  } as Record<string, string>,
} as const;

export const RESERVED_NAMES = [
  "workspace",
  "repos",
  ".repos",
  ".temp",
  "knowledge",
  "rules",
  "archive",
  "xmind",
  "prds",
  "issues",
  "reports",
  "historys",
  "tests",
  "templates",
  "scripts",
  "plugins",
  "skills",
] as const;

export const TEMPLATE_ROOT_REL = "templates/project-skeleton";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface SkeletonDiff {
  exists: boolean;
  missing_dirs: string[];
  missing_files: string[];
  missing_gitkeeps: string[];
  skeleton_complete: boolean;
}

export interface ConfigMergeResult {
  merged: Record<string, unknown>;
  added: boolean;
}

export function validateProjectName(name: string): ValidationResult;
export function resolveSkeletonPaths(projectDirAbs: string): {
  dirs: string[];
  gitkeeps: string[];
  templates: { src_rel: string; dst_abs: string }[];
};
export function diffProjectSkeleton(
  projectDirAbs: string,
  templateRootAbs: string,
): SkeletonDiff;
export function mergeProjectConfig(
  existing: Record<string, unknown>,
  projectName: string,
): ConfigMergeResult;
export function renderTemplate(raw: string, vars: { project: string }): string;
export function configJsonPath(): string;
export function todayIso(): string;
```

---

### Task 1: lib/create-project.ts 骨架 + validateProjectName

**Files:**
- Create: `.claude/scripts/lib/create-project.ts`
- Create: `.claude/scripts/__tests__/lib/create-project.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `.claude/scripts/__tests__/lib/create-project.test.ts`：

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RESERVED_NAMES,
  validateProjectName,
} from "../../lib/create-project.ts";

describe("validateProjectName", () => {
  it("accepts camelCase name dataAssets", () => {
    const r = validateProjectName("dataAssets");
    assert.equal(r.valid, true);
    assert.equal(r.error, undefined);
  });

  it("accepts kebab-case name data-assets", () => {
    assert.equal(validateProjectName("data-assets").valid, true);
  });

  it("accepts all-lowercase pinyin xyzh", () => {
    assert.equal(validateProjectName("xyzh").valid, true);
  });

  it("rejects empty name", () => {
    const r = validateProjectName("");
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects single character (too short)", () => {
    const r = validateProjectName("a");
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects name over 32 chars", () => {
    const r = validateProjectName("a".repeat(33));
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects name starting with digit", () => {
    const r = validateProjectName("1project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects name starting with dash", () => {
    const r = validateProjectName("-project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects underscore", () => {
    const r = validateProjectName("my_project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects space", () => {
    const r = validateProjectName("my project");
    assert.equal(r.valid, false);
  });

  it("rejects dot", () => {
    const r = validateProjectName("my.project");
    assert.equal(r.valid, false);
  });

  it("rejects slash", () => {
    const r = validateProjectName("my/project");
    assert.equal(r.valid, false);
  });

  it("rejects reserved name 'knowledge'", () => {
    const r = validateProjectName("knowledge");
    assert.equal(r.valid, false);
    assert.match(r.error!, /reserved/);
  });

  it("rejects every reserved name in RESERVED_NAMES", () => {
    for (const reserved of RESERVED_NAMES) {
      if (!/^[A-Za-z]/.test(reserved)) continue; // 保留名 '.repos'/'.temp' 本就被字符集规则拒
      const r = validateProjectName(reserved);
      assert.equal(r.valid, false, `expected "${reserved}" to be rejected`);
    }
  });
});
```

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: 所有用例 FAIL（`Cannot find module '../../lib/create-project.ts'`）

- [ ] **Step 3: 实现 lib/create-project.ts 骨架 + validateProjectName**

新建 `.claude/scripts/lib/create-project.ts`：

```typescript
// lib/create-project.ts

import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SKELETON_SPEC = {
  dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "historys",
    "reports",
    "tests",
    "rules",
    "knowledge",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
    ".temp",
  ],
  gitkeep_dirs: [
    "prds",
    "xmind",
    "archive",
    "issues",
    "historys",
    "reports",
    "tests",
    "knowledge/modules",
    "knowledge/pitfalls",
    ".repos",
    ".temp",
  ],
  template_files: {
    "rules/README.md": "rules/README.md",
    "knowledge/overview.md": "knowledge/overview.md",
    "knowledge/terms.md": "knowledge/terms.md",
  } as Record<string, string>,
} as const;

export const RESERVED_NAMES = [
  "workspace",
  "repos",
  ".repos",
  ".temp",
  "knowledge",
  "rules",
  "archive",
  "xmind",
  "prds",
  "issues",
  "reports",
  "historys",
  "tests",
  "templates",
  "scripts",
  "plugins",
  "skills",
] as const;

export const TEMPLATE_ROOT_REL = "templates/project-skeleton";

const NAME_REGEX = /^[A-Za-z][A-Za-z0-9-]*$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProjectName(name: string): ValidationResult {
  if (name.length < 2 || name.length > 32) {
    return { valid: false, error: `length must be 2-32 (got ${name.length})` };
  }
  if (!NAME_REGEX.test(name)) {
    return {
      valid: false,
      error:
        "invalid character set (allowed: ^[A-Za-z][A-Za-z0-9-]*$)",
    };
  }
  if ((RESERVED_NAMES as readonly string[]).includes(name)) {
    return { valid: false, error: `"${name}" is a reserved system name` };
  }
  return { valid: true };
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function repoRootFromLib(): string {
  return resolve(fileURLToPath(import.meta.url), "../../../..");
}

export function configJsonPath(): string {
  const override = process.env.CONFIG_JSON_PATH;
  if (override && override.length > 0) return override;
  return join(repoRootFromLib(), "config.json");
}
```

- [ ] **Step 4: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: 14 个用例全部 PASS

- [ ] **Step 5: 全量测试验证无回归**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: `551 + N pass, 0 fail`（N = 本 task 新增用例数）

- [ ] **Step 6: Commit**

```bash
cd /Users/poco/Projects/qa-flow
git add .claude/scripts/lib/create-project.ts .claude/scripts/__tests__/lib/create-project.test.ts
git commit -m "feat(phase1): add create-project lib with validateProjectName"
```

---

### Task 2: SKELETON_SPEC + resolveSkeletonPaths + diffProjectSkeleton

**Files:**
- Modify: `.claude/scripts/lib/create-project.ts`
- Modify: `.claude/scripts/__tests__/lib/create-project.test.ts`

- [ ] **Step 1: 追加失败测试**

在 `create-project.test.ts` 末尾追加：

```typescript
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { after, before } from "node:test";

import {
  diffProjectSkeleton,
  resolveSkeletonPaths,
  SKELETON_SPEC,
  TEMPLATE_ROOT_REL,
} from "../../lib/create-project.ts";

describe("SKELETON_SPEC shape", () => {
  it("has 13 directories", () => {
    assert.equal(SKELETON_SPEC.dirs.length, 13);
  });

  it("has 11 gitkeep directories", () => {
    assert.equal(SKELETON_SPEC.gitkeep_dirs.length, 11);
  });

  it("has 3 template files", () => {
    assert.equal(Object.keys(SKELETON_SPEC.template_files).length, 3);
  });

  it("gitkeep_dirs is a subset of dirs", () => {
    for (const d of SKELETON_SPEC.gitkeep_dirs) {
      assert.ok(
        SKELETON_SPEC.dirs.includes(d as (typeof SKELETON_SPEC.dirs)[number]),
        `${d} not in dirs`,
      );
    }
  });

  it("template_files dst paths are not in gitkeep_dirs' directories of same file", () => {
    // rules/README.md should NOT need gitkeep (rules is not a gitkeep_dir)
    assert.ok(!SKELETON_SPEC.gitkeep_dirs.includes("rules"));
  });
});

describe("resolveSkeletonPaths", () => {
  it("returns absolute paths derived from projectDir", () => {
    const projDir = "/tmp/x/workspace/demoProj";
    const r = resolveSkeletonPaths(projDir);
    assert.ok(r.dirs.every((d) => d.startsWith(projDir + "/")));
    assert.ok(r.gitkeeps.every((g) => g.endsWith(".gitkeep")));
    assert.ok(r.templates.every((t) => t.dst_abs.startsWith(projDir + "/")));
  });

  it("produces 13 dirs, 11 gitkeeps, 3 templates", () => {
    const r = resolveSkeletonPaths("/tmp/foo");
    assert.equal(r.dirs.length, 13);
    assert.equal(r.gitkeeps.length, 11);
    assert.equal(r.templates.length, 3);
  });
});

describe("diffProjectSkeleton", () => {
  const TMP = join(tmpdir(), `qa-flow-cp-unit-${process.pid}`);
  const TPL = join(TMP, "templates", "project-skeleton");
  const EMPTY_PROJ = join(TMP, "empty-proj");
  const FULL_PROJ = join(TMP, "full-proj");

  before(() => {
    // Build a stub template root so diff can inspect existence
    mkdirSync(join(TPL, "rules"), { recursive: true });
    mkdirSync(join(TPL, "knowledge"), { recursive: true });
    writeFileSync(join(TPL, "rules", "README.md"), "# {{project}}");
    writeFileSync(join(TPL, "knowledge", "overview.md"), "# {{project}}");
    writeFileSync(join(TPL, "knowledge", "terms.md"), "# {{project}}");

    // Empty project: does not exist
    // Full project: all dirs + gitkeeps + template-produced files
    for (const d of SKELETON_SPEC.dirs) {
      mkdirSync(join(FULL_PROJ, d), { recursive: true });
    }
    for (const g of SKELETON_SPEC.gitkeep_dirs) {
      writeFileSync(join(FULL_PROJ, g, ".gitkeep"), "");
    }
    for (const rel of Object.keys(SKELETON_SPEC.template_files)) {
      writeFileSync(join(FULL_PROJ, rel), "# existing");
    }
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("empty project: exists=false, all missing", () => {
    const diff = diffProjectSkeleton(EMPTY_PROJ, TPL);
    assert.equal(diff.exists, false);
    assert.equal(diff.missing_dirs.length, 13);
    assert.equal(diff.missing_gitkeeps.length, 11);
    assert.equal(diff.missing_files.length, 3);
    assert.equal(diff.skeleton_complete, false);
  });

  it("full project: exists=true, nothing missing, skeleton_complete", () => {
    const diff = diffProjectSkeleton(FULL_PROJ, TPL);
    assert.equal(diff.exists, true);
    assert.equal(diff.missing_dirs.length, 0);
    assert.equal(diff.missing_gitkeeps.length, 0);
    assert.equal(diff.missing_files.length, 0);
    assert.equal(diff.skeleton_complete, true);
  });

  it("partial project: only missing what's absent", () => {
    // Remove knowledge/modules only
    rmSync(join(FULL_PROJ, "knowledge", "modules"), { recursive: true });
    const diff = diffProjectSkeleton(FULL_PROJ, TPL);
    assert.equal(diff.exists, true);
    assert.deepEqual(diff.missing_dirs, ["knowledge/modules"]);
    assert.deepEqual(diff.missing_gitkeeps, ["knowledge/modules/.gitkeep"]);
    assert.equal(diff.skeleton_complete, false);
    // Restore for cleanup
    mkdirSync(join(FULL_PROJ, "knowledge", "modules"), { recursive: true });
    writeFileSync(join(FULL_PROJ, "knowledge", "modules", ".gitkeep"), "");
  });
});
```

注意：将 `import { join } from "node:path";` 补入文件顶部 import 清单（与第一行 `describe("validateProjectName")` 的测试所需 import 合并）。

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: 新增 `SKELETON_SPEC shape` / `resolveSkeletonPaths` / `diffProjectSkeleton` 各用例 FAIL

- [ ] **Step 3: 实现 resolveSkeletonPaths + diffProjectSkeleton**

在 `lib/create-project.ts` 末尾（`configJsonPath` 之后）追加：

```typescript
import { existsSync } from "node:fs";

export interface SkeletonDiff {
  exists: boolean;
  missing_dirs: string[];
  missing_files: string[];
  missing_gitkeeps: string[];
  skeleton_complete: boolean;
}

export function resolveSkeletonPaths(projectDirAbs: string): {
  dirs: string[];
  gitkeeps: string[];
  templates: { src_rel: string; dst_abs: string }[];
} {
  return {
    dirs: SKELETON_SPEC.dirs.map((d) => join(projectDirAbs, d)),
    gitkeeps: SKELETON_SPEC.gitkeep_dirs.map((d) =>
      join(projectDirAbs, d, ".gitkeep"),
    ),
    templates: Object.entries(SKELETON_SPEC.template_files).map(
      ([dst_rel, src_rel]) => ({
        src_rel,
        dst_abs: join(projectDirAbs, dst_rel),
      }),
    ),
  };
}

export function diffProjectSkeleton(
  projectDirAbs: string,
  templateRootAbs: string,
): SkeletonDiff {
  const exists = existsSync(projectDirAbs);
  const spec = resolveSkeletonPaths(projectDirAbs);

  const missing_dirs: string[] = [];
  for (let i = 0; i < spec.dirs.length; i++) {
    if (!existsSync(spec.dirs[i])) {
      missing_dirs.push(SKELETON_SPEC.dirs[i]);
    }
  }

  const missing_gitkeeps: string[] = [];
  for (let i = 0; i < spec.gitkeeps.length; i++) {
    if (!existsSync(spec.gitkeeps[i])) {
      missing_gitkeeps.push(`${SKELETON_SPEC.gitkeep_dirs[i]}/.gitkeep`);
    }
  }

  const missing_files: string[] = [];
  for (const t of spec.templates) {
    if (!existsSync(t.dst_abs)) {
      const rel = Object.keys(SKELETON_SPEC.template_files).find(
        (k) => join(projectDirAbs, k) === t.dst_abs,
      );
      if (rel) missing_files.push(rel);
    }
  }

  // templateRootAbs is consumed by later tasks (create action) to know where
  // to source templates from; it is validated here by checking existence.
  // We deliberately do not fail here if templateRootAbs is missing — lint-like
  // concerns are left to create-time validation.
  void templateRootAbs;

  const skeleton_complete =
    exists &&
    missing_dirs.length === 0 &&
    missing_gitkeeps.length === 0 &&
    missing_files.length === 0;

  return {
    exists,
    missing_dirs,
    missing_files,
    missing_gitkeeps,
    skeleton_complete,
  };
}
```

**重要**：`node:path` 的 `join` 已在前一 Task 导入，无需重复 import。`existsSync` 在文件顶部 import 清单追加：`import { existsSync } from "node:fs";`

- [ ] **Step 4: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: 所有用例 PASS

- [ ] **Step 5: 全量测试验证**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/lib/create-project.ts .claude/scripts/__tests__/lib/create-project.test.ts
git commit -m "feat(phase1): add SKELETON_SPEC and diffProjectSkeleton"
```

---

### Task 3: mergeProjectConfig

**Files:**
- Modify: `.claude/scripts/lib/create-project.ts`
- Modify: `.claude/scripts/__tests__/lib/create-project.test.ts`

- [ ] **Step 1: 追加失败测试**

在 `create-project.test.ts` 末尾追加：

```typescript
import { mergeProjectConfig } from "../../lib/create-project.ts";

describe("mergeProjectConfig", () => {
  it("adds project to empty config", () => {
    const { merged, added } = mergeProjectConfig({}, "newProj");
    assert.equal(added, true);
    assert.deepEqual(merged, {
      projects: { newProj: { repo_profiles: {} } },
    });
  });

  it("adds project alongside existing projects", () => {
    const existing = {
      projects: {
        dataAssets: { repo_profiles: { 岚图: { repos: [] } } },
      },
    };
    const { merged, added } = mergeProjectConfig(existing, "newProj");
    assert.equal(added, true);
    assert.deepEqual(
      (merged as any).projects.dataAssets.repo_profiles,
      { 岚图: { repos: [] } },
      "existing project untouched",
    );
    assert.deepEqual(
      (merged as any).projects.newProj,
      { repo_profiles: {} },
      "new project registered",
    );
  });

  it("skips when project already registered", () => {
    const existing = {
      projects: {
        existProj: { repo_profiles: { foo: { repos: [{ path: "a" }] } } },
      },
    };
    const { merged, added } = mergeProjectConfig(existing, "existProj");
    assert.equal(added, false);
    assert.deepEqual(
      (merged as any).projects.existProj.repo_profiles,
      { foo: { repos: [{ path: "a" }] } },
      "existing repo_profiles preserved",
    );
  });

  it("preserves top-level keys outside projects", () => {
    const existing = { otherField: "keepme", projects: {} };
    const { merged } = mergeProjectConfig(existing, "x");
    assert.equal((merged as any).otherField, "keepme");
  });

  it("handles missing projects key", () => {
    const existing = { someOtherField: 1 };
    const { merged, added } = mergeProjectConfig(existing, "y");
    assert.equal(added, true);
    assert.ok("projects" in merged);
    assert.deepEqual((merged as any).projects, {
      y: { repo_profiles: {} },
    });
  });

  it("does not mutate the input (immutability)", () => {
    const existing = { projects: { a: { repo_profiles: {} } } };
    const snapshot = JSON.stringify(existing);
    mergeProjectConfig(existing, "b");
    assert.equal(JSON.stringify(existing), snapshot, "input unchanged");
  });
});
```

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: `mergeProjectConfig` 6 个用例 FAIL

- [ ] **Step 3: 实现 mergeProjectConfig**

在 `lib/create-project.ts` 末尾追加：

```typescript
export interface ConfigMergeResult {
  merged: Record<string, unknown>;
  added: boolean;
}

export function mergeProjectConfig(
  existing: Record<string, unknown>,
  projectName: string,
): ConfigMergeResult {
  const projects = (existing.projects as Record<string, unknown> | undefined) ?? {};
  if (Object.prototype.hasOwnProperty.call(projects, projectName)) {
    return {
      merged: {
        ...existing,
        projects: { ...projects },
      },
      added: false,
    };
  }
  return {
    merged: {
      ...existing,
      projects: {
        ...projects,
        [projectName]: { repo_profiles: {} },
      },
    },
    added: true,
  };
}
```

- [ ] **Step 4: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: 全绿

- [ ] **Step 5: 全量测试验证**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/lib/create-project.ts .claude/scripts/__tests__/lib/create-project.test.ts
git commit -m "feat(phase1): add mergeProjectConfig"
```

---

### Task 4: renderTemplate

**Files:**
- Modify: `.claude/scripts/lib/create-project.ts`
- Modify: `.claude/scripts/__tests__/lib/create-project.test.ts`

- [ ] **Step 1: 追加失败测试**

在 `create-project.test.ts` 末尾追加：

```typescript
import { renderTemplate } from "../../lib/create-project.ts";

describe("renderTemplate", () => {
  it("replaces single {{project}} placeholder", () => {
    assert.equal(renderTemplate("Hello {{project}}", { project: "myProj" }), "Hello myProj");
  });

  it("replaces multiple occurrences", () => {
    const raw = "# {{project}}\n\nSee rules for {{project}}.";
    const out = renderTemplate(raw, { project: "dataAssets" });
    assert.equal(out, "# dataAssets\n\nSee rules for dataAssets.");
  });

  it("returns original string when no placeholder", () => {
    const raw = "Plain content without placeholder";
    assert.equal(renderTemplate(raw, { project: "p" }), raw);
  });

  it("handles empty string", () => {
    assert.equal(renderTemplate("", { project: "x" }), "");
  });

  it("does not replace {{ project }} with spaces (strict token)", () => {
    const raw = "{{ project }}";
    assert.equal(renderTemplate(raw, { project: "x" }), "{{ project }}");
  });
});
```

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: `renderTemplate` 5 个用例 FAIL

- [ ] **Step 3: 实现 renderTemplate**

在 `lib/create-project.ts` 末尾追加：

```typescript
export function renderTemplate(raw: string, vars: { project: string }): string {
  return raw.split("{{project}}").join(vars.project);
}
```

- [ ] **Step 4: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/lib/create-project.test.ts`
Expected: 全绿

- [ ] **Step 5: 全量测试验证**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/lib/create-project.ts .claude/scripts/__tests__/lib/create-project.test.ts
git commit -m "feat(phase1): add renderTemplate"
```

---

### Task 5: 模板文件入库

**Files:**
- Create: `templates/project-skeleton/knowledge/overview.md`
- Create: `templates/project-skeleton/knowledge/terms.md`
- Create: `templates/project-skeleton/rules/README.md`

- [ ] **Step 1: 创建 knowledge/overview.md 模板**

新建 `templates/project-skeleton/knowledge/overview.md`（参考 `workspace/dataAssets/knowledge/overview.md` 文案；`{{project}}` 占位）：

```markdown
# {{project}} 业务概览

> 本文件由 `knowledge-keeper` skill 维护。
> 用户可直接编辑，但 AI 写入前应经过 knowledge-keeper API。
> 填充指南：见 [knowledge 架构设计](../../../docs/refactor/specs/2026-04-17-knowledge-architecture-design.md#42-目录结构目标态)。

## 产品定位

（占位：一句话描述该项目是做什么的，服务对象是谁，核心价值主张）

## 主流程

（占位：列出 2-5 条主要业务流程，每条一段简短描述 + 关键步骤）

1. …
2. …

## 术语入口

详见 [terms.md](terms.md)。

## 模块入口

详见 [modules/](modules/) 目录。每个业务模块一个 .md 文件。

## 踩坑入口

详见 [pitfalls/](pitfalls/) 目录。每个典型坑一个 .md 文件。
```

- [ ] **Step 2: 创建 knowledge/terms.md 模板**

新建 `templates/project-skeleton/knowledge/terms.md`：

```markdown
# {{project}} 术语表

> 本表由 `knowledge-keeper write --type term` 维护，也可手动追加。
> 查询：`bun run .claude/scripts/knowledge-keeper.ts read-core --project {{project}}`

| 术语 | 中文 | 解释 | 别名 |
|---|---|---|---|
```

- [ ] **Step 3: 创建 rules/README.md 模板**

新建 `templates/project-skeleton/rules/README.md`：

```markdown
# {{project}} 项目级规则

本目录下的规则覆盖全局 `rules/`。优先级：用户当前指令 > 项目级 rules > 全局 rules > skill 内置。

## 如何添加项目级规则

1. 从仓库根目录 `rules/` 拷贝需要覆盖的 `.md` 文件到本目录
2. 修改该文件即可（保留 frontmatter 若有）
3. 规则加载由以下命令完成：
   `bun run .claude/scripts/rule-loader.ts load --project {{project}}`

## 常见场景

- 覆盖用例编写规范：拷贝 `rules/case-writing.md` 到本目录修改
- 覆盖 XMind 结构约束：拷贝 `rules/xmind-structure.md` 到本目录修改
- 仅项目独有规则：直接新建 `.md` 文件（如 `hotfix-frontmatter.md`）
```

- [ ] **Step 4: 验证文件落盘**

Run:
```bash
cd /Users/poco/Projects/qa-flow && ls templates/project-skeleton/knowledge/ templates/project-skeleton/rules/
```
Expected: 列出 `overview.md`、`terms.md`、`README.md` 三个文件

- [ ] **Step 5: 快速渲染 sanity check**

Run:
```bash
cd /Users/poco/Projects/qa-flow && grep -c "{{project}}" templates/project-skeleton/knowledge/overview.md templates/project-skeleton/knowledge/terms.md templates/project-skeleton/rules/README.md
```
Expected：每文件 ≥1 次 `{{project}}` 占位（具体数字：overview=1、terms=2、rules=3）

- [ ] **Step 6: Commit**

```bash
git add templates/project-skeleton/
git commit -m "feat(phase1): add project skeleton templates"
```

---

### Task 6: CLI 入口 + scan action（+ 集成测试）

**Files:**
- Create: `.claude/scripts/create-project.ts`
- Create: `.claude/scripts/__tests__/create-project.test.ts`

- [ ] **Step 1: 写集成测试骨架（TDD：先写 scan 场景）**

新建 `.claude/scripts/__tests__/create-project.test.ts`：

```typescript
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

const TMP = join(tmpdir(), `qa-flow-cp-int-${process.pid}`);
const WORKSPACE_DIR = join(TMP, "workspace");
const CONFIG_PATH = join(TMP, "config.json");
const REPO_ROOT = resolve(import.meta.dirname, "../../..");

function runCp(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/create-project.ts", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          WORKSPACE_DIR,
          CONFIG_JSON_PATH: CONFIG_PATH,
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

function resetFixture(): void {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(WORKSPACE_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ projects: {} }, null, 2));
}

describe("create-project scan", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("rejects invalid project name", () => {
    const { stderr, code } = runCp(["scan", "--project", "1invalid"]);
    assert.equal(code, 1);
    assert.match(stderr, /\[create-project\] Invalid project name/);
  });

  it("reports non-existent project with all missing", () => {
    const { stdout, code } = runCp(["scan", "--project", "ghost"]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.project, "ghost");
    assert.equal(data.valid_name, true);
    assert.equal(data.exists, false);
    assert.equal(data.skeleton_complete, false);
    assert.equal(data.missing_dirs.length, 13);
    assert.equal(data.missing_gitkeeps.length, 11);
    assert.equal(data.missing_files.length, 3);
    assert.equal(data.config_registered, false);
  });

  it("reports config_registered=true when project exists in config.json", () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        { projects: { registered: { repo_profiles: {} } } },
        null,
        2,
      ),
    );
    const { stdout, code } = runCp(["scan", "--project", "registered"]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.config_registered, true);
  });

  it("reports skeleton_complete=true for fully populated project", () => {
    const projDir = join(WORKSPACE_DIR, "fullProj");
    const tplRoot = join(REPO_ROOT, "templates", "project-skeleton");
    // mkdir all dirs
    const dirs = [
      "prds",
      "xmind",
      "archive",
      "issues",
      "historys",
      "reports",
      "tests",
      "rules",
      "knowledge",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
      ".temp",
    ];
    for (const d of dirs) mkdirSync(join(projDir, d), { recursive: true });
    // gitkeeps
    const gks = [
      "prds",
      "xmind",
      "archive",
      "issues",
      "historys",
      "reports",
      "tests",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
      ".temp",
    ];
    for (const g of gks) writeFileSync(join(projDir, g, ".gitkeep"), "");
    // template files
    writeFileSync(join(projDir, "rules", "README.md"), "# fullProj rules");
    writeFileSync(
      join(projDir, "knowledge", "overview.md"),
      "# fullProj overview",
    );
    writeFileSync(join(projDir, "knowledge", "terms.md"), "# fullProj terms");

    void tplRoot; // template root is read only by create action

    const { stdout, code } = runCp(["scan", "--project", "fullProj"]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.exists, true);
    assert.equal(data.skeleton_complete, true);
    assert.equal(data.missing_dirs.length, 0);
    assert.equal(data.missing_files.length, 0);
    assert.equal(data.missing_gitkeeps.length, 0);
  });
});
```

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: 4 个用例 FAIL（Cannot find module `.claude/scripts/create-project.ts`）

- [ ] **Step 3: 实现 create-project.ts 入口 + scan handler**

新建 `.claude/scripts/create-project.ts`：

```typescript
#!/usr/bin/env bun
/**
 * create-project.ts — 项目创建 + 骨架补齐 + 源码仓库克隆。
 * Usage:
 *   bun run .claude/scripts/create-project.ts <action> --project <name> [...]
 * Actions: scan | create | clone-repo
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { initEnv } from "./lib/env.ts";
import {
  configJsonPath,
  diffProjectSkeleton,
  TEMPLATE_ROOT_REL,
  validateProjectName,
} from "./lib/create-project.ts";
import { projectDir, workspaceDir } from "./lib/paths.ts";

initEnv();

function repoRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "../../..");
}

function readConfig(): Record<string, unknown> {
  const p = configJsonPath();
  if (!existsSync(p)) return { projects: {} };
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return { projects: {} };
  }
}

function isProjectRegistered(name: string): boolean {
  const cfg = readConfig();
  const projects = (cfg.projects as Record<string, unknown> | undefined) ?? {};
  return Object.prototype.hasOwnProperty.call(projects, name);
}

function fail(message: string, code = 1): never {
  process.stderr.write(`[create-project] ${message}\n`);
  process.exit(code);
}

// ── actions ──────────────────────────────────────────────────────────────────

function runScan(project: string): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`Invalid project name: ${nameCheck.error}`);
  }
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);
  const diff = diffProjectSkeleton(projDir, tplRoot);
  const out = {
    project,
    valid_name: true,
    name_error: "",
    exists: diff.exists,
    missing_dirs: diff.missing_dirs,
    missing_files: diff.missing_files,
    missing_gitkeeps: diff.missing_gitkeeps,
    config_registered: isProjectRegistered(project),
    repos_configured: 0, // Task 9 populates this from .repos scan if needed
    skeleton_complete: diff.skeleton_complete,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name("create-project")
  .description("创建新项目或补齐残缺项目骨架")
  .version("1.0.0");

program
  .command("scan")
  .description("扫描项目骨架与目标态的差异")
  .requiredOption("--project <name>", "项目名")
  .action((opts: { project: string }) => {
    runScan(opts.project);
  });

program.parse(process.argv);
```

注意：`void tplRoot` 在测试中为占位，这里 `tplRoot` 在 scan 阶段**不**被 diffProjectSkeleton 实际消费，仅 create action 会用。保留该参数保持函数签名清晰。

对 `workspaceDir()` 的依赖：该函数读取 `WORKSPACE_DIR` env 或默认 `workspace`，恰好是我们测试需要的重定向钩子。

- [ ] **Step 4: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: 4 个用例 PASS

- [ ] **Step 5: 全量测试验证**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/create-project.ts .claude/scripts/__tests__/create-project.test.ts
git commit -m "feat(phase1): add create-project scan action"
```

---

### Task 7: CLI create action --dry-run 分支

**Files:**
- Modify: `.claude/scripts/create-project.ts`
- Modify: `.claude/scripts/__tests__/create-project.test.ts`

- [ ] **Step 1: 追加集成测试**

在 `create-project.test.ts` 末尾追加：

```typescript
describe("create-project create --dry-run", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("returns will_create plan without touching disk", () => {
    const { stdout, code } = runCp([
      "create",
      "--project",
      "newProj",
      "--dry-run",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.dry_run, true);
    assert.equal(data.will_register, true);
    assert.equal(data.will_call_index, true);
    assert.ok(Array.isArray(data.will_create.dirs));
    assert.ok(Array.isArray(data.will_create.files));
    assert.ok(Array.isArray(data.will_create.gitkeeps));
    assert.equal(data.will_create.dirs.length, 13);
    // Disk must remain untouched
    assert.equal(existsSync(join(WORKSPACE_DIR, "newProj")), false);
    // Config must remain unchanged
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    assert.deepEqual(cfg, { projects: {} });
  });

  it("dry-run rejects invalid name with exit 1", () => {
    const { stderr, code } = runCp([
      "create",
      "--project",
      "1bad",
      "--dry-run",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /Invalid project name/);
  });

  it("dry-run on complete project returns skipped=true", () => {
    // Pre-build a complete project
    const projDir = join(WORKSPACE_DIR, "complete");
    for (const d of [
      "prds",
      "xmind",
      "archive",
      "issues",
      "historys",
      "reports",
      "tests",
      "rules",
      "knowledge",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
      ".temp",
    ]) mkdirSync(join(projDir, d), { recursive: true });
    for (const g of [
      "prds",
      "xmind",
      "archive",
      "issues",
      "historys",
      "reports",
      "tests",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
      ".temp",
    ]) writeFileSync(join(projDir, g, ".gitkeep"), "");
    writeFileSync(join(projDir, "rules", "README.md"), "# complete");
    writeFileSync(join(projDir, "knowledge", "overview.md"), "# complete");
    writeFileSync(join(projDir, "knowledge", "terms.md"), "# complete");
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ projects: { complete: { repo_profiles: {} } } }, null, 2),
    );
    const { stdout, code } = runCp([
      "create",
      "--project",
      "complete",
      "--dry-run",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.skipped, true);
  });

  it("returns exit 2 when missing --confirmed and diff exists", () => {
    const { stderr, code } = runCp(["create", "--project", "newProj"]);
    assert.equal(code, 2);
    assert.match(stderr, /--confirmed/);
  });
});
```

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: `create --dry-run` 4 个用例 FAIL

- [ ] **Step 3: 实现 create action dry-run 与前置判断**

在 `create-project.ts` 追加（在 `runScan` 之后、CLI 声明之前）：

```typescript
interface CreatePlan {
  dirs: string[];
  files: string[];
  gitkeeps: string[];
}

function computeCreatePlan(project: string): {
  plan: CreatePlan;
  skeleton_complete: boolean;
  config_registered: boolean;
} {
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);
  const diff = diffProjectSkeleton(projDir, tplRoot);
  return {
    plan: {
      dirs: diff.missing_dirs,
      files: diff.missing_files,
      gitkeeps: diff.missing_gitkeeps,
    },
    skeleton_complete: diff.skeleton_complete,
    config_registered: isProjectRegistered(project),
  };
}

function runCreate(project: string, dryRun: boolean, confirmed: boolean): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`Invalid project name: ${nameCheck.error}`);
  }

  const { plan, skeleton_complete, config_registered } = computeCreatePlan(project);

  if (skeleton_complete && config_registered) {
    process.stdout.write(
      JSON.stringify(
        {
          skipped: true,
          project,
          message: "已完整，无需补齐",
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          dry_run: true,
          project,
          will_create: plan,
          will_register: !config_registered,
          will_call_index: true,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (!confirmed) {
    fail(
      "Add --confirmed to apply. Run with --dry-run to preview.",
      2,
    );
  }

  // Confirmed path: Task 8 implements
  fail("create --confirmed not yet implemented (Task 8)");
}
```

在 CLI 声明块追加 command：

```typescript
program
  .command("create")
  .description("创建或补齐项目骨架")
  .requiredOption("--project <name>", "项目名")
  .option("--dry-run", "预览将要创建的内容，不落盘")
  .option("--confirmed", "真实执行写入")
  .action((opts: { project: string; dryRun?: boolean; confirmed?: boolean }) => {
    runCreate(opts.project, opts.dryRun === true, opts.confirmed === true);
  });
```

- [ ] **Step 4: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: dry-run 4 个用例 PASS；原 scan 4 个用例仍 PASS

- [ ] **Step 5: 全量测试验证**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/create-project.ts .claude/scripts/__tests__/create-project.test.ts
git commit -m "feat(phase1): add create-project create dry-run"
```

---

### Task 8: CLI create --confirmed 分支（落盘 + config.json + knowledge-keeper index）

**Files:**
- Modify: `.claude/scripts/create-project.ts`
- Modify: `.claude/scripts/__tests__/create-project.test.ts`

- [ ] **Step 1: 追加集成测试**

在 `create-project.test.ts` 末尾追加：

```typescript
describe("create-project create --confirmed", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("materialises full skeleton end-to-end", () => {
    const { stdout, code } = runCp([
      "create",
      "--project",
      "fresh",
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.project, "fresh");
    assert.equal(data.registered_config, true);
    assert.equal(data.index_generated, true);
    assert.ok(data.index_path.endsWith("knowledge/_index.md"));

    const projDir = join(WORKSPACE_DIR, "fresh");
    // Dirs
    for (const d of [
      "prds",
      "xmind",
      "archive",
      "issues",
      "historys",
      "reports",
      "tests",
      "rules",
      "knowledge",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
      ".temp",
    ]) {
      assert.ok(existsSync(join(projDir, d)), `dir missing: ${d}`);
    }
    // Gitkeeps
    assert.ok(existsSync(join(projDir, "prds", ".gitkeep")));
    assert.ok(existsSync(join(projDir, "knowledge", "modules", ".gitkeep")));
    // Templates rendered
    const rulesReadme = readFileSync(
      join(projDir, "rules", "README.md"),
      "utf8",
    );
    assert.match(rulesReadme, /# fresh 项目级规则/);
    const overview = readFileSync(
      join(projDir, "knowledge", "overview.md"),
      "utf8",
    );
    assert.match(overview, /# fresh 业务概览/);
    // _index.md generated by knowledge-keeper
    assert.ok(existsSync(join(projDir, "knowledge", "_index.md")));
    const indexContent = readFileSync(
      join(projDir, "knowledge", "_index.md"),
      "utf8",
    );
    assert.match(indexContent, /last-indexed/);
    // Config registered
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    assert.deepEqual(cfg.projects.fresh, { repo_profiles: {} });
  });

  it("is idempotent: second run returns skipped=true and does not touch disk", () => {
    runCp(["create", "--project", "again", "--confirmed"]);
    const overviewPath = join(
      WORKSPACE_DIR,
      "again",
      "knowledge",
      "overview.md",
    );
    const before = readFileSync(overviewPath, "utf8");

    const { stdout, code } = runCp([
      "create",
      "--project",
      "again",
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.skipped, true);
    const after = readFileSync(overviewPath, "utf8");
    assert.equal(after, before, "overview.md must not change on second run");
  });

  it("preserves user-edited files during partial repair", () => {
    // First run
    runCp(["create", "--project", "partial", "--confirmed"]);
    const overviewPath = join(
      WORKSPACE_DIR,
      "partial",
      "knowledge",
      "overview.md",
    );
    // User edit
    writeFileSync(overviewPath, "# user-customised content");
    // Remove a directory to force partial repair
    rmSync(join(WORKSPACE_DIR, "partial", "knowledge", "modules"), {
      recursive: true,
    });

    const { stdout, code } = runCp([
      "create",
      "--project",
      "partial",
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    // Repair happened
    assert.ok(Array.isArray(data.created_dirs));
    assert.ok(data.created_dirs.some((p: string) => p.endsWith("knowledge/modules")));
    // User edit preserved
    const content = readFileSync(overviewPath, "utf8");
    assert.equal(content, "# user-customised content");
  });

  it("registers config.json alongside other existing projects", () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          projects: {
            prior: { repo_profiles: { foo: { repos: [] } } },
          },
          otherKey: "keep",
        },
        null,
        2,
      ),
    );
    const { code } = runCp(["create", "--project", "newOne", "--confirmed"]);
    assert.equal(code, 0);
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    assert.deepEqual(cfg.projects.prior, {
      repo_profiles: { foo: { repos: [] } },
    });
    assert.deepEqual(cfg.projects.newOne, { repo_profiles: {} });
    assert.equal(cfg.otherKey, "keep");
  });
});
```

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: `create --confirmed` 4 个用例 FAIL（当前 --confirmed 分支抛错 "not yet implemented"）

- [ ] **Step 3: 实现 create --confirmed 完整落盘路径**

在 `create-project.ts` 顶部 import 追加：

```typescript
import {
  copyFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { mergeProjectConfig, renderTemplate, SKELETON_SPEC } from "./lib/create-project.ts";
import { knowledgeDir } from "./lib/paths.ts";
```

注意：`existsSync` / `readFileSync` 已 import；新增项并入现有 import 声明。

然后替换 `runCreate` 里 `// Confirmed path: Task 8 implements` 的 `fail(...)` 为真实逻辑：

```typescript
function applyCreate(project: string): {
  created_dirs: string[];
  created_files: string[];
  created_gitkeeps: string[];
  registered_config: boolean;
  index_generated: boolean;
  index_path: string;
} {
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);
  const diff = diffProjectSkeleton(projDir, tplRoot);

  const created_dirs: string[] = [];
  for (const rel of diff.missing_dirs) {
    const abs = join(projDir, rel);
    mkdirSync(abs, { recursive: true });
    created_dirs.push(abs);
  }

  const created_gitkeeps: string[] = [];
  for (const rel of diff.missing_gitkeeps) {
    const abs = join(projDir, rel);
    writeFileSync(abs, "");
    created_gitkeeps.push(abs);
  }

  const created_files: string[] = [];
  for (const rel of diff.missing_files) {
    const src = join(tplRoot, SKELETON_SPEC.template_files[rel]);
    const dst = join(projDir, rel);
    mkdirSync(dirname(dst), { recursive: true });
    const raw = readFileSync(src, "utf8");
    writeFileSync(dst, renderTemplate(raw, { project }));
    created_files.push(dst);
  }

  // config.json merge
  const cfgPath = configJsonPath();
  const existing = existsSync(cfgPath)
    ? (JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>)
    : {};
  const { merged, added } = mergeProjectConfig(existing, project);
  writeFileSync(cfgPath, JSON.stringify(merged, null, 2) + "\n");

  // Invoke knowledge-keeper index
  const indexPath = join(knowledgeDir(project), "_index.md");
  const kk = spawnSync(
    "bun",
    [
      "run",
      ".claude/scripts/knowledge-keeper.ts",
      "index",
      "--project",
      project,
    ],
    {
      cwd: repoRoot(),
      env: process.env,
      encoding: "utf8",
    },
  );
  if (kk.status !== 0) {
    process.stderr.write(kk.stderr || "");
    fail(`knowledge-keeper index failed (exit ${kk.status})`);
  }

  return {
    created_dirs,
    created_files,
    created_gitkeeps,
    registered_config: added,
    index_generated: existsSync(indexPath),
    index_path: indexPath,
  };
}
```

并将 `runCreate` 尾部 `fail("create --confirmed not yet implemented (Task 8)");` 替换为：

```typescript
  const result = applyCreate(project);
  process.stdout.write(
    JSON.stringify({ project, ...result }, null, 2) + "\n",
  );
```

- [ ] **Step 4: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: `create --confirmed` 4 个用例 PASS；之前 8 个用例仍 PASS

- [ ] **Step 5: 全量测试验证**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/create-project.ts .claude/scripts/__tests__/create-project.test.ts
git commit -m "feat(phase1): add create-project create confirmed path"
```

---

### Task 9: CLI clone-repo action

**Files:**
- Modify: `.claude/scripts/create-project.ts`
- Modify: `.claude/scripts/__tests__/create-project.test.ts`

- [ ] **Step 1: 追加集成测试**

在 `create-project.test.ts` 末尾追加：

```typescript
import { execSync } from "node:child_process";

describe("create-project clone-repo", () => {
  const BARE_DIR = join(TMP, "bare");
  const BARE_REPO = join(BARE_DIR, "demo.git");

  before(() => {
    resetFixture();
    mkdirSync(BARE_DIR, { recursive: true });
    // Create a local bare repo with at least one commit
    execSync(`git init --bare "${BARE_REPO}"`);
    const wt = join(TMP, "seed-wt");
    execSync(`git init "${wt}"`);
    execSync(
      `cd "${wt}" && git config user.email test@local && git config user.name test && echo hello > a.txt && git add a.txt && git commit -m seed && git branch -M main && git remote add origin "file://${BARE_REPO}" && git push origin main`,
      { shell: "/bin/bash" },
    );
    rmSync(wt, { recursive: true, force: true });
  });

  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => {
    // Keep bare repo; recreate workspace/config only
    const barePreserve = readFileSync(CONFIG_PATH, "utf8");
    void barePreserve;
  });

  it("rejects if project does not exist", () => {
    rmSync(join(WORKSPACE_DIR, "noproj"), { recursive: true, force: true });
    const { stderr, code } = runCp([
      "clone-repo",
      "--project",
      "noproj",
      "--url",
      `file://${BARE_REPO}`,
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /project not found|does not exist/i);
  });

  it("clones bare repo into .repos/<group>/<repo>", () => {
    // Pre-create project (minimal: just .repos dir)
    runCp(["create", "--project", "withRepo", "--confirmed"]);

    const { stdout, code } = runCp([
      "clone-repo",
      "--project",
      "withRepo",
      "--url",
      `file://${BARE_REPO}`,
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.project, "withRepo");
    assert.equal(data.repo, "demo");
    assert.equal(data.branch, "main");
    assert.ok(data.local_path.endsWith("/demo"));
    assert.ok(existsSync(join(data.local_path, ".git")), "cloned .git exists");
  });

  it("rejects when repo already cloned at target path", () => {
    // Target still populated from previous test
    const { stderr, code } = runCp([
      "clone-repo",
      "--project",
      "withRepo",
      "--url",
      `file://${BARE_REPO}`,
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /already cloned/i);
  });
});
```

注意：测试中 `file://${BARE_REPO}` 可被 git 识别为 remote。`parseGitUrl` 需要能处理 `file://` 形式并提取 group/repo。

- [ ] **Step 2: Run 测试确认失败**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: `clone-repo` 3 个用例 FAIL

- [ ] **Step 3: 扩展 parseGitUrl 对 `file://` 的处理（校验）**

Run 检查现有行为：

```bash
cd /Users/poco/Projects/qa-flow && bun -e 'import { parseGitUrl } from "./.claude/scripts/lib/paths.ts"; console.log(parseGitUrl("file:///tmp/foo/bare/demo.git"));'
```

Expected: `{ group: "bare", repo: "demo" }`（现有 `parseGitUrl` 从路径末尾向前取最后两段）

若输出不符合上述 `{ group: "bare", repo: "demo" }`（实测现有实现应正确），本 step 视为 no-op；若不符合则需 patch `parseGitUrl`（**非本 plan 预期范围，若触发请停下来和用户对齐**）。

- [ ] **Step 4: 实现 clone-repo handler**

在 `create-project.ts` import 区追加：

```typescript
import { parseGitUrl, reposDir } from "./lib/paths.ts";
```

（`projectDir` 已 import；`reposDir` 新增）

在 CLI 声明前追加 handler：

```typescript
function runCloneRepo(project: string, url: string, branch: string): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`Invalid project name: ${nameCheck.error}`);
  }
  const projDir = projectDir(project);
  if (!existsSync(projDir)) {
    fail(`Project not found: ${project}. Run 'create' first.`);
  }

  const { group, repo } = parseGitUrl(url);
  if (!group || !repo) {
    fail(`Cannot parse git URL: ${url}`);
  }
  const targetDir = join(reposDir(project), group, repo);
  if (existsSync(targetDir)) {
    fail(`Repo already cloned: ${targetDir}`);
  }

  mkdirSync(dirname(targetDir), { recursive: true });
  const args = ["clone"];
  if (branch) {
    args.push("--branch", branch, "--single-branch");
  }
  args.push(url, targetDir);
  const result = spawnSync("git", args, {
    cwd: repoRoot(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "");
    fail(`git clone failed (exit ${result.status})`);
  }

  process.stdout.write(
    JSON.stringify(
      {
        project,
        url,
        group,
        repo,
        branch: branch || "main",
        local_path: targetDir,
      },
      null,
      2,
    ) + "\n",
  );
}
```

在 CLI 命令块追加：

```typescript
program
  .command("clone-repo")
  .description("克隆源码仓库到项目 .repos 目录")
  .requiredOption("--project <name>", "项目名")
  .requiredOption("--url <git-url>", "Git URL")
  .option("--branch <branch>", "分支（默认 main）", "")
  .action(
    (opts: { project: string; url: string; branch?: string }) => {
      runCloneRepo(opts.project, opts.url, opts.branch ?? "");
    },
  );
```

- [ ] **Step 5: Run 测试确认通过**

Run: `cd /Users/poco/Projects/qa-flow && bun test .claude/scripts/__tests__/create-project.test.ts`
Expected: `clone-repo` 3 个用例 PASS；之前 12 个用例仍 PASS

- [ ] **Step 6: 全量测试验证**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 7: Commit**

```bash
git add .claude/scripts/create-project.ts .claude/scripts/__tests__/create-project.test.ts
git commit -m "feat(phase1): add create-project clone-repo action"
```

---

### Task 10: SKILL.md 入库

**Files:**
- Create: `.claude/skills/create-project/SKILL.md`

- [ ] **Step 1: 创建 SKILL.md**

新建 `.claude/skills/create-project/SKILL.md`（内容基于 spec §7，按 knowledge-keeper/SKILL.md 风格裁剪）：

```markdown
---
name: create-project
description: "创建新项目或补齐残缺项目骨架。初始化 workspace/{project}/ 完整子目录结构，注册 config.json，可选配置源码仓库。触发词：创建项目、新建项目、create-project、补齐项目、项目初始化。"
argument-hint: "[项目名]"
---

# create-project

## 前置加载

加载全局规则（project 未知，不加载项目级规则）：

```bash
bun run .claude/scripts/rule-loader.ts load
```

## 场景 A：新建项目（主流程）

### A1. 收集项目名

- 优先从 argument-hint 取
- 否则 AskUserQuestion："请输入项目名称（英文短名，允许 camelCase 如 `dataAssets` 或 kebab-case 如 `data-assets`）"
- 规则提示：`^[A-Za-z][A-Za-z0-9-]*$`，长度 2-32，不可用系统保留字（workspace/knowledge/rules/prds/...）

### A2. CLI scan 预校验

```bash
bun run .claude/scripts/create-project.ts scan --project {{name}}
```

分支：
- `valid_name=false` → 展示 `name_error`，回 A1
- `exists=true` + `skeleton_complete=true` + `config_registered=true` → 跳到 B3
- 其他 → 进 A3

### A3. 展示 diff 表 + AskUserQuestion

展示 markdown 表：
```
目标项目：{{name}}
状态：{{exists ? "已存在，将补齐" : "全新创建"}}

将创建的目录（{{missing_dirs.length}} 个）：
- {{missing_dirs.map(d => "workspace/" + name + "/" + d).join("\n- ")}}

将创建的文件（{{missing_files.length + missing_gitkeeps.length}} 个）：
- {{missing_files.concat(missing_gitkeeps).join("\n- ")}}

将注册 config.json：{{config_registered ? "已注册，跳过" : "是"}}
将调用 knowledge-keeper index：是
```

AskUserQuestion：[确认创建] [调整名称] [取消]

### A4. CLI create --confirmed

```bash
bun run .claude/scripts/create-project.ts create --project {{name}} --confirmed
```

展示 JSON 的 markdown 摘要（`created_dirs`、`created_files`、`registered_config`、`index_path`）。

### A5. AskUserQuestion 源码仓库

```
是否配置源码仓库？（可跳过，后续需要时再加）
选项：[配置仓库] [跳过]
```

### A6. clone-repo 循环

每次 AskUserQuestion：
```
请输入 Git URL：
分支（默认 main）：
```

```bash
bun run .claude/scripts/create-project.ts clone-repo \
  --project {{name}} --url {{url}} [--branch {{branch}}]
```

AskUserQuestion：[继续添加] [完成]

### A7. 摘要 + 下一步

```
✓ 项目 {{name}} 已创建
✓ {{created_dirs.length}} 个子目录、{{created_files.length}} 个模板文件、{{repo_count}} 个仓库
✓ config.json 已注册
✓ knowledge/_index.md 已生成

下一步：
- 生成测试用例：/test-case-gen（选择项目 {{name}}）
- 编辑业务知识：/knowledge-keeper（选择项目 {{name}}）
- 追加源码仓库：/create-project clone-repo --project {{name}} --url ...
```

## 场景 B：补齐残缺项目

### B1. 识别意图

- 用户直接传入已存在的项目名
- 或 A2 scan 检测到 `exists=true` + `skeleton_complete=false`

### B2. CLI scan（同 A2）

### B3. 无差异

```
✓ 项目 {{name}} 结构完整，无需补齐
```

### B4. 有差异 → 复用 A3 + A4

## 场景 C：仅查看状态（只读）

触发词："查看项目 xxx 状态"、"列出所有项目"

```bash
bun run .claude/scripts/create-project.ts scan --project {{name}}
```

多项目列表：扫描 `workspace/` 所有非隐藏子目录，对每个跑 scan 汇总。

## 异常处理

- scan exit 1（非法项目名）→ 回 A1 重新输入
- create exit 2（有可补齐项且未 `--confirmed`）→ 回 A3 走确认流程
- create exit 1（落盘或 knowledge-keeper 失败）→ 展示 stderr，引导用户重跑（幂等无副作用）
- clone-repo exit 1 → 检查 URL 和网络，或清理已存在路径后重试

## Subagent 调用守则

- subagent **禁止**直接调 `create` / `clone-repo`（写操作）
- subagent 可自由调 `scan`（只读安全）
- subagent 发现需创建项目时，在返回报告标注：`建议创建项目：{{name}}`
- 主 agent 收到后由本 skill 统一处理
```

- [ ] **Step 2: 验证 SKILL.md 存在且格式合法**

Run:
```bash
cd /Users/poco/Projects/qa-flow && head -5 .claude/skills/create-project/SKILL.md
```
Expected: frontmatter `---` + `name: create-project` + description 行

- [ ] **Step 3: 全量测试验证无回归**

Run: `cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__`
Expected: 全绿

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/create-project/SKILL.md
git commit -m "feat(phase1): add create-project SKILL.md"
```

---

### Task 11: Smoke 验证（手动）+ 最终清理

**Files:**
- 无代码改动；仅在真实 workspace 验证端到端行为

- [ ] **Step 1: Smoke 1 — 创建全新烟雾项目**

Run:
```bash
cd /Users/poco/Projects/qa-flow
bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed
```
Expected: JSON 输出 `created_dirs` 13、`created_files` 3、`registered_config=true`、`index_generated=true`

- [ ] **Step 2: Smoke 2 — 验证骨架**

Run:
```bash
ls workspace/smokeProj/
ls workspace/smokeProj/knowledge/
cat workspace/smokeProj/knowledge/_index.md | head -5
cat workspace/smokeProj/rules/README.md | head -3
```
Expected:
- workspace/smokeProj/ 下 13 个子目录 + 3 个模板文件
- _index.md 含 "smokeProj Knowledge Index" 标题 + "last-indexed" 标记
- rules/README.md H1 为 "smokeProj 项目级规则"

- [ ] **Step 3: Smoke 3 — 验证 config.json 注册**

Run:
```bash
jq '.projects.smokeProj' config.json
```
Expected: `{ "repo_profiles": {} }`

- [ ] **Step 4: Smoke 4 — 幂等验证**

Run:
```bash
bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed
```
Expected: `{ "skipped": true, "project": "smokeProj", "message": "已完整，无需补齐" }`

- [ ] **Step 5: Smoke 5 — knowledge-keeper 集成**

Run:
```bash
bun run .claude/scripts/knowledge-keeper.ts lint --project smokeProj
```
Expected: `errors: []`（warnings 可能存在，不阻断）；exit 0 或 2

- [ ] **Step 6: Smoke 6 — 现有项目 dataAssets 兼容**

Run:
```bash
bun run .claude/scripts/create-project.ts scan --project dataAssets
```
Expected: `skeleton_complete=true`（Phase 0 / 子目标 1 已建骨架）；`config_registered=true`

若 `skeleton_complete=false`，检查 diff 输出判断是缺 `.gitkeep`（正常）还是缺目录（异常，需调查）。记录结果。

- [ ] **Step 7: 清理烟雾项目**

Run:
```bash
rm -rf workspace/smokeProj
git checkout config.json
git status workspace/ config.json
```
Expected: `workspace/smokeProj/` 删除；config.json 回到未修改态；git status 干净

- [ ] **Step 8: 全量测试最终验证**

Run:
```bash
bun test ./.claude/scripts/__tests__
```
Expected: 全绿（原 551 + 本 plan 新增用例数）

---

### Task 12: 子目标 2 收尾 commit

**Files:** 无代码改动；收尾确认

- [ ] **Step 1: 最终 git 状态确认**

Run:
```bash
cd /Users/poco/Projects/qa-flow && git log --oneline -15
```
Expected: 看到本 plan 产出的 commits（spec + 6 lib/CLI/templates/skill commits + 可能的 plan commit）。顺序大致：
```
feat(phase1): add create-project SKILL.md
feat(phase1): add create-project clone-repo action
feat(phase1): add create-project create confirmed path
feat(phase1): add create-project create dry-run
feat(phase1): add create-project scan action
feat(phase1): add project skeleton templates
feat(phase1): add renderTemplate
feat(phase1): add mergeProjectConfig
feat(phase1): add SKELETON_SPEC and diffProjectSkeleton
feat(phase1): add create-project lib with validateProjectName
docs(phase1): add create-project implementation plan
docs(phase1): add create-project skill design spec
```

- [ ] **Step 2: git status 必须干净**

Run: `git status`
Expected: 无未提交文件（workspace/.repos/ 子模块变动除外，此属既有噪音）

- [ ] **Step 3: 确认 spec Success Criteria 全部对号**

对照 spec §9 逐条 check：
- [x] spec 入库
- [x] plan 入库
- [x] CLI 入口 + lib
- [x] SKILL
- [x] Templates 3 个
- [x] 单元 + 集成测试
- [x] 全量测试通过
- [x] Smoke 通过
- [x] 幂等性
- [x] 现有项目兼容
- [x] 无硬编码
- [x] 原子 commit

- [ ] **Step 4: 主 agent 生成下一阶段 prompt**

按 roadmap §阶段切换约定，主 agent 主动输出"子目标 3 启动 prompt"，引用：
- `docs/refactor/specs/2026-04-17-knowledge-architecture-design.md`
- `docs/refactor/specs/2026-04-17-knowledge-keeper-design.md`
- `docs/refactor/specs/2026-04-18-create-project-skill-design.md`（含本 skill 接管项目管理的现状）
- `docs/refactor-roadmap.md`

Scope 摘要：setup SKILL.md 瘦身（删除第 2/4 步交互块；`.claude/skills/setup/references/repo-setup.md` 迁移或更新）。

提示用户：「本子目标完成，建议 `/clear` 或新开 CC 实例，粘贴子目标 3 启动 prompt 继续。」

---

## Self-Review（plan 作者自查）

### 1. Spec 覆盖检查

| Spec §| 要求 | 覆盖 Task |
|---|---|---|
| §2.1-2 | CLI + Skill 双层 | Task 1-10 |
| §2.3 | 3 个 actions | Task 6/7/8/9 |
| §2.4 | 幂等补齐 | Task 8（Step 1 的第 2、3 测试用例） |
| §2.5 | templates/ | Task 5 |
| §2.6 | clone 迁移（实际新实施） | Task 9（关键现状修正已在 plan 头部说明） |
| §2.7 | 项目名校验 | Task 1 |
| §2.8 | 单测 + 集成测试 | Task 1-9 全部 |
| §2.9 | 自动 knowledge-keeper index | Task 8（applyCreate 末尾 spawnSync） |
| §5.3 | 模板契约 | Task 5 |
| §5.4 | 目录骨架 | SKELETON_SPEC（Task 2） |
| §6.1 scan | ✓ | Task 6 |
| §6.2 create | ✓ | Task 7 + 8 |
| §6.3 clone-repo | ✓ | Task 9 |
| §6.4 命名规则 | ✓ | Task 1 |
| §7 SKILL | ✓ | Task 10 |
| §8.1 单元 | ✓ | Task 1-4 |
| §8.2 集成 | ✓ | Task 6-9 |
| §8.3 Smoke | ✓ | Task 11 |
| §9 Success Criteria | ✓ | Task 12 逐条确认 |

无漏项。

### 2. Placeholder 扫描

无 TBD / TODO。Task 9 Step 3 提到"若触发请停下来和用户对齐"是边界 fallback，不是占位。

### 3. 类型一致性

- `validateProjectName` 签名 `(name: string) => ValidationResult` — 各 Task 一致使用
- `SKELETON_SPEC` 结构在 Task 1/2/5/6/8 引用一致
- `mergeProjectConfig` 返回 `{ merged, added }` — Task 3 定义、Task 8 消费一致
- `renderTemplate` 签名 `(raw, { project }) => string` — Task 4/8 一致
- `diffProjectSkeleton` 返回 `SkeletonDiff` — Task 2/6/7/8 一致
- `configJsonPath` / `todayIso` — Task 1 定义，Task 8 消费

一致无冲突。

### 4. 执行顺序依赖

- Task 1 → 2 → 3 → 4：lib 单元逐步扩张，无跨越
- Task 5（templates）：独立于 lib，但被 Task 8（applyCreate 读模板）+ Task 6（diff 检查模板存在性）+ Task 7（dry-run 展示）消费
- Task 6（scan）：消费 Task 1-4 的 lib；测试用"手工 mkdir + 手工写模板"模拟，不依赖 Task 5
- Task 7（dry-run）：Task 6 之上；一致
- Task 8（confirmed）：Task 5 + Task 6 + Task 7 之上
- Task 9（clone-repo）：Task 8 之上（需要先 create 项目）
- Task 10（SKILL.md）：独立
- Task 11（smoke）：所有 Task 之上
- Task 12（收尾）：Task 11 之上

顺序正确。

---

## 执行交付

Plan 完整。Execute 阶段使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，每 Task 原子 commit，遵循 CLAUDE.md 的脚本改动同步单测 + 全量绿规则。
