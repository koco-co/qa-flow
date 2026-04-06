# lanhu-mcp 集成设计

## 背景

qa-flow 现有的 `plugins/lanhu/fetch.ts` 使用了不存在的蓝湖 API 端点 (`/api/product/spec`)，无法正确获取 PRD 内容。开源项目 [lanhu-mcp](https://github.com/dsphper/lanhu-mcp) 已实现完整的蓝湖 API 调用链路，经过验证可用。

本次改造将 lanhu-mcp 作为 git submodule 引入，通过 Python 桥接脚本复用其核心逻辑，同时保持 qa-flow 现有接口不变。

## 决策记录

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 引入方式 | git submodule | 可追踪上游更新，代码隔离 |
| 目录位置 | `tools/lanhu/lanhu-mcp/` | 按设计平台分目录，便于后续扩展 Figma/MasterGo |
| Python 环境 | uv | 快速、确定性依赖管理 |
| 调用方式 | subprocess + Python 桥接 | 最简路径，避免 MCP 协议栈开销 |
| 分析视角 | 硬编码 `tester` | qa-flow 是 QA 工具，不暴露无关选项 |
| 适配策略 | fetch.ts 作为适配层 | 对上游 skill 零改动 |

## 目录结构

```
qa-flow/
├── tools/
│   └── lanhu/
│       ├── lanhu-mcp/              # git submodule → github.com/dsphper/lanhu-mcp
│       ├── bridge.py               # 桥接脚本：import lanhu_mcp_server，输出 JSON
│       └── setup.sh                # 初始化：submodule pull + uv sync
├── plugins/lanhu/
│   ├── fetch.ts                    # 适配层（改造）：调用 bridge.py → 输出 raw-prd.md
│   ├── plugin.json                 # 插件声明
│   └── README.md
└── .gitmodules                     # submodule 声明
```

## 数据流

```
用户输入蓝湖 URL
    |
plugins/lanhu/fetch.ts (适配层)
    |-- 1. 解析 URL，提取 tid/pid/docId/pageId
    |-- 2. subprocess: uv run tools/lanhu/bridge.py --url URL
    |-- 3. bridge.py 输出 JSON:
    |       {
    |         "title": "文档标题",
    |         "doc_type": "axure",
    |         "total_pages": 3,
    |         "pages": [
    |           {
    |             "name": "页面名",
    |             "path": "文件夹/页面名",
    |             "content": "markdown 文本",
    |             "images": ["https://..."]
    |           }
    |         ]
    |       }
    |-- 4. 下载图片到 images/
    |-- 5. 组装 raw-prd.md (front-matter + 各页面内容 + 图片引用)
    |-- 6. stdout 输出 FetchOutput JSON
             |
       test-case-gen skill 消费 raw-prd.md
```

## 组件设计

### 1. bridge.py

职责：调用 lanhu-mcp 核心逻辑，输出结构化 JSON 到 stdout。

```
输入: --url <lanhu_url> [--page-id <id>]
输出: JSON (stdout)
错误: JSON (stderr)
环境变量: LANHU_COOKIE (由 fetch.ts 透传)
```

逻辑：
1. import `lanhu_mcp_server.LanhuExtractor`
2. `parse_url(url)` 提取 project_id / doc_id
3. `get_pages_list()` 获取页面树
4. 若有 `--page-id`，筛选目标页面；否则获取全部
5. 逐页调用分析函数，perspective 固定为 `tester`，mode 为 `text_only`
6. 组装结果 JSON 输出

具体函数签名需在实现时对齐 lanhu_mcp_server.py 源码。

### 2. fetch.ts (适配层改造)

保留：
- CLI 接口 (`--url`, `--output`)
- `parseLanhuUrl()` — 简化为仅提取 URL 参数
- `downloadImage()` — 下载图片
- `htmlToMarkdown()` / `slugify()` — 辅助函数
- front-matter + raw-prd.md 输出格式
- FetchOutput JSON 输出

删除：
- `fetchJson()` — 不再直接调蓝湖 API
- `extractTitle()` / `extractTextContent()` — bridge.py 已返回
- 错误的 API URL 构建逻辑 (`/api/product/spec`)

新增：
- subprocess 调用 bridge.py
- LANHU_COOKIE 环境变量透传
- 前置检查：若 `tools/lanhu/lanhu-mcp/.venv` 不存在则自动执行 setup.sh

### 3. setup.sh

职责：一键初始化蓝湖工具链。

步骤：
1. 检查 uv 是否安装，未安装则提示
2. `git submodule update --init --remote tools/lanhu/lanhu-mcp`
3. `cd tools/lanhu/lanhu-mcp && uv sync`

集成到 `/qa-flow init` 的"插件配置"步骤。

### 4. .gitmodules

```
[submodule "tools/lanhu/lanhu-mcp"]
    path = tools/lanhu/lanhu-mcp
    url = https://github.com/dsphper/lanhu-mcp.git
```

## 改动文件清单

| 文件 | 操作 |
|------|------|
| `.gitmodules` | 新增 |
| `tools/lanhu/lanhu-mcp/` | 新增 (submodule) |
| `tools/lanhu/bridge.py` | 新增 |
| `tools/lanhu/setup.sh` | 新增 |
| `plugins/lanhu/fetch.ts` | 改造 |
| `plugins/lanhu/plugin.json` | 微调 |

## 不改动的文件

- `.claude/skills/test-case-gen/` — 零改动
- `.claude/scripts/plugin-loader.ts` — 零改动
- 其他 plugins/ 或 skills/ — 无影响

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| uv 未安装 | setup.sh 提示安装命令 |
| submodule 拉取失败 | 提示检查网络/GitHub 访问 |
| LANHU_COOKIE 未配置 | fetch.ts 现有逻辑保留，输出 MISSING_COOKIE |
| Cookie 过期 | bridge.py 捕获 401/403，输出 COOKIE_EXPIRED |
| bridge.py 执行异常 | fetch.ts 捕获 stderr，输出 BRIDGE_ERROR |
| 页面内容为空 | 正常输出空内容页面，不中断流程 |
