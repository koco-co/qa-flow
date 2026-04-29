# ui-autotest — Rules

- Never weaken assertions to make tests pass — report real failures.
- Use `.toBeTruthy()` for boolean checks, never to bypass empty arrays or rendering anomalies.
- Assert numeric/text values must match PRD/case specification exactly.
- Test selectors: prefer `data-testid` over text/CSS where available.
- Source sync and writeback are separate confirmation gates — never merge.
- Ant Design 通用交互封装（Select / Modal / Drawer / Table 等）统一维护在 `lib/playwright/ant-design/`，通过 `workspace/{project}/shared/helpers/index.ts` re-export。发现交互模式可复用时，判断：若为**跨站点通用、不依赖业务/URL**的模式，改 `lib/playwright/ant-design/` 本体；若为**当前站点特有**的模式，记录到 `workspace/{project}/knowledge/sites/`。不要在单个 spec 文件或 `shared/helpers/` 中重复实现。
