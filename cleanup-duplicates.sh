#!/usr/bin/env bash
# cleanup-duplicates.sh — 检测并删除 macOS 复制产生的 "xxx 2.yyy" 文件/目录
# 匹配模式: 名称中包含 " 2." 或以 " 2" 结尾（无扩展名的目录）

set -euo pipefail

ROOT="${1:-.}"

echo "🔍 扫描目录: $(cd "$ROOT" && pwd)"
echo ""

# 收集匹配项（排除 node_modules、.git）
mapfile -t items < <(
  find "$ROOT" \
    -name "node_modules" -prune -o \
    -name ".git" -prune -o \
    \( -name "* 2.*" -o -name "* 2" \) -print
)

if [[ ${#items[@]} -eq 0 ]]; then
  echo "✅ 未发现重复文件/目录"
  exit 0
fi

echo "⚠️  发现 ${#items[@]} 个疑似重复项:"
echo ""
for item in "${items[@]}"; do
  if [[ -d "$item" ]]; then
    echo "  [目录] $item"
  else
    size=$(du -h "$item" 2>/dev/null | cut -f1 | xargs)
    echo "  [文件] $item  ($size)"
  fi
done

echo ""
read -rp "确认删除以上所有项? (y/N): " answer

if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
  echo "❌ 已取消"
  exit 0
fi

for item in "${items[@]}"; do
  rm -rf "$item"
  echo "  已删除: $item"
done

echo ""
echo "✅ 清理完成，共删除 ${#items[@]} 项"
