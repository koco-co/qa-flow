---
name: xmind-editor
description: "XMind 测试用例局部编辑。无需 PRD，直接搜索、查看、修改、新增、删除已有 XMind 文件中的用例。触发词：修改用例、编辑用例、新增用例、更新步骤、删除用例。修改完成后触发偏好规则写入流程。"
argument-hint: "[操作] [用例标题或关键词]"
---

# xmind-editor

## 前置加载

### 项目选择

扫描 `workspace/` 目录下的子目录（排除以 `.` 开头的隐藏目录和通用目录如 `.repos`）：
- 若只有 **1 个项目**，自动选择，输出：`当前项目：{{project}}`
- 若有 **多个项目**，列出供用户选择：
  ```
  检测到多个项目，请选择：
  1. project-a
  2. project-b
  请输入编号（默认 1）：
  ```
- 若 **无项目**，提示用户先执行 `/qa-flow init` 初始化

选定的项目名称记为 `{{project}}`，后续所有路径均使用该变量。

### 偏好上下文

按读取顺序加载偏好（后者覆盖前者）：
1. 全局 `preferences/` 目录下所有 `.md` 文件
2. 项目级 `workspace/{{project}}/preferences/` 目录下所有 `.md` 文件

<precedence>
用户当前指令 > 项目级 preferences > 全局 preferences > 本文件
</precedence>

<artifact_contract>
  <xmind_intermediate contract="A">
    <title>验证xxx</title>
    <priority>P1</priority>
  </xmind_intermediate>
  <archive_md contract="B">
    <display_title>【P1】验证xxx</display_title>
  </archive_md>
</artifact_contract>

> 本 Skill 写入 XMind 时必须使用 Contract A：`case-json.title` 保持裸标题 `验证xxx`，`priority` 单独存储。
> 若用户提供的是 Archive MD / 展示标题 `【P1】验证xxx`，写入前必须先拆分为 `title=验证xxx` + `priority=P1`。

## 写入确认策略

- `search` / `show` 为只读操作，直接执行，无需确认
- `patch` / `add` / `delete` 为状态变更操作，必须先 `--dry-run` 预览，再等待用户确认，最后执行真实写入
- 任何真实写入完成后，先展示结果摘要，再进入偏好写入流程

---

## 场景一：搜索用例

```bash
bun run .claude/scripts/xmind-edit.ts search "{{keyword}}" --project {{project}}
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
4. 先执行预览：

```bash
bun run .claude/scripts/xmind-edit.ts patch \
  --file {{file}} \
  --title "{{title}}" \
  --case-json '{{json}}' \
  --dry-run
```

5. 展示修改前后对比，等待用户确认
6. 用户确认后去掉 `--dry-run` 执行真实写入
7. 展示写入结果摘要
8. 触发**偏好写入流程**

---

## 场景四：新增用例

1. 与用户确认目标文件和父节点路径
2. AI 生成 `case-json`（`title` 必填）
3. 先执行预览：

```bash
bun run .claude/scripts/xmind-edit.ts add \
  --file {{file}} \
  --parent "{{parent}}" \
  --case-json '{{json}}' \
  --dry-run
```

4. 展示即将新增的节点内容，等待用户确认
5. 用户确认后去掉 `--dry-run` 执行真实写入
6. 展示写入结果摘要
7. 触发**偏好写入流程**

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

1. AI 提炼本次修改中的可复用规则
2. AI 判断该规则的归属：
   - **项目特定**（如特定产品的菜单结构、字段命名、业务术语）→ 写入 `workspace/{{project}}/preferences/` 下对应文件
   - **跨项目通用**（如用例编写格式规范、通用步骤模板）→ 写入全局 `preferences/` 下对应文件
3. AI 判断写入哪个偏好文件（如 `case-writing.md`、`xmind-structure.md`、`hotfix-frontmatter.md`，或新建文件）
4. 使用 AskUser 向用户确认判断结果：

```
📝 检测到可复用的偏好规则：
「导出按钮的预期结果应包含文件命名规则」

判断归属：项目级偏好（数据资产特定的按钮命名规范）
写入目标：workspace/dataAssets/preferences/case-writing.md

选项：[确认写入] [更换目标文件] [调整规则内容] [跳过]
```

5. 用户确认后执行写入，追加到目标文件末尾

---

## case-json 格式

```json
{
  "title": "验证xxx（Contract A，可选，patch 时可省略）",
  "priority": "P0|P1|P2（可选）",
  "preconditions": "前置条件（可选）",
  "steps": [{ "step": "操作描述", "expected": "预期结果" }]
}
```

- `patch` 时只写需变更的字段
- `add` 时 `title` 必填
- `title` 不得包含 `【P0】` / `【P1】` / `【P2】` 前缀；带前缀的显示标题仅属于 Archive MD / 其他展示面

---

## 用例编写规范提醒

- 第一步必须以「进入【xxx】页面」开头
- 禁止模糊词：「尝试」「相关信息」「某些数据」等
- 预期结果必须可观测，禁止「操作成功」「显示正确」等空洞表述
