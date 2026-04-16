# Multi-Environment Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 UI 自动化框架原生支持多环境并发，使多个 Claude Code 实例可以同时针对不同环境运行，且同一套脚本可以跨环境复用回归。

**Architecture:** 引入 `ACTIVE_ENV` 作为环境维度标识，渗透到 session 文件路径、进度追踪、报告输出三层。`playwright.config.ts` 作为桥接层，根据 `ACTIVE_ENV` 解析对应环境变量并注入运行时。所有改动向后兼容——不传 `ACTIVE_ENV` 时降级为当前单环境行为。

**Tech Stack:** TypeScript, Playwright, Bun, Commander.js

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `.env` | 环境变量重命名：`QA_*` → 语义化命名 |
| Modify | `playwright.config.ts` | 桥接层：读取新变量名，设置 session 路径、报告路径 |
| Modify | `.claude/skills/ui-autotest/scripts/session-login.ts` | 默认输出路径按环境区分 |
| Modify | `.claude/scripts/ui-autotest-progress.ts` | 进度文件加入 env 维度 |
| Modify | `.claude/references/playwright-patterns.md` | 脚本模板去掉硬编码 storageState |
| Modify | `workspace/dataAssets/tests/helpers/test-setup.ts` | 兼容新 session 路径环境变量 |
| Modify | `.claude/scripts/__tests__/ui-autotest-progress.test.ts` | 补充 --env 参数测试 |
| Modify | `.claude/scripts/__tests__/ui-autotest/merge-specs.test.ts` | 更新 fixture 去掉硬编码 storageState |

---

### Task 1: 重命名 .env 环境变量

**Files:**
- Modify: `.env`

重命名规则：

| Old | New | 说明 |
|-----|-----|------|
| `QA_ACTIVE_ENV` | `ACTIVE_ENV` | 当前活跃环境 |
| `QA_BASE_URL_{ENV}` | `{ENV}_BASE_URL` | 环境名作前缀，自然语义 |
| `QA_COOKIE_{ENV}` | `{ENV}_COOKIE` | |
| `QA_USERNAME_{ENV}` | `{ENV}_USERNAME` | |
| `QA_PASSWORD_{ENV}` | `{ENV}_PASSWORD` | |
| `QA_DOMAIN_{ENV}` | `{ENV}_DOMAIN` | |

保留不变的运行时变量（非 .env 配置，由命令行传入）：
- `QA_PROJECT` — 项目名（运行时环境变量）
- `QA_SUITE_NAME` — 套件名（运行时环境变量）

- [ ] **Step 1: 重写 .env 的 UI 自动化测试区块**

将 `.env` 第 80-131 行替换为：

```bash
# ══════════════════════════════════════════════════════════════════════════════
# UI 自动化测试 - 多环境配置
# 用法：设置 ACTIVE_ENV 切换当前活跃环境（如 ltqcdev、ci63、ltqc）
# 脚本自动读取对应 {ENV}_BASE_URL / {ENV}_COOKIE 等变量
# 多实例并发时，每个实例通过 shell 环境变量覆盖：ACTIVE_ENV=ci63 bunx playwright test ...
# ══════════════════════════════════════════════════════════════════════════════

# 当前活跃环境标识（切换环境只需改这一行）
ACTIVE_ENV=ltqcdev

# ──────────────────────────────────────────────────────────────
# ltqc 环境（数展63 LTQC 定制测试环境）
# ──────────────────────────────────────────────────────────────
LTQC_BASE_URL=http://shuzhan63-test-ltqc.k8s.dtstack.cn
LTQC_USERNAME=admin@dtstack.com
LTQC_PASSWORD=DrpEco_2020
LTQC_DOMAIN=shuzhan63-test-ltqc.k8s.dtstack.cn
LTQC_COOKIE=<保留原值>

# ──────────────────────────────────────────────────────────────
# standard 环境（标准版，按需填写）
# ──────────────────────────────────────────────────────────────
# STANDARD_BASE_URL=http://xxx.k8s.dtstack.cn
# STANDARD_USERNAME=
# STANDARD_PASSWORD=
# STANDARD_DOMAIN=
# STANDARD_COOKIE=

# ──────────────────────────────────────────────────────────────
# ci63 环境（CI63 集成测试环境）
# ──────────────────────────────────────────────────────────────
CI63_BASE_URL=http://172.16.122.52
CI63_USERNAME=admin@dtstack.com
CI63_PASSWORD=DrpEco_2020
CI63_DOMAIN=172.16.122.52
CI63_COOKIE=<保留原值>

# ──────────────────────────────────────────────────────────────
# ci78 环境（CI78 集成测试环境）
# ──────────────────────────────────────────────────────────────
CI78_BASE_URL=http://172.16.124.78
CI78_USERNAME=admin@dtstack.com
CI78_DOMAIN=172.16.124.78
CI78_COOKIE=<保留原值>

# ──────────────────────────────────────────────────────────────
# ltqcdev 环境（数展63 LTQC-DEV 开发测试环境）
# ──────────────────────────────────────────────────────────────
LTQCDEV_BASE_URL=http://shuzhan63-ltqc-dev.k8s.dtstack.cn
LTQCDEV_USERNAME=admin@dtstack.com
LTQCDEV_DOMAIN=shuzhan63-ltqc-dev.k8s.dtstack.cn
LTQCDEV_COOKIE=<保留原值>
```

> 注意：`<保留原值>` 表示保留 `.env` 中当前的实际 cookie 字符串，不做修改。

- [ ] **Step 2: 验证 .env 格式正确**

Run: `bun run .claude/scripts/lib/env.ts` (dry-run import test)

手动检查：变量名无拼写错误，注释分组清晰。

- [ ] **Step 3: Commit**

```bash
git add .env
git commit -m "refactor: rename QA_* env vars to semantic {ENV}_PROP naming"
```

---

### Task 2: 更新 playwright.config.ts 桥接层

**Files:**
- Modify: `playwright.config.ts`

核心改动：
1. 读取 `ACTIVE_ENV` 替代 `QA_ACTIVE_ENV`（保留旧变量 fallback）
2. 解析 `{ENV}_COOKIE` / `{ENV}_BASE_URL` 替代 `QA_COOKIE_{ENV}` / `QA_BASE_URL_{ENV}`
3. 设置 `process.env.UI_AUTOTEST_SESSION_PATH` 为 `.auth/session-{env}.json`
4. 报告路径加入环境标识
5. 全局 `use.storageState` 设为 session 文件路径

- [ ] **Step 1: 写测试验证当前行为**

在本地终端手动验证当前配置可正常加载（无需写测试文件，playwright.config.ts 变更后通过运行现有测试验证）：

```bash
ACTIVE_ENV=ltqcdev bunx playwright test --list 2>&1 | head -5
```

预期：能列出测试文件，无报错。

- [ ] **Step 2: 修改 playwright.config.ts**

将文件完整替换为：

```typescript
import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// 手动解析 .env，确保 worker 继承时变量已就绪
function loadDotEnv() {
  try {
    const content = readFileSync(`${process.cwd()}/.env`, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env 不存在时静默跳过
  }
}

loadDotEnv();

// ── 环境解析 ──────────────────────────────────────────────────
// 优先级：shell 环境变量 > .env 文件
// 新变量名 ACTIVE_ENV，兼容旧名 QA_ACTIVE_ENV
const activeEnv = (
  process.env.ACTIVE_ENV ?? process.env.QA_ACTIVE_ENV ?? "ltqc"
).toUpperCase();
const activeEnvLower = activeEnv.toLowerCase();

// 新命名：{ENV}_COOKIE / {ENV}_BASE_URL
// 兼容旧命名：QA_COOKIE_{ENV} / QA_BASE_URL_{ENV}
const cookie =
  process.env[`${activeEnv}_COOKIE`] ??
  process.env[`QA_COOKIE_${activeEnv}`] ??
  process.env.UI_AUTOTEST_COOKIE ??
  "";
const baseUrl =
  process.env[`${activeEnv}_BASE_URL`] ??
  process.env[`QA_BASE_URL_${activeEnv}`] ??
  process.env.UI_AUTOTEST_BASE_URL ??
  "";

// 桥接到运行时变量（test-setup.ts 读取这些）
process.env.UI_AUTOTEST_COOKIE = cookie;
if (baseUrl) process.env.UI_AUTOTEST_BASE_URL = baseUrl;

// Session 文件按环境隔离
const sessionPath = `.auth/session-${activeEnvLower}.json`;
process.env.UI_AUTOTEST_SESSION_PATH = sessionPath;

// 报告路径：workspace/{project}/reports/playwright/{YYYYMM}/{suiteName}/{env}/
const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/g, "");
const suiteName = process.env.QA_SUITE_NAME ?? "report";
const project = process.env.QA_PROJECT ?? "dataAssets";
const reportDir = `workspace/${project}/reports/playwright/${yyyymm}/${suiteName}/${activeEnvLower}`;

export default defineConfig({
  testMatch: `workspace/${project}/tests/**/*.spec.ts`,
  timeout: 60000,
  reporter: [
    ["line"],
    [
      "monocart-reporter",
      {
        name: `${suiteName} - UI自动化测试报告 (${activeEnvLower})`,
        outputFile: `${reportDir}/${suiteName}.html`,
      },
    ],
  ],
  use: {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1280, height: 720 },
    storageState: sessionPath,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

- [ ] **Step 3: 验证新配置**

```bash
ACTIVE_ENV=ltqcdev bunx playwright test --list 2>&1 | head -5
```

预期：能列出测试文件，无报错。

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts
git commit -m "feat: multi-env bridge in playwright.config.ts - env-scoped session, reports, and cookie resolution"
```

---

### Task 3: 更新 session-login.ts 默认输出路径

**Files:**
- Modify: `.claude/skills/ui-autotest/scripts/session-login.ts`

改动：`--output` 参数的默认值从无默认值改为根据 `ACTIVE_ENV` 动态生成。

- [ ] **Step 1: 修改 CLI 选项默认值**

在 `session-login.ts` 第 160-168 行，将 `requiredOption("--output <path>", ...)` 改为带默认值的 option：

```typescript
const envLabel = (process.env.ACTIVE_ENV ?? process.env.QA_ACTIVE_ENV ?? "default").toLowerCase();

const program = new Command();

program
  .name("session-login")
  .description("检查或创建 Playwright 登录 session")
  .requiredOption("--url <url>", "目标系统 URL")
  .option("--output <path>", "session.json 输出路径", `.auth/session-${envLabel}.json`)
  .option("--force", "强制重新登录，忽略现有 session")
  .parse(process.argv);
```

- [ ] **Step 2: 验证脚本语法**

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts --help
```

预期：显示帮助信息，`--output` 带有默认值说明。

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/ui-autotest/scripts/session-login.ts
git commit -m "feat: session-login defaults output path to .auth/session-{env}.json"
```

---

### Task 4: 更新 ui-autotest-progress.ts 加入 env 维度

**Files:**
- Modify: `.claude/scripts/ui-autotest-progress.ts`
- Test: `.claude/scripts/__tests__/ui-autotest-progress.test.ts`

改动：
1. `Progress` 接口新增 `env` 可选字段
2. `progressFilePath` 函数：有 env 时文件名加 `-{env}` 后缀
3. 所有子命令新增 `--env` 可选参数
4. `create` 命令将 env 写入进度文件
5. `summary` 输出包含 env 字段

- [ ] **Step 1: 写失败测试 — env 参数隔离**

在 `.claude/scripts/__tests__/ui-autotest-progress.test.ts` 末尾追加：

```typescript
// ── env isolation ────────────────────────────────────────────────────────────

describe("env isolation", () => {
  it("create with --env produces env-scoped progress file", () => {
    const { stdout, code } = run([
      "create",
      "--project", "dataAssets",
      "--suite", "env-scoped-suite",
      "--archive", "test.md",
      "--url", "http://localhost",
      "--env", "ci63",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.env, "ci63");

    // File should be keyed by env
    const filePath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      "ui-autotest-progress-env-scoped-suite-ci63.json",
    );
    assert.ok(existsSync(filePath), "env-scoped progress file should exist");
  });

  it("same suite different env produces separate files", () => {
    // Create for env=ci63
    run([
      "create", "--project", "dataAssets", "--suite", "multi-env-suite",
      "--archive", "test.md", "--url", "http://ci63",
      "--env", "ci63",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);
    // Create for env=ltqcdev
    run([
      "create", "--project", "dataAssets", "--suite", "multi-env-suite",
      "--archive", "test.md", "--url", "http://ltqcdev",
      "--env", "ltqcdev",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    // Both files should exist independently
    const ci63Path = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      "ui-autotest-progress-multi-env-suite-ci63.json",
    );
    const ltqcdevPath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      "ui-autotest-progress-multi-env-suite-ltqcdev.json",
    );
    assert.ok(existsSync(ci63Path));
    assert.ok(existsSync(ltqcdevPath));

    // Read both — should have different URLs
    const { stdout: ci63Out } = run([
      "read", "--project", "dataAssets", "--suite", "multi-env-suite", "--env", "ci63",
    ]);
    const { stdout: ltqcdevOut } = run([
      "read", "--project", "dataAssets", "--suite", "multi-env-suite", "--env", "ltqcdev",
    ]);
    assert.equal(JSON.parse(ci63Out).url, "http://ci63");
    assert.equal(JSON.parse(ltqcdevOut).url, "http://ltqcdev");
  });

  it("commands without --env still work (backward compat)", () => {
    createTestSuite("no-env-suite");
    const { stdout, code } = run([
      "read", "--project", "dataAssets", "--suite", "no-env-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.env, undefined);
  });

  it("summary includes env field when set", () => {
    run([
      "create", "--project", "dataAssets", "--suite", "env-summary-suite",
      "--archive", "test.md", "--url", "http://localhost",
      "--env", "ci78",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    const { stdout, code } = run([
      "summary", "--project", "dataAssets", "--suite", "env-summary-suite", "--env", "ci78",
    ]);
    assert.equal(code, 0);
    const summary = JSON.parse(stdout);
    assert.equal(summary.env, "ci78");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
bun test .claude/scripts/__tests__/ui-autotest-progress.test.ts 2>&1 | tail -10
```

预期：`env isolation` 相关测试 FAIL（`--env` 参数不存在）。

- [ ] **Step 3: 实现 — 修改 Progress 接口和路径函数**

在 `ui-autotest-progress.ts` 中：

3a. `Progress` 接口新增可选字段：

```typescript
interface Progress {
  readonly version: 1;
  readonly suite_name: string;
  readonly env?: string;           // ← 新增
  readonly archive_md: string;
  // ... 其余不变
}
```

3b. `progressFilePath` 函数加入 env 参数：

```typescript
function progressFilePath(project: string, suiteName: string, env?: string): string {
  const envSuffix = env ? `-${env.toLowerCase()}` : "";
  return `${tempDir(project)}/ui-autotest-progress-${slugify(suiteName)}${envSuffix}.json`;
}
```

3c. `readProgress` 和 `writeProgress` 加入 env 参数：

```typescript
function readProgress(project: string, suiteName: string, env?: string): Progress | null {
  const filePath = progressFilePath(project, suiteName, env);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Progress;
  } catch (err) {
    throw new Error(`Failed to parse progress file: ${err}`);
  }
}

function writeProgress(project: string, suiteName: string, progress: Progress, env?: string): void {
  const filePath = progressFilePath(project, suiteName, env);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
}
```

3d. 所有子命令（create, update, read, summary, reset, resume）增加 `.option("--env <name>", "环境标识（如 ci63、ltqcdev）")`，并透传给 `readProgress` / `writeProgress` / `progressFilePath`。

3e. `create` 命令将 `opts.env` 写入 progress 对象：

```typescript
const progress: Progress = {
  version: 1,
  suite_name: opts.suite,
  env: opts.env,           // ← 新增，可选
  archive_md: opts.archive,
  // ... 其余不变
};
```

3f. `summary` 输出包含 env：

```typescript
const summary = {
  suite_name: progress.suite_name,
  env: progress.env,       // ← 新增
  current_step: progress.current_step,
  // ... 其余不变
};
```

- [ ] **Step 4: 运行测试验证通过**

```bash
bun test .claude/scripts/__tests__/ui-autotest-progress.test.ts
```

预期：全部 PASS（含新增的 `env isolation` 测试）。

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/ui-autotest-progress.ts .claude/scripts/__tests__/ui-autotest-progress.test.ts
git commit -m "feat: add --env parameter to ui-autotest-progress for multi-env isolation"
```

---

### Task 5: 更新 playwright-patterns.md 脚本模板

**Files:**
- Modify: `.claude/references/playwright-patterns.md:211-248`

改动：去掉 `test.use({ storageState: ".auth/session.json" })` 硬编码行，改为注释说明 storageState 由 `playwright.config.ts` 全局设置。

- [ ] **Step 1: 更新模板**

将 `playwright-patterns.md` 中两处模板的 `test.use({ storageState: ".auth/session.json" });` 行替换为注释：

```typescript
// META: {"id":"t1","priority":"P0","title":"【P0】验证xxx"}
import { test, expect } from "../../fixtures/step-screenshot";
// storageState 由 playwright.config.ts 根据 ACTIVE_ENV 全局设置，无需在此指定

test.describe("功能名称 - 页面名", () => {
  test("【P0】验证xxx", async ({ page, step }) => {
    // 步骤内容
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add .claude/references/playwright-patterns.md
git commit -m "docs: update playwright template - storageState now set globally by config"
```

---

### Task 6: 更新 test-setup.ts 兼容 session 路径

**Files:**
- Modify: `workspace/dataAssets/tests/helpers/test-setup.ts:59-61`

改动很小：`getRawBaseUrl()` 的硬编码 fallback IP 替换为空字符串（避免意外连接到错误环境），同时无需改动 cookie 逻辑（已通过 playwright.config.ts 桥接）。

- [ ] **Step 1: 修改 fallback**

```typescript
function getRawBaseUrl(): string {
  return getEnv("UI_AUTOTEST_BASE_URL") ?? getEnv("E2E_BASE_URL") ?? "";
}
```

若 base URL 为空，测试会在 `page.goto()` 时明确报错，而不是静默连接到意外的 IP。

- [ ] **Step 2: Commit**

```bash
git add workspace/dataAssets/tests/helpers/test-setup.ts
git commit -m "fix: remove hardcoded fallback IP from getRawBaseUrl - fail explicitly when no env configured"
```

---

### Task 7: 更新 merge-specs 测试 fixtures

**Files:**
- Modify: `.claude/scripts/__tests__/ui-autotest/merge-specs.test.ts`

改动：测试 fixtures 中的 `test.use({ storageState: '.auth/session.json' });` 行需要移除，与新模板保持一致。

- [ ] **Step 1: 更新 fixtures**

移除 `BLOCK_P0` 和 `BLOCK_P1` 中的 `test.use({ storageState: '.auth/session.json' });` 行：

```typescript
const BLOCK_P0 = `// META: {"id":"t1","priority":"P0","title":"【P0】验证列表页默认加载"}
import { test, expect } from '@playwright/test';

test.describe('质量问题台账 - 列表页', () => {
  test('【P0】验证列表页默认加载', async ({ page }) => {
    await page.goto('https://test.example.com');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
`;

const BLOCK_P1 = `// META: {"id":"t2","priority":"P1","title":"【P1】验证筛选功能"}
import { test, expect } from '@playwright/test';

test.describe('质量问题台账 - 列表页', () => {
  test('【P1】验证筛选功能', async ({ page }) => {
    await page.goto('https://test.example.com');
    await page.getByText('数据缺失').click();
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);
  });
});
`;
```

- [ ] **Step 2: 运行 merge-specs 测试**

```bash
bun test .claude/scripts/__tests__/ui-autotest/merge-specs.test.ts
```

预期：全部 PASS。

- [ ] **Step 3: Commit**

```bash
git add .claude/scripts/__tests__/ui-autotest/merge-specs.test.ts
git commit -m "test: update merge-specs fixtures to match new template (no hardcoded storageState)"
```

---

### Task 8: 全量测试验证

**Files:** None (验证步骤)

- [ ] **Step 1: 运行全量单元测试**

```bash
bun test .claude/scripts/__tests__
```

预期：全部 PASS。

- [ ] **Step 2: 验证多环境配置解析**

```bash
ACTIVE_ENV=ci63 node -e "
  require('dotenv').config();
  const { readFileSync } = require('fs');
  // 模拟 playwright.config.ts 的解析逻辑
  const env = (process.env.ACTIVE_ENV ?? 'ltqc').toUpperCase();
  console.log('Active env:', env);
  console.log('Base URL:', process.env[env + '_BASE_URL'] ?? 'NOT SET');
  console.log('Cookie present:', Boolean(process.env[env + '_COOKIE']));
  console.log('Session path:', '.auth/session-' + env.toLowerCase() + '.json');
"
```

预期：输出 `Active env: CI63`, 对应 URL 和 cookie 正确解析。

- [ ] **Step 3: 验证 session 文件隔离**

```bash
ls -la .auth/session-*.json 2>/dev/null || echo "No env-scoped sessions yet (expected for fresh setup)"
```

---

### Task 9: 更新 ui-autotest skill 定义（仅文档）

**Files:**
- Modify: `.claude/skills/ui-autotest/skill.md` (手动更新，不在此自动化)

需要在 skill 定义中更新：
1. 步骤 1 参数提取：新增 `env` 参数（从用户输入或 `ACTIVE_ENV` 环境变量获取）
2. 步骤 3 session-login 调用：`--output .auth/session-{env}.json`
3. 步骤 4 进度持久化：所有 `@progress:*` 命令追加 `--env {env}`
4. 步骤 5 自测命令：`ACTIVE_ENV={env} bunx playwright test ...`
5. 步骤 7 回归命令：`ACTIVE_ENV={env} QA_SUITE_NAME="..." bunx playwright test ...`
6. 步骤 8 验收命令：`ACTIVE_ENV={env} QA_SUITE_NAME="..." bunx playwright test ...`
7. 命令别名：所有 `@progress:*` 别名增加 `--env` 可选参数

> 此任务不在自动化执行范围内，需手动编辑 skill 文件。在上述代码改造全部完成并测试通过后，单独处理。

---

## 改造后使用方式

### 场景 1：多 Claude Code 实例并发

```bash
# 实例 1：需求 A，ltqcdev 环境
ACTIVE_ENV=ltqcdev bunx playwright test workspace/dataAssets/tests/202604/需求A/full.spec.ts

# 实例 2：需求 B，ci63 环境（同时运行，互不干扰）
ACTIVE_ENV=ci63 bunx playwright test workspace/dataAssets/tests/202604/需求B/full.spec.ts
```

### 场景 2：同一套脚本跨环境回归

```bash
# 本地测试环境
ACTIVE_ENV=ltqcdev QA_SUITE_NAME="需求A" bunx playwright test workspace/dataAssets/tests/202604/需求A/full.spec.ts

# 客户测试环境（脚本不变，只换环境）
ACTIVE_ENV=customer_test QA_SUITE_NAME="需求A" bunx playwright test workspace/dataAssets/tests/202604/需求A/full.spec.ts

# 客户生产环境
ACTIVE_ENV=customer_prod QA_SUITE_NAME="需求A" bunx playwright test workspace/dataAssets/tests/202604/需求A/full.spec.ts
```

### 场景 3：新增环境

在 `.env` 中添加一组变量即可：

```bash
# customer_test 环境
CUSTOMER_TEST_BASE_URL=http://customer-test.example.com
CUSTOMER_TEST_USERNAME=admin
CUSTOMER_TEST_COOKIE=...
```

---

## 隔离验证清单

| 维度 | 隔离方式 | 验证方法 |
|------|---------|---------|
| Session | `.auth/session-{env}.json` | `ls .auth/` 查看多个文件 |
| Cookie | `{ENV}_COOKIE` → 运行时桥接 | 不同实例的 `UI_AUTOTEST_COOKIE` 值不同 |
| 进度 | `progress-{suite}-{env}.json` | 同套件不同环境生成独立进度文件 |
| 报告 | `reports/.../suiteName/{env}/` | 报告目录按环境分隔 |
| 进程 | 每个 CC 实例独立 process.env | shell 环境变量天然隔离 |
