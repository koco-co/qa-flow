# Knowledge Architecture 设计文档

**Phase**: 0 · 信息架构 + rules/ 迁移
**Date**: 2026-04-17
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`docs/refactor-roadmap.md`](../../refactor-roadmap.md)

---

## 1. Context

qa-flow 在长期使用中暴露出三个信息层级的职责混淆：

- `memory/` 混入了"项目状态"（如 `project_15695_branches.md`、`project_multi_env_architecture.md`），边界不清
- `preferences/` 全局四个文件均为空壳模板（仅有占位符），实际规则全部沉淀在 `workspace/{project}/preferences/`
- **业务知识库层级完全缺失**：对于"数据源模块授权流程是什么"、"质量项目创建的业务规则"这类业务事实，当前没有存放处

第 0 阶段为整轮重构打地基：清晰定义三层信息架构、提供 `knowledge-keeper` skill contract、并完成 `preferences/ → rules/` 命名迁移。

---

## 2. Goals

1. 定义 memory / rules / knowledge 三层边界，并形成可落地的判断维度
2. 确定 `knowledge/` 的组织粒度（P3 混合结构）
3. 定型写入策略（W2 按置信度分级）与读取策略（R3 分层懒加载）
4. 产出 `knowledge-keeper` skill contract 骨架
5. 完成 `preferences/ → rules/` 物理迁移（目录 + 脚本引用 + 文档引用 + 测试）
6. 在每个项目 `workspace/{project}/` 下创建 `knowledge/` 空骨架

---

## 3. Non-Goals

- `knowledge-keeper` skill 的代码实施 → 第 1 阶段
- `create-project` skill 实施 → 第 1 阶段
- `knowledge/` 内容填充 → 长期维护事务
- `memory/` 现有条目的物理迁移（边界重定义即可，无需动文件）
- `README.md` 全面改写（拖到第 6 阶段）

---

## 4. Architecture

### 4.1 三层信息架构（方案 C：寿命 × 作用域）

| 层 | 寿命 | 作用域 | 语义 | 典型内容 |
| --- | --- | --- | --- | --- |
| `memory/` | **长**（跨项目永久） | 用户级 | 协作偏好 + 项目状态小便签 | `feedback_*`（AI 协作风格）、`project_*`（如"正在做 15695 迭代"这类短状态引用） |
| `rules/` | **中**（项目周期内稳定） | 项目级 + 全局级（双层） | 硬约束规则 | 用例编写规范、XMind 结构约束、格式/命名约定 |
| `knowledge/` | **短-中**（业务迭代更新） | 仅项目级 | 业务知识库 | 主流程、术语表、业务规则、踩过的坑 |

**关键区分：`memory/project_*` vs `knowledge/`**

- `memory/project_*` = **AI 的"项目状态小便签"**（跨对话引用当前状态，如版本号、架构决策的实施进度）
- `knowledge/` = **项目的"业务知识库"**（系统化的业务事实，供 writer/script-writer 等 agent 生成内容时参考）

两者看似重叠实则语义不同，无需物理迁移现有 memory，**只需今后新信息按语义精准归位**。

### 4.2 目录结构（目标态）

```
qa-flow/
├── rules/                        # 全局规则（原 preferences/）
│   ├── case-writing.md
│   ├── data-preparation.md
│   ├── xmind-structure.md
│   └── prd-recognition.md
│
└── workspace/{project}/
    ├── rules/                    # 项目级规则（原 preferences/，覆盖全局）
    │   ├── case-writing.md
    │   ├── hotfix-frontmatter.md
    │   └── ...
    └── knowledge/                # 项目级业务知识库（新增）
        ├── overview.md           # 产品定位 + 主流程
        ├── terms.md              # 术语表
        ├── modules/              # 业务模块（每模块一文件）
        │   ├── data-source.md
        │   ├── quality.md
        │   └── ...
        ├── pitfalls/             # 踩坑记录（每坑一文件，便于精准检索）
        │   ├── ui-dom-drift.md
        │   └── ...
        └── _index.md             # 目录索引（自动维护）
```

### 4.3 写入策略（W2：按置信度分级）

| 置信度 | 触发场景 | 行为 |
| --- | --- | --- |
| **高** | 用户显式 "记一下 XX 是 YY" | 直接写，仅提示落盘路径 |
| **中** | 主 agent 从源码/PRD 提炼出新术语/规则 | `AskUserQuestion` 确认后写 |
| **低** | subagent 汇报 "踩了个坑"、或主 agent 推断性结论 | 主 agent 评估能否升级到"中"；不能升级就**暂存 → 阶段末批量问** |

**硬约束**：
- 所有写入必须经过 `knowledge-keeper` skill 的 API
- subagent 不得直接改 `knowledge/` 下任何文件
- 写入必然同步更新 `_index.md`

### 4.4 读取策略（R3：分层懒加载）

| 层级 | 内容 | 注入时机 | API |
| --- | --- | --- | --- |
| **核心** | `overview.md` + `terms.md` + `_index.md` | 所有 skill 启动时默认注入 | `read-core` |
| **模块** | `modules/*.md` | 按场景懒加载（writer 生成 `data-source` 模块用例时只读 `data-source.md`） | `read-module <name>` |
| **坑** | `pitfalls/*.md` | 按关键词懒加载（script-fixer 遇错时检索） | `read-pitfall <query>` |

### 4.5 Git 关系

`knowledge/` **默认进 Git**，跟随 `workspace/` 现有约定（与 `archive/`、`reports/` 一致）。团队协作 + 跨时间沉淀都受益。

敏感条目：通过文件名前缀 `private-` 标记，由 `.gitignore` 规则排除（例：`pitfalls/private-xxx.md`）。

---

## 5. knowledge-keeper Skill Contract

### 5.1 触发词

`记一下`、`沉淀到知识库`、`更新知识库`、`查业务规则`、`这个坑记一下`

### 5.2 Actions API 骨架

```
knowledge-keeper read-core
knowledge-keeper read-module <name>
knowledge-keeper read-pitfall <query>
knowledge-keeper write <type> <content>
  type ∈ {overview|term|module|pitfall}
knowledge-keeper update <path>
knowledge-keeper index                      # 刷新 _index.md
knowledge-keeper lint                       # 健康检查（frontmatter / 命名 / 孤立文件）
```

### 5.3 写入前置

所有 `write` / `update` 遵循 W2 置信度分级，中/低置信度强制 `AskUserQuestion`。

### 5.4 Frontmatter 约定

所有 `knowledge/` 下 Markdown 文件统一 frontmatter：

```yaml
---
title: <简要标题>
type: overview|term|module|pitfall
tags: [tag1, tag2]
confidence: high|medium|low
source: <证据来源，如源码路径、PRD URL、用户反馈编号>
updated: YYYY-MM-DD
---
```

### 5.5 实施范围

本 spec 只定义 contract。**代码实施在第 1 阶段进行**（与 `create-project` 一同交付）。

---

## 6. preferences → rules 迁移清单

### 6.1 路径变更

| 从 | 到 |
| --- | --- |
| `preferences/*.md` | `rules/*.md` |
| `workspace/*/preferences/*.md` | `workspace/*/rules/*.md` |

### 6.2 脚本变更（全量扫描 + 批改）

- `.claude/scripts/preference-loader.ts` → `.claude/scripts/rule-loader.ts`
- 所有引用 `preferences/` / `preference` / `Preference` 字符串的脚本、测试、配置
- 执行：`grep -r "preference" .claude/ preferences/ workspace/` 全量定位

### 6.3 文档变更

- `CLAUDE.md`（项目根）：增加三层边界说明 + 更新 `rules/` 路径
- 每个 skill 的 `SKILL.md` 中所有 `preferences/` 字样
- `README.md` / `README-EN.md` 同步（本阶段做最小改动，完整重写留第 6 阶段）

### 6.4 验证

- [ ] `bun test ./.claude/scripts/__tests__` 全绿
- [ ] skill 加载时 `rules/` 正常读取
- [ ] `workspace/{project}/rules/` 正常覆盖全局 `rules/`
- [ ] `grep -r "preference" .claude/` 确认无漏网之鱼（除历史注释说明以外）

---

## 7. Success Criteria

阶段 0 完成的硬性验收：

- [ ] 本 spec 文档已提交到 git
- [ ] `docs/refactor-roadmap.md` 已提交
- [ ] `preferences/` 目录物理改名为 `rules/`
- [ ] `workspace/*/preferences/` 改名为 `workspace/*/rules/`
- [ ] 脚本层引用全部更新（尤其 `preference-loader.ts` → `rule-loader.ts`）
- [ ] 单元测试全量通过
- [ ] 每个现有 workspace（`dataAssets`、`xyzh`）下创建 `knowledge/` 空骨架：
  - `knowledge/overview.md`（模板，含填充指南）
  - `knowledge/terms.md`（空表格模板）
  - `knowledge/modules/.gitkeep`
  - `knowledge/pitfalls/.gitkeep`
  - `knowledge/_index.md`（自动生成的目录）
- [ ] `CLAUDE.md` 增加"三层信息架构"章节
- [ ] smoke 验证：任意 skill（如 `test-case-gen`）能从 `rules/` 正常加载

---

## 8. Risks

| 风险 | 缓解 |
| --- | --- |
| 脚本漏改引用，运行时找不到 `preferences/` | 单元测试全量 + `grep -r "preference"` 全量扫描 |
| 生产项目 `workspace/*/preferences/` 改名影响在用用例 | 迁移在独立 atomic commit；分项目逐一改名 |
| `knowledge/` 空骨架带来认知负担（不知填什么） | `_index.md` 提供填充指南 + 模板自带示例 + knowledge-keeper 提供引导（第 1 阶段） |
| 三层边界在实际使用中再度模糊 | `knowledge-keeper` 写入时按 W2 + 维度判断自动归位 |

---

## 9. Out of Scope（转入后续阶段）

- `knowledge-keeper` skill 代码实施 → **阶段 1**
- `create-project` skill → **阶段 1**
- `knowledge/` 内容填充 → 长期维护
- `README.md` 全面重写 → **阶段 6**
- memory/project_* 条目的精简或归档 → 自然演进，不强制

---

## 10. 交付后下一步

本阶段结束时，主 agent 必须：
1. 生成"阶段 1 启动 prompt"（自包含、引用本 spec + roadmap）
2. 提示用户：**建议 /clear 或新开 CC 实例粘贴该 prompt 继续阶段 1**
3. 阶段 1 的 scope：`create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施
