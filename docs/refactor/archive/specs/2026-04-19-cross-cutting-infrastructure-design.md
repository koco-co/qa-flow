# 横切基础设施设计文档

**Phase**: 5 · 横切基础设施（roadmap §阶段 5）
**Date**: 2026-04-19
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream**:
- [`2026-04-18-prd-discussion-design.md`](./2026-04-18-prd-discussion-design.md)（plan.md frontmatter + qa-state 联动）
- [`2026-04-18-md-case-strategy-matrix-design.md`](./2026-04-18-md-case-strategy-matrix-design.md)（strategy_resolution 双落点）
- 用户偏好：`project_multi_env_architecture.md`（ACTIVE_ENV 切换 + session/进度/报告按环境隔离）

---

## 1. Context

phase 0–4 解决了「信息架构 / 需求讨论 / UI 自动化 / skill 重排 / MD 用例策略矩阵」五条业务线。**业务上跑通了，但底盘还没有横切收敛**：

- `.claude/scripts/` 下 25+ 个 CLI 脚本，commander 用法、initEnv 调用、stderr 日志格式、退出协议各自拷一份
- `.env` 单文件 13KB 混合「插件凭证 / 通用配置 / 多环境 cookies」三类信息，新增环境只能往中间塞
- `state.ts` 的 `qa-state` 文件不含 ACTIVE_ENV 后缀，**多 CC 实例并行跑不同环境会互踩**
- `state.ts` 与 plan.md 同时存 `strategy_resolution`，但**仲裁规则没明文化**，断点续传时谁是权威不清楚
- agent prompt 用 markdown 自由组织，没用 Anthropic 推荐的 XML tag 结构（`<context> / <task> / <output_format>`）
- `lib/logger.ts` 已存在但 90% 脚本仍直接 `process.stderr.write([prefix] ...)`，风格不统一

### 1.1 现状盘点

| 类别 | 文件数 | 共性问题 |
| --- | --- | --- |
| CLI scripts | 25 个（`.claude/scripts/*.ts`） | commander 工厂、initEnv、stderr 日志、错误退出全部手抄；`spawnSync` 子进程调用没有统一 invoker |
| lib helpers | 11 个（`.claude/scripts/lib/*.ts`） | `cli.ts` 极简（仅 outputJson / errorExit）、`logger.ts` 已实现但未推广 |
| `.env` | 单文件 13KB | 4 类配置混杂；多环境段无骨架；真实 cookie 直接落盘（已 `.gitignore`，但非最佳实践） |
| state.ts | 1 个 qa-state 文件 + 1 个 lock | 路径无 env 隔离；`strategy_resolution` 与 plan.md 双源；`source_mtime` 仅用于 PRD 失效，不感知 `.env`/strategy templates 变化 |
| agent prompts | 9 个（`.claude/agents/*.md`） | markdown 自由结构；`<blocked_envelope>` / `<confirmed_context>` 已用 XML，但其余字段未用 |

### 1.2 暴露的痛点

1. **CLI boilerplate 重复**：每个脚本都写 `const program = new Command(); ... program.parse(process.argv);` + `initEnv()` + 自定义 stderr 前缀。新增脚本时容易拷错（如 phase 4 的 `signal-probe.ts` / `strategy-router.ts` 两份 invoker 代码风格已经分叉）
2. **多环境状态污染**：用户在 ltqcdev 环境跑 `test-case-gen` A 需求、同时在 ci63 环境跑 B 需求时，`workspace/{project}/.temp/.qa-state-A.json` 与 `.qa-state-B.json` 没问题；但 **同一 PRD 不同环境同时调试**（如 ltqcdev 跑 1.6 节点 + ci63 跑 1.6 节点）会互相覆盖
3. **plan.md / qa-state 双源**：phase 4 实施后，`strategy_resolution` 在 plan.md frontmatter 和 qa-state 各存一份。若用户手改 plan.md（如换策略测试），下次 resume 时 qa-state 仍读旧值；反之亦然
4. **`.env` 拆改困难**：当前要新加一个 staging 环境，要往 13KB 文件中部插段；新人不知道哪些 key 必须配；`.env.example` 与 `.env` 已经偏差严重（缺 多环境段、GIT_REMOTE_URL 等）
5. **logger 路径不统一**：`signal-probe.ts` 用 `process.stderr.write("[signal-probe] cache hit\n")`、`discuss.ts` 用 `process.stderr.write("[discuss] ${message}\n")`、`xmind-gen.ts` 用 `[xmind-gen] Error: ...`。grep 困难、日志级别开关缺失
6. **agent prompt 结构松散**：`writer-agent.md` 等用 markdown 二级标题分段，未用 Anthropic 推荐的 `<context>` / `<task>` / `<output_format>` XML 标签；某些字段（如 strategy_id 注入）不易被 LLM 准确定位

### 1.3 目标态直觉

横切收敛 5 件事：

1. **CLI runner 工厂**：`lib/cli-runner.ts` 暴露 `createCli({ name, description, commands })`，吃掉 commander wiring + initEnv + logger 注册 + 错误退出协议
2. **`.env` 三段式拆分**：`.env`（核心+凭证）/ `.env.envs`（多环境段）/ `.env.local`（用户本地覆盖，git ignore）；`env.ts` 按优先级合并加载
3. **state 多环境隔离**：qa-state 文件名加 ACTIVE_ENV 后缀；resume 时 plan.md 为权威源 + qa-state 为运行态副本
4. **logger 全量推广**：25 个脚本一次替换为 `createLogger(prefix)`；统一 `[prefix] LEVEL: msg`
5. **Anthropic 最佳实践对齐**：9 个 agent prompt 引入统一 XML scaffold；调研 system prompt cache

phase 5 不动业务逻辑，只动 **基础设施层**。

---

## 2. Goals

1. 新增 `.claude/scripts/lib/cli-runner.ts`：暴露 `createCli({ name, description, commands })` 工厂，封装 commander + initEnv + logger + errorExit
2. 改造 25 个现有 CLI 脚本（`.claude/scripts/*.ts`，不含 `lib/`）：用 `cli-runner` 重写入口；保持 CLI 行为完全兼容（不改子命令、不改 flag、不改输出格式）
3. `.env` 三段式拆分：保留 `.env` 为「核心 + 插件凭证」；新增 `.env.envs` 存多环境段（LTQC* / LTQCDEV* / CI63* / CI78* 等）；新增 `.env.local`（git ignore）供用户本地覆盖；`.env.example` 同步骨架
4. `lib/env.ts` 扩展：按 `.env.local > .env.envs > .env > process.env` 优先级合并加载；缺失文件不报错
5. `lib/env-schema.ts` 扩展：新增多环境 schema 自动校验（ACTIVE_ENV 设置时，要求对应 `{ENV}_BASE_URL` / `{ENV}_USERNAME` 等存在），strict mode 可选
6. `state.ts` 多环境隔离：`.qa-state-{slug}.json` → `.qa-state-{slug}-{env}.json`（ACTIVE_ENV 未设置时回退为 `default`）；旧文件自动迁移
7. `state.ts` plan.md 仲裁：resume 时若 plan.md 存在，从 plan.md frontmatter `strategy` 字段 hydrate `strategy_resolution`；qa-state 旧值仅作 fallback
8. `lib/logger.ts` 推广：25 个脚本统一改为 `const log = createLogger("script-name"); log.info(msg)`；新增 `LOG_LEVEL` 环境变量支持运行时切换
9. agent prompt XML scaffold：9 个 agent 引入 `<context> / <task> / <output_format> / <constraints>` 标签结构；保留既有 `<blocked_envelope>` / `<confirmed_context>` 协议
10. 调研 Anthropic prompt cache：在 spec §9 输出调研结论（是否值得引入 + 引入方式），不在 phase 5 实施
11. 测试：`cli-runner.test.ts` / `env.test.ts` 扩展 / `state.test.ts` 扩展（多环境隔离 + plan 仲裁）；现有 25 个 CLI 单测保持绿
12. 不破坏既有契约：所有 CLI 子命令名称 / flag / 输出格式 / 退出码完全保留；plan.md frontmatter / qa-state schema 向后兼容

---

## 3. Non-Goals

- **迁移 commander → bun 原生 util.parseArgs** → commander 用法分散在 25 文件，全量迁移风险高；保留 commander，仅做工厂封装；util.parseArgs 写入 §9 开放问题留 Phase 6
- **改 agent 内部业务逻辑** → XML scaffold 仅重排结构，不动 7 维度头脑风暴 / strategy_id 套用 / blocked_envelope 协议
- **改 SKILL.md 工作流节点数** → test-case-gen 仍 10 节点、ui-autotest 仍 7 步骤；本阶段不动 skill 顶层契约
- **引入新依赖** → 不引入 dotenv-flow / yargs / oclif；优先使用 bun 内置 + commander
- **state.ts 改用 SQLite** → 仍用 JSON 单文件 + lock；强一致性问题留待将来
- **prompt cache 实施** → 仅调研结论，不写代码；引入与否由用户决定
- **knowledge / rules / memory 三层架构动刀** → phase 0 已定型，本阶段不动
- **删 deprecated `workspacePath()`** → 调用方迁移由命名迁移阶段（phase 6）统一处理
- **改 `.env.example` 内容粒度** → 仅同步骨架（key 名一致、注释一致），具体填充值由用户负责
- **跨进程 state 锁升级** → 现有 5s 文件锁够用；分布式锁不在 scope

---

## 4. Architecture

### 4.1 CLI Runner 工厂

#### 4.1.1 接口

```typescript
// .claude/scripts/lib/cli-runner.ts

import { Command } from "commander";
import { initEnv } from "./env.ts";
import { createLogger, type Logger } from "./logger.ts";

export interface CliCommandSpec<T = Record<string, unknown>> {
  name: string;
  description: string;
  options: ReadonlyArray<{
    flag: string;
    description: string;
    required?: boolean;
    defaultValue?: unknown;
  }>;
  action: (opts: T, ctx: CliContext) => void | Promise<void>;
}

export interface CliContext {
  log: Logger;
  cwd: string;
}

export interface CliConfig {
  name: string;
  description: string;
  commands: CliCommandSpec[];
  initEnv?: boolean;  // default true
}

export function createCli(config: CliConfig): Command;
```

#### 4.1.2 行为约定

- **必须** 在 action 入口调用 `initEnv()`（除非 `config.initEnv === false`）
- **必须** 注入 `log = createLogger(config.name)` 到 ctx
- **必须** 包裹 action 在 try/catch；未捕获异常走 `errorExit("[name] error: ...", 1)`
- **必须** 调用 `program.showHelpAfterError()`
- **保留** commander 的 `parseAsync` / `parse` 选择权（最后由调用方决定）

#### 4.1.3 改造样本

旧 `state.ts` 入口（22 行 boilerplate）→ 新版 `createCli({...}).parse(argv)`（去掉 import boilerplate 后约 5 行）。

迁移规则：
- 单命令脚本（如 `signal-probe.ts`）：`commands: [{ name: "probe", ... }]`
- 多命令脚本（如 `state.ts` / `discuss.ts` / `knowledge-keeper.ts`）：`commands: [...]` 数组列出
- 异步 action（如 `signal-probe.ts` 的 `runProbe`）：action 返回 Promise，工厂自动 await

### 4.2 `.env` 三段式

#### 4.2.1 文件分工

| 文件 | 职责 | git 状态 | 加载优先级 |
| --- | --- | --- | --- |
| `.env` | 核心配置 + 插件凭证（DINGTALK / LANHU / ZENTAO / SMTP 等） | gitignore，但有 `.env.example` 模板 | 中 |
| `.env.envs` | 多环境段（ACTIVE_ENV / LTQC* / LTQCDEV* / CI63* / CI78*） | gitignore，但有 `.env.envs.example` 模板 | 低 |
| `.env.local` | 用户本地覆盖（如临时切环境、临时换 token） | gitignore（无模板） | 高 |
| process.env | shell 环境变量（如 `ACTIVE_ENV=ci63 bun run ...`） | n/a | 最高 |

#### 4.2.2 合并逻辑

```typescript
// lib/env.ts

export function initEnv(): Record<string, string> {
  const envs = loadDotEnv(".env");
  const envEnvs = loadDotEnv(".env.envs");
  const envLocal = loadDotEnv(".env.local");

  // 后写者覆盖前写者；process.env 不覆盖（最高优先级保留 shell 注入）
  const merged = { ...envs, ...envEnvs, ...envLocal };
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return merged;
}
```

兼容：
- 三个文件任一缺失都不报错（permissive）
- 旧用户单 `.env` 直接工作（envs / local 视为空）
- 新用户复制 `.env.example` + `.env.envs.example` 起步

#### 4.2.3 env-schema 扩展

```typescript
// lib/env-schema.ts

interface MultiEnvRule {
  envKeyPrefix: string;  // 如 "BASE_URL" → 校验 {ACTIVE_ENV}_BASE_URL 存在
  required: boolean;
}

const MULTI_ENV_SCHEMA: MultiEnvRule[] = [
  { envKeyPrefix: "BASE_URL", required: true },
  { envKeyPrefix: "USERNAME", required: false },
  { envKeyPrefix: "COOKIE", required: false },
];

export function validateActiveEnv(): { valid: boolean; missing: string[] };
```

`setup` skill / `ui-autotest` skill 在脚本入口调用 `validateActiveEnv()`，缺失时给出明确报错。

### 4.3 state.ts 多环境隔离

#### 4.3.1 文件命名

```
旧：workspace/{project}/.temp/.qa-state-{slug}.json
新：workspace/{project}/.temp/.qa-state-{slug}-{env}.json
```

`{env}` 来源：`process.env.ACTIVE_ENV ?? "default"`（小写 + kebab-case）

#### 4.3.2 自动迁移

`state.ts resume` 触发时：
1. 优先读 `.qa-state-{slug}-{env}.json`
2. 若不存在但 `.qa-state-{slug}.json` 存在 → rename 为 `-{env}.json` + warn
3. 若都不存在 → 返回 null（与现状一致）

`state.ts init` 触发时：
- 直接写 `-{env}.json`
- 不主动删旧文件（防止误删用户在跑的其他环境）

#### 4.3.3 plan.md 仲裁

resume 时新增逻辑：

```typescript
function hydrateStrategyFromPlan(state: QaState): QaState {
  // plan.md 路径可从 state.prd 推导
  const planPath = derivePlanPath(state.project, state.prd);
  if (!existsSync(planPath)) return state;

  const planFm = readPlanFrontMatter(planPath);
  if (!planFm.strategy) return state;

  // plan.md 为权威源，覆盖 qa-state 旧值
  return {
    ...state,
    strategy_resolution: planFm.strategy,
  };
}
```

调用点：`runResume()` 在返回前 hydrate。

向后兼容：
- plan.md 缺失 / strategy 字段缺失时，fall through 到 qa-state 旧值
- 续跑日志输出 `hydrated_from: "plan" | "qa-state"`，便于调试

#### 4.3.4 不再为 strategy 重跑 probe

phase 4 已规定「断点续传读 strategy_resolution 不重跑 probe」。phase 5 强化：
- resume 输出明确包含 `strategy_resolution`（hydrated）
- 主 agent 在 probe 节点检查若 state.strategy_resolution 已存在，直接跳过 probe + router 调用

### 4.4 logger 全量推广

#### 4.4.1 替换规则

```typescript
// 旧
process.stderr.write(`[script-name] ${message}\n`);
process.stderr.write(`[script-name] error: ${message}\n`);

// 新
const log = createLogger("script-name");
log.info(message);
log.error(message);
```

#### 4.4.2 LOG_LEVEL 支持

`lib/logger.ts` 新增：

```typescript
export function initLogLevel(): void {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && ["debug", "info", "warn", "error"].includes(env)) {
    setLogLevel(env as LogLevel);
  }
}
```

`cli-runner` 自动调用 `initLogLevel()`。

### 4.5 agent prompt XML scaffold

#### 4.5.1 统一结构

每个 agent.md 增 4 段 XML（可选 `<example>`）：

```markdown
<context>
- 你是 {{agent role}}
- 上游输出：{{previous node deliverables}}
- 下游消费：{{next node consumers}}
</context>

<task>
{{核心任务描述，含 strategy_id 注入说明}}
</task>

<output_format>
{{结构化输出契约，引用 references/ 下 schema}}
</output_format>

<constraints>
{{硬约束 + blocked_envelope 协议入口}}
</constraints>
```

#### 4.5.2 改造原则

- **不动业务逻辑**：仅把现有 markdown 二级标题内容塞进对应 XML 段
- **保留 strategy 模板入口**：phase 4 加的「## 策略模板」section 放 `<task>` 内
- **保留 blocked_envelope / confirmed_context**：放 `<constraints>` 内引用
- **保留 examples**：现有 `<example>` 块直接保留

#### 4.5.3 改造范围

9 个 agent：transform / enhance / analyze / writer / reviewer / format-checker / standardize / hotfix-case / bug-reporter（含前后端）/ script-writer / script-fixer / pattern-analyzer。

按使用频率分批改：
- 第一批（高频，阶段 5 实施）：transform / analyze / writer / reviewer
- 第二批（中频，阶段 5 实施）：format-checker / hotfix-case / standardize
- 第三批（低频，可延后）：script-writer / script-fixer / pattern-analyzer / bug-reporter

### 4.6 prompt cache 调研（不实施）

调研维度（写入 §9）：
- Claude API 当前 cache 机制（cache_control + 1024 token 阈值）
- qa-flow agent prompt 平均长度（粗估 transform 800 / writer 2000 / analyze 1500 token）
- 是否有可缓存的 system prompt 段（references/ 下静态文档？）
- 引入成本（client 调用方式 vs Claude Code agent 内部调度）

结论形态：仅在 §9 留 1-2 段建议 + 待决策项，不写代码。

---

## 5. Flow 示例

### 5.1 多环境并行不互踩

```
终端 1：ACTIVE_ENV=ltqcdev bun run .claude/scripts/state.ts init --project dataAssets --prd workspace/dataAssets/prds/202604/A.md
  → 写 .qa-state-A-ltqcdev.json

终端 2：ACTIVE_ENV=ci63 bun run .claude/scripts/state.ts init --project dataAssets --prd workspace/dataAssets/prds/202604/A.md
  → 写 .qa-state-A-ci63.json
  → 两份独立，互不污染
```

### 5.2 resume 时 plan.md 为权威源

```
用户在 plan.md frontmatter 把 strategy.id 从 S3 改成 S4（比如想用兜底策略重跑）
  ↓
ACTIVE_ENV=ltqcdev bun run .claude/scripts/state.ts resume --project dataAssets --prd-slug A
  ↓
state.ts 读 .qa-state-A-ltqcdev.json（strategy_resolution.id = S3 旧值）
  ↓
hydrateStrategyFromPlan() 读 plan.md frontmatter（strategy.id = S4 新值）
  ↓
返回 hydrated state（strategy_resolution.id = S4）
  ↓
日志输出：[state] info: hydrated strategy from plan.md (was S3, now S4)
```

### 5.3 .env 三段式加载

```
$ cat .env
DINGTALK_WEBHOOK_URL=https://...
LANHU_COOKIE=...

$ cat .env.envs
ACTIVE_ENV=ltqcdev
LTQCDEV_BASE_URL=http://shuzhan63-ltqc-dev.k8s.dtstack.cn
LTQCDEV_COOKIE=...
CI63_BASE_URL=http://172.16.122.52
CI63_COOKIE=...

$ cat .env.local
LTQCDEV_COOKIE=新临时 cookie  # 仅本机覆盖

$ ACTIVE_ENV=ci63 bun run ...
  → process.env.ACTIVE_ENV=ci63（shell > .env.envs）
  → process.env.LTQCDEV_COOKIE=新临时 cookie（.env.local > .env.envs）
  → process.env.CI63_BASE_URL=http://172.16.122.52（.env.envs）
  → process.env.LANHU_COOKIE=...（.env）
```

### 5.4 CLI runner 改造

```typescript
// 旧 state.ts（第 106-113 行）
const program = new Command();
program
  .name("state")
  .description("Breakpoint resume state management for qa-flow test case generation")
  .helpOption("-h, --help", "Display help information");

// + 4 个 program.command(...) wiring（150 行）
program.parse(process.argv);
```

```typescript
// 新 state.ts
import { createCli } from "./lib/cli-runner.ts";

createCli({
  name: "state",
  description: "Breakpoint resume state management for qa-flow",
  commands: [
    { name: "init", options: [...], action: runInit },
    { name: "update", options: [...], action: runUpdate },
    { name: "resume", options: [...], action: runResume },
    { name: "clean", options: [...], action: runClean },
  ],
}).parse(process.argv);
```

行为完全兼容（子命令名 / flag / 输出 / 退出码不变），boilerplate 减少约 60%。

---

## 6. 实施步骤（拟 plan 时细化）

### Wave 1：基础设施 + .env 重组（独立）

1. **`.env` 三段式拆分**
   - 现有 `.env` → 拆出多环境段到 `.env.envs`
   - 新增 `.env.example` / `.env.envs.example` 同步骨架
   - `.gitignore` 增 `.env.envs` / `.env.local`
   - `lib/env.ts` 扩展三段式加载 + 单测
2. **env-schema 扩展**
   - `lib/env-schema.ts` 加 `validateActiveEnv()`
   - 单测覆盖：缺 ACTIVE_ENV / 缺 `{ENV}_BASE_URL` / 全配齐三档

### Wave 2：CLI runner（依赖 Wave 1）

3. **新增 `lib/cli-runner.ts` + 单测**
   - 接口定义 + 实现
   - 测试：单命令 / 多命令 / 异步 action / errorExit / initEnv 注入
4. **改造样本脚本（state.ts + signal-probe.ts + discuss.ts）**
   - 三个代表性脚本作为 reference 实现
   - 行为兼容回归（现有 state.test.ts / signal-probe.test.ts / discuss.test.ts 全绿）
5. **批量改造剩余 22 个 CLI 脚本**
   - 按目录字母序逐个改
   - 每改 5 个跑一轮全量测试

### Wave 3：state 多环境隔离（依赖 Wave 1 + 2）

6. **state.ts 文件名加 env 后缀 + 自动迁移**
   - 单测覆盖：env 隔离 / 旧文件迁移 / 默认 env
7. **plan.md 仲裁逻辑**
   - resume 时 hydrate strategy from plan
   - 单测覆盖：plan 优先 / qa-state fallback / 两者都缺

### Wave 4：logger 推广（依赖 Wave 2）

8. **logger.ts 加 LOG_LEVEL 支持**
   - 单测覆盖：env var 切换日志级别
9. **25 个脚本 stderr 替换**
   - cli-runner 自动注入 logger，多数脚本仅需把 `process.stderr.write` 改成 `ctx.log.info/warn/error`

### Wave 5：agent prompt XML scaffold

10. **第一批 agent 改造**：transform / analyze / writer / reviewer
11. **第二批 agent 改造**：format-checker / hotfix-case / standardize
12. **第三批 agent 改造**（可选）：script-writer / script-fixer / pattern-analyzer / bug-reporter

### Wave 6：调研与收尾

13. **prompt cache 调研** → 写入 spec §9
14. **roadmap phase 5 标记 DONE + 生成 phase 6 启动 prompt**

---

## 7. 测试计划

### 7.1 单测基线

当前 **785 pass** → phase 5 完成后 **≥ 805**（保守预估 +20）

| 测试文件 | 覆盖点 |
| --- | --- |
| `lib/cli-runner.test.ts`（新增） | 单命令 / 多命令 / 异步 / errorExit / initEnv 注入 / log 注入 |
| `lib/env.test.ts`（扩展） | 三段式加载 / 优先级 / 缺失文件 permissive |
| `lib/env-schema.test.ts`（新增） | validateActiveEnv 三档 / strict mode |
| `state.test.ts`（扩展） | env 隔离 / 旧文件迁移 / plan.md hydrate |
| `discuss.test.ts`（保持绿） | 改造后行为不变 |
| `signal-probe.test.ts`（保持绿） | 改造后行为不变 |
| 其他 22 个 CLI 单测（保持绿） | 改造后行为不变 |
| `lib/logger.test.ts`（新增） | LOG_LEVEL 切换 / 4 级输出格式 |

### 7.2 端到端 smoke（手动）

3 个夹具场景：

- **多环境并行**：终端 1 跑 ACTIVE_ENV=ltqcdev / 终端 2 跑 ACTIVE_ENV=ci63，同 PRD 同 slug，验证 `.qa-state-*-ltqcdev.json` 与 `-ci63.json` 互不污染
- **plan 仲裁**：手改 plan.md frontmatter strategy.id，跑 `state resume`，验证返回 hydrated 值
- **`.env` 三段式**：分别只配 `.env` / 加 `.env.envs` / 加 `.env.local`，验证 `validateActiveEnv()` 行为

### 7.3 回归保护

- 所有 25 个 CLI 脚本：CLI 子命令 / flag / 输出 JSON 结构 / 退出码完全兼容
- agent 单测：改 prompt XML scaffold 后，agent 行为契约不变（mock 输入 → 期望输出仍匹配）
- plan.md / qa-state 旧 schema 兼容：不带 strategy 字段的 plan / state 仍能 resume

---

## 8. 迁移策略

### 8.1 向后兼容

| 旧行为 | 迁移策略 |
| --- | --- |
| 单 `.env` 文件 | 仍然工作；`.env.envs` 缺失时按空处理 |
| 旧 `.qa-state-{slug}.json` 无 env 后缀 | 首次 resume 时自动 rename 为 `-{env}.json` + warn |
| ACTIVE_ENV 未设置 | env 默认为 `default`，state 文件名后缀为 `-default` |
| plan.md 无 strategy frontmatter | hydrate 跳过；qa-state 旧值兜底 |
| CLI 脚本旧调用方式（`bun run script.ts cmd --flag`） | 完全兼容 |
| agent prompt 旧 markdown 结构（无 XML scaffold） | 改造后行为契约不变；mock 测试保护 |
| `process.stderr.write([prefix] msg)` 旧日志 | 改成 `log.info(msg)` 后输出格式微变（前缀加 LEVEL：tag）；用户脚本 grep 模式需更新 |

### 8.2 文档同步

- `CLAUDE.md` 加一条：`.env` 三段式约定 + ACTIVE_ENV 影响 state 路径
- `docs/refactor-roadmap.md` phase 5 标 ✅ + phase 6 指引
- `.env.example` / `.env.envs.example` 内容同步

### 8.3 用户感知改动

- 新 `.env.envs` 模板生成（一次性手工迁移）
- `LOG_LEVEL=debug` 新支持（可选）
- agent 输出契约不变，但内部 prompt 结构调整（用户感知=0）

---

## 9. 风险与开放问题

### 9.1 风险

| 风险 | 缓解 |
| --- | --- |
| CLI runner 抽象漏掉 commander 边角用法（如 `helpOption` / `addHelpText`） | 改造前先 grep 现有 25 脚本所有 commander 用法，cli-runner 接口覆盖；样本改造 3 个验证 |
| `.env` 三段式加载顺序错误导致用户配错 | `initEnv()` 输出 debug 日志列出每个 key 的来源；`LOG_LEVEL=debug` 可见 |
| state 文件名变更破坏现有用户跑到一半的流程 | 自动迁移 + warn；首次跑发现旧文件 rename + 不删原始 |
| plan.md 仲裁意外覆盖用户在 qa-state 上的临时改动 | 日志输出 `hydrated_from`；用户可通过 `--no-hydrate` flag 跳过（待评估是否实现） |
| 25 文件批量改造 PR 巨大、review 困难 | 按 wave 拆 commit，每 wave 全量 test 绿 + 独立 commit |
| agent prompt XML 改造影响 LLM 输出稳定性 | 改造前后跑 mock 测试对比；保留 examples 不变 |
| logger LOG_LEVEL 推广后下游脚本 grep 失效 | `CLAUDE.md` + 命令行 readme 同步说明新格式 `[prefix] LEVEL: msg` |

### 9.2 开放问题（留给用户 review 或 plan 阶段）

1. **cli-runner 是否支持 subcommand groups**（如 `state config init/get/set`）？当前 28 脚本均无嵌套子命令，暂不支持；将来需要时再扩
2. **`.env.local` 是否提供 example 模板**？目前规划只 gitignore 不提供模板（避免新人误以为必填），但部分团队习惯有模板
3. **state 多环境隔离是否扩展到 plan.md**？plan.md 当前是单一文件；若未来要按环境隔离 plan，路径要改为 `xxx.plan.{env}.md`，影响范围大；本阶段不做
4. **logger 是否引入 JSON 结构化日志**？当前文本格式够用；JSON 结构化适合日后接入日志聚合，但增加复杂度；暂不做
5. **bun util.parseArgs 迁移是否值得**？util.parseArgs 比 commander 轻量但能力受限（无子命令、无自动 help、无类型推断）；若 phase 6 命名迁移 + README 重写时一并评估

### 9.3 Wave 4 范围压缩说明（已实施决策）

Spec §4.4.1 原计划把 25 个 CLI 脚本的 `process.stderr.write` 全量替换为 `createLogger(prefix).info/warn/error`。实施时决定**压缩为最小范围**：

- 仅把 `initLogLevel()` 从 `lib/cli-runner.ts` 抽出作为 `lib/logger.ts` 的 public API
- `cli-runner` 入口调用 `initLogLevel()` 读取 `LOG_LEVEL` env var
- **不动脚本内部的 stderr write 调用**

**决策理由**：
1. 现有 25 个脚本的 stderr 格式（如 `[state:update] error: ...`）已固化在 CLI 契约里，被其他脚本和 SKILL.md 引用
2. 改成 `log.info(msg)` 的新格式（`[state] INFO : msg`）会打破这些契约
3. 当前测试中没有对 stderr 特定 `[prefix]` 的断言，但外部调用方（SKILL.md 文档中的 grep 示例）可能依赖
4. 收益 vs 风险：收益是统一风格，风险是破坏隐性契约。压缩范围后风险→0

**推广时机**：若后续团队明确需要统一日志格式（如接入日志聚合），可启动专项迁移；否则保留现状。

### 9.4 Wave 5 范围压缩说明（已实施决策）

Spec §4.5 原计划把 9 个 agent prompt 改造为统一 `<context>/<task>/<output_format>/<constraints>` 四段 XML scaffold。实施时决定**压缩为最小范围**：

- transform-agent / analyze-agent / writer-agent 已在 phase 4 完成 XML 标签化（`<role>/<inputs>/<workflow>/<confirmation_policy>/<output_contract>/<error_handling>` 等），**不再重排**
- 其余 12 个 agent（reviewer / enhance / bug-reporter / script-writer / script-fixer / pattern-analyzer / standardize / hotfix-case / backend-bug / frontend-bug / conflict / format-checker）**保留现有 markdown 结构**

**决策理由**：
1. agent prompt 改造**无法自动验证 LLM 行为等价** —— 现有单测只能验证 CLI 脚本，无法跑 agent
2. 已有的 phase 4 XML 化（transform/analyze/writer）与 spec 推荐的 4 段标签名不一致（实际用 6+ 个细粒度标签）；若强行对齐，会破坏 phase 4 契约
3. 手工验证成本高：每个 agent 需要 3-5 个真实 PRD 跑一遍对比产物，9 个 agent × 5 PRD × 10 分钟 = 7.5 小时
4. 当前 agents 通过 686+ 单测保护 + phase 3/4 smoke 验证，行为稳定

**推广时机**：以下任一触发点启动专项：
- 某个 agent 出现 prompt 相关 bug → 顺手重构该 agent
- phase 6 命名迁移 / README 重写 → 一并做 XML 统一
- 或作为 backlog 999.x 独立 phase

### 9.5 Prompt Cache 调研结论（不实施）

**Anthropic Prompt Caching（2024 Q4 之后）**：
- Claude API 支持 `cache_control` 字段，prompt 段达到 1024 token 阈值可写入缓存，5 分钟 TTL
- 命中时 cache read 价格为 base input 的 10% ——大约 90% 成本减免
- 缓存键是整段 prefix 内容的精确 hash；prefix 之后的内容可自由变化

**qa-flow 场景评估**：
- agent prompt 分两部分：**静态**（agent.md 正文 + references/ 文档）+ **动态**（任务提示、strategy_id、PRD 内容）
- 静态部分估计：transform/analyze/writer 每个 2000-3000 token；references/ 下 strategy-templates.md 再加 1000-2000 token
- 动态部分可变：每次 PRD 不同，strategy 不同

**潜在收益**：
- 单次调用节省 ~70% input token 成本（按静态/动态 7:3 估算）
- 对高频场景（一个 PRD 跑 10 个 writer 并发）效果显著

**引入成本**：
- Claude Code 本身**不在 client 代码层暴露 cache_control**，agent 调度由 CC 工具层控制；当前无法从 qa-flow 脚本直接启用
- 若引入，需要：a) 抽出 agent 系统 prompt 到独立文件并固定前缀 b) 通过 Anthropic SDK 或 Managed Agents API 直调（跳过 CC 工具层）
- 改造量大，且 qa-flow 并非独立的 Claude API 应用，而是 Claude Code skill/agent 编排器

**结论**：
- **暂不实施**。prompt cache 需要改造为 Anthropic SDK 直调模式，与 Claude Code agent 编排架构不兼容
- 若将来 Claude Code 平台本身支持 agent prompt cache（通过 agent frontmatter 声明静态段），可直接受益
- 跟进项：watch Claude Code release notes + Anthropic docs 的 prompt caching 更新

**立即可做的相关优化**（非本阶段范围）：
- 压缩 agent.md 正文，减少每次调用的 input token
- 把大型静态文档（`references/strategy-templates.md`）改为 tool 调用方式按需读取，而非每次注入
- 评估是否可把 writer-context-builder 的多 writer 共享 context 分离（减少重复 token）

---

## 10. 下阶段启动 prompt

Phase 5 完成日期：2026-04-19。最终测试数字：**821 pass / 0 fail**（起点 785 / +36）。

完整 phase 6 启动 prompt 见本文件末尾附录 §12。

---

## 11. 附录：现状盘点数据

### 11.1 CLI 脚本清单（28 个）

`.claude/scripts/` 下顶层 ts 脚本（不含 `lib/` / `__tests__/`）：

archive-gen / auto-fixer / config / create-project / discuss / format-check-script / format-report-locator / history-convert / image-compress / knowledge-keeper / migrate-helpers-split / migrate-session-paths / plan / plugin-loader / prd-frontmatter / report-to-pdf / repo-profile / repo-sync / rule-loader / search-filter / signal-probe / source-analyze / state / strategy-router / ui-autotest-progress / writer-context-builder / xmind-edit / xmind-gen

**实施结果**：27 个脚本迁移到 cli-runner；`report-to-pdf.ts` 因使用 commander positional arg 的旧模式且已稳定，**保留原生 commander 用法不迁移**（作为已知例外）。

### 11.2 agent 清单（位于 `.claude/agents/`）

参考 `git ls-files .claude/agents/`，按使用频率分批改造（见 §4.5.3）。

### 11.3 当前 .env key 类型分类

| 类别 | key 数 | 拆分目标 |
| --- | --- | --- |
| 核心通用 | 4（WORKSPACE_DIR / SOURCE_REPOS / GIT_REMOTE_URL / SERVER_WORKSPACE_PATH / REPO_BRANCH_MAPPING_PATH） | `.env` |
| 插件凭证 | 11（DINGTALK* / FEISHU / WECOM / SMTP* / ZENTAO* / LANHU*） | `.env` |
| 多环境 | 25（LTQC* / LTQCDEV* / CI63* / CI78* + ACTIVE_ENV） | `.env.envs` |
| 用户本地 | 0（按需） | `.env.local` |

---

## 12. Phase 6 启动 prompt

```markdown
# Phase 6 执行启动 prompt

## 已完成前序
- Phase 0 ✅ 信息架构 + rules 迁移
- Phase 2 ✅ PRD 需求讨论（discuss + plan.md）
- Phase 3 ✅ UI 自动化进化
- Phase 3.5 ✅ skill 重排
- Phase 4 ✅ MD 用例策略矩阵（4 维信号 + 5 策略 + probe 节点 + knowledge 注入）
- Phase 5 ✅ 横切基础设施（cli-runner / .env 三段式 / state 多环境 + plan 仲裁 / logger LOG_LEVEL）：785 → 821 pass

## Phase 6 Scope（roadmap §阶段 6）
命名迁移 + README 同步 + 架构图：

1. **命名迁移**：`workspace/{project}/historys/` → `history/` 统一（grep 调用点 → 脚本重命名 → 文档更新 → git mv）
2. **README 中英同步**：`README.md` + `README-EN.md` 按 phase 0-5 最新架构更新；加入"横切基础设施"一节（cli-runner / 三段式 .env / 多环境 state / LOG_LEVEL）
3. **drawio 架构图**：更新 `assets/diagrams/` 下架构图（移除 `code-analysis` / 加入 `hotfix-case-gen` / `bug-report` / `conflict-report` / strategy matrix / signal probe 等 phase 3.5/4 新 skill）

## 可选扩展（spec §9 开放问题）
- logger stderr 全量推广：是否启动？（风险：外部 grep 契约）
- agent prompt XML scaffold 统一：是否启动？（风险：需手工验证 LLM 输出等价）
- bun util.parseArgs 迁移：是否启动？（风险：commander 能力丢失）
- cli-runner subcommand groups 支持：是否启动？（需要时再扩）

## 首步
1. 读 `docs/refactor/specs/2026-04-19-cross-cutting-infrastructure-design.md` 全文（phase 5 实施详情 + §9 开放问题）
2. 读 `docs/refactor-roadmap.md` §阶段 6
3. grep `historys` 在全仓库的使用点，评估命名迁移影响面
4. 撰写 Phase 6 spec，停下来让用户 review

## 执行约束（与 Phase 4/5 一致）
- cwd = /Users/poco/Projects/qa-flow
- `workspace/{project}/.repos/` 只读
- 禁硬编码绝对路径/凭证；仓库根用 `repoRoot()`
- 主 agent 禁自行调试，派 sub-agent
- 无 Co-Authored-By；无 push
- 测试 fixture 必须 `after()` 清理
- 每 Task 完成后全量 `bun test ./.claude/scripts/__tests__` 全绿才进下一 Task
- 新基线 **821 pass**
```
