/**
 * engine public API surface (§3.6 AP1-AP5).
 *
 * RULES:
 * - This file is the ONLY public entry point. External callers
 *   (CLI, future desktop app, MCP server) MUST import from "kata-engine"
 *   top level — never reach into kata-engine/src/domain/...
 * - Functions here must be backward-compatible (additions OK; removals
 *   or signature changes require major version bump).
 * - This file MUST stay <= 200 lines (re-exports + facade only;
 *   actual implementation lives in src/domain/).
 *
 * Populated incrementally: P1 ships skeleton; P2-P11 fill in domain functions.
 */

// ── Path resolution ─────────────────────────────────
export {
  repoRoot,
  workspaceDir,
  projectDir,
  listProjects,
} from "./lib/paths.ts";

// ── Project metadata ───────────────────────────────
// (more exports added in P3+ as features/ becomes the norm)

// ── Marker for P1 ─────────────────────────────────
export const KATA_ENGINE_VERSION = "3.0.0-alpha.1" as const;
