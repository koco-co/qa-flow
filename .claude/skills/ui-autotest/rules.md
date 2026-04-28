# ui-autotest — Rules

- Never weaken assertions to make tests pass — report real failures.
- Use `.toBeTruthy()` for boolean checks, never to bypass empty arrays or rendering anomalies.
- Assert numeric/text values must match PRD/case specification exactly.
- Test selectors: prefer `data-testid` over text/CSS where available.
- Source sync and writeback are separate confirmation gates — never merge.
