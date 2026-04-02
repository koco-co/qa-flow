#!/bin/bash
# notify-on-write.sh
# PostToolUse(Write) hook: 检测 hotfix 用例文件写入 cases/issues/，自动 commit + push。
# 注意：IM 通知由 LLM 在 hotfix-case-flow.md Step 10 显式调用，此脚本只负责 git 同步。

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null || echo "")

# 只处理写入 cases/issues/ 下的 markdown 文件
if ! echo "$FILE_PATH" | grep -qE "cases/issues/.*\.md$"; then
  exit 0
fi

# 文件名必须包含 hotfix_ 模式
BASENAME=$(basename "$FILE_PATH")
if ! echo "$BASENAME" | grep -qE "hotfix_"; then
  exit 0
fi

PROJECT_DIR="/Users/poco/Documents/DTStack/qa-flow"
cd "$PROJECT_DIR" || exit 0

# 去重：同一文件只提交一次
SENTINEL="/tmp/.qa-commit-hotfix"
[ "$(cat "$SENTINEL" 2>/dev/null)" = "$FILE_PATH" ] && exit 0
echo "$FILE_PATH" > "$SENTINEL"

# git commit + push，确保 GitHub 文件链接可访问
git add -A 2>/dev/null || true
git commit -m "chore: auto-commit hotfix case — $BASENAME" 2>/dev/null || true
git push 2>/dev/null || true
