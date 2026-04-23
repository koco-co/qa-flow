---
name: xmind-editor
description: "XMind 测试用例局部编辑。无需 PRD，直接搜索/查看/修改/新增/删除已有 XMind 用例。触发词：修改用例、编辑用例、新增用例、删除用例。完成后触发偏好规则写入。"
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
- 若 **无项目**，提示用户先执行 `/kata init` 初始化

选定的项目名称记为 `{{project}}`，后续所有路径均使用该变量。

### 偏好上下文

按读取顺序加载偏好（后者覆盖前者）：

1. 全局 `rules/` 目录下所有 `.md` 文件
2. 项目级 `workspace/{{project}}/rules/` 目录下所有 `.md` 文件

<precedence>
用户当前指令 > 项目级 rules > 全局 rules > 本文件
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

## 工作流总览

| 场景   | 名称     | 操作类型 |
| ------ | -------- | -------- |
| 场景一 | 搜索用例 | 只读     |
| 场景二 | 查看用例 | 只读     |
| 场景三 | 修改用例 | 写入     |
| 场景四 | 新增用例 | 写入     |
| 场景五 | 删除用例 | 写入     |

五大场景的命令与执行细节详见 [`workflow/scenarios.md`](workflow/scenarios.md)。

修改/新增完成后的偏好规则写入流程（含归属判断、差异预览、AskUser 模板）详见 [`workflow/preference-writing.md`](workflow/preference-writing.md)。

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
