# UI 自动化测试 — tests/ 目录规范

所有步骤必须遵守以下目录规范（`tests/` 根目录由 Step 1 的 `kata-cli features:init-tests` 创建）：

```
features/{ym}-{slug}/tests/
├── .task-state.json                  ← 任务状态文件（自动管理）
├── README.md                          ← 套件说明
│
├── runners/                           ← Playwright runner 装配
│   ├── full.spec.ts                   ←   全量
│   ├── smoke.spec.ts                  ←   冒烟（核心 P0）
│   └── retry-failed.spec.ts           ←   失败重跑
│
├── cases/                             ← 用例脚本本体
│   ├── README.md                      ←   编号 → 场景映射表
│   │   - case 数 < 15：cases/ 直接平铺，命名 `t{编号}-{slug}.ts`
│   │   - case 数 ≥ 15：必须按 PRD 模块分子目录
│   ├── {module}/                      ←   ≥15 case 时按 PRD 模块分组
│   │   ├── t01-{slug}.ts
│   │   └── t02-{slug}.ts
│   └── ...
│
├── helpers/                           ← PRD 私有 helper（按职责拆）
│   ├── README.md
│   ├── {domain-1}.ts
│   └── ...
│
├── data/                              ← 测试数据 / fixtures
│   ├── README.md
│   ├── seed.sql
│   ├── *.ts                           ← 命名禁止 _v1/_v2 变体
│   └── storage-state.json
│
├── unit/                              ← helpers 单元测试（可选）
│   └── *.test.ts
│
└── .debug/                            ← 调试遗物（gitignore，CI 不跑）
    └── *-repro.spec.ts
```
