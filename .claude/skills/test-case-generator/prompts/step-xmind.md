<!-- step-id: xmind | delegate: xmindConverter -->
# Step xmind：XMind 输出

## 执行方式

调用 `xmind-converter` Skill（`.claude/skills/xmind-converter/SKILL.md`）。
文件命名和输出路径见 CLAUDE.md「XMind 输出规范」。

## 目标文件判断

- 文件不存在 → 新建
- 文件已存在，本次 requirement_name 不同 → `--append` 追加模式
- 文件已存在，requirement_name 相同 → 询问用户覆盖还是跳过

## 快捷链接刷新

XMind 生成成功后，刷新根目录符号链接：

```bash
ln -sf <实际XMind路径> ./latest-output.xmind
```

## 步骤完成后

验证 .xmind 文件存在后：

```bash
node .claude/scripts/harness-state-machine.mjs \
  --advance xmind \
  --state-path <story-dir>/.qa-state.json
```

同时将 `output_xmind: "<路径>"` 写入 `.qa-state.json`（在 advance 前写入）。

> 注意：Step xmind 完成后不删除临时文件，延迟到 Step notify（用户确认后）清理。
