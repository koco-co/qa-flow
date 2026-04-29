# UI 自动化测试 — 协议

## Confirmation policy

- Read-only operations (parse, scope, status check) → no confirmation needed
- Stateful operations (login session, file writes, git operations) → confirm before execution
- Destructive operations (delete, overwrite, clean) → explicit confirmation with impact preview

## Command aliases

| Alias          | Command                                                            |
| -------------- | ------------------------------------------------------------------ |
| `@parse-cases` | `bun run engine/src/ui-autotest/parse-cases.ts --file {{md_path}}` |
| `@merge-specs` | `bun run engine/src/ui-autotest/merge-specs.ts ...`                |

## Exception handling

| Situation                           | Response                                            |
| ----------------------------------- | --------------------------------------------------- |
| Session login fails                 | Retry with new credentials; ask user if env changes |
| Test compilation error              | Caught in Step 3 case agent fix loop                |
| Flaky tests (intermittent failures) | Retry 3x; report as flaky if inconsistent           |
| Missing Archive MD                  | Ask user for file path or fallback to manual input  |
| Subagent timeout                    | Skip case, continue with remaining tasks            |
| Lint violation (severe)             | Report to user, ask whether to proceed              |
