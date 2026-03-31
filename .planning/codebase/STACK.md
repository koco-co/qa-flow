# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- JavaScript (ES Modules) - All automation scripts, test helpers, and skill orchestration scripts
- Python 3.10+ - Lanhu MCP server (`tools/lanhu-mcp/lanhu_mcp_server.py`)

**Secondary:**
- Markdown - PRD documents, archive cases, skill prompts, rules
- YAML - Repo/branch mapping config (`config/repo-branch-mapping.yaml`)
- JSON - Intermediate test-case format, state files (`.qa-state-*.json`)

## Runtime

**Environment:**
- Node.js v25.8.1 (current environment; no `.nvmrc` pinning detected)
- Python 3.9.6 (system) / Python 3.14 (venv inside `tools/lanhu-mcp/.venv`)

**Package Manager:**
- npm (lockfiles present at `.claude/shared/scripts/package-lock.json`, `.claude/skills/xmind-converter/scripts/package-lock.json`, `.claude/skills/archive-converter/scripts/package-lock.json`, `.claude/tests/package-lock.json`)
- pip + venv for Python (`tools/lanhu-mcp/.venv/`)
- Lockfile: `package-lock.json` present in each script sub-package; `requirements.txt` present for Python

## Frameworks

**Core:**
- None — This is a Claude AI workflow project. The "framework" is the Claude Agent SDK and prompt engineering; there is no application server or UI framework.

**Testing:**
- Custom Node.js test runner (`node` + `assert`) — Test files are plain `.mjs` files prefixed `test-`, run via `node .claude/tests/run-all.mjs`
- `pytest` + `pytest-asyncio` + `pytest-cov` (dev dependency in `tools/lanhu-mcp/pyproject.toml`) — Used for Lanhu MCP server Python tests in `tools/lanhu-mcp/tests/`

**Build/Dev:**
- No transpilation or bundling — scripts run directly with `node`
- `setuptools` + `wheel` — Python package build for `lanhu-mcp-server`
- `black` — Python formatter (dev dependency)
- `flake8` — Python linter (dev dependency)
- `isort` — Python import sorter (dev dependency)

## Key Dependencies

**Critical:**
- `jszip` ^3.10.1 — Reading and writing `.xmind` files (ZIP-based format). Present in all four `package.json` manifests: `shared/scripts`, `xmind-converter/scripts`, `archive-converter/scripts`, `tests`
- `xmind-generator` ^1.0.1 — High-level XMind node/topic/workbook API used in `json-to-xmind.mjs`. Only in `.claude/skills/xmind-converter/scripts/package.json`

**Infrastructure (Python / Lanhu MCP):**
- `fastmcp` >=2.0.0 — MCP server framework; exposes Lanhu tools via Model Context Protocol (`tools/lanhu-mcp/lanhu_mcp_server.py`)
- `httpx` >=0.27.0 — Async HTTP client for Lanhu API calls
- `playwright` >=1.48.0 — Headless browser for Lanhu page rendering / screenshots
- `beautifulsoup4` >=4.12.0 — HTML parsing of Lanhu Axure page content
- `lxml` >=5.0.0 — Fast XML/HTML parser (BS4 backend)
- `python-dotenv` >=1.0.0 — Loads `tools/lanhu-mcp/.env` at startup
- `htmlmin2` >=0.1.12 — HTML minification for generated reports

## Configuration

**Environment:**
- Lanhu MCP reads `tools/lanhu-mcp/.env` (not committed). Template at `tools/lanhu-mcp/config.example.env`.
- Key env vars: `LANHU_COOKIE`, `DDS_COOKIE`, `FEISHU_WEBHOOK_URL`, `SERVER_HOST`, `SERVER_PORT`, `DATA_DIR`, `HTTP_TIMEOUT`, `VIEWPORT_WIDTH`, `VIEWPORT_HEIGHT`, `DEBUG`
- All skill/script configuration is centralized in `.claude/config.json` (module paths, repo paths, integration settings, shortcut symlink names)

**Build:**
- No build step required for Node.js scripts — run directly with `node`
- Python: `pip install -r tools/lanhu-mcp/requirements.txt` (or `pyproject.toml` extras)

## Platform Requirements

**Development:**
- macOS / Linux (scripts use Unix paths; `trash-cleanup.sh` is bash)
- Node.js ≥18 (uses ES module `import`, `fetch` API, `AbortSignal.timeout`)
- Python ≥3.10 (required by `pyproject.toml`)
- `git` CLI (used by `sync-source-repos.mjs` via `spawnSync`)
- Playwright browser binaries installed via `playwright install`

**Production:**
- Local workstation only — this project is a personal AI workflow assistant, not a deployed service
- Lanhu MCP server runs locally on `http://127.0.0.1:8000` (see `config.json` `integrations.lanhuMcp`)
- Source repos cloned locally under `.repos/` (read-only references)

---

*Stack analysis: 2026-03-31*
