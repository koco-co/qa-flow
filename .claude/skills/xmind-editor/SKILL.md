---
name: xmind-editor
description: "XMind 测试用例局部编辑。无需 PRD，直接搜索、查看、修改、新增、删除已有 XMind 文件中的用例。触发词：修改用例、编辑用例、新增用例、更新步骤、删除用例。修改完成后触发偏好规则写入流程。"
argument-hint: "[操作] [用例标题或关键词]"
---

# xmind-editor

## 前置加载

读取 `preferences/` 目录下所有 `.md` 文件，作为本次编辑的偏好上下文。

---

## 场景一：搜索用例

```bash
bun run .claude/scripts/xmind-edit.ts search "{{keyword}}" --dir workspace/xmind
```

展示所有匹配的用例列表（文件名 + 用例标题），用户选择后进入查看。

---

## 场景二：查看用例

```bash
bun run .claude/scripts/xmind-edit.ts show --file {{file}} --title "{{title}}"
```

展示该用例的完整内容（前置条件 + 步骤 + 预期结果），等待用户下一步指令。

---

## 场景三：修改用例

1. 执行 `show` 展示当前内容
2. 用户说明修改意图
3. AI 构造 `case-json`（遵循 `preferences/` 规则及用例编写规范）
4. 执行写入：

```bash
bun run .claude/scripts/xmind-edit.ts patch \
  --file {{file}} \
  --title "{{title}}" \
  --case-json '{{json}}'
```

5. 展示修改前后对比
6. 触发**偏好写入流程**

---

## 场景四：新增用例

1. 与用户确认目标文件和父节点路径
2. AI 生成 `case-json`（`title` 必填）
3. 执行写入：

```bash
bun run .claude/scripts/xmind-edit.ts add \
  --file {{file}} \
  --parent "{{parent}}" \
  --case-json '{{json}}'
```

4. 触发**偏好写入流程**

---

## 场景五：删除用例

1. 先预览：

```bash
bun run .claude/scripts/xmind-edit.ts delete \
  --file {{file}} \
  --title "{{title}}" \
  --dry-run
```

2. 展示将被删除的节点，等待用户确认
3. 用户确认后去掉 `--dry-run` 执行

---

## 偏好写入流程

修改或新增用例完成、用户验收通过后触发：

```
AI 提炼本次修改中的可复用规则，向用户确认：

  📝 检测到可复用的偏好规则：
  「导出按钮的预期结果应包含文件命名规则」

  写入到：preferences/case-writing.md
  选项：[✓ 写入] [调整后写入] [跳过]
```

---

## case-json 格式

```json
{
  "title": "验证xxx（可选，patch 时可省略）",
  "priority": "P0|P1|P2（可选）",
  "preconditions": "前置条件（可选）",
  "steps": [{ "step": "操作描述", "expected": "预期结果" }]
}
```

- `patch` 时只写需变更的字段
- `add` 时 `title` 必填

---

## 用例编写规范提醒

- 第一步必须以「进入【xxx】页面」开头
- 禁止模糊词：「尝试」「相关信息」「某些数据」等
- 预期结果必须可观测，禁止「操作成功」「显示正确」等空洞表述
