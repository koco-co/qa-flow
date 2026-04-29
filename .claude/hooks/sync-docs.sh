#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || exit 1)
cd "$ROOT"

SYNCED=0

# ─── 1. 命令索引同步 ─────────────────────────────────────
# Read command table from CLAUDE.md (Chinese)
CN_TABLE=$(sed -n '/^| `\//,/^$/p' CLAUDE.md | grep '|')

# English mirror (keep in sync with CLAUDE.md)
EN_TABLE='| `/using-kata`    | Feature menu + project creation |
| `/test-case-gen` | Generate test cases (PRD → structured cases) |
| `/case-format`   | XMind editing / XMind↔Archive sync / format conversion |
| `/daily-task`    | Bug / conflict / hotfix three-mode workflow |
| `dtstack-cli`    | Platform prerequisites CLI (SQL/project/asset sync), see `tools/dtstack-sdk/docs/usage.md` |
| `/ui-autotest`   | UI automation testing |
| `/static-scan`   | Release branch static scan (diff → reproducible bug report) |
| `/update-docs`   | Sync command index to README + update CHANGELOG (run before committing) |'

if [ -z "$CN_TABLE" ]; then
  echo "  ⚠ CLAUDE.md 中未找到命令表格"
else
  replace_block() {
    local file="$1" header="$2" table="$3"
    if ! grep -q "<!-- COMMANDS:START -->" "$file"; then
      echo "  ⚠ $file — 缺少 COMMANDS 标记，跳过"
      return
    fi
    tmpf=$(mktemp)
    {
      echo "<!-- COMMANDS:START -->"
      echo ""
      printf "%b\n" "$header"
      echo "$table"
      echo ""
      echo "<!-- COMMANDS:END -->"
    } > "$tmpf"

    python3 - "$file" "$tmpf" << 'PYEOF'
import sys
file_path = sys.argv[1]
repl_path = sys.argv[2]
with open(repl_path) as f:
    replacement = f.read()
with open(file_path) as f:
    content = f.read()
ms, me = '<!-- COMMANDS:START -->', '<!-- COMMANDS:END -->'
start, end = content.find(ms), content.find(me)
if start >= 0 and end >= 0:
    end += len(me)
    content = content[:start] + replacement + content[end:]
    with open(file_path, 'w') as f:
        f.write(content)
    print('OK')
PYEOF
    rm -f "$tmpf"
    echo "  ✅ $file — 命令索引已同步"
    SYNCED=1
  }

  replace_block "README.md" "| 命令 | 功能 |\n|------|------|" "$CN_TABLE"
  replace_block "README-EN.md" "| Command | Description |\n|---------|-------------|" "$EN_TABLE"
fi

# ─── 2. CHANGELOG 更新 ───────────────────────────────────
LAST_DATE=$(grep -oE '\([0-9]{4}-[0-9]{2}-[0-9]{2}\)' CHANGELOG.md | tr -d '()' | head -1)
if [ -n "$LAST_DATE" ]; then
  NEW_COMMITS=$(git log --since="${LAST_DATE}" --no-merges --oneline --pretty=format:"- %s" 2>/dev/null || true)
  if [ -n "$NEW_COMMITS" ]; then
    COUNT=$(echo "$NEW_COMMITS" | wc -l | tr -d ' ')
    TODAY=$(date +%Y-%m-%d)
    if ! grep -q "($TODAY)" CHANGELOG.md; then
      cat >> CHANGELOG.md << EOF

## $(date +%Y.%m.%d) ($TODAY)

### Changes

$NEW_COMMITS
EOF
      echo "  ✅ CHANGELOG — 追加 ${COUNT} 条提交"
      SYNCED=1
    else
      echo "  ℹ CHANGELOG — 今日已更新，跳过"
    fi
  else
    echo "  ℹ CHANGELOG — 上次发版后无新提交"
  fi
fi

# ─── 3. 汇总 ────────────────────────────────────────────
if [ "$SYNCED" -eq 1 ]; then
  echo "✅ 文档同步完成"
else
  echo "ℹ 无变更"
fi
