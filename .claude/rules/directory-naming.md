# 目录命名约定

> 技术层（目录名/文件名/变量名）使用英文，面向用户的文档使用中文。

## 模块 key 与路径别名

以上为模板示例。实际模块列表定义在 `.claude/config.json` 的 `modules` 字段中。

| 中文名        | XMind 路径                | Archive 路径                | PRD 路径              |
| ------------- | ------------------------- | --------------------------- | --------------------- |
| ${module_zh}  | `cases/xmind/YYYYMM/`    | `cases/archive/YYYYMM/`    | `cases/prds/YYYYMM/` |

- YYYYMM 为年月数字（如 `202604`），按产物生成时间归档；同一批次产物归入同一 YYYYMM 目录。
- 路径别名用于 `cases/xmind/`、`cases/archive/` 和 `cases/prds/` 的目录层级。
- `cases/archive/` 是固定归档根目录；历史文档或旧 Prompt 中的 `archive-cases/` 统一映射到这里，不代表需要额外创建目录。
- `cases/issues/` 存放线上问题转化的用例（原 `cases/archive/online-cases/`）。
- `.claude/config.json` 的 `branchMapping` 字段用于定位 repo profile 与开发版本 → 分支映射文件。

## 顶层目录结构

```text
qa-flow/
├── CLAUDE.md
├── README.md
├── cases/
│   ├── xmind/          # XMind 输出
│   ├── archive/        # 归档 MD 根目录
│   ├── issues/         # 线上问题用例（原 archive/online-cases/）
│   ├── prds/           # PRD / Story 文档（原 requirements/）
│   └── history/        # 历史 CSV 等原始资料
├── .repos/             # 隐藏源码仓库只读
├── reports/            # 代码分析报告
├── assets/
│   └── images/         # 全局图片
├── tools/              # 内置第三方工具（如 lanhu-cli）
└── .claude/
    ├── config.json     # 集中路径配置
    ├── rules/          # 按需加载规范
    ├── skills/         # 项目 Skills
    └── shared/
        └── scripts/    # 共享 Node.js 脚本
```

## Story / PRD / 产物命名规则

### 年月制路径（新约定）

- PRD 目录：`cases/prds/YYYYMM/`（按产物生成年月归档）
- PRD 文件命名：需求标题（去掉编号前缀），如 `【功能名】需求标题.md`
- 只保留增强版（`-enhanced`）；raw 和 formalized 版本在增强完成后移入 `.trash/`
- XMind 目录：`cases/xmind/YYYYMM/`，每需求对应一个独立 xmind 文件
- Archive 目录：`cases/archive/YYYYMM/`
- 线上问题用例目录：`cases/issues/`
- 断点状态文件：生成过程中临时存放在对应 `cases/prds/YYYYMM/`，完成后移入 `.trash/`

### 通用

- PRD 级 XMind 输出：`<功能名>.xmind`（新流程直接写入版本目录）
- Story 聚合 Markdown 只在明确需要"一个 Story 汇总文件"时使用，命名为 `Story-YYYYMMDD.md`
- 历史遗留文件若进入工作流改写范围，应同步迁移到当前命名 contract
- 报告文件：`<标题>.html`，按日期目录归档到 `reports/bugs/` 或 `reports/conflicts/`

## 结构例外（属于规范内目录形态）

某些模块可能存在按版本范围或功能类型归档的特殊目录，例如：

- 版本范围目录（如 `6.3.x/`）：语义为某系列全版本，不同于具体版本 `vX.Y.Z/`
- 功能类型目录（如 `主流程/`、`集成测试/`）：按功能类型归档的特殊分类，非版本目录

以上路径仍是规范内允许的目录形态；目录结构可例外，但其中新增或回填的产物命名仍需遵循现行规范。
