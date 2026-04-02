#!/bin/bash
# notify-on-write.sh
# PostToolUse(Write) hook: 检测 hotfix 用例文件写入 cases/issues/，触发 IM 通知。

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

# 去重：避免同一文件多次写入触发重复通知
SENTINEL="/tmp/.qa-notify-hotfix"
[ "$(cat "$SENTINEL" 2>/dev/null)" = "$FILE_PATH" ] && exit 0

# 从文件名提取 bugId 和分支
# 格式：hotfix_{version}_{bugId}-{描述}.md
BRANCH=$(echo "$BASENAME" | grep -oE 'hotfix_[^-]+' | head -1)
BUG_ID=$(echo "$BASENAME" | grep -oE 'hotfix_[^_]+_([0-9]+)' | grep -oE '[0-9]+$' | head -1)
BUG_ID=${BUG_ID:-0}

# 相对路径
REL_PATH=$(echo "$FILE_PATH" | sed "s|$PROJECT_DIR/||")

# git commit + push
git add -A 2>/dev/null || true
git commit -m "chore: auto-commit before notify — hotfix-case-generated" 2>/dev/null || true
git push 2>/dev/null || true

# 发送通知
node "$PROJECT_DIR/.claude/shared/scripts/notify.mjs" \
  --event hotfix-case-generated \
  --data "{\"bugId\":$BUG_ID,\"branch\":\"$BRANCH\",\"file\":\"$REL_PATH\"}" \
  2>/dev/null || true

echo "$FILE_PATH" > "$SENTINEL"
