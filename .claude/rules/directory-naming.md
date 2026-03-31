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
| 信永中和 | xyzh            | 定制    | `cases/xmind/custom/xyzh/`         | `cases/archive/custom/xyzh/`         | `cases/requirements/custom/xyzh/` |

- `xyzh` 是模块 key，用于 `.claude/config.json`、脚本参数和状态文件；在 Archive/PRD frontmatter 中对应 `product` 字段。
- `custom/xyzh` 是文件系统路径别名，用于 `cases/xmind/`、`cases/archive/` 和 `cases/requirements/` 的目录层级。
- `cases/history/xyzh/` 保持使用 `xyzh`，不会写成 `cases/history/custom/xyzh/`。
- `cases/archive/` 是固定归档根目录；历史文档或旧 Prompt 中的 `archive-cases/` 统一映射到这里，不代表需要额外创建目录。
- `.claude/config.json` 的 `repoBranchMapping` 字段用于定位 DTStack repo profile 与开发版本 → 分支映射文件；默认值是 `config/repo-branch-mapping.yaml`。

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
    └── shared/
        └── scripts/    # 共享 Node.js 脚本
```

## Story / PRD / 产物命名规则

### DTStack 模块

- Requirements 版本目录：`cases/requirements/<module>/v{version}/`（如 `cases/requirements/data-assets/v6.4.10/`）
- PRD 文件命名：需求标题（去掉 `PRD-NNNNN` 前缀），如 `【内置规则丰富】合理性校验-多表字段值对比.md`
- 只保留增强版（`-enhanced`）；raw 和 formalized 版本在增强完成后移入 `.trash/`
- XMind 版本目录：`cases/xmind/<module>/v{version}/`，每需求对应一个独立 xmind 文件
- Archive 版本目录：`cases/archive/<module>/v{version}/`（保持不变）
- 断点状态文件：生成过程中临时存放在 `cases/requirements/<module>/v{version}/`，完成后移入 `.trash/`

### 定制模块（xyzh）

- Requirements 目录：`cases/requirements/custom/xyzh/`（扁平，无版本子目录）
- PRD 文件命名：需求标题（去掉 `PRD-XX-` 前缀），如 `数据质量-质量问题台账.md`
- 只保留增强版；无增强版时保留 raw 版并重命名

### 通用

- PRD 级 XMind 输出：`<功能名>.xmind`（新流程直接写入版本目录）
- Story 聚合 Markdown 只在明确需要"一个 Story 汇总文件"时使用，命名为 `Story-YYYYMMDD.md`
- 历史遗留文件若进入工作流改写范围，应同步迁移到当前命名 contract
- 报告文件：`<标题>.html`，按日期目录归档到 `reports/bugs/` 或 `reports/conflicts/`

## 结构例外（属于规范内目录形态）

| 路径 | 原因 |
|------|------|
| `cases/archive/batch-works/6.3.x/` | 版本范围目录（语义为”6.3.x 全系列”），不同于具体版本 `vX.Y.Z/` |
| `cases/archive/data-assets/主流程/`、`岚图标品/` | 按功能类型归档的特殊分类，非版本目录 |
| `cases/archive/batch-works/集成测试/` | 同上 |
| `cases/xmind/data-assets/主流程/`、`岚图标品/` | 同上，xmind 侧特殊分类 |
| `cases/xmind/batch-works/6.3.x/`、`集成测试/` | 同上 |

以上路径仍是规范内允许的目录形态；目录结构可例外，但其中新增或回填的产物命名仍需遵循现行规范。
