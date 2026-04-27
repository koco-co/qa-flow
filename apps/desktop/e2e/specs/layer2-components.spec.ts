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
    let status: Record<string, string> = { kind: "cli_missing" };
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
    await expect(page.locator("text=等待输入")).toBeVisible();
  });

  test("renders assistant text event", async ({ page }) => {
    await mockIpc(page, {
      send_input: () => ({ task_id: "t1", session_id: "s1" }),
    });
    await page.goto("/");
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
