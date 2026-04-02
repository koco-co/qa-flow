#!/bin/bash
# notify-on-xmind.sh
# PostToolUse hook: 检测 xmind 生成命令，自动发送 IM 通知。
# 完全独立于 LLM 行为，只要 xmind 转换脚本执行成功就触发。

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# 只在 xmind 转换命令完成后触发
if ! echo "$CMD" | grep -qE "json-to-xmind|xmind-converter"; then
  exit 0
fi

PROJECT_DIR="/Users/poco/Documents/DTStack/qa-flow"
cd "$PROJECT_DIR" || exit 0

# 从命令输出中提取 xmind 文件路径（最可靠）
OUTPUT=$(echo "$INPUT" | jq -r '.tool_response.output // ""' 2>/dev/null || echo "")
XMIND_FILE=$(echo "$OUTPUT" | grep -oE 'cases/xmind/[^[:space:]]+\.xmind' | tail -1)

# 备选：找最近修改的 xmind 文件
if [ -z "$XMIND_FILE" ]; then
  XMIND_FILE=$(find cases/xmind -name "*.xmind" -type f | xargs ls -t 2>/dev/null | head -1)
fi

[ -z "$XMIND_FILE" ] && exit 0

# 去重：避免同一文件重复通知
SENTINEL="/tmp/.last-qa-notified-xmind"
LAST_NOTIFIED=$(cat "$SENTINEL" 2>/dev/null || echo "")
if [ "$XMIND_FILE" = "$LAST_NOTIFIED" ]; then
  exit 0
fi

# 从命令输出中提取用例数（如有）
COUNT=$(echo "$OUTPUT" | grep -oE '[0-9]+ 条' | head -1 | grep -oE '[0-9]+' || echo "0")
[ -z "$COUNT" ] && COUNT=0

# 发送通知
node "$PROJECT_DIR/.claude/shared/scripts/notify.mjs" \
  --event case-generated \
  --data "{\"count\":$COUNT,\"file\":\"$XMIND_FILE\",\"duration\":\"N/A\"}" \
  2>/dev/null || true

# 记录已通知文件，防止重复
echo "$XMIND_FILE" > "$SENTINEL"
