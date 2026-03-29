#!/bin/bash
# trash-cleanup.sh — 清理超过保留期限的回收站文件
# 用法: bash trash-cleanup.sh [--auto] [--days N]
#
# --auto  自动清理，不询问确认
# --days  保留天数（默认 30）

TRASH_DIR="$(cd "$(dirname "$0")/../.." && pwd)/.trash"
AUTO=false
DAYS=30

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto) AUTO=true; shift ;;
    --days) DAYS="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ ! -d "$TRASH_DIR" ]; then
  echo "回收站目录不存在：$TRASH_DIR"
  exit 0
fi

expired=()
while IFS= read -r -d '' dir; do
  dirname=$(basename "$dir")
  # 目录名格式: YYYY-MM-DD
  if [[ "$dirname" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    dir_ts=$(date -j -f "%Y-%m-%d" "$dirname" "+%s" 2>/dev/null)
    if [ -z "$dir_ts" ]; then
      continue
    fi
    cutoff_ts=$(date -v-"${DAYS}"d "+%s")
    if [ "$dir_ts" -lt "$cutoff_ts" ]; then
      expired+=("$dir")
    fi
  fi
done < <(find "$TRASH_DIR" -mindepth 1 -maxdepth 1 -type d -print0)

if [ ${#expired[@]} -eq 0 ]; then
  echo "回收站中没有超过 ${DAYS} 天的归档目录。"
  exit 0
fi

echo "发现 ${#expired[@]} 个超过 ${DAYS} 天的归档目录："
for d in "${expired[@]}"; do
  echo "  - $(basename "$d")/"
done

if [ "$AUTO" = true ]; then
  for d in "${expired[@]}"; do
    rm -rf "$d"
  done
  echo "已自动清理 ${#expired[@]} 个目录。"
else
  echo ""
  read -rp "是否清理这些目录？[Y/n] " answer
  case "$answer" in
    [nN]*) echo "已跳过清理。" ;;
    *)
      for d in "${expired[@]}"; do
        rm -rf "$d"
      done
      echo "已清理 ${#expired[@]} 个目录。"
      ;;
  esac
fi
