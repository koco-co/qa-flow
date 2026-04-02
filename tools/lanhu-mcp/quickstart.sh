#!/bin/bash
# 蓝湖 MCP 服务器快速启动脚本（使用 uv 管理 Python 环境）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "蓝湖 MCP 服务器 - 快速启动"
echo "=================================="
echo ""

# ── 1. 检查 uv 是否可用 ─────────────────────────────────────────
if ! command -v uv &> /dev/null; then
    echo "错误：未安装 uv，请先安装"
    echo "安装命令：curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "官方文档：https://docs.astral.sh/uv/"
    exit 1
fi
echo "uv 版本：$(uv --version)"

# ── 2. 更新检查（非阻断）────────────────────────────────────────
echo ""
echo "检查 lanhu-mcp 更新..."
if git -C "$SCRIPT_DIR" remote &>/dev/null 2>&1; then
    LOCAL=$(git -C "$SCRIPT_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")
    REMOTE=$(git -C "$SCRIPT_DIR" ls-remote origin HEAD 2>/dev/null | awk '{print $1}' || echo "unknown")
    if [ "$LOCAL" != "$REMOTE" ] && [ "$REMOTE" != "unknown" ]; then
        echo "提示：lanhu-mcp 有新版本可用（本地: ${LOCAL:0:7}，远程: ${REMOTE:0:7}）"
        echo "      如需更新，请在 tools/lanhu-mcp/ 目录运行：git pull"
    else
        echo "已是最新版本（${LOCAL:0:7}）"
    fi
else
    echo "（非 git 仓库，跳过更新检查）"
fi

# ── 3. 创建/同步虚拟环境（uv venv + uv pip install）─────────────
echo ""
echo "初始化 Python 虚拟环境..."
if [ ! -d ".venv" ]; then
    uv venv .venv
    echo "虚拟环境创建完成"
fi

echo "同步依赖..."
uv pip install -r requirements.txt --quiet
echo "依赖同步完成"

# ── 4. 加载 Cookie 配置 ──────────────────────────────────────────
# 优先从根目录 .env 读取 LANHU_COOKIE，其次从本地 .env
ROOT_ENV="$SCRIPT_DIR/../../.env"
LOCAL_ENV="$SCRIPT_DIR/.env"

load_env() {
    local envfile="$1"
    if [ -f "$envfile" ]; then
        set -a
        # shellcheck disable=SC1090
        source "$envfile"
        set +a
    fi
}

# 先加载根 .env（不覆盖已设置的变量）
[ -f "$ROOT_ENV" ] && load_env "$ROOT_ENV"
# 再加载本地 .env（可本地覆盖）
[ -f "$LOCAL_ENV" ] && load_env "$LOCAL_ENV"

if [ -z "$LANHU_COOKIE" ] || [ "$LANHU_COOKIE" = "your_lanhu_cookie_here" ]; then
    echo ""
    echo "错误：LANHU_COOKIE 未配置"
    echo "请在根目录 .env 文件中设置：LANHU_COOKIE=你的蓝湖Cookie"
    echo "获取方法参见：tools/lanhu-mcp/GET-COOKIE-TUTORIAL.md"
    exit 1
fi

echo ""
echo "Cookie 已加载（长度：${#LANHU_COOKIE} 字符）"

# ── 5. 创建数据目录 ──────────────────────────────────────────────
mkdir -p data logs

# ── 6. 启动服务 ──────────────────────────────────────────────────
echo ""
echo "启动蓝湖 MCP 服务器..."
echo "=================================="
echo ""
echo "服务地址：http://localhost:${SERVER_PORT:-8000}/mcp"
echo "按 Ctrl+C 停止"
echo ""

uv run python lanhu_mcp_server.py
