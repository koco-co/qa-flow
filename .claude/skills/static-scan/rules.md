# static-scan — Rules

> 这些规则同时约束 `static-scan-agent` 与 skill 编排层。

## 输出契约（agent）

详见 `.claude/agents/static-scan-agent.md`。要点：

- 每条 bug **必须**有 reproduction_steps（≥3 步）、location（file:line）、evidence.diff_hunk、confidence ≥ 0.6
- 写不出可复现操作路径 → 丢弃
- 不接受性能/安全猜测、元 bug、缺 file:line 的"代码气味"

## 编排约束

- **不允许**编排层伪造 bug 字段（不能 LLM 一句"reproduction_steps 凑 3 行"）
- add-bug 失败（exit 2）必须记录到丢弃日志，**不能**重试改写后再写
- HTML 仅 render 命令产出；编排层不直接生成 HTML

## CLI 错误处理

- exit 1：参数错 / 找不到 audit → 提示用户检查输入
- exit 2：bug 校验失败 → 记录到 `audits/{slug}/.scan-discarded.log`，继续下一条
- exit 3：git 错误 → 提示用户检查仓库状态、是否需要 fetch

## .repos 仓库纪律（继承自 CLAUDE.md）

- `.repos/` 下源码仓库**只读**，禁止 push/commit
- 扫描前必须确保仓库已同步，但本 skill **不主动 sync**——由用户控制
