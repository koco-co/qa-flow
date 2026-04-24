# bug-report · routing（路由识别与回退）

> 由 SKILL.md 路由后加载。共享的输入校验、确认策略、契约定义在 SKILL.md 前段，本文件不重复。

---

## 路由识别

根据 SKILL.md `<routing>` 段的信号判定：

- 后端信号 → 派发 `backend-bug-agent`（详见 `workflow/backend.md`）
- 前端信号 → 派发 `frontend-bug-agent`（详见 `workflow/frontend.md`）
- 歧义（两类信号都没有或同时出现）→ AskUserQuestion 询问"属于后端还是前端？"

---

## 路由错误回退

若用户首次回答「后端」但实际为前端报错（或反之），路由错误会导致 agent 分析方向偏离。处理策略：

1. 在生成的 HTML 报告 footer 自动注入「路由判定提示」：

   ```
   ⚠️ 若分析方向不准确，请检查堆栈顶部的 `at` 行：
   - 后端通常含 `at com.xxx.Service.method(Xxx.java:123)`
   - 前端通常含 `at module.js:line:col` 或 `at https://.../bundle.js:123:45`
   ```

2. 若用户在结果阶段反馈「分析错路由」，提供「切换路由」指引：

   ```
   重新触发 `/bug-report` 并在输入开头明确说明：
   - 「这是前端报错：...」 → 强制走 frontend-bug-agent
   - 「这是后端报错：...」 → 强制走 backend-bug-agent
   ```

3. 旧报告不删除（用户可对比），新报告以 `{{原 Bug 标题}}-rerouted.html` 命名写入同目录
