---
name: knowledge-keeper
description: "业务知识库读写。记录/查询业务概览、术语、模块知识、踩坑记录。触发词：记一下、沉淀到知识库、更新知识库、查业务规则、这个坑记一下、查术语、查模块知识。"
argument-hint: "[操作] [关键词或内容]"
---

# knowledge-keeper

## 前置加载

### 项目选择

扫描 `workspace/` 目录下的子目录（排除以 `.` 开头的隐藏目录）：

- 仅 1 个项目：自动选择，输出 `当前项目：{{project}}`
- 多项目：列出让用户选择
- 无项目：提示 `/qa-flow init` 初始化

选定的项目记为 `{{project}}`。

### 规则上下文

按 rule-loader 合并加载：

```bash
kata-cli rule-loader load --project {{project}}
```

---

## 知识层级

| 层级     | 存储路径                                        | 典型内容                       |
| -------- | ----------------------------------------------- | ------------------------------ |
| overview | `workspace/{{project}}/knowledge/_overview.md`  | 业务概览、主流程               |
| terms    | `workspace/{{project}}/knowledge/_core.json`    | 术语表（中英对照、别名）       |
| modules  | `workspace/{{project}}/knowledge/modules/*.md`  | 模块业务知识（带 frontmatter） |
| pitfalls | `workspace/{{project}}/knowledge/pitfalls/*.md` | 踩坑记录（带 frontmatter）     |

---

## CLI 命令总览

| 命令           | 用途                              | 写入? |
| -------------- | --------------------------------- | ----- |
| `read-core`    | 读 overview + terms + index       | 否    |
| `read-module`  | 读单个 module                     | 否    |
| `read-pitfall` | 检索 pitfall（按关键词）          | 否    |
| `write`        | 新增 term/overview/module/pitfall | 是    |
| `update`       | 精细更新 frontmatter / body       | 是    |
| `verify`       | 冲突检测（写入前必调）            | 否    |
| `history`      | 查看 `.audit.jsonl` 写入/回滚记录 | 否    |
| `rollback`     | 按 audit index 回滚到快照         | 是    |
| `index`        | 刷新 `_index.md`                  | 是    |
| `lint`         | 健康检查                          | 否    |

**防污染三件套：** `verify`（写前检测）+ `.history/` 快照 + `.audit.jsonl` 审计。详见 `workflow/write.md` 的 B5 仲裁流程与 C3 回滚流程。

---

## 工作流分支

- 查询场景（A1 查术语 / A2 查模块知识 / A3 查踩坑）：详见 [`workflow/read.md`](workflow/read.md)
- 写入场景（B1-B5 写入流程、覆盖策略、置信度分流、冲突仲裁）与维护场景（C1 索引刷新 / C2 健康检查 / C3 历史查询 + 回滚）：详见 [`workflow/write.md`](workflow/write.md)

---

## Subagent 调用守则（速览）

- subagent **禁止**直接调 `write` / `update`
- subagent 发现需沉淀知识时，在返回报告中标注：`建议沉淀：{{type}} / {{content 摘要}} / 置信度 {{conf}}`
- 主 agent 收到后由本 skill 统一处理写入流程
- subagent 可自由调 `read-core` / `read-module` / `read-pitfall`（只读安全）

完整守则与其他 skill 集成方式详见 [`workflow/write.md`](workflow/write.md) 与 [`workflow/read.md`](workflow/read.md)。
