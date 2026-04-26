export type PreflightStatus =
  | { kind: "ready"; version: string }
  | { kind: "cli_missing" }
  | { kind: "not_logged_in"; version: string };

export interface ProjectDto {
  name: string;
  display_name: string | null;
  path: string;
  last_active_at: number | null;
}

export type PtyState = "NotSpawned" | "Spawning" | "Idle" | "Active" | "Closed";
export type TaskStatus = "running" | "success" | "failed" | "cancelled";

export interface TaskStarted {
  task_id: string;
  session_id: string | null;
}

export interface TaskDto {
  id: string;
  command: string;
  session_id: string | null;
  started_at: number;
  ended_at: number | null;
  status: TaskStatus;
  pinned: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

export type StreamEvent =
  | { type: "system"; subtype: string; [key: string]: unknown }
  | { type: "assistant"; message: AssistantMessage }
  | { type: "user"; message: UserMessage }
  | { type: "result"; total_cost_usd?: number; duration_ms?: number; [k: string]: unknown }
  | { type: string; [k: string]: unknown };

export interface AssistantMessage {
  content: AssistantContent[];
}
export type AssistantContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

export interface UserMessage {
  content: UserContent[];
}
export type UserContent =
  | { type: "text"; text: string }
  | { type: "tool_result"; tool_use_id: string; content: string | Array<{ type: string; text?: string }>; is_error?: boolean };

export interface TaskEventPayload {
  task_id: string;
  event: StreamEvent;
}

export interface TaskStatusPayload {
  task_id: string;
  status: TaskStatus;
  project: string;
}
