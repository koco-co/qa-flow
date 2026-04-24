# hotfix-case-gen · 禅道输入解析

> 由 SKILL.md 路由后加载。共享的输入校验、确认策略、契约、产物路径定义在 SKILL.md 前段，本文件不重复。

---

## 输入格式

接收以下任一形式：

| 输入形式      | 示例                                                  | 处理                              |
| ------------- | ----------------------------------------------------- | --------------------------------- |
| 完整禅道 URL  | `{{ZENTAO_BASE_URL}}/zentao/bug-view-138845.html`     | 提取 `bug_id=138845`              |
| 裸 Bug ID     | `138845`                                              | 直接作为 `bug_id` 使用            |
| 含 ID 的文本  | `这个 bug 链接 bug-view-138845`                       | 用正则匹配 `bug-view-(\d+)` 提取  |

提取失败时按 SKILL.md `<pre_guard>` 中的 `invalid_input` 处理。`{{ZENTAO_BASE_URL}}` 来自 `.env`，不要硬编码。

---

## 输出目录约定

| 类型        | 目录                                     |
| ----------- | ---------------------------------------- |
| Hotfix 用例 | `workspace/{{project}}/issues/YYYYMM/`   |
| 临时文件    | `workspace/{{project}}/.temp/zentao/`    |
