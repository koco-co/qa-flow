# kata-engine

kata 核心引擎。CLI / Skill / 未来桌面端共用的纯逻辑层。

## 入口

- `bin/kata-cli` — shell 命令（用户视角）
- `src/api.ts` — 程序化 API（其他包 import 入口）

## 内部组织（§3.5）

- `src/cli/` — CLI 入口层，按领域分组
- `src/domain/` — 领域逻辑（无 IO 假设）
- `src/lib/` — 横切共享库
- `src/adapter/` — 外部依赖适配
- `src/hooks/` — Claude Code hooks 实现

详见 [docs/superpowers/specs/2026-04-27-architecture-redesign-design.md](../docs/superpowers/specs/2026-04-27-architecture-redesign-design.md) §3.5 / §3.6。
