# ui-autotest · step 2 — 登录态准备

> 由 SKILL.md 路由后加载。执行时机：步骤 1（解析与范围确认）完成后。

按 Task Schema 更新：将 `步骤 2` 标记为 `in_progress`。

**2.1 检查已有 session**

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts --project {{project}} --url {{url}} --output .auth/{{project}}/session-{{env}}.json
```

若返回 `{ "valid": true }`，直接复用，跳过登录。

**2.2 引导用户登录（session 无效时）**

脚本会自动打开浏览器，提示用户：

```
浏览器已打开，请手动登录系统。
登录完成后请回到此终端按 Enter 继续...
```

登录完成后，session 保存至 `.auth/session-{{env}}.json`。

---

按 Task Schema 更新：将 `步骤 2` 标记为 `completed`（subject: `步骤 2 — 登录态就绪`）。
