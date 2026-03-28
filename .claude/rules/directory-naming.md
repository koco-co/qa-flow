# 目录命名约定

> 技术层（目录名/文件名/变量名）使用英文，面向用户的文档使用中文。

## 模块 key 与路径别名

| 中文名   | 模块 key        | 类型    | XMind 路径                         | Archive 路径                         | Requirements 路径                  |
| -------- | --------------- | ------- | ---------------------------------- | ------------------------------------ | ---------------------------------- |
| 离线开发 | batch-works     | DTStack | `cases/xmind/batch-works/`         | `cases/archive/batch-works/`         | — |
| 数据资产 | data-assets     | DTStack | `cases/xmind/data-assets/`         | `cases/archive/data-assets/`         | `cases/requirements/data-assets/` |
| 统一查询 | data-query      | DTStack | `cases/xmind/data-query/`          | `cases/archive/data-query/`          | — |
| 变量中心 | variable-center | DTStack | `cases/xmind/variable-center/`     | `cases/archive/variable-center/`     | — |
| 公共组件 | public-service  | DTStack | `cases/xmind/public-service/`      | `cases/archive/public-service/`      | — |
| 信永中和 | xyzh            | 定制    | `cases/xmind/custom/xyzh/`         | `cases/archive/custom/xyzh/`         | `cases/requirements/xyzh/` |

- `xyzh` 是模块 key，用于 `.claude/config.json`、脚本参数和状态文件。
- `custom/xyzh` 是文件系统路径别名，只用于 `cases/xmind/` 与 `cases/archive/` 的目录层级。
- `cases/history/xyzh/` 保持使用 `xyzh`，不会写成 `cases/history/custom/xyzh/`。
- `cases/archive/` 是固定归档根目录；历史文档或旧 Prompt 中的 `archive-cases/` 统一映射到这里，不代表需要额外创建目录。
- `config/repo-branch-mapping.yaml` 固定放在 `config/` 目录，用于维护 DTStack repo profile 与开发版本 → 分支映射。

## 顶层目录结构

```text
qa-flow/
├── CLAUDE.md
├── README.md
├── cases/
│   ├── xmind/          # XMind 输出
│   ├── archive/        # 归档 MD 根目录
│   ├── requirements/   # PRD / Story 文档
│   └── history/        # 历史 CSV 等原始资料
├── .repos/             # 隐藏源码仓库只读
├── reports/            # 代码分析报告
├── assets/
│   └── images/         # 全局图片
├── tools/              # 内置第三方工具（如 lanhu-mcp）
└── .claude/
    ├── config.json     # 集中路径配置
    ├── rules/          # 按需加载规范
    ├── skills/         # 项目 Skills
    ├── agents/         # 子代理定义
    └── scripts/        # Node.js 脚本
```

## Story / PRD / 产物命名规则

- Story 目录：`cases/requirements/<requirements-root>/Story-YYYYMMDD/`（其中 `<requirements-root>` 表示上表中的模块需求目录名，如 `data-assets` 或 `xyzh`）
- PRD 原文：`PRD-XX-<功能名>.md`
- PRD 增强版：`PRD-XX-<功能名>-enhanced.md`
- 断点状态：`Story-YYYYMMDD/.qa-state.json`
- PRD 级输出：`YYYYMM-<功能名>.xmind` 与同 basename 的 `.md`
- Story 级输出：`YYYYMM-Story-YYYYMMDD.xmind` 与同 basename 的 `.md`
- 当 Archive 来源能识别原始 PRD 文件名时，Archive Markdown 应优先沿用 `PRD-XX-<功能名>.md`，保证需求与归档一一对应
- DTStack 如识别到语义版本，Archive 优先落到 `cases/archive/<module>/vX.Y.Z/`
- DTStack 形式化需求页的 Archive Markdown 可直接使用需求标题命名
- Story 聚合 Markdown 只在明确需要“一个 Story 汇总文件”时使用，避免长期沉积为迭代级超大文件
- 历史遗留文件名可继续保留，例如 `信永中和测试用例.xmind`、`20260322-信永中和测试用例.xmind`
- 报告文件：`<标题>.html`，按日期目录归档到 `reports/bugs/` 或 `reports/conflicts/`

## 已知历史例外（不做强制迁移）

| 路径 | 原因 |
|------|------|
| `cases/requirements/data-assets/Story/` | 早于 `Story-YYYYMMDD` 命名规范创建，日期后缀不可补全 |
| `cases/archive/batch-works/6.3.x/` | 版本范围目录（语义为"6.3.x 全系列"），不同于具体版本 `vX.Y.Z/` |
| `cases/archive/data-assets/主流程/`、`岚图标品/` | 按功能类型归档的特殊分类，非版本目录 |
| `cases/archive/batch-works/集成测试/` | 同上 |

以上路径均可继续使用；新建目录遵循现行命名规范。
