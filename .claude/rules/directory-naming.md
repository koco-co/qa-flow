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

## 顶层目录结构

```text
WorkSpaces/
├── CLAUDE.md
├── README.md
├── cases/
│   ├── xmind/          # XMind 输出
│   ├── archive/        # 归档 MD 根目录
│   ├── requirements/   # PRD / Story 文档
│   └── history/        # 历史 CSV 等原始资料
├── repos/              # 源码仓库只读
├── reports/            # 代码分析报告
├── assets/
│   └── images/         # 全局图片
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
- 历史遗留文件名可继续保留，例如 `信永中和测试用例.xmind`、`20260322-信永中和测试用例.xmind`
- 报告文件：`<标题>.html`，按日期目录归档到 `reports/bugs/` 或 `reports/conflicts/`
