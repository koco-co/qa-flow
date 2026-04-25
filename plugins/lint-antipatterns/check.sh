#!/usr/bin/env bash
# check.sh — PostToolUse hook: 扫描本次改动文件的反模式。
# stdin: Claude Code hook JSON (含 tool_input.file_path)
# 行为：非阻塞，发现反模式时 stderr 打印警告。
# 规则来源：CLAUDE.md 的「测试与提交纪律」「测试用例保真度」「禁止硬编码规则」。

set -uo pipefail

# 从 hook JSON 提取文件路径
file_path=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

# 空路径、文件不存在直接放行
[ -z "$file_path" ] && exit 0
[ ! -f "$file_path" ] && exit 0

# 只检查 ts/tsx/md，其它格式放行
case "$file_path" in
  *.ts|*.tsx|*.md) ;;
  *) exit 0 ;;
esac

# 反模式规则表：描述|正则
declare -a RULES=(
  "硬编码绝对路径 /Users/poco|/Users/poco"
  "env='default' 兜底|env[[:space:]]*[:=][[:space:]]*[\"']default[\"']"
  "硬编码 storageState 路径|storageState[[:space:]]*[:=][[:space:]]*[\"']/"
  ".toBeTruthy() 断言（确认不是兜底空数组）|\\.toBeTruthy\\(\\)"
  ".filter(Boolean) 调用（确认未掩盖渲染异常）|\\.filter\\(Boolean\\)"
)

findings=""
for rule in "${RULES[@]}"; do
  desc="${rule%%|*}"
  pattern="${rule#*|}"
  # 跳过注释行，避免 CLAUDE.md 自身规则描述被误报
  if grep -nE "$pattern" "$file_path" 2>/dev/null | grep -vE '^\s*(#|//|\*|--)' >/dev/null; then
    findings="${findings}  - ${desc}"$'\n'
  fi
done

if [ -n "$findings" ]; then
  printf '⚠️  反模式检测 [%s]:\n%s' "$file_path" "$findings" >&2
fi

exit 0
