#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check uv is installed
if ! command -v uv &> /dev/null; then
  echo "[lanhu] ERROR: uv is not installed."
  echo "[lanhu] Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

# Update submodule
echo "[lanhu] Updating submodule..."
cd "$PROJECT_ROOT"
git submodule update --init --remote tools/lanhu/lanhu-mcp

# Install Python dependencies
echo "[lanhu] Installing Python dependencies..."
cd "$SCRIPT_DIR/lanhu-mcp"
uv sync

echo "[lanhu] Ready."
