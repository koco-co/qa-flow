# Feature Landscape

**Domain:** Claude Code Skills-based QA Automation Suite (universal framework)
**Researched:** 2026-03-31

---

## Context: What This Tool Is

qa-flow is not a traditional test management SaaS. It is a **Claude Code Skills suite** — a collection of AI-driven workflow definitions that QA engineers invoke through natural language in Claude Code CLI. This changes the feature landscape significantly:

- No web UI to build or host
- No user accounts, RBAC, or subscription model
- Features are "Skills" (markdown-defined instruction sets) + supporting Node.js scripts
- The distribution unit is a GitHub repo that users clone and configure
- Extensibility means "add a new Skill file" or "edit config.json"

This means the feature comparison is not against TestRail or Testsigma. The closest comparisons are against other Claude Code agent skill collections (e.g., the `agents` community repos, Composio skill packs) and against do-it-yourself Playwright + LLM setups.

---

## Table Stakes

Features users expect. Missing = tool feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PRD/requirement parsing from file or URL | Without this, users must pre-process inputs manually | Low | Existing in v1 via lanhu-mcp + file read |
| Test case generation from structured requirement | The core value proposition; without it there is no product | High | Existing in v1 (multi-step pipeline) |
| XMind output | Chinese QA teams' de facto deliverable format; missing = output is unusable at handoff | Med | Existing in v1 via json-to-xmind.mjs |
| Markdown archive output | Required for version control, diff review, and historical search | Low | Existing in v1 |
| Checkpoint/resume on interrupted generation | LLM sessions time out; without resume users restart entire pipeline | Med | Existing in v1 via .qa-state-*.json |
| Quality threshold auto-decision (stop/warn/fix) | Without this, bad cases silently propagate; users lose trust in tool | Med | Existing in v1 (15%/40% thresholds) |
| Module-level re-run | Large PRDs have 10+ modules; re-running one should not regenerate all | Med | Existing in v1 |
| One-command project initialization | New users should not need to read internals to set up; onboarding friction kills adoption | Med | Partially exists; needs universalization |
| Human-readable config (no code required) | QA engineers are not necessarily JS developers; config edits must be declarative | Low | Existing via config.json; needs templating |
| Intermediate JSON format (portable exchange) | Allows scripts, other tools, and future integrations to consume test cases without re-generating | Med | Existing in v1 |
| Source code reference during case generation (optional) | Cases that reference actual frontend components/routes are more precise | High | Existing in v1 via .repos/ read-only sync |
| Shortcut/symlink to latest output | Without this, users must navigate version directories to find the most recent file | Low | Existing in v1 via latest-output.xmind |
| Error reporting when script fails | Claude must surface Node.js script errors clearly, not silently swallow them | Low | Existing pattern; needs consistency |

---

## Differentiators

Features that set this tool apart. Not universally expected, but meaningfully valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-modal PRD enhancement (image parsing) | Turns screenshot-heavy requirement docs into fully described text; LLM can then reason about UI states it would otherwise miss | High | Existing in v1; rare in CLI tools |
| Parallel sub-agent Writer pattern | Generates cases for multiple modules simultaneously; production-tested at DTStack scale | High | Existing in v1; architectural differentiator |
| Reviewer sub-agent with auto-correction | Enforces writing rules without human review loop; three-tier abort escalation is novel | High | Existing in v1 |
| PRD health check scoring | Gives author early feedback before generation starts; prevents garbage-in-garbage-out | Med | Existing in v1 |
| Historical case archive + index search | Context-aware generation informed by prior cases; reduces duplication | Med | Existing in v1 via INDEX.json brainstorm step |
| Playwright UI automation script generation from test cases | Closes the loop from requirement → case → executed script; not common in LLM-native tools | High | Planned; requires Playwright MCP or CLI integration |
| Bidirectional sync: script result → MD archive | Executed test results annotate the archive (pass/fail/flaky); creates living documentation | High | Planned; differentiating capability |
| Bug report auto-generation from failed scripts | Combines stack trace, UI snapshot, and test case context into structured bug report | High | Planned; extends existing code-analysis-report skill |
| Source code branch auto-sync before generation | Guarantees cases are written against the correct code state, not a stale branch | Med | Existing in v1; rare in other tools |
| IM notification integration (DingTalk/Feishu/WeCom) | Chinese enterprise QA teams communicate primarily on DingTalk/Feishu; delivery loop closes in their workflow | Med | Planned; webhook-based, not complex |
| Zentao (禅道) bug auto-submit | Standard bug tracker in Chinese enterprise; auto-submit + assign eliminates copy-paste | Med | Planned; REST API integration |
| Universal project init with structure inference | User points tool at any project; tool infers module structure from existing files rather than requiring manual config | Med | Planned; key to open-source adoption |
| Historical case import (CSV/XMind → archive) | Teams migrating from Excel/XMind can bring prior work into the system | Med | Existing in v1 |
| Open standard Skill format (agentskills.io portable) | Skills written for qa-flow work in other Claude Code clients; portability future-proofs user investment | Low | Agent Skills open standard adopted across GitHub Copilot, Cursor, Codex CLI; no extra work needed |
| Lanhu (蓝湖) URL direct import | Chinese product teams use Lanhu as primary PRD tool; one-URL workflow eliminates export steps | Med | Existing in v1 |

---

## Anti-Features

Features to deliberately NOT build. Each has a reason grounded in scope, architecture, or opportunity cost.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Web dashboard / admin UI | Building a web app requires auth, hosting, maintenance, and moves the tool away from CLI-native developer workflow; out of scope per PROJECT.md | Stay CLI-only via Claude Code; output files are the UI |
| User accounts and RBAC | No server means no session state; multi-user is a team-level git workflow problem, not a tool problem | Use git branching and PR review for team collaboration |
| Built-in test runner / CI orchestration | Playwright already handles execution; wrapping it adds maintenance surface without value | Integrate with Playwright CLI directly; CI integration is a future milestone |
| API automation testing | Different skill set, different mental model (HTTP contracts vs. UI interactions); scope creep risk | Scope to UI layer in v2 per PROJECT.md |
| Mobile automation (Appium, etc.) | Separate device ecosystem, driver complexity; WebUI first is correct sequencing | Future milestone after WebUI is stable |
| Performance / load testing | Different concern entirely (k6, Gatling); a QA case generation tool is not a load testing tool | Out of scope per PROJECT.md |
| AI self-healing test selectors (auto) | Adds non-determinism to what should be a deterministic output; maintenance cost is high | Playwright's built-in locator resilience is sufficient; flag broken selectors to human |
| Built-in test data management service | Overengineering for a Skills-based tool; test data lives in the case archive as examples | Reference real data in case templates; let users manage their test environments |
| Subscription / SaaS offering | Contradicts open-source plan; monetization is out of scope for v2 | Open source on GitHub |
| Graphical test recorder (codeless UI) | Targets non-technical testers; qa-flow's user is a QA engineer comfortable with CLI | Playwright's codegen already solves this better than we could |
| Tight Jira integration (creating test plans) | Jira test management (Zephyr, Xray) is a separate ecosystem; integration complexity is high for marginal value | Output markdown + XMind that can be imported; do not duplicate test management systems |

---

## Feature Dependencies

Dependencies between features (B requires A to work correctly):

```
PRD file/URL parsing
  └── PRD health check scoring
  └── PRD enhancement (image parsing)
        └── Test case generation (multi-step pipeline)
              └── Intermediate JSON format
                    ├── XMind output
                    ├── Markdown archive output
                    └── Playwright script generation
                          └── Bidirectional sync (script result → archive)
                                └── Bug report auto-generation

Source code branch sync
  └── Test case generation (DTStack mode; source-informed cases)

Project initialization (config.json with module keys)
  └── All output routing (XMind, archive, requirements paths)
  └── Notification integration (webhook endpoints per project)
  └── Bug tracker integration (Zentao project ID, Jira project key)

Intermediate JSON format
  └── Historical case archive + index (brainstorm step)
  └── Parallel Writer sub-agents (each outputs partial JSON)
        └── Reviewer sub-agent (merges + quality-gates partial JSONs)

Playwright script generation
  └── Playwright CLI/MCP installed in user environment
  └── Branch → frontend environment URL mapping (config.json)
```

---

## MVP Recommendation

For the universal framework milestone (v2), prioritize:

1. **Universal project initialization** — without this, no new user can adopt the tool
2. **PRD parsing + test case generation** — the core pipeline is already built; the work is removing DTStack coupling
3. **XMind + archive output** — table stakes for the target user base; already exists
4. **Checkpoint/resume** — already exists; must survive the generalization refactor
5. **One differentiator: IM notification (DingTalk/Feishu webhook)** — low complexity, high perceived value for Chinese enterprise QA teams; demonstrates the integration extension model

Defer to subsequent milestones:
- **Playwright script generation**: Depends on URL mapping infrastructure and Playwright MCP/CLI setup; high complexity, high value, correct to sequence after core pipeline is universal
- **Bidirectional sync (script result → archive)**: Requires Playwright integration to exist first
- **Bug report auto-generation**: Requires both Playwright results and code analysis skill to be wired together
- **Zentao/Jira integration**: Useful but not blocking adoption; deliver after IM notifications validate the integration model
- **Historical case import**: Exists in v1; preserve functionality but not in critical path for generalization

---

## Feature Complexity Reference

Complexity ratings used above:

| Rating | Meaning |
|--------|---------|
| Low | Primarily config/template changes; no new runtime logic |
| Med | New Node.js script or Skill step; 1-3 days implementation |
| High | Multi-component coordination, external API, or LLM orchestration change; 3-10 days |

---

## Sources

- [TestRail QA Automation Tools Overview 2026](https://www.testrail.com/blog/qa-automation-tools/) — MEDIUM confidence (commercial vendor, self-serving but accurate feature catalog)
- [Testomat.io AI Test Management Tools 2026](https://testomat.io/blog/top-ai-test-management-tools/) — MEDIUM confidence
- [LLM-Powered Test Case Generation: Frugal Testing](https://www.frugaltesting.com/blog/llm-powered-test-case-generation-enhancing-coverage-and-efficiency) — MEDIUM confidence
- [Playwright MCP Modern Guide: Testomat.io](https://testomat.io/blog/playwright-mcp-modern-test-automation-from-zero-to-hero/) — MEDIUM confidence
- [Microsoft: Playwright MCP for AI-Driven Test Automation](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/how-to-integrate-playwright-mcp-for-ai-driven-test-automation/4470372) — HIGH confidence (official Microsoft source)
- [Microsoft DevOps Blog: Manual Testing to AI-Generated Automation](https://devblogs.microsoft.com/devops/from-manual-testing-to-ai-generated-automation-our-azure-devops-mcp-playwright-success-story/) — HIGH confidence (official Microsoft source)
- [Claude Code Agent Skills Docs](https://code.claude.com/docs/en/skills) — HIGH confidence (official Anthropic source)
- [Agent Skills Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — HIGH confidence (official Anthropic source)
- [Open Source Test Management Tools 2026: BrowserStack](https://www.browserstack.com/guide/best-open-source-test-management-tools) — MEDIUM confidence
- [n8n AI Bug Triage Workflow (Jira + Slack)](https://n8n.io/workflows/11697-ai-powered-bug-triage-system-with-openai-jira-and-slack-alerts/) — MEDIUM confidence
- [Playwright CLI vs MCP token comparison: TestDino](https://testdino.com/blog/playwright-mcp/) — MEDIUM confidence (2026 recommendation: CLI preferred over MCP for coding agents with filesystem access)
