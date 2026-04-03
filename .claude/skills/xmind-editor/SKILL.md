---
name: xmind-editor
description: 局部修改或新增 XMind 测试用例。无需读取 PRD，直接对已生成的 XMind 文件进行定点编辑。触发词：「修改用例」「编辑用例」「新增用例」「更新用例步骤」「给用例xxx添加步骤」「删除用例」。
---

# XMind 用例局部编辑 Skill

## 用途

**在不读 PRD 的前提下**，直接对已生成的 XMind 文件进行：
- 修改某条用例（步骤、预期结果、优先级、前置条件）
- 新增一条用例到指定页面/分组
- 删除某条用例

---

## 触发词

- `修改用例 "xxx"`
- `编辑用例 "xxx" 的步骤`
- `给用例 "xxx" 增加一个步骤`
- `新增用例 到 "xxx" 分组`
- `删除用例 "xxx"`
- `更新 "xxx" 的预期结果`

---

## 工具

脚本路径（均相对于 qa-flow 根目录执行）：

```
.claude/skills/xmind-converter/scripts/xmind-case-editor.mjs
```

---

## Canonical 工作流

### 场景一：修改已有用例

**步骤 1 — 搜索定位**

```bash
node .claude/skills/xmind-converter/scripts/xmind-case-editor.mjs \
  search "用户提供的用例标题关键词" \
  [--dir cases/xmind/202604]
```

- 输出：匹配的用例列表，含文件路径、树路径、标题、优先级
- 若匹配多条，展示给用户确认选哪条
- 若未找到，告知用户并停止

**步骤 2 — 查看当前内容**

```bash
node .claude/skills/xmind-converter/scripts/xmind-case-editor.mjs \
  show \
  --file "cases/xmind/202604/xxx.xmind" \
  --title "用例标题关键词"
```

- 输出：当前标题、优先级、前置条件、完整步骤列表
- 将内容展示给用户，**等待用户说明具体修改内容**

**步骤 3 — 应用修改**

收到用户指令后，构造 case-json 并执行：

```bash
node .claude/skills/xmind-converter/scripts/xmind-case-editor.mjs \
  patch \
  --file "cases/xmind/202604/xxx.xmind" \
  --title "用例标题关键词" \
  --case-json '{"priority":"P1","steps":[{"step":"...","expected":"..."}]}'
```

- case-json 只需包含**要变更的字段**，其余字段保持原值
- 输出：修改前后对比，确认写入成功

---

### 场景二：新增用例

**步骤 1 — 确认文件和父节点**

先搜索父节点（页面或功能分组）：

```bash
node .claude/skills/xmind-converter/scripts/xmind-case-editor.mjs \
  search "父节点标题关键词" \
  --dir cases/xmind/202604
```

若用户已给出文件路径，可直接跳到步骤 2。

**步骤 2 — 新增用例**

```bash
node .claude/skills/xmind-converter/scripts/xmind-case-editor.mjs \
  add \
  --file "cases/xmind/202604/xxx.xmind" \
  --parent-title "父节点标题关键词" \
  --case-json '{
    "title": "验证xxx",
    "priority": "P1",
    "preconditions": "1、xxx前置条件",
    "steps": [
      {"step": "进入【xxx】页面", "expected": "页面正常加载"},
      {"step": "操作xxx", "expected": "预期结果"}
    ]
  }'
```

- `--parent-title` 支持**部分匹配**（如"列表页"可匹配"规则列表页"）
- 新用例插入到父节点的最后一条子节点

---

### 场景三：删除用例

```bash
node .claude/skills/xmind-converter/scripts/xmind-case-editor.mjs \
  delete \
  --file "cases/xmind/202604/xxx.xmind" \
  --title "用例标题关键词" \
  [--dry-run]
```

- 强烈建议先加 `--dry-run` 预览再执行

---

## case-json 格式说明

```json
{
  "title": "验证xxx（可选，不填则保持原标题）",
  "priority": "P0|P1|P2（可选）",
  "preconditions": "前置条件文本（可选，设为空字符串则清除）",
  "steps": [
    { "step": "操作描述", "expected": "预期结果" }
  ]
}
```

- `patch` 时：只写需要变更的字段，未提供的字段保持原值
- `add` 时：`title` 必填，其余可选

---

## 用例编写规范（适用于 patch/add）

遵守 `.claude/rules/test-case-writing.md` 的规范：

- 第一步**必须**以「进入【xxx】页面」开头
- 步骤描述用具体操作，禁止"尝试"、"相关"等模糊词
- 预期结果须可观测，禁止"操作成功"等空洞表述
- 步骤数少于 4 条的正向用例需与同组其他正向用例合并

---

## 完成定义

1. `search` 已确认唯一目标文件和用例位置
2. `show` 已展示原始用例内容给用户
3. `patch`/`add`/`delete` 执行成功，输出路径确认
4. 无 dry-run 时，文件已落盘；有 dry-run 时，预览内容已展示

---

## 引用索引

- `.claude/skills/xmind-converter/scripts/xmind-case-editor.mjs`：编辑脚本
- `.claude/rules/test-case-writing.md`：用例编写规范（步骤格式、优先级等）
- `.claude/rules/xmind-output.md`：XMind 命名与路径规范
