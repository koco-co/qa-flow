---
name: archive-converter
description: 历史用例归档转化 Skill。将非 Markdown 格式的历史测试用例（CSV、XMind）转化为标准化 Markdown 归档用例。当用户说「转化历史用例」「归档用例」「将XMind转为MD」「转换用例格式」「convert cases」「archive convert」「更新归档用例」时触发。支持全量转化、指定文件/模块转化和检测模式。
---

# 历史用例归档转化 Skill

本 Skill 将非 Markdown 格式的历史测试用例（CSV、XMind）转化为标准化 Markdown 格式，存放到 `cases/archive/` 目录，供 AI 工作流（test-case-generator 等）引用和参考。

**执行前必须阅读本文件和 `rules/archive-format.md`。**

---

## 一、支持的输入格式

| 格式  | 来源路径                                        | 说明            |
| ----- | ----------------------------------------------- | --------------- |
| CSV   | `cases/history/${module_key}/${version}/*.csv`  | 含完整步骤+预期 |
| XMind | `cases/xmind/**/*.xmind`                        | 标题树结构      |

---

## 二、输出目标

转化后的 Markdown 文件统一存放在 `cases/archive/` 目录下，根据来源自动判断输出路径：

| 来源 | 输出目录 |
| --- | --- |
| 模块 XMind | `cases/archive/${module_key}/` |
| 带版本的模块 XMind | `cases/archive/${module_key}/v${version}/` |
| 模块 CSV | `cases/archive/${module_key}/${version}/` |

路径解析使用 `resolveModulePath(moduleKey, 'archive', config, version)`，模块 key 和版本从输入文件路径或 `config.modules` 推断。

---

## 三、执行流程

```
Step 1: 解析用户指令
  → 确定运行模式（全量/指定/检测）
  → 确定目标范围（全部/指定模块/指定文件）

Step 2: 执行转化
  → 调用 convert-history-cases.mjs（附带相应参数）
  → 脚本自动处理增量（跳过已有 MD）
  → --force 参数可强制覆盖

Step 3: 输出结果
  → 展示转化统计（成功/跳过/失败数量）
  → 如有失败，展示失败文件和原因
  → 提示用户可在 cases/archive/ 目录查看结果
```

---

## 四、运行模式

### 4.1 全量模式（默认）

转化所有未归档的历史用例：

```
转化所有历史用例
更新归档用例
```

运行命令：

```bash
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs
```

### 4.2 指定模式

转化指定文件或模块的历史用例：

```
将 cases/xmind/${module_key}/xxx.xmind 转为MD
转化${模块名}的历史用例
```

运行命令：

```bash
# 指定文件
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --path <file>

# 指定模块（使用模块名称或 key）
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --module <name>
```

### 4.3 检测模式

仅检测未转化的历史用例，不执行转化：

```
检查哪些历史用例还没转化
```

运行命令：

```bash
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --detect
```

---

## 五、强制覆盖模式

当需要忽略已有 MD、强制重新转化时，附加 `--force` 参数：

```
强制重新转化所有历史用例
```

运行命令：

```bash
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --force
```

也可与指定模式组合使用：

```bash
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --module ${module_key} --force
```

---

## 六、模块名称映射

模块名称映射从 `config.modules` 动态构建：
- `config.modules[key].zh` → key（中文名到 key 的映射）
- key → key（直通映射）

无需手动维护映射表，添加新模块只需在 `config.json` 的 `modules` 中配置。

> **注意**：`--module` 参数接受中文名（如配置了 `zh` 字段）或 key（英文），两者均有效。

---

## 七、与 test-case-generator 的集成

本 Skill 也会被 test-case-generator 在 Step 1.4 自动调用——当检测到目标模块存在未转化的历史用例时，自动触发归档转化，确保后续 Brainstorming 和 Writer 能引用到完整的历史用例上下文。

自动调用时等价于：

```bash
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --module <当前模块名或key>
```

---

## 八、完成通知

转化完成后，向用户输出：

```
✅ 历史用例归档转化完成

转化统计：
- 成功：<N> 个文件
- 跳过（已存在）：<M> 个文件
- 失败：<K> 个文件

输出目录：<cases/archive/... 路径>
```

如有失败文件，额外展示：

```
❌ 失败文件：
- <文件路径>：<失败原因>
```

---

## 参考文件

- `.claude/skills/archive-converter/scripts/convert-history-cases.mjs` — 转化脚本
- `rules/archive-format.md` — 归档格式规范
