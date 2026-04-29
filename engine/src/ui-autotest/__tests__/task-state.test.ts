import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const {
  readTaskState,
  writeTaskState,
  createTaskState,
  claimPendingTask,
  updateTask,
  updateTasks,
  detectResume,
  calcStats,
  resolveTestsDirFromFile,
  stateFilePath,
} = await import("../task-state.ts");

// ────────────────────────────────────────────────────────────
// 测试夹具
// ────────────────────────────────────────────────────────────

const SAMPLE_TASKS = [
  {
    id: "t01",
    title: "【P0】验证列表默认加载",
    priority: "P0" as const,
    page: "列表页",
    steps: [
      { step: "进入列表页", expected: "页面正常加载" },
      { step: "查看列表数据", expected: "显示最近记录" },
    ],
    preconditions: "",
  },
  {
    id: "t02",
    title: "【P1】验证搜索功能",
    priority: "P1" as const,
    page: "列表页",
    steps: [
      { step: "进入列表页", expected: "页面正常加载" },
      { step: "输入关键词", expected: "列表更新" },
    ],
    preconditions: "已有测试数据",
  },
  {
    id: "t03",
    title: "【P2】验证分页",
    priority: "P2" as const,
    page: "列表页",
    steps: [
      { step: "进入列表页", expected: "页面正常加载" },
      { step: "点击下一页", expected: "显示第二页数据" },
    ],
    preconditions: "",
  },
];

let TMP_DIR: string;
let TESTS_DIR: string;

beforeEach(() => {
  TMP_DIR = join(tmpdir(), `kata-task-state-test-${process.pid}-${Date.now()}`);
  TESTS_DIR = join(TMP_DIR, "tests");
  mkdirSync(TESTS_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

// ────────────────────────────────────────────────────────────
// 路径工具
// ────────────────────────────────────────────────────────────

describe("resolveTestsDirFromFile", () => {
  it("从 archive.md 路径推导 tests 目录", () => {
    const result = resolveTestsDirFromFile(
      "/workspace/project/features/202604-xxx/archive.md",
    );
    expect(result).toBe("/workspace/project/features/202604-xxx/tests");
  });

  it("处理相对路径", () => {
    const result = resolveTestsDirFromFile("features/202604-xxx/archive.md");
    expect(result.endsWith("/features/202604-xxx/tests")).toBe(true);
  });
});

describe("stateFilePath", () => {
  it("返回正确的 .task-state.json 路径", () => {
    expect(stateFilePath("/a/b/tests")).toBe("/a/b/tests/.task-state.json");
  });
});

// ────────────────────────────────────────────────────────────
// 读写
// ────────────────────────────────────────────────────────────

describe("readTaskState / writeTaskState", () => {
  it("文件不存在时返回 null", () => {
    expect(readTaskState(TESTS_DIR)).toBeNull();
  });

  it("写入并读取完整 TaskState", () => {
    const state = createTaskState({
      project: "test-proj",
      feature: "202604-xxx",
      suite_name: "测试套件",
      source_file: "/tmp/archive.md",
      tasks: SAMPLE_TASKS,
    });

    writeTaskState(TESTS_DIR, state);

    const loaded = readTaskState(TESTS_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded!.project).toBe("test-proj");
    expect(loaded!.feature).toBe("202604-xxx");
    expect(loaded!.suite_name).toBe("测试套件");
    expect(loaded!.tasks.length).toBe(3);
    expect(loaded!.workflow_status).toBe("initialized");
  });

  it("updated_at 是合法 ISO 时间戳", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS.slice(0, 1),
    });

    writeTaskState(TESTS_DIR, state);
    const loaded = readTaskState(TESTS_DIR);
    expect(loaded!.meta.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ────────────────────────────────────────────────────────────
// createTaskState
// ────────────────────────────────────────────────────────────

describe("createTaskState", () => {
  it("所有任务初始状态为 pending, phase 为 writing", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });

    for (const task of state.tasks) {
      expect(task.status).toBe("pending");
      expect(task.phase).toBe("writing");
    }
  });

  it("stats 与任务列表一致", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });

    expect(state.stats.total).toBe(3);
    expect(state.stats.p0_total).toBe(1);
    expect(state.stats.pending).toBe(3);
    expect(state.stats.completed).toBe(0);
  });

  it("schema_version 固定为 3", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: [],
    });

    expect(state.schema_version).toBe("3");
  });

  it("每个任务有 created_at 和 updated_at", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });

    for (const task of state.tasks) {
      expect(task.created_at).toBeTruthy();
      expect(task.updated_at).toBeTruthy();
    }
  });
});

// ────────────────────────────────────────────────────────────
// claimPendingTask
// ────────────────────────────────────────────────────────────

describe("claimPendingTask", () => {
  it("领取第一个 pending 任务", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    writeTaskState(TESTS_DIR, state);

    const result = claimPendingTask(TESTS_DIR, "agent-1");
    expect(result).not.toBeNull();
    expect(result!.task.id).toBe("t01");
    expect(result!.task.status).toBe("in_progress");
    expect(result!.task.assignee).toBe("agent-1");

    // 文件已持久化
    const reloaded = readTaskState(TESTS_DIR);
    expect(reloaded!.tasks[0].status).toBe("in_progress");
    expect(reloaded!.tasks[0].assignee).toBe("agent-1");
  });

  it("无 pending 任务时返回 null", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS.slice(0, 1),
    });
    state.tasks[0].status = "completed";
    state.workflow_status = "in_progress";
    writeTaskState(TESTS_DIR, state);

    const result = claimPendingTask(TESTS_DIR, "agent-2");
    expect(result).toBeNull();
  });

  it("文件不存在时返回 null", () => {
    expect(claimPendingTask(TESTS_DIR, "agent-1")).toBeNull();
  });

  it("更新 stats 中的 pending/in_progress 计数", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    writeTaskState(TESTS_DIR, state);

    claimPendingTask(TESTS_DIR, "agent-1");
    const reloaded = readTaskState(TESTS_DIR);
    expect(reloaded!.stats.pending).toBe(2);
    expect(reloaded!.stats.in_progress).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────
// updateTask
// ────────────────────────────────────────────────────────────

describe("updateTask", () => {
  it("更新任务字段并写回", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    writeTaskState(TESTS_DIR, state);

    updateTask(TESTS_DIR, "t01", {
      status: "completed",
      phase: "done",
      script_path: "cases/t01-xxx.ts",
    });

    const reloaded = readTaskState(TESTS_DIR);
    expect(reloaded!.tasks[0].status).toBe("completed");
    expect(reloaded!.tasks[0].phase).toBe("done");
    expect(reloaded!.tasks[0].script_path).toBe("cases/t01-xxx.ts");
  });

  it("不存在的任务 ID 返回 null", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS.slice(0, 1),
    });
    writeTaskState(TESTS_DIR, state);

    const result = updateTask(TESTS_DIR, "t99", { status: "completed" });
    expect(result).toBeNull();
  });

  it("更新后 recalcStats 自动刷新", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    writeTaskState(TESTS_DIR, state);

    updateTask(TESTS_DIR, "t01", { status: "completed", phase: "done" });
    updateTask(TESTS_DIR, "t02", { status: "failed" });

    const reloaded = readTaskState(TESTS_DIR);
    expect(reloaded!.stats.completed).toBe(1);
    expect(reloaded!.stats.failed).toBe(1);
    expect(reloaded!.stats.pending).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────
// updateTasks（批量）
// ────────────────────────────────────────────────────────────

describe("updateTasks", () => {
  it("批量更新多个任务", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    writeTaskState(TESTS_DIR, state);

    updateTasks(TESTS_DIR, [
      { id: "t01", patch: { status: "completed", phase: "done" } },
      { id: "t02", patch: { status: "failed", error: { message: "timeout", phase: "fixing", attempts: 2 } } },
    ]);

    const reloaded = readTaskState(TESTS_DIR);
    expect(reloaded!.tasks[0].status).toBe("completed");
    expect(reloaded!.tasks[1].status).toBe("failed");
    expect(reloaded!.tasks[1].error?.message).toBe("timeout");
    expect(reloaded!.tasks[2].status).toBe("pending");
  });
});

// ────────────────────────────────────────────────────────────
// detectResume
// ────────────────────────────────────────────────────────────

describe("detectResume", () => {
  it("文件不存在时返回 null", () => {
    expect(detectResume(TESTS_DIR)).toBeNull();
  });

  it("completed 状态时 can_resume=false", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    state.workflow_status = "completed";
    state.tasks.forEach((t) => {
      t.status = "completed";
      t.phase = "done";
    });
    state.stats = calcStats(state.tasks);
    writeTaskState(TESTS_DIR, state);

    const result = detectResume(TESTS_DIR);
    expect(result).not.toBeNull();
    expect(result!.can_resume).toBe(false);
    expect(result!.summary).toContain("已完成");
  });

  it("有 in_progress 任务时检测到 stale_locks", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    state.tasks[0].status = "in_progress";
    state.tasks[0].assignee = "agent-writer";
    state.stats = calcStats(state.tasks);
    state.workflow_status = "in_progress";
    writeTaskState(TESTS_DIR, state);

    const result = detectResume(TESTS_DIR);
    expect(result).not.toBeNull();
    expect(result!.can_resume).toBe(true);
    expect(result!.stale_locks.length).toBe(1);
    expect(result!.stale_locks[0]).toContain("t01");
  });

  it("部分完成时 can_resume=true", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: SAMPLE_TASKS,
    });
    state.tasks[0].status = "completed";
    state.tasks[0].phase = "done";
    state.stats = calcStats(state.tasks);
    state.workflow_status = "in_progress";
    writeTaskState(TESTS_DIR, state);

    const result = detectResume(TESTS_DIR);
    expect(result).not.toBeNull();
    expect(result!.can_resume).toBe(true);
    expect(result!.summary).toContain("1/3");
  });
});

// ────────────────────────────────────────────────────────────
// calcStats
// ────────────────────────────────────────────────────────────

describe("calcStats", () => {
  it("按状态统计分布", () => {
    const state = createTaskState({
      project: "p",
      feature: "f",
      suite_name: "s",
      source_file: "a.md",
      tasks: [
        { id: "t01", title: "t1", priority: "P0", page: "p", steps: [], preconditions: "" },
        { id: "t02", title: "t2", priority: "P1", page: "p", steps: [], preconditions: "" },
        { id: "t03", title: "t3", priority: "P0", page: "p", steps: [], preconditions: "" },
        { id: "t04", title: "t4", priority: "P2", page: "p", steps: [], preconditions: "" },
      ],
    });

    // t01 → completed, t02 → failed
    const now = new Date().toISOString();
    state.tasks[0].status = "completed";
    state.tasks[0].phase = "done";
    state.tasks[0].updated_at = now;
    state.tasks[1].status = "failed";
    state.tasks[1].updated_at = now;

    const stats = calcStats(state.tasks);
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(2);
    expect(stats.p0_total).toBe(2);
    expect(stats.p0_completed).toBe(1);
  });
});
