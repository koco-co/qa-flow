#!/bin/bash

# Copilot 快速初始化脚本
# 用法: ./copilot-init.sh 或 bash copilot-init.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_SCRIPT="$PROJECT_ROOT/.claude/copilot-init.js"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Copilot 初始化"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "✗ 错误: 未检测到 Node.js"
  echo "  请安装 Node.js: https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js 版本: $NODE_VERSION"
echo ""

# 运行初始化脚本
cd "$PROJECT_ROOT"
node "$INIT_SCRIPT"

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Copilot 初始化完成！"
  echo ""
  echo "下一步："
  echo "  1. 查看配置: cat .copilot.json"
  echo "  2. 阅读指南: cat .claude/COPILOT-INIT-GUIDE.md"
  echo "  3. 开始使用 GSD: /using-qa-flow"
  echo ""
else
  echo "✗ 初始化失败 (错误码: $EXIT_CODE)"
  exit $EXIT_CODE
fi
