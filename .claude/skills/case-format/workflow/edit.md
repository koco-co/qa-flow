# case-format / edit — XMind 测试用例局部编辑工作流
> 由 case-format SKILL.md 路由后加载。

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

五大场景的命令与执行细节详见 [`workflow/edit/scenarios.md`](edit/scenarios.md)。

修改/新增完成后的偏好规则写入流程（含归属判断、差异预览、AskUser 模板）详见 [`workflow/edit/preference-writing.md`](edit/preference-writing.md)。

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
