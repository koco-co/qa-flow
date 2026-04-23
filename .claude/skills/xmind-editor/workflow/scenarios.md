# xmind-editor · 五大场景执行

> 由 SKILL.md 路由后加载。共享的前置加载、artifact_contract、写入确认策略、case-json 格式、用例编写规范在 SKILL.md 中定义，本文件不重复。

---

## 场景一：搜索用例

```bash
kata-cli xmind-patch search "{{keyword}}" --project {{project}}
```

展示所有匹配的用例列表（文件名 + 用例标题），用户选择后进入查看。

---

## 场景二：查看用例

```bash
kata-cli xmind-patch show --file {{file}} --title "{{title}}"
```

展示该用例的完整内容（前置条件 + 步骤 + 预期结果），等待用户下一步指令。

---

## 场景三：修改用例

1. 执行 `show` 展示当前内容
2. 用户说明修改意图
3. AI 构造 `case-json`（遵循 `rules/` 规则及用例编写规范）
4. 先执行预览：

```bash
kata-cli xmind-patch patch \
  --file {{file}} \
  --title "{{title}}" \
  --case-json '{{json}}' \
  --dry-run
```

5. 展示修改前后对比，等待用户确认
6. 用户确认后去掉 `--dry-run` 执行真实写入
7. 展示写入结果摘要
8. 触发**偏好写入流程**（详见 `workflow/preference-writing.md`）

---

## 场景四：新增用例

1. 与用户确认目标文件和父节点路径
2. AI 生成 `case-json`（`title` 必填）
3. 先执行预览：

```bash
kata-cli xmind-patch add \
  --file {{file}} \
  --parent "{{parent}}" \
  --case-json '{{json}}' \
  --dry-run
```

4. 展示即将新增的节点内容，等待用户确认
5. 用户确认后去掉 `--dry-run` 执行真实写入
6. 展示写入结果摘要
7. 触发**偏好写入流程**（详见 `workflow/preference-writing.md`）

---

## 场景五：删除用例

1. 先预览：

```bash
kata-cli xmind-patch delete \
  --file {{file}} \
  --title "{{title}}" \
  --dry-run
```

2. 展示将被删除的节点，等待用户确认
3. 用户确认后去掉 `--dry-run` 执行
