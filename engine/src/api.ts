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

// Placeholder — will re-export from ./domain/* in P1 Task 14
export const PLACEHOLDER = "kata-engine api surface" as const;
