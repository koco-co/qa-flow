# E2E Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a three-layer E2E test suite for kata Workbench covering Rust IPC, React components, and full Tauri application workflows.

**Architecture:** Three independently runnable layers — `cargo test` for Rust integration, Playwright+Vite for component rendering with mocked IPC, and Playwright+tauri-driver for critical user flows in a real Tauri window. Mock `claude` binary simulates stream-json responses for deterministic testing.

**Tech Stack:** Rust (cargo test, tempfile), Playwright 2.x (TypeScript), tauri-driver (WebDriver), Vite dev server, shell script (mock claude binary)

---

## File Structure

| File | Responsibility |
|---|---|
| `e2e/playwright.config.ts` | Playwright config: two projects (`@component`, `@critical`), webServer, output dirs |
| `e2e/fixtures/mock-claude.sh` | Mock `claude` binary: read input → output stream-json |
| `e2e/fixtures/test-projects/{demo,empty,deep-nested}/` | Workspace fixture directories |
| `e2e/utils/ipc-mock.ts` | Layer 2 helper: inject `__TAURI_INTERNALS__` mock into page |
| `e2e/utils/tauri-app.ts` | Layer 1 helper: spawn/kill tauri-driver + app instances |
| `e2e/specs/layer2-components.spec.ts` | Layer 2: all component tests |
| `e2e/specs/layer1-critical.spec.ts` | Layer 1: 10 critical E2E scenarios |
| `src-tauri/tests/cli_mock.rs` | Rust helper: create mock claude binary for PTY tests |
| `src-tauri/tests/pty_lifecycle.rs` | Rust integration: PTY spawn, I/O, crash, kill |
| `src-tauri/tests/sessions.rs` | Rust integration: session CRUD, task association |
| `.github/workflows/e2e.yml` | CI pipeline: 3-layer execution, artifacts |
| `apps/desktop/package.json` | Add `test:e2e:*` scripts |

---

### Task 1: Create mock claude binary and project fixtures

**Files:**
- Create: `apps/desktop/e2e/fixtures/mock-claude.sh`
- Create: `apps/desktop/e2e/fixtures/test-projects/demo-project/src/index.ts`
- Create: `apps/desktop/e2e/fixtures/test-projects/demo-project/src/utils.ts`
- Create: `apps/desktop/e2e/fixtures/test-projects/demo-project/package.json`
- Create: `apps/desktop/e2e/fixtures/test-projects/demo-project/README.md`
- Create: `apps/desktop/e2e/fixtures/test-projects/empty-project/.gitkeep`
- Create: `apps/desktop/e2e/fixtures/test-projects/deep-nested/a/b/c/file.txt`

- [ ] **Step 1: Create mock-claude.sh**

```bash
#!/bin/bash
SESSION_ID="${KATA_MOCK_SESSION_ID:-test-sid}"
TIMEOUT="${KATA_MOCK_TIMEOUT:-100}"

IFS= read -r input_line
case "$input_line" in
  *"fail-login"*)
    echo '{"type":"system","subtype":"init","session_id":"fail-sid"}'
    echo '{"type":"assistant","message":{"content":[{"type":"text","text":"401 Unauthorized"}]}}'
    echo '{"type":"result","is_error":true,"result":"401 Unauthorized"}'
    ;;
  *)
    echo '{"type":"system","subtype":"init","session_id":"'"$SESSION_ID"'"}'
    echo '{"type":"assistant","message":{"content":[{"type":"text","text":"Mock reply"}]}}'
    echo '{"type":"result","total_cost_usd":0.0,"duration_ms":'"$TIMEOUT"'}'
    ;;
esac
```

Make executable:
```bash
chmod +x apps/desktop/e2e/fixtures/mock-claude.sh
```

- [ ] **Step 2: Create project fixture directories and files**

```bash
mkdir -p apps/desktop/e2e/fixtures/test-projects/{demo-project/src,empty-project,deep-nested/a/b/c}
```

`demo-project/src/index.ts`:
```typescript
export const greet = (name: string) => `Hello ${name}`;
```

`demo-project/src/utils.ts`:
```typescript
export const add = (a: number, b: number) => a + b;
```

`demo-project/package.json`:
```json
{ "name": "demo-project" }
```

`demo-project/README.md`:
```markdown
# Demo Project

Used for kata Workbench E2E testing.
```

Create `empty-project/.gitkeep` (empty file).
Create `deep-nested/a/b/c/file.txt` with content `deep file`.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/e2e/fixtures/
git commit -m "test(e2e): add mock-claude.sh and project fixtures"
```

---

### Task 2: Playwright config and IPC mock utility

**Files:**
- Create: `apps/desktop/e2e/playwright.config.ts`
- Create: `apps/desktop/e2e/utils/ipc-mock.ts`

- [ ] **Step 1: Create Playwright config**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../results/html" }],
  ],
  webServer: {
    command: "bun run --filter @kata/desktop dev:vite -- --mode e2e",
    port: 1420,
    reuseExistingServer: !process.env.CI,
    env: { KATA_ROOT: "./e2e/fixtures/test-projects/demo-project" },
  },
  use: {
    baseURL: "http://localhost:1420",
    trace: process.env.CI ? "on-first-retry" : "on",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "component",
      grep: /@component/,
      use: { headless: true },
    },
    {
      name: "critical",
      grep: /@critical/,
      use: { headless: true },
    },
  ],
});
```

- [ ] **Step 2: Create IPC mock utility**

```typescript
import type { Page } from "@playwright/test";
import { resolve } from "path";

type IpcHandler = (...args: any[]) => any;

/**
 * Layer 2 test helper.
 * Injects Tauri IPC and event mocks into the page so the app runs in a plain browser.
 * Must be called BEFORE page.goto (via addInitScript runs on "AboutToNavigate").
 */
export async function mockIpc(page: Page, handlers: Record<string, IpcHandler>) {
  await page.addInitScript(() => {
    // Mock Tauri IPC bridge (used by @tauri-apps/api/core)
    window.__TAURI_INTERNALS__ = {
      invoke: (cmd: string, args?: any) => {
        const handler = (window as any).__MOCK_HANDLERS__?.[cmd];
        if (!handler) throw new Error(`unmocked IPC: ${cmd}`);
        return Promise.resolve(handler(args));
      },
      convertFileSrc: (path: string) => path,
      events: {
        listen: (event: string, cb: (e: any) => void) => {
          if (!window.__MOCK_EVENTS__) window.__MOCK_EVENTS__ = {};
          if (!window.__MOCK_EVENTS__[event]) window.__MOCK_EVENTS__[event] = [];
          window.__MOCK_EVENTS__[event].push(cb);
          return Promise.resolve(() => {
            window.__MOCK_EVENTS__[event] = window.__MOCK_EVENTS__[event]?.filter(
              (l: Function) => l !== cb,
            );
          });
        },
        emit: (event: string, payload: any) => {
          window.__MOCK_EVENTS__?.[event]?.forEach((cb: Function) =>
            cb({ payload, event }),
          );
          return Promise.resolve();
        },
      },
    };
  });
  await page.evaluate((h) => { (window as any).__MOCK_HANDLERS__ = h; }, handlers);
}

/** Simulate a Tauri backend event push (e.g., task:event, session:resumed) */
export async function emitTauriEvent(page: Page, event: string, payload: any) {
  await page.evaluate(
    ({ e, p }) => window.__TAURI_INTERNALS__.events.emit(e, p),
    { e: event, p: payload },
  );
}

/** Path to the plugin that rewrites @tauri-apps/api imports for Vite */
export function tauriMockPluginPath() {
  return resolve(__dirname, "../fixtures/vite-tauri-mock-plugin.ts");
}
```

Also create `e2e/fixtures/vite-tauri-mock-plugin.ts`:

```typescript
import type { Plugin } from "vite";

/**
 * Vite plugin that aliases @tauri-apps modules during E2E tests.
 * The app imports `listen` from @tauri-apps/api/event which references
 * __TAURI_INTERNALS__.events under the hood, already set up by ipc-mock.ts.
 * This plugin prevents Vite from bundling the real Tauri modules which
 * would crash in a plain browser.
 */
export function tauriMockPlugin(): Plugin {
  const mockModules: Record<string, string> = {
    "@tauri-apps/api/core": `
      export function invoke(cmd, args) {
        return window.__TAURI_INTERNALS__.invoke(cmd, args);
      }
    `,
    "@tauri-apps/api/event": `
      export function listen(event, cb) {
        return window.__TAURI_INTERNALS__.events.listen(event, cb);
      }
      export async function emit(event, payload) {
        return window.__TAURI_INTERNALS__.events.emit(event, payload);
      }
    `,
    "@tauri-apps/api/window": `
      export function getCurrentWindow() {
        return { close: () => Promise.resolve() };
      }
    `,
    "@tauri-apps/plugin-shell": `
      export function open(url) { return Promise.resolve(); }
    `,
    "@tauri-apps/plugin-clipboard-manager": `
      export async function writeText(text) { return Promise.resolve(); }
    `,
    "@tauri-apps/plugin-dialog": `
      export async function open() { return null; }
    `,
    "@tauri-apps/plugin-fs": `
      export async function readTextFile() { return ''; }
    `,
  };

  return {
    name: "tauri-mock",
    resolveId(id) {
      if (mockModules[id]) return "\0" + id;
      return null;
    },
    load(id) {
      if (id.startsWith("\0")) {
        const realId = id.slice(1);
        if (mockModules[realId]) return mockModules[realId];
      }
      return null;
    },
  };
}
```

Update `vite.config.ts` to load the mock plugin in test mode (add to existing Vite config):

```typescript
import { tauriMockPlugin } from "./e2e/fixtures/vite-tauri-mock-plugin";

export default defineConfig(({ mode }) => ({
  // ...existing config...
  plugins: [
    // ...existing plugins...
    mode === "e2e" && tauriMockPlugin(),
  ].filter(Boolean),
}));
```

Update Playwright config's `webServer` to pass `--mode e2e`:

```typescript
webServer: {
  command: "bun run dev:vite -- --mode e2e",
  port: 1420,
  reuseExistingServer: !process.env.CI,
},
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/e2e/playwright.config.ts apps/desktop/e2e/utils/ipc-mock.ts
git commit -m "test(e2e): add Playwright config and IPC mock utility"
```

---

### Task 3: Layer 3 — Rust MockClaude helper

**Files:**
- Create: `apps/desktop/src-tauri/tests/cli_mock.rs`

- [ ] **Step 1: Create cli_mock.rs**

```rust
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

pub const KATA_MOCK_SESSION_ID: &str = "test-sid";

const MOCK_SCRIPT: &str = r#"#!/bin/bash
SESSION_ID="${KATA_MOCK_SESSION_ID:-test-sid}"
TIMEOUT="${KATA_MOCK_TIMEOUT:-100}"
IFS= read -r input_line
case "$input_line" in
  *"fail-login"*)
    echo '{"type":"system","subtype":"init","session_id":"fail-sid"}'
    echo '{"type":"assistant","message":{"content":[{"type":"text","text":"401 Unauthorized"}]}}'
    echo '{"type":"result","is_error":true,"result":"401 Unauthorized"}'
    ;;
  *)
    echo '{"type":"system","subtype":"init","session_id":"'"$SESSION_ID"'"}'
    echo '{"type":"assistant","message":{"content":[{"type":"text","text":"Mock reply"}]}}'
    echo '{"type":"result","total_cost_usd":0.0,"duration_ms":'"$TIMEOUT"'}'
    ;;
esac
"#;

pub struct MockClaude {
    script_path: PathBuf,
    _data_dir: TempDir,
}

impl MockClaude {
    pub fn new() -> Self {
        let dir = TempDir::new().unwrap();
        let script = dir.path().join("claude");
        fs::write(&script, MOCK_SCRIPT).unwrap();
        fs::set_permissions(&script, fs::Permissions::from_mode(0o755)).unwrap();
        Self { script_path: script, _data_dir: dir }
    }

    pub fn bin_path(&self) -> &Path {
        &self.script_path
    }

    pub fn session_id(&self) -> &str {
        KATA_MOCK_SESSION_ID
    }
}
```

- [ ] **Step 2: Run cargo check to verify it compiles**

Run: `cd apps/desktop/src-tauri && cargo check --tests`
Expected: Compilation succeeds (no tests to run, but the module compiles).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src-tauri/tests/cli_mock.rs
git commit -m "test(rust): add MockClaude helper for PTY integration tests"
```

---

### Task 4: Layer 3 — PTY lifecycle integration tests

**Files:**
- Create: `apps/desktop/src-tauri/tests/pty_lifecycle.rs`

- [ ] **Step 1: Create pty_lifecycle.rs**

```rust
mod cli_mock;

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use kata_workbench_lib::pty::{PtyManager, PtyState};

fn setup_mock_env(mock: &cli_mock::MockClaude) {
    std::env::set_var("KATA_CLAUDE_BIN", mock.bin_path());
    std::env::set_var("KATA_MOCK_SESSION_ID", mock.session_id());
    std::env::set_var("KATA_MOCK_TIMEOUT", "100");
}

// helper to create a temp workspace dir
fn tmp_workspace() -> (tempfile::TempDir, PathBuf) {
    let dir = tempfile::TempDir::new().unwrap();
    let cwd = dir.path().join("project");
    std::fs::create_dir_all(&cwd).unwrap();
    (dir, cwd)
}

#[tokio::test]
async fn pty_parses_normal_output() {
    let mock = cli_mock::MockClaude::new();
    setup_mock_env(&mock);
    let (_tmp, cwd) = tmp_workspace();
    let mgr = PtyManager::new();

    let (handle, mut rx) = mgr.get_or_spawn("test", cwd, None).await.unwrap();
    handle.write_input("hello").await.unwrap();

    let mut events = Vec::new();
    while let Some(line) = rx.recv().await {
        events.push(line);
        if line.contains("\"result\"") { break; }
    }

    assert!(events.iter().any(|l| l.contains("system") && l.contains("init")));
    assert!(events.iter().any(|l| l.contains("assistant")));
    assert!(events.iter().any(|l| l.contains("result")));
}

#[tokio::test]
async fn pty_detects_cli_crash() {
    let mock = cli_mock::MockClaude::new();
    setup_mock_env(&mock);
    let (_tmp, cwd) = tmp_workspace();
    let mgr = PtyManager::new();

    let (handle, _rx) = mgr.get_or_spawn("crash-test", cwd, None).await.unwrap();

    // simulate crash by killing the child directly
    handle.kill().await.unwrap();
    tokio::time::sleep(Duration::from_millis(200)).await;

    assert_eq!(*handle.state.read().await, PtyState::Closed);
}

#[tokio::test]
async fn pty_kill_during_active() {
    let mock = cli_mock::MockClaude::new();
    setup_mock_env(&mock);
    let (_tmp, cwd) = tmp_workspace();
    let mgr = PtyManager::new();

    let (handle, _rx) = mgr.get_or_spawn("kill-test", cwd, None).await.unwrap();
    *handle.state.write().await = PtyState::Active;

    handle.kill().await.unwrap();
    assert_eq!(*handle.state.read().await, PtyState::Closed);
}

#[tokio::test]
async fn session_persistence() {
    let mock = cli_mock::MockClaude::new();
    setup_mock_env(&mock);
    let (_tmp, cwd) = tmp_workspace();

    // create a real project DB
    let db_path = cwd.join(".kata").join("tasks.db");
    let pool = kata_workbench_lib::db::open_project_pool(&db_path).unwrap();

    let mgr = PtyManager::new();
    let (handle, mut rx) = mgr.get_or_spawn("session-test", cwd, None).await.unwrap();
    handle.write_input("hello").await.unwrap();

    // wait for the session_id from system.init event
    let mut session_id = None;
    while let Some(line) = rx.recv().await {
        if let Some(sid) = line.split("session_id").nth(1)
            .and_then(|s| s.split('"').nth(1))
        {
            session_id = Some(sid.to_string());
        }
        if line.contains("\"result\"") { break; }
    }

    let sid = session_id.expect("should have received a session_id");
    let rows = kata_workbench_lib::db::list_sessions(&pool, 10).unwrap();
    assert!(rows.iter().any(|r| r.session_id == sid));
}
```

- [ ] **Step 2: Run tests**

Run: `cd apps/desktop/src-tauri && cargo test --test pty_lifecycle`
Expected: 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src-tauri/tests/pty_lifecycle.rs
git commit -m "test(rust): add PTY lifecycle integration tests"
```

---

### Task 5: Layer 3 — Session integration tests

**Files:**
- Create: `apps/desktop/src-tauri/tests/sessions.rs`

- [ ] **Step 1: Create sessions.rs**

```rust
use kata_workbench_lib::db::{create_task, finish_task, list_recent_tasks, list_sessions, upsert_session, SessionRow, TaskRow};

fn make_pool() -> (tempfile::TempDir, kata_workbench_lib::db::DbPool) {
    let dir = tempfile::TempDir::new().unwrap();
    let pool = kata_workbench_lib::db::open_project_pool(&dir.path().join("tasks.db")).unwrap();
    (dir, pool)
}

fn make_task(id: &str, session_id: Option<&str>, started_at: i64) -> TaskRow {
    TaskRow {
        id: id.into(),
        command: "echo hello".into(),
        session_id: session_id.map(|s| s.into()),
        started_at,
        ended_at: None,
        status: "running".into(),
        log_path: "/tmp/log".into(),
        retain_until: None,
        pinned: false,
    }
}

#[test]
fn create_then_list_sessions() {
    let (_dir, pool) = make_pool();

    upsert_session(&pool, &SessionRow {
        session_id: "s2".into(),
        first_task_id: "t2".into(),
        first_input_summary: Some("second".into()),
        created_at: 200,
        last_active_at: 200,
        task_count: 1,
    }).unwrap();

    upsert_session(&pool, &SessionRow {
        session_id: "s1".into(),
        first_task_id: "t1".into(),
        first_input_summary: Some("first".into()),
        created_at: 100,
        last_active_at: 300,
        task_count: 2,
    }).unwrap();

    let list = list_sessions(&pool, 10).unwrap();
    assert_eq!(list[0].session_id, "s1"); // most recent last_active_at first
    assert_eq!(list[1].session_id, "s2");
}

#[test]
fn session_task_count_increments() {
    let (_dir, pool) = make_pool();

    upsert_session(&pool, &SessionRow {
        session_id: "s1".into(),
        first_task_id: "t1".into(),
        first_input_summary: None,
        created_at: 100,
        last_active_at: 100,
        task_count: 1,
    }).unwrap();

    upsert_session(&pool, &SessionRow {
        session_id: "s1".into(),
        first_task_id: "t1".into(),
        first_input_summary: None,
        created_at: 100,
        last_active_at: 200,
        task_count: 1, // value ignored on conflict; uses task_count + 1
    }).unwrap();

    let list = list_sessions(&pool, 10).unwrap();
    assert_eq!(list[0].task_count, 2);
}

#[test]
fn task_belongs_to_session() {
    let (_dir, pool) = make_pool();

    create_task(&pool, &make_task("t1", Some("s1"), 100)).unwrap();
    create_task(&pool, &make_task("t2", Some("s1"), 200)).unwrap();
    create_task(&pool, &make_task("t3", None, 300)).unwrap();

    let all = list_recent_tasks(&pool, 10).unwrap();
    let s1_tasks: Vec<_> = all.iter().filter(|t| t.session_id.as_deref() == Some("s1")).collect();
    assert_eq!(s1_tasks.len(), 2);
}
```

- [ ] **Step 2: Run tests**

Run: `cd apps/desktop/src-tauri && cargo test --test sessions`
Expected: 3 tests PASS.

- [ ] **Step 3: Run full Rust test suite**

Run: `cd apps/desktop/src-tauri && cargo test`
Expected: 32 unit tests + 6 integration tests = 38 PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src-tauri/tests/sessions.rs
git commit -m "test(rust): add session integration tests"
```

---

### Task 6: Layer 2 — Component test spec

**Files:**
- Create: `apps/desktop/e2e/specs/layer2-components.spec.ts`

- [ ] **Step 1: Create the component test spec**

```typescript
import { test, expect, type Page } from "@playwright/test";
import { mockIpc, emitTauriEvent } from "../utils/ipc-mock";

test.describe("@component PreflightGate", () => {
  test("ready state shows main UI", async ({ page }) => {
    await mockIpc(page, {
      get_preflight_status: () => ({ kind: "ready", version: "1.2.0" }),
    });
    await page.goto("/");
    await expect(page.locator("text=请从左侧选择项目")).toBeVisible();
  });

  test("cli_missing shows install guide", async ({ page }) => {
    await mockIpc(page, {
      get_preflight_status: () => ({ kind: "cli_missing" }),
    });
    await page.goto("/");
    await expect(page.locator("text=Claude Code CLI 不可用")).toBeVisible();
    await expect(page.locator("text=查看安装文档")).toBeVisible();
  });

  test("not_logged_in shows login prompt", async ({ page }) => {
    await mockIpc(page, {
      get_preflight_status: () => ({ kind: "not_logged_in", version: "1.2.0" }),
    });
    await page.goto("/");
    await expect(page.locator("text=尚未登录 Claude")).toBeVisible();
    await expect(page.locator("text=打开终端")).toBeVisible();
  });

  test("retry transitions from cli_missing to ready", async ({ page }) => {
    let status = { kind: "cli_missing" };
    await mockIpc(page, {
      get_preflight_status: () => status,
      recheck: () => {
        status = { kind: "ready", version: "1.2.0" };
        return status;
      },
    });
    await page.goto("/");
    await expect(page.locator("text=Claude Code CLI 不可用")).toBeVisible();
    await page.click("text=重新检测");
    await expect(page.locator("text=请从左侧选择项目")).toBeVisible();
  });
});

test.describe("@component Composer", () => {
  test("submit disabled when input empty", async ({ page }) => {
    await mockIpc(page, {});
    await page.goto("/");
    // Composer should be visible when there's a project in the store
    // This requires the project store to have a current project
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test("drag @path injection inserts into textarea", async ({ page }) => {
    await mockIpc(page, {});
    await page.goto("/");
    const textarea = page.locator("textarea");
    await textarea.dispatchEvent("dragenter", {
      dataTransfer: { types: ["text/x-kata-relpath"] },
    });
    await textarea.dispatchEvent("drop", {
      dataTransfer: {
        getData: (fmt: string) => fmt === "text/x-kata-relpath" ? "@src/file.ts" : "",
      },
    });
    await expect(textarea).toHaveValue(/@src\/file\.ts/);
  });
});

test.describe("@component StreamRenderer", () => {
  test("empty list shows placeholder", async ({ page }) => {
    await mockIpc(page, {});
    await page.goto("/");
    // renders empty state when no active task
    await expect(page.locator("text=等待输入")).toBeVisible();
  });

  test("renders assistant text event", async ({ page }) => {
    await mockIpc(page, {
      send_input: () => ({ task_id: "t1", session_id: "s1" }),
    });
    await page.goto("/");
    // simulate task:event from backend
    await emitTauriEvent(page, "task:event", {
      task_id: "t1",
      event: {
        type: "assistant",
        message: { content: [{ type: "text", text: "Hello from mock" }] },
      },
    });
    await expect(page.locator("text=Hello from mock")).toBeVisible();
  });

  test("result shows cost badge", async ({ page }) => {
    await mockIpc(page, {
      send_input: () => ({ task_id: "t1", session_id: "s1" }),
    });
    await page.goto("/");
    await emitTauriEvent(page, "task:status", {
      task_id: "t1",
      status: "success",
      project: "demo",
    });
    // The ResultBadge should show after task completes
    await expect(page.locator("text=success")).toBeVisible();
  });
});

test.describe("@component FileTree", () => {
  test("empty project shows placeholder", async ({ page }) => {
    await mockIpc(page, {
      listFiles: () => [],
    });
    await page.goto("/");
    await expect(page.locator("text=空目录")).toBeVisible();
  });

  test("renders file and folder list", async ({ page }) => {
    await mockIpc(page, {
      listFiles: () => [
        { name: "src", path: "/workspace/proj/src", is_dir: true, size: 0 },
        { name: "README.md", path: "/workspace/proj/README.md", is_dir: false, size: 100 },
      ],
    });
    await page.goto("/");
    await expect(page.locator("text=src")).toBeVisible();
    await expect(page.locator("text=README.md")).toBeVisible();
  });
});

test.describe("@component SessionsList", () => {
  test("empty history shows placeholder", async ({ page }) => {
    await mockIpc(page, {
      list_sessions_cmd: () => [],
    });
    await page.goto("/");
    await expect(page.locator("text=无历史 session")).toBeVisible();
  });

  test("lists multiple sessions", async ({ page }) => {
    const now = Math.floor(Date.now() / 1000);
    await mockIpc(page, {
      list_sessions_cmd: () => [
        { session_id: "s1", first_task_id: "t1", first_input_summary: "hello",
          created_at: now, last_active_at: now, task_count: 3 },
        { session_id: "s2", first_task_id: "t2", first_input_summary: "world",
          created_at: now - 100, last_active_at: now - 100, task_count: 1 },
      ],
    });
    await page.goto("/");
    await expect(page.locator("text=hello")).toBeVisible();
    await expect(page.locator("text=world")).toBeVisible();
  });
});

test.describe("@component Modal", () => {
  test("renders close confirmation", async ({ page }) => {
    await mockIpc(page, {});
    await page.goto("/");
    // Simulate app:close-requested event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("app:close-requested"));
    });
    await expect(page.locator("text=任务进行中")).toBeVisible();
    await expect(page.locator("text=强制退出")).toBeVisible();
    await expect(page.locator("text=取消")).toBeVisible();
  });

  test("cancel button dismisses modal", async ({ page }) => {
    await mockIpc(page, {});
    await page.goto("/");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("app:close-requested"));
    });
    await page.click("text=取消");
    await expect(page.locator("text=任务进行中")).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Verify tests compile (syntax check)**

Run: `cd apps/desktop && bun playwright test --config e2e/playwright.config.ts --list`
Expected: Lists all tests without syntax errors.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/e2e/specs/layer2-components.spec.ts
git commit -m "test(e2e): add Layer 2 component test spec"
```

---

### Task 7: Layer 1 — Tauri app lifecycle utility

**Files:**
- Create: `apps/desktop/e2e/utils/tauri-app.ts`

- [ ] **Step 1: Create tauri-app.ts**

```typescript
import { spawn, type ChildProcess } from "child_process";
import { resolve } from "path";

const TAURI_DRIVER_BIN = "tauri-driver";
const APP_BINARY = resolve(__dirname, "../../../src-tauri/target/debug/kata-workbench");
const E2E_DIR = resolve(__dirname, "..");

export interface TauriAppFixture {
  app: ChildProcess;
  driver: ChildProcess;
  env: NodeJS.ProcessEnv;
}

export async function startTauriApp(options?: {
  claudeBin?: string;
  root?: string;
  dataDir?: string;
}): Promise<TauriAppFixture> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    KATA_CLAUDE_BIN: options?.claudeBin ?? `${E2E_DIR}/fixtures/mock-claude.sh`,
    KATA_ROOT: options?.root ?? `${E2E_DIR}/fixtures/test-projects/demo-project`,
    KATA_DATA_DIR: options?.dataDir ?? `${E2E_DIR}/results/temp-${Date.now()}`,
    NO_COLOR: "1",
  };

  const app = spawn(APP_BINARY, [], { env, stdio: ["ignore", "pipe", "pipe"] });
  const driver = spawn(TAURI_DRIVER_BIN, [], { stdio: ["ignore", "pipe", "pipe"] });

  // Wait for WebDriver session to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("tauri-driver startup timeout")), 15000);
    driver.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (text.includes("WebDriver")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    driver.stderr?.on("data", (data: Buffer) => {
      // tauri-driver may log to stderr; not necessarily an error
    });
  });

  return { app, driver, env };
}

export async function stopTauriApp(fixture: TauriAppFixture): Promise<void> {
  fixture.driver.kill("SIGTERM");
  fixture.app.kill("SIGTERM");

  // Wait for processes to exit
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Force kill if still alive
  try { fixture.driver.kill("SIGKILL"); } catch {}
  try { fixture.app.kill("SIGKILL"); } catch {}
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/e2e/utils/tauri-app.ts
git commit -m "test(e2e): add Tauri app lifecycle utility for Layer 1 tests"
```

---

### Task 8: Layer 1 — Critical E2E spec

**Files:**
- Create: `apps/desktop/e2e/specs/layer1-critical.spec.ts`

- [ ] **Step 1: Create critical E2E spec**

```typescript
import { test, expect } from "@playwright/test";
import { startTauriApp, stopTauriApp } from "../utils/tauri-app";

test.describe("@critical App Lifecycle", () => {
  let fixture: Awaited<ReturnType<typeof startTauriApp>>;

  test.beforeEach(async () => {
    fixture = await startTauriApp();
  });

  test.afterEach(async () => {
    await stopTauriApp(fixture);
  });

  test("normal startup shows sidebar and workbench placeholder", async ({ page }) => {
    // Navigate to Tauri webview (using tauri-driver WebDriver session)
    await page.goto("tauri://localhost");
    await expect(page.locator("text=请从左侧选择项目")).toBeVisible({ timeout: 10000 });
    // verify sidebar sections are present
    await expect(page.locator("text=Projects")).toBeVisible();
    await expect(page.locator("text=Sessions")).toBeVisible();
    await expect(page.locator("text=Files")).toBeVisible();
  });

  test("cli_missing shows install guide on startup", async ({ page }) => {
    // override KATA_CLAUDE_BIN to a nonexistent path
    const badFixture = await startTauriApp({ claudeBin: "/usr/bin/false" });
    try {
      await page.goto("tauri://localhost");
      await expect(page.locator("text=Claude Code CLI 不可用")).toBeVisible({ timeout: 10000 });
    } finally {
      await stopTauriApp(badFixture);
    }
  });
});

test.describe("@critical Task Execution", () => {
  test("send input and receive events", async ({ page }) => {
    const fixture = await startTauriApp();
    try {
      await page.goto("tauri://localhost");
      // Select demo project
      await page.click("text=demo-project");
      // Type input
      await page.fill("textarea", "hello");
      await page.click('button[type="submit"]');
      // Wait for result event to render
      await expect(page.locator("text=Mock reply")).toBeVisible({ timeout: 15000 });
    } finally {
      await stopTauriApp(fixture);
    }
  });
});

test.describe("@critical Session & Navigation", () => {
  test("session resume shows historical events", async ({ page }) => {
    const fixture = await startTauriApp();
    try {
      await page.goto("tauri://localhost");
      await page.click("text=demo-project");
      await page.fill("textarea", "hello");
      await page.click('button[type="submit"]');
      // Wait for task to complete
      await expect(page.locator("text=Mock reply")).toBeVisible({ timeout: 15000 });
      // Click on Sessions list and resume
      await page.click("text=Sessions");
      await page.click("text=test-sid"); // session_id from mock
      // Verify replay
      await expect(page.locator("text=Mock reply")).toBeVisible();
    } finally {
      await stopTauriApp(fixture);
    }
  });
});

test.describe("@critical Window Events", () => {
  test("close with active task shows confirmation modal", async ({ page }) => {
    const fixture = await startTauriApp();
    try {
      await page.goto("tauri://localhost");
      await page.click("text=demo-project");
      // Send slow task
      await page.fill("textarea", "slow-task");
      await page.click('button[type="submit"]');
      // Attempt to close (Tauri intercepts this)
      await page.evaluate(() => window.close());
      await expect(page.locator("text=任务进行中")).toBeVisible({ timeout: 5000 });
    } finally {
      await stopTauriApp(fixture);
    }
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/e2e/specs/layer1-critical.spec.ts
git commit -m "test(e2e): add Layer 1 critical E2E spec"
```

---

### Task 9: CI workflow and package scripts

**Files:**
- Create: `.github/workflows/e2e.yml`
- Modify: `apps/desktop/package.json`

- [ ] **Step 1: Create CI workflow**

```yaml
name: E2E Tests
on: [push, pull_request]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - name: Install tauri-driver
        run: cargo install tauri-driver

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build

      - name: Layer 3 — Rust integration
        run: cd apps/desktop/src-tauri && cargo test --test '*'

      - name: Layer 2 — Components
        run: |
          cd apps/desktop
          bun run dev &
          sleep 3
          bun playwright test --config e2e/playwright.config.ts --grep @component

      - name: Layer 1 — Critical E2E
        run: |
          cd apps/desktop
          bun playwright test --config e2e/playwright.config.ts --grep @critical

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results
          path: apps/desktop/e2e/results/
```

- [ ] **Step 2: Update package.json scripts**

Add to `apps/desktop/package.json` scripts section:
```json
"test:e2e:layer1": "playwright test --config e2e/playwright.config.ts --grep @critical",
"test:e2e:layer2": "playwright test --config e2e/playwright.config.ts --grep @component",
"test:e2e:all": "playwright test --config e2e/playwright.config.ts"
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/e2e.yml apps/desktop/package.json
git commit -m "ci: add E2E test workflow and package scripts"
```

---

### Task 10: Self-review and final verification

- [ ] **Step 1: Verify files exist**

Run:
```bash
ls -la apps/desktop/e2e/fixtures/mock-claude.sh
ls -la apps/desktop/e2e/fixtures/test-projects/demo-project/src/index.ts
ls -la apps/desktop/e2e/playwright.config.ts
ls -la apps/desktop/e2e/utils/ipc-mock.ts
ls -la apps/desktop/e2e/utils/tauri-app.ts
ls -la apps/desktop/e2e/specs/layer2-components.spec.ts
ls -la apps/desktop/e2e/specs/layer1-critical.spec.ts
ls -la apps/desktop/src-tauri/tests/cli_mock.rs
ls -la apps/desktop/src-tauri/tests/pty_lifecycle.rs
ls -la apps/desktop/src-tauri/tests/sessions.rs
ls -la .github/workflows/e2e.yml
```

- [ ] **Step 2: Run Rust tests**

Run: `cd apps/desktop/src-tauri && cargo test`
Expected: 32 unit + integration tests PASS.

- [ ] **Step 3: TypeScript check**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit plan**

```bash
git add -f docs/superpowers/plans/2026-04-27-desktop-e2e-test-plan.md
git commit -m "docs: add E2E test implementation plan"
```

- [ ] **Step 5: Spec coverage check**

Skim the spec (docs/superpowers/specs/2026-04-27-desktop-e2e-test-plan-design.md) and confirm:
- [ ] Layer 3 Rust tests: MockClaude helper, PTY lifecycle, session CRUD
- [ ] Layer 2 component tests: PreflightGate (5), Composer (2), StreamRenderer (3), FileTree (4), SessionsList (3), Modal (2)
- [ ] Layer 1 critical E2E: startup (2), task execution (1), session resume (1), window events (1)
- [ ] CI integration: 3 layers in GitHub Actions
