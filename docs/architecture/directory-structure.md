# 目录结构

> 详细规范见 [Directory Alignment Design](../superpowers/specs/2026-04-29-directory-alignment-design.md)

## 顶层目录

```
kata/
├── .claude/              ← Claude Code 协议层
│   ├── skills/           ←   skill 定义
│   ├── agents/           ←   sub-agent prompts
│   └── settings.json
│
├── engine/               ← 核心引擎（npm workspace 包）
│   ├── bin/kata-cli      ←   CLI entrypoint
│   ├── src/              ←   入口脚本 + cli/
│   ├── lib/              ←   共享工具库
│   ├── hooks/            ←   Claude Code hook 脚本
│   ├── references/       ←   引擎级参考文档
│   └── tests/
│
├── plugins/              ← 三方集成
│   ├── lanhu/            ←   蓝湖 PRD 导入（TS fetch + Python MCP bridge）
│   ├── zentao/           ←   禅道集成
│   └── notify/           ←   通知集成
│
├── tools/                ← 独立工具包
│   └── dtstack-sdk/      ←   DTStack SDK（npm workspace 包）
│
├── lib/playwright/       ← Playwright 共享库（Ant Design 交互）
├── templates/            ← 输出模板（Handlebars）
├── rules/                ← 全局规则
├── scripts/lint/         ← CI 辅助 lint 脚本
├── config/               ← repo-branch-mapping.yaml（gitignored）
│
├── docs/                 ← 文档
│   ├── architecture/     ←   架构文档
│   ├── audit/            ←   审计报告
│   └── superpowers/      ←   设计 spec + 实现计划
│
├── apps/desktop/         ← Tauri desktop 试水
├── workspace/            ← 用户产物（按项目隔离）
│
├── .auth/                ← 运行时 session 数据（gitignored）
├── .kata/                ← Desktop app 数据（gitignored）
│
├── config.json           ← 项目配置
├── biome.json            ← 代码格式化配置
├── tsconfig.base.json    ← TypeScript 基础配置
└── package.json          ← 单仓 + npm workspaces
```

## workspace/{project}/ 标准结构

```
workspace/{project}/
├── README.md             ← 项目说明
├── project.json          ← 项目元数据
├── features/{ym}-{slug}/ ← PRD 派生物聚合
│   ├── prd.md / enhanced.md / images/
│   ├── archive.md / cases.xmind
│   └── tests/            ← Playwright 自动化脚本（见下文）
├── incidents/            ← 非 PRD 派生 bug
├── regressions/          ← 周期性回归
├── knowledge/            ← 项目级知识
├── shared/               ← 跨 feature 复用（helpers/fixtures/pages）
├── rules/                ← 项目级硬约束
├── archive-history/      ← 旧用例导入
├── history/              ← 历史数据
├── issues/               ← Hotfix 用例
├── reports/              ← 分析报告
├── audits/               ← 静态扫描报告（meta/report/diff/HTML）
└── .repos/               ← 只读源码副本
```

## features/{ym}-{slug}/tests/ 子目录规范

```
tests/
├── README.md             ← 套件说明：用例编号 → 业务场景映射
├── runners/              ← Playwright runner 装配
│   ├── full.spec.ts
│   ├── smoke.spec.ts
│   └── retry-failed.spec.ts
├── cases/                ← 用例脚本本体
│   ├── README.md         ← 编号 → 场景映射表（强制）
│   └── {module}/         ← ≥15 case 时按 PRD 模块分组
├── helpers/              ← PRD 私有 helper（≤800 行/文件）
├── data/                 ← 测试数据 / fixtures
├── unit/                 ← helpers 的单元测试（可选）
└── .debug/               ← 调试遗物（gitignore）
```

**CI lint 规则：**

- `cases/*.ts` 匹配 `^t\d{2}-[a-z0-9-]+\.ts$`
- `helpers/*.ts` 单文件 ≤ 800 行
- `data/` 禁止 `*_v[0-9]` 变体
- `runners/` 只允许 `*.spec.ts`，`cases/` 只允许 `t{nn}-*.ts`
- `cases/` ≥15 文件时必须有 ≥2 个模块子目录
- `cases/README.md` 必须存在
