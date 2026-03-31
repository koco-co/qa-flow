# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**Design Tool (PRD Source):**
- Lanhu (蓝湖) — Primary PRD/design document source
  - SDK/Client: `fastmcp` + `httpx` + `playwright` (Python MCP server at `tools/lanhu-mcp/lanhu_mcp_server.py`)
  - Auth: `LANHU_COOKIE` env var (browser cookie, manually obtained)
  - Secondary cookie: `DDS_COOKIE` env var (dds.lanhuapp.com subdomain)
  - Base URLs: `https://lanhuapp.com`, `https://dds.lanhuapp.com`, `https://axure-file.lanhuapp.com`
  - Access pattern: Headless Playwright browser + direct HTTPS API calls

**Notification:**
- Feishu (飞书) Robot Webhook — Optional team notification
  - Auth: `FEISHU_WEBHOOK_URL` env var (Webhook URL with embedded key)
  - Endpoint: `https://open.feishu.cn/open-apis/bot/v2/hook/<webhook-key>`
  - Used from: `tools/lanhu-mcp/lanhu_mcp_server.py`

## Data Storage

**Databases:**
- None — No database. All persistent state is file-based.

**File Storage:**
- Local filesystem only
  - XMind outputs: `cases/xmind/<module>/v{version}/`
  - Archive Markdown: `cases/archive/<module>/v{version}/`
  - PRD/requirements: `cases/requirements/<module>/v{version}/`
  - Historical CSV sources: `cases/history/`
  - HTML reports: `reports/bugs/`, `reports/conflicts/`
  - Image assets: `assets/images/`
  - Lanhu MCP data cache: `tools/lanhu-mcp/data/` (controlled by `DATA_DIR` env var)

**Caching:**
- In-memory metadata cache inside `tools/lanhu-mcp/lanhu_mcp_server.py` (`_metadata_cache` dict, keyed by version ID)
- File-based XMind append/replace cache: existing `.xmind` files read back before update via `jszip`

## Authentication & Identity

**Auth Provider:**
- None — No identity provider or user authentication system
- Lanhu access relies on a manually-copied browser session cookie (`LANHU_COOKIE`)

## Source Code Repositories (Read-Only References)

**DTStack backend repos** (accessed via `git -C <path>` read-only operations):
- `dt-center-assets` → `.repos/dt-insight-web/dt-center-assets/`
- `dt-center-metadata` → `.repos/dt-insight-web/dt-center-metadata/`
- `DAGScheduleX` → `.repos/dt-insight-plat/DAGScheduleX/`
- `datasourcex` → `.repos/dt-insight-plat/datasourcex/`
- `dt-center-ide` → `.repos/dt-insight-plat/dt-center-ide/`
- `dt-public-service` → `.repos/dt-insight-plat/dt-public-service/`
- `SQLParser` → `.repos/dt-insight-plat/SQLParser/`
- `engine-plugins` → `.repos/dt-insight-engine/engine-plugins/`
- `flink` → `.repos/dt-insight-engine/flink/`

**DTStack frontend repos:**
- `dt-insight-studio-front` → `.repos/dt-insight-front/dt-insight-studio/`

**Custom (岚图定制) repos:**
- `dt-insight-studio-custom` → `.repos/CustomItem/dt-insight-studio/`
- `dt-center-assets-custom` → `.repos/CustomItem/dt-center-assets/`
- `dt-center-metadata-custom` → `.repos/CustomItem/dt-center-metadata/`
- `dt-public-service-custom` → `.repos/CustomItem/dt-public-service/`
- Plus `DatasourceX-custom`, `dagschedulex-custom`, `SQLParser-custom`, `dt-center-ide-custom`

Branch resolution is driven by `config/repo-branch-mapping.yaml` and executed via `sync-source-repos.mjs`.

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Lanhu MCP server writes logs to `.claude/tmp/lanhu-mcp.log` (configured in `.claude/config.json` `integrations.lanhuMcp.logFile`)
- `DEBUG=true` env var enables verbose output in `tools/lanhu-mcp/lanhu_mcp_server.py`

## CI/CD & Deployment

**Hosting:**
- Local workstation only — no cloud deployment

**CI Pipeline:**
- None — Tests run manually via `node .claude/tests/run-all.mjs`

## Environment Configuration

**Required env vars (Lanhu MCP):**
- `LANHU_COOKIE` — Mandatory; Lanhu session cookie for API access
- `DDS_COOKIE` — Optional; falls back to `LANHU_COOKIE` if unset

**Optional env vars (Lanhu MCP):**
- `FEISHU_WEBHOOK_URL` — Feishu robot notification; disabled if empty
- `SERVER_HOST` — Default `0.0.0.0`
- `SERVER_PORT` — Default `8000`
- `DATA_DIR` — Default `./data` (relative to `tools/lanhu-mcp/`)
- `HTTP_TIMEOUT` — Default `30` seconds
- `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` — Default `1920x1080`
- `DEBUG` — Default `false`

**Secrets location:**
- `tools/lanhu-mcp/.env` (not committed; template at `tools/lanhu-mcp/config.example.env`)

## Webhooks & Callbacks

**Incoming:**
- None — The Lanhu MCP server exposes an MCP endpoint at `http://127.0.0.1:8000/mcp` consumed by the Claude client, not a public webhook

**Outgoing:**
- Feishu robot webhook (`https://open.feishu.cn/open-apis/bot/v2/hook/*`) — optional, POST on completion events

## MCP (Model Context Protocol) Integration

**Lanhu MCP Server:**
- Runtime path: `tools/lanhu-mcp/`
- Entry: `tools/lanhu-mcp/lanhu_mcp_server.py` (FastMCP server named "Lanhu Axure Extractor")
- Listening at: `http://127.0.0.1:8000/mcp`
- Managed by: `.claude/skills/using-qa-flow/scripts/lanhu-mcp-runtime.mjs` (start/status/paths commands)
- Cookie refresh helper: `.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py`
- Used by: `test-case-generator` skill when a Lanhu URL is provided as input

---

*Integration audit: 2026-03-31*
