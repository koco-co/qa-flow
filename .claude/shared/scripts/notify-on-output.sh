#!/bin/bash
# notify-on-output.sh
# PostToolUse(Bash) hook: 统一检测各 Skill 终态产物命令，自动触发 IM 通知。
# 覆盖事件：case-generated / bug-report / conflict-analyzed / archive-converted
# hotfix-case-generated 由 notify-on-write.sh（PostToolUse Write hook）处理。

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")
OUTPUT=$(echo "$INPUT" | jq -r '.tool_response.output // ""' 2>/dev/null || echo "")

PROJECT_DIR="/Users/poco/Documents/DTStack/qa-flow"
cd "$PROJECT_DIR" || exit 0

EVENT=""
DATA="{}"
SENTINEL=""

# ──────────────────────────────────────────────────────────────
# 1. case-generated — json-to-xmind / xmind-converter
# ──────────────────────────────────────────────────────────────
if echo "$CMD" | grep -qE "json-to-xmind|xmind-converter"; then

  XMIND_FILE=$(echo "$OUTPUT" | grep -oE 'cases/xmind/[^[:space:]]+\.xmind' | tail -1)
  if [ -z "$XMIND_FILE" ]; then
    XMIND_FILE=$(find cases/xmind -name "*.xmind" -type f 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
  fi
  [ -z "$XMIND_FILE" ] && exit 0

  SENTINEL="/tmp/.qa-notify-xmind"
  [ "$(cat "$SENTINEL" 2>/dev/null)" = "$XMIND_FILE" ] && exit 0

  COUNT=$(echo "$OUTPUT" | grep -oE '[0-9]+ 条' | head -1 | grep -oE '[0-9]+')
  COUNT=${COUNT:-0}

  EVENT="case-generated"
  DATA="{\"count\":$COUNT,\"file\":\"$XMIND_FILE\",\"duration\":\"N/A\"}"

# ──────────────────────────────────────────────────────────────
# 2. bug-report / conflict-analyzed — render-report.mjs
# ──────────────────────────────────────────────────────────────
elif echo "$CMD" | grep -qE "render-report\.mjs"; then

  # 从命令参数或输出中提取 HTML 报告路径
  REPORT_FILE=$(echo "$CMD $OUTPUT" | grep -oE 'reports/(bugs|conflicts)/[^[:space:]]+\.html' | tail -1)
  [ -z "$REPORT_FILE" ] && exit 0

  SENTINEL="/tmp/.qa-notify-report"
  [ "$(cat "$SENTINEL" 2>/dev/null)" = "$REPORT_FILE" ] && exit 0

  if echo "$REPORT_FILE" | grep -q "reports/bugs/"; then
    EVENT="bug-report"
    DATA="{\"reportFile\":\"$REPORT_FILE\",\"summary\":\"\"}"
  elif echo "$REPORT_FILE" | grep -q "reports/conflicts/"; then
    EVENT="conflict-analyzed"
    DATA="{\"reportFile\":\"$REPORT_FILE\"}"
  else
    exit 0
  fi

# ──────────────────────────────────────────────────────────────
# 3. archive-converted — convert-history-cases.mjs（排除 --detect）
# ──────────────────────────────────────────────────────────────
elif echo "$CMD" | grep -qE "convert-history-cases\.mjs" && ! echo "$CMD" | grep -q "\-\-detect"; then

  # 防抖：60 秒内只触发一次（批量转化可能触发多次）
  SENTINEL="/tmp/.qa-notify-archive"
  NOW=$(date +%s)
  LAST=$(cat "$SENTINEL" 2>/dev/null || echo "0")
  [ $((NOW - LAST)) -lt 60 ] && exit 0

  FILE_COUNT=$(echo "$OUTPUT" | grep -oE '成功 ([0-9]+)' | grep -oE '[0-9]+' | head -1)
  FILE_COUNT=${FILE_COUNT:-0}

  EVENT="archive-converted"
  DATA="{\"fileCount\":$FILE_COUNT}"

else
  exit 0
fi

[ -z "$EVENT" ] && exit 0

# ──────────────────────────────────────────────────────────────
# git commit + push，确保 GitHub 文件链接可访问
# ──────────────────────────────────────────────────────────────
git add -A 2>/dev/null || true
git commit -m "chore: auto-commit before notify — $EVENT" 2>/dev/null || true
git push 2>/dev/null || true

# ──────────────────────────────────────────────────────────────
# 发送 IM 通知
# ──────────────────────────────────────────────────────────────
node "$PROJECT_DIR/.claude/shared/scripts/notify.mjs" \
  --event "$EVENT" \
  --data "$DATA" \
  2>/dev/null || true

# 写入 sentinel，防止重复通知
[ -n "$SENTINEL" ] && {
  if [ "$EVENT" = "archive-converted" ]; then
    date +%s > "$SENTINEL"
  else
    echo "$REPORT_FILE$XMIND_FILE" > "$SENTINEL"
  fi
}
