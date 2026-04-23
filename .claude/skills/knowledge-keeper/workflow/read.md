# knowledge-keeper · 查询场景（只读）

> 由 SKILL.md 路由后加载。共享的前置加载、知识层级、CLI 命令总览在 SKILL.md 中定义，本文件不重复。

---

## A1. 查术语

```bash
kata-cli knowledge-keeper read-core --project {{project}}
```

从返回 JSON 的 `terms` 字段中过滤用户关键词并 Markdown 渲染。

---

## A2. 查模块知识

```bash
kata-cli knowledge-keeper read-module --project {{project}} --module {{name}}
```

渲染 `frontmatter` + `content`。文件不存在时给用户建议（列出已有 modules）。

---

## A3. 查踩坑

```bash
kata-cli knowledge-keeper read-pitfall --project {{project}} --query {{keyword}}
```

空结果时提示"未找到，建议：补充关键词 / 列出已有 pitfalls / 新增踩坑"。

---

## 其他 skill 集成

其他 skill 如需业务背景，在 SKILL.md 顶部新增：

```bash
kata-cli knowledge-keeper read-core --project {{project}}
```

返回的 overview / terms / index 作为业务背景注入后续决策。

**本阶段仅在本 SKILL.md 提供标准调用块**，其他 skill 的集成不做强制修改。
