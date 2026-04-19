# 命名迁移 + README + 架构图

**Phase**: 6 · 命名迁移 + README 同步 + drawio 架构图（roadmap §阶段 6）
**Date**: 2026-04-19
**Status**: Approved — 2026-04-19 decisions merged (§9.2)
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream**:
- Phase 0 信息架构 ([`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md))
- Phase 2 PRD 讨论 ([`2026-04-18-prd-discussion-design.md`](./2026-04-18-prd-discussion-design.md))
- Phase 3 UI 自动化进化 ([`2026-04-18-ui-autotest-evolution-design.md`](./2026-04-18-ui-autotest-evolution-design.md))
- Phase 3.5 skill 重排 ([`2026-04-18-skill-reorganization-design.md`](./2026-04-18-skill-reorganization-design.md))
- Phase 4 策略矩阵 ([`2026-04-18-md-case-strategy-matrix-design.md`](./2026-04-18-md-case-strategy-matrix-design.md))
- Phase 5 横切基础设施 ([`2026-04-19-cross-cutting-infrastructure-design.md`](./2026-04-19-cross-cutting-infrastructure-design.md))

---

## 1. Context

Phase 0–5 把 qa-flow 的信息架构、PRD 讨论、UI 自动化、skill 分拆、策略矩阵、横切基础设施全部搭完。**业务面和底盘都落地了，但命名和外宣还停留在 phase 2/3 的形态**：

- `workspace/{project}/historys/` 目录名是错的复数形式，CLAUDE.md / README / SKILL.md / create-project.ts 全部照抄，已成既定事实
- README.md / README-EN.md 文档还按 phase 2/3 的架构写（`test-case-gen` 节点数写作 7 节点，实际已是 10 节点 probe+strategy；缺 `knowledge-keeper` / `create-project` 两个新 skill 的说明；缺横切基础设施章节）
- `assets/diagrams/` 下 5 套 drawio 架构图（architecture / plugin-system / test-case-gen / ui-autotest / code-analysis）— `code-analysis` 已在 phase 3.5 删除，图却仍在；architecture 图未体现 phase 3.5/4 新 skill

这三件事是「对外叙述」层面的收尾，不改业务逻辑，但直接影响新用户第一印象与现有文档的可信度。

### 1.1 现状盘点

#### 1.1.1 `historys` 命名使用点（14 处文件，25+ 处实例）

| 类别 | 文件 | 备注 |
| --- | --- | --- |
| 代码（必改） | `.claude/scripts/lib/create-project.ts` | `projectStructure.subDirs` 含 `historys`（3 处） |
| 测试（必改） | `.claude/scripts/__tests__/create-project.test.ts` | 断言含 `historys`（5 处） |
| skill 文档 | `.claude/skills/qa-flow/SKILL.md` | 示例路径（1 处） |
| skill 文档 | `.claude/skills/qa-flow/references/quickstart.md` | 目录说明（1 处） |
| README | `README.md` / `README-EN.md` | 目录树 + 示例命令（各 2 处） |
| CLAUDE.md | `CLAUDE.md` | 目录树（1 处） |
| roadmap | `docs/refactor-roadmap.md` | 阶段 6 scope 描述（保留，仅改"已完成"） |
| spec | `docs/refactor/specs/2026-04-18-create-project-skill-design.md` | 原始设计规范（保留，历史定稿） |
| plan | `docs/refactor/plans/2026-04-17-phase0-implementation.md` / `2026-04-18-create-project-implementation.md` | 已完结 plan（保留不改） |
| spec | `docs/refactor/specs/2026-04-19-cross-cutting-infrastructure-design.md` | phase 5 spec 提及 phase 6 scope（保留） |
| 实际目录 | `workspace/dataAssets/historys/` | 含真实历史资料 3 文件 + 1 子目录 `v6.4.10` |
| 实际目录 | `workspace/xyzh/historys/` | 含 csv / prds / xmind 三子目录 |
| 脏数据 | `workspace/historys/信永中和/` + `workspace/xyzh/historys/dataAssets/` / `xyzh/` | 早期误建，仅在两个 archive tmp json 里被引用 |

#### 1.1.2 README 同步缺口

| 章节 | 现状 | 应对 |
| --- | --- | --- |
| `核心特性` | 写"7 个 Skill / 5 个核心工作流"、"13 Agent 架构" | 实际 11 skill + 14+ agent（含 pattern-analyzer），数字更新 |
| `架构总览` | 列出 11 个 skill 名，但 `test-case-gen` 节点图不含 probe | architecture 图重绘后同步描述 |
| `工作流详解 §1` | `test-case-gen` 7 节点表 | 更新为 10 节点（signal probe + strategy router + knowledge inject） |
| `工作流详解 §2` | Hotfix/Bug/Conflict 描述齐全 | 无需改 |
| `工作流详解 §4` | `ui-autotest` 9 步骤 + pattern-analyzer 未体现 | 补 pattern-analyzer 节点 + Allure 替换说明 |
| `脚本 CLI 参考` | 仅列 10 个脚本 | 补 `signal-probe.ts` / `strategy-router.ts` / `discuss.ts` / `writer-context-builder.ts` / `knowledge-keeper.ts` / `rule-loader.ts` / `repo-profile.ts` 等新脚本 |
| `环境配置` | 未提及 `.env.envs` / `.env.local` / ACTIVE_ENV | 新增"多环境配置"小节 |
| **新增章节**`横切基础设施` | 缺失 | 新增：cli-runner / 三段式 .env / 多环境 state / LOG_LEVEL |

`README-EN.md` 同结构英文同步（不新加内容，仅跟随翻译）。

#### 1.1.3 drawio 架构图缺口

| 文件 | 现状 | 应对 |
| --- | --- | --- |
| `architecture.drawio/png/svg` | 含 `code-analysis` 旧 skill | 重绘：移除 `code-analysis`，加入 `hotfix-case-gen` / `bug-report` / `conflict-report` / `knowledge-keeper` / `create-project` |
| `test-case-gen.drawio/png/svg` | 7 节点 | 重绘：10 节点含 probe + strategy + knowledge inject |
| `ui-autotest.drawio/png/svg` | 不含 pattern-analyzer / Allure | 重绘：9 步骤 + 步骤 5.5 共性收敛节点 |
| `plugin-system.drawio/png/svg` | 无变化 | 保持不变 |
| `code-analysis.drawio/png/svg` | 对应已删 skill | **删除** |

### 1.2 暴露的痛点

1. **`historys` 的复数错误已被多方引用**：新人复制目录模板会继续传错；README 截图里也写着；migration 要前后一致
2. **README 节点数字已过时**：访客看完 README 进入 skill 实际看到的是 10 节点，体验割裂
3. **code-analysis 图已成"僵尸资产"**：README 未直接引用该图，但文件仍在仓库里搜得到，新人可能被误导
4. **横切基础设施对新人零门槛暴露**：`.env.envs` 的存在需要在 README 明示，否则新人会困惑「为什么克隆后没有多环境配置」

### 1.3 目标态直觉

三件事都是「消除与现实的落差」：

1. **命名迁移**：全仓库一次性把 `historys` 改为 `history`（单数），包括代码、测试、文档、实际目录
2. **README 中英同步**：按 phase 0–5 终态重写关键章节，补齐缺失信息
3. **drawio 架构图**：重绘 3 张已过时的图 + 删除 1 张僵尸图

Phase 6 不动业务逻辑，不动基础设施，只动**文字与图**。

---

## 2. Goals

1. 重命名 `workspace/{project}/historys/` 为 `workspace/{project}/history/`（单数形式），使用 `git mv` 保留历史
2. 修改 `.claude/scripts/lib/create-project.ts` 中 `projectStructure.subDirs` 的 `historys` 为 `history`（3 处）
3. 修改 `.claude/scripts/__tests__/create-project.test.ts` 断言（5 处）
4. 为老用户提供兼容：`create-project` skill 在 repair 模式下检测到旧目录 `historys` 时**自动 rename**为 `history` + warn 日志（非破坏迁移）
5. 同步更新 5 处文档：`CLAUDE.md` / `README.md` / `README-EN.md` / `.claude/skills/qa-flow/SKILL.md` / `.claude/skills/qa-flow/references/quickstart.md`
6. README 中英重写：
   - `核心特性` 表格数字更新（11 skill / 14 agent）
   - `工作流详解 §1 test-case-gen`：节点表 7 → 10（含 probe / strategy router / knowledge inject）
   - `工作流详解 §4 ui-autotest`：步骤表补 5.5 共性收敛（pattern-analyzer）+ Allure 替换说明
   - `脚本 CLI 参考`：补 7 个新脚本（signal-probe / strategy-router / discuss / writer-context-builder / knowledge-keeper / rule-loader / repo-profile）
   - `环境配置`：新增"多环境（ACTIVE_ENV）"小节说明三段式
   - **新增章节**`横切基础设施`：cli-runner 工厂 + 三段式 .env + 多环境 state + LOG_LEVEL
7. drawio 架构图重绘 3 张：
   - `architecture.drawio/png/svg`（移除 code-analysis，加入 hotfix/bug/conflict/knowledge/create-project）
   - `test-case-gen.drawio/png/svg`（7 → 10 节点）
   - `ui-autotest.drawio/png/svg`（含 pattern-analyzer 节点 + Allure 替换标记）
8. drawio 僵尸资产删除：`code-analysis.drawio` / `.png` / `.svg`
9. 脏数据清理：`workspace/historys/信永中和/` 目录（非任何项目所属）移入对应项目的 `history/` 或 `.trash/`（需用户确认）
10. 测试基线不下降：`bun test ./.claude/scripts/__tests__` 从 821 开始，phase 6 结束 **≥ 821 pass**（预期无新增测试）

---

## 3. Non-Goals

- **改 rules/ 内容** → phase 0 已定型，本阶段仅同步命名引用（无 rules 引用 `historys`）
- **改 `.env.example` 内容** → phase 5 已做三段式拆分，本阶段 README 仅描述已有事实
- **新增新 drawio 图** → 仅重绘 3 张 + 删 1 张，不新增 `strategy-matrix.drawio` 之类
- **重写 CLAUDE.md 主体** → 仅改 `historys → history` 一处，不动其他章节
- **修 workspace archive 旧 json 里的 `historys` 路径** → 两处脏 json（`workspace/xyzh/archive/202604/tmp/20260410-*.json` 等）是历史生成产物，保持不动（路径已失效但不影响当前流程）
- **支持 `historys`/`history` 双向兼容**（仅向前迁移，rename 老目录；主干只保留 `history`）
- **重绘 plugin-system.drawio** → 插件架构未变，图仍正确
- **改 drawio XML 以外的 svg/png 渲染** → 仍需人工用 draw.io / diagrams.net 导出；AI 只改 .drawio 源
- **RoadMap 历史 phase 记录改写** → phase 0–5 的条目（含 spec / plan 引用）保持不动，仅追加 phase 6 DONE
- **agent prompt 中 `historys` 引用搜索** → 当前 grep 结果显示 agent 文件无引用；若有漏网则临时补

---

## 4. Architecture

### 4.1 命名迁移

#### 4.1.1 原则

- **单数 `history`**：与仓库其他目录命名一致（`archive` / `issues` / `reports` / `tests` 都是单数名词表示目录内容类别）
- **原子迁移**：一次 commit 完成所有引用替换，不做过渡期双名并存
- **git mv 保留历史**：对 `workspace/dataAssets/historys/` 和 `workspace/xyzh/historys/` 用 `git mv` 而非 `rm + add`
- **老用户兼容**：`create-project` skill 的 repair 模式检测到 `historys` 目录时自动 rename，不留旧目录

#### 4.1.2 代码改动

```typescript
// .claude/scripts/lib/create-project.ts
// 改动位置：projectStructure.subDirs、defaultSubDirs、validateProjectStructure

export const DEFAULT_SUBDIRS = [
  "prds",
  "xmind",
  "archive",
  "issues",
  "history",       // ← 改自 "historys"
  "reports",
  "tests",
  "rules",
  "knowledge",
  ".repos",
  ".temp",
] as const;

// repair 模式下新增
function migrateHistorysDir(projectRoot: string, log: Logger): void {
  const oldDir = join(projectRoot, "historys");
  const newDir = join(projectRoot, "history");
  if (existsSync(oldDir) && !existsSync(newDir)) {
    renameSync(oldDir, newDir);
    log.warn(`renamed legacy directory: historys → history`);
  }
}
```

#### 4.1.3 单测改动

```typescript
// .claude/scripts/__tests__/create-project.test.ts
// 现有断言 5 处 "historys" → "history"
// 新增 1 个 test case：legacy historys rename（在 repair mode 下）

test("repair mode renames legacy historys to history", () => {
  const root = mkdtempSync(...);
  mkdirSync(join(root, "historys"));
  runRepair(root);
  expect(existsSync(join(root, "history"))).toBe(true);
  expect(existsSync(join(root, "historys"))).toBe(false);
});
```

#### 4.1.4 实际目录迁移

```bash
# 真实项目目录
git mv workspace/dataAssets/historys workspace/dataAssets/history
git mv workspace/xyzh/historys workspace/xyzh/history

# 脏数据目录（需用户确认处理方式）
# 选项 A：移入所属项目
# git mv workspace/historys/信永中和 workspace/xyzh/history/legacy-信永中和
# 选项 B：打入 .trash（等用户决定）
# mv workspace/historys workspace/.trash/

# phase 6 默认选 A：归并到 xyzh/history 下（信永中和是 xyzh 的业务名）
```

### 4.2 README 中英同步

#### 4.2.1 章节改动清单（中文版）

详见 §1.1.2 表格。关键改动：

**核心特性表**：

| 特性 | 旧描述 | 新描述 |
| --- | --- | --- |
| 第 1 行 | 7 个 Skill / 5 个核心工作流 | 11 个 Skill / 6 个核心工作流 |
| 第 2 行 | 13 Agent 架构 | 14+ Agent 架构（含 pattern-analyzer） |

**test-case-gen 节点表**（7 → 10）：

| 节点 | 名称 | 说明 |
| --- | --- | --- |
| 1 | init | 解析输入、恢复状态、加载项目/插件上下文 |
| 2 | discuss | PRD 需求讨论（主 agent 主持，落盘 plan.md） |
| 3 | probe | 4 维信号探针（bug / regression / feature-magnitude / reuse-score） |
| 4 | strategy | 5 策略派发（S1–S5，S5 外转 hotfix-case-gen） |
| 5 | transform | 源码分析 + PRD 结构化 |
| 6 | enhance | 图片识别、frontmatter 标准化、健康度预检 |
| 7 | analyze | 历史用例检索 + QA 头脑风暴 → 测试点清单（含 knowledge 注入） |
| 8 | write | 按模块拆分并行 Writer Sub-Agents 生成 Contract A 用例 |
| 9 | review | 质量门控审查（阈值 < 15% / 15–40% / > 40%），最多 2 轮 |
| 10 | output | 生成 XMind（A）+ Archive MD（B）、发送通知并清理状态 |

**新增章节 `横切基础设施`**（示例草案）：

```markdown
## 横切基础设施

Phase 5 收敛了 CLI / 配置 / 状态 / 日志四条横切通道：

### CLI Runner 工厂

`.claude/scripts/lib/cli-runner.ts` 提供 `createCli({ name, description, commands })`，
27 个 CLI 脚本统一入口。新增脚本直接调用工厂，自动获得：

- `initEnv()` 预加载
- `createLogger(name)` 注入
- 错误退出协议（stderr + exitCode 1）
- `LOG_LEVEL` 环境变量感知

### .env 三段式

| 文件 | 职责 | git 状态 |
| --- | --- | --- |
| `.env` | 核心 + 插件凭证 | gitignore（有 `.env.example`） |
| `.env.envs` | 多环境段（ACTIVE_ENV / LTQCDEV* / CI63* / ...） | gitignore（有 `.env.envs.example`） |
| `.env.local` | 用户本地覆盖（临时 token） | gitignore（无模板） |

加载优先级：`process.env > .env.local > .env.envs > .env`。

### 多环境 State 隔离

`qa-state` 文件名加 `ACTIVE_ENV` 后缀：`.qa-state-{slug}-{env}.json`。
多 CC 实例并行跑不同环境互不污染。resume 时以 `plan.md` frontmatter 为权威源。

### LOG_LEVEL

`LOG_LEVEL=debug` / `info` / `warn` / `error` 运行时切换日志级别。
`cli-runner` 入口自动调用 `initLogLevel()` 读取。
```

#### 4.2.2 英文版同步

`README-EN.md` 对应翻译上面所有改动。不新增英文独有内容。

### 4.3 drawio 架构图

#### 4.3.1 architecture.drawio 重绘

核心改动：
- 节点移除：`code-analysis`
- 节点新增：`hotfix-case-gen` / `bug-report` / `conflict-report` / `knowledge-keeper` / `create-project`
- 连线保持：`qa-flow` router → 各 skill

#### 4.3.2 test-case-gen.drawio 重绘

核心改动：
- 节点数 7 → 10
- 新增节点：`discuss`（节点 2）/ `probe`（节点 3）/ `strategy`（节点 4）
- 节点 `analyze` 增「knowledge inject」标签

#### 4.3.3 ui-autotest.drawio 重绘

核心改动：
- 节点 5 后增「5.5 pattern-analyzer」子节点（共性收敛）
- 节点 8 「Playwright report」改为「Allure report」

#### 4.3.4 code-analysis.drawio 删除

直接 `git rm assets/diagrams/code-analysis.{drawio,png,svg}`。

#### 4.3.5 PNG / SVG 导出约定

**AI 只负责修改 `.drawio` XML 源**。PNG/SVG 导出需要用户在 diagrams.net / draw.io Desktop 手动导出，或用 `drawio-cli`（如已安装）批量重渲：

```bash
# 可选：若用户有 drawio-cli
drawio --export --format svg assets/diagrams/*.drawio
drawio --export --format png assets/diagrams/*.drawio
```

若用户无 drawio-cli，spec 建议：phase 6 commit 时，PNG/SVG 可暂时保持旧版本，下次用户打开 draw.io 时同步重导。**主干 README 引用的是 `.svg`**，所以重导时机不强约束。

---

## 5. Flow 示例

### 5.1 命名迁移 commit 序列

```
commit 1: refactor(create-project): rename subdir historys → history
  - .claude/scripts/lib/create-project.ts
  - .claude/scripts/__tests__/create-project.test.ts
  - 新增 legacy dir auto-migrate 测试

commit 2: chore(workspace): git mv historys → history for existing projects
  - workspace/dataAssets/historys/ → workspace/dataAssets/history/
  - workspace/xyzh/historys/ → workspace/xyzh/history/

commit 3: docs: rename historys → history in all docs
  - CLAUDE.md
  - README.md / README-EN.md
  - .claude/skills/qa-flow/SKILL.md
  - .claude/skills/qa-flow/references/quickstart.md

commit 4 (可选，用户确认后)：chore(workspace): cleanup legacy workspace/historys orphan
  - workspace/historys/信永中和/ → workspace/xyzh/history/legacy-信永中和/
```

### 5.2 README 重写 commit 序列

```
commit 5: docs(readme): sync to phase 0-5 final architecture
  - README.md / README-EN.md 核心特性 / 架构总览 / test-case-gen 节点表 / ui-autotest 步骤表

commit 6: docs(readme): add 横切基础设施 section
  - README.md / README-EN.md 新增章节

commit 7: docs(readme): add 环境配置 multi-env subsection
  - README.md / README-EN.md
```

### 5.3 drawio commit 序列

```
commit 8: chore(diagrams): remove obsolete code-analysis diagrams
  - git rm assets/diagrams/code-analysis.{drawio,png,svg}

commit 9: docs(diagrams): update architecture.drawio for phase 3.5/5 skills
  - assets/diagrams/architecture.drawio

commit 10: docs(diagrams): update test-case-gen.drawio for 10-node workflow
  - assets/diagrams/test-case-gen.drawio

commit 11: docs(diagrams): update ui-autotest.drawio with pattern-analyzer + allure
  - assets/diagrams/ui-autotest.drawio
```

### 5.4 老用户 repair 体验

```bash
# 老用户 pull 最新代码，其 workspace/myProj/ 下还是旧目录 historys/

# 主动触发 repair
/qa-flow
> "项目 myProj 的目录结构需要升级：historys → history，是否现在迁移？"
> [用户确认] → rename + log warn

# 或被动触发：其他 skill 检测到 historys 存在时 log warn 一次
```

---

## 6. 实施步骤（拟 plan 时细化）

### Wave 1：命名迁移（独立）

1. **create-project.ts + 单测改造**
   - 常量 `DEFAULT_SUBDIRS` / `projectStructure.subDirs` 的 `historys` → `history`
   - 新增 `migrateHistorysDir()` 函数 + repair 模式调用点
   - 新增 1 个单测：legacy dir auto-rename
2. **workspace 目录 git mv**
   - `workspace/dataAssets/historys` / `workspace/xyzh/historys` 两处
3. **文档同步**
   - CLAUDE.md / README.md / README-EN.md / SKILL.md / quickstart.md
4. **脏数据处理**
   - 询问用户 `workspace/historys/信永中和/` 归并方向

### Wave 2：README 重写（依赖 Wave 1）

5. **核心特性 + 架构总览**
   - 数字更新（11 skill / 14 agent）
6. **工作流详解 §1 test-case-gen 节点表**
   - 7 → 10 节点
7. **工作流详解 §4 ui-autotest 步骤表**
   - 补 pattern-analyzer 5.5 + Allure
8. **脚本 CLI 参考**
   - 补 7 个新脚本行
9. **环境配置**
   - 新增多环境小节
10. **新增`横切基础设施`章节**
11. **英文版同步**
    - README-EN.md 全部对应翻译

### Wave 3：drawio 重绘（独立于 Wave 1/2）

12. **删 code-analysis**
    - git rm 3 个文件
13. **architecture.drawio 重绘**
14. **test-case-gen.drawio 重绘**
15. **ui-autotest.drawio 重绘**
16. **（可选）PNG/SVG 重导**
    - 若用户环境有 drawio-cli，spec 附命令；无则延到下次手工导

### Wave 4：收尾

17. **roadmap 标 DONE**
    - `docs/refactor-roadmap.md` phase 6 ✅
18. **smoke 验证**
    - `bun test` 全绿（≥ 821）
    - `create-project` 手工跑一遍新项目验证 `history/` 目录正确
    - README 渲染预览（GitHub 或本地 VSCode Markdown Preview）
19. **commit 序列完成后询问是否触发下一轮重构（Phase 7 待定）**

---

## 7. 测试计划

### 7.1 单测基线

起点 **821 pass** → phase 6 完成后 **≥ 822 pass**（+1：legacy historys auto-rename 测试）

| 测试文件 | 覆盖点 |
| --- | --- |
| `create-project.test.ts`（扩展） | 断言 `history` 而非 `historys`；新增 legacy rename 测试 |
| 其他全部脚本单测（保持绿） | 无代码改动，仅保护命名迁移不破坏任何 CLI 行为 |

### 7.2 端到端 smoke（手动）

- **新项目创建**：`/qa-flow` → 创建 `testProj`，确认 `workspace/testProj/history/` 存在且无 `historys/`
- **老项目修复**：模拟一个只有 `historys/` 的项目，跑 repair，验证自动 rename
- **README 渲染**：本地 VSCode 预览 `README.md` + `README-EN.md`，确认链接、表格、代码块、图片都正常
- **drawio 渲染**：打开 `architecture.drawio` / `test-case-gen.drawio` / `ui-autotest.drawio` 用 draw.io Desktop 或 web，确认节点连线正确

### 7.3 回归保护

- `bun test ./.claude/scripts/__tests__` 全绿
- `bunx biome check .` 无新增错误
- `git log --oneline` 可见 11 个 atomic commit（Wave 1–4）

---

## 8. 迁移策略

### 8.1 向后兼容

| 旧行为 | 迁移策略 |
| --- | --- |
| 老用户有 `workspace/{proj}/historys/` | `create-project` repair 模式自动 rename + warn |
| 老用户粘贴 README 示例命令 `标准化归档 workspace/<project>/historys/...` | 文档已改 `history/`；老命令仍可工作（因 repair 时已 rename） |
| 老 archive tmp json 中 `prd_path: workspace/historys/...` | 不改（历史生成产物，路径已失效但不影响当前流程） |
| 旧 drawio 图已被用户 fork 引用 | 主干直接覆盖；用户若需旧版可从 git history 拉 |

### 8.2 文档同步

| 文件 | 改动 |
| --- | --- |
| `CLAUDE.md` | 目录树 `historys` → `history` |
| `README.md` / `README-EN.md` | 10 处改动（见 §4.2） |
| `.claude/skills/qa-flow/SKILL.md` | 示例路径 |
| `.claude/skills/qa-flow/references/quickstart.md` | 目录说明 |
| `docs/refactor-roadmap.md` | phase 6 ✅ |
| 历史 spec / plan | 保持不动（定稿文件） |

### 8.3 用户感知改动

- `workspace/{proj}/history/` 是新目录名（首次 pull + repair 后自动迁移，无数据丢失）
- README 大改版，但命令行接口零变化
- drawio 图片更符合实际 skill 列表

---

## 9. 风险与开放问题

### 9.1 风险

| 风险 | 缓解 |
| --- | --- |
| `git mv workspace/{proj}/historys` 时用户有本地未提交的 `historys/` 改动 | 提交前先检查 `git status`；有 uncommitted 则先 stash 或警告用户 |
| `create-project` repair 自动 rename 破坏用户在跑的脚本（正在读 `historys/` 的脚本） | repair 模式需用户显式触发（不在 idle 扫描时自动执行） |
| README 翻译偏差（中英不一致） | 同一 commit 同步改；review 时对照两版 |
| drawio XML 手改易破坏渲染 | 改前备份 `.drawio`；用 draw.io 打开验证；建议用户自己在 draw.io GUI 重绘 |
| 脏数据 `workspace/historys/信永中和/` 归并方向错误 | spec §5.1 明确询问用户确认后再操作；默认方案可退出 |
| 新 `横切基础设施` 章节内容与 phase 5 spec 脱节 | 翻译 spec §4 内容，引用原文关键词 |

### 9.2 开放问题（已决议）

用户 review 后 2026-04-19 决议如下：

1. **脏数据 `workspace/historys/信永中和/` 归并方向** → **A**：`git mv` 到 `workspace/xyzh/history/legacy-信永中和/`，保留数据可追溯
2. **PNG/SVG 是否本轮一并重导** → **A**：AI 仅改 `.drawio` XML；PNG/SVG 由用户之后用 draw.io Desktop 手工导出，避免 AI 渲染偏差影响外宣质量。commit 附提示
3. **`横切基础设施` 章节位置** → 放在 `插件系统` 之后、`项目结构` 之前。插件系统 + 横切基础设施构成「内部能力」段落，再接物理落点
4. **`create-project` repair 触发时机** → **A**：仅显式触发（`/qa-flow init` → 修复项目）。与 `feedback_orchestrator_no_debug` 偏好一致，不做被动自动修改
5. **英文命名** → 保留 `history`，直译自然

### 9.3 可选扩展（从 phase 5 §9 延续，暂不启动）

- logger stderr 全量推广（保留现状）
- agent prompt XML scaffold 统一（保留现状）
- bun util.parseArgs 迁移（保留 commander）
- cli-runner subcommand groups（按需扩）

---

## 10. 下阶段启动 prompt

Phase 6 完成后，roadmap 主干（0–6）全部 DONE。阶段 1（`create-project` / `knowledge-keeper` 代码实施）仍标 ⏳ PENDING，若尚未单独推进，应作为 **Phase 7** 启动；否则重构主轮次收尾。

Phase 7 启动 prompt 骨架（待 phase 6 完成时补数据）：

```markdown
# Phase 7 执行启动 prompt（待定）

## 已完成前序
- Phase 0 ✅ 信息架构 + rules 迁移
- Phase 2 ✅ PRD 需求讨论
- Phase 3 ✅ UI 自动化进化
- Phase 3.5 ✅ skill 重排
- Phase 4 ✅ MD 用例策略矩阵
- Phase 5 ✅ 横切基础设施（821 pass）
- Phase 6 ✅ 命名迁移 + README + 架构图

## Phase 7 Scope（候选）
- **Option A**：Phase 1 补齐（create-project / knowledge-keeper 完整实施）
- **Option B**：Phase 5 §9 开放问题启动（logger 推广 / agent XML scaffold）
- **Option C**：新业务目标（待用户确认）
```

---

## 11. 附录：现状数据

### 11.1 `historys` 实例清单

见 §1.1.1 表格。

### 11.2 README 改动行数估算

| 文件 | 改动行数 |
| --- | --- |
| `README.md` | ~80 行 |
| `README-EN.md` | ~80 行 |
| `CLAUDE.md` | 1 行 |
| `.claude/skills/qa-flow/SKILL.md` | 1 行 |
| `.claude/skills/qa-flow/references/quickstart.md` | 1 行 |
| `docs/refactor-roadmap.md` | 1 行（phase 6 ✅） |
| **合计** | **~164 行** |

### 11.3 drawio 改动规模

| 文件 | 操作 | 预估改动节点数 |
| --- | --- | --- |
| `architecture.drawio` | 重绘 | 4 增 1 删 |
| `test-case-gen.drawio` | 重绘 | 3 增 |
| `ui-autotest.drawio` | 重绘 | 1 增 1 改 |
| `code-analysis.*`（3 文件） | 删除 | 全删 |

---

**请 review 本 spec，确认后即可启动 plan 阶段。**

特别请用户就 §9.2 的 5 个开放问题给出倾向：
- Q1 脏数据方向（A/B/C）
- Q2 PNG/SVG 重导（A/B）
- Q3 横切基础设施章节位置
- Q4 repair 触发时机（A/B）
- Q5 英文命名无争议可跳过
