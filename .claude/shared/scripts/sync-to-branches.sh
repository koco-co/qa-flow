#!/usr/bin/env bash
# sync-to-branches.sh
# 将 main 分支的公共代码 merge --no-ff 到指定子分支
# 排除 cases/、assets/、.repos/ 等业务专属目录
#
# 用法:
#   ./sync-to-branches.sh [--branches xyzh,assets] [--dry-run]
#
# 选项:
#   --branches <b1,b2,...>  目标分支列表（逗号分隔），默认读取 SYNC_TARGET_BRANCHES 环境变量
#   --dry-run               预览将要执行的操作，不实际执行

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# ─── 参数解析 ────────────────────────────────────────────────────────────────

DRY_RUN=false
BRANCHES_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branches)
      BRANCHES_ARG="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "未知参数: $1" >&2
      echo "用法: $0 [--branches xyzh,assets] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

# 目标分支：命令行参数 > 环境变量 > 报错退出
TARGET_BRANCHES_RAW="${BRANCHES_ARG:-${SYNC_TARGET_BRANCHES:-}}"
if [[ -z "$TARGET_BRANCHES_RAW" ]]; then
  echo "错误：请通过 --branches 或 SYNC_TARGET_BRANCHES 环境变量指定目标分支" >&2
  exit 1
fi

IFS=',' read -ra TARGET_BRANCHES <<< "$TARGET_BRANCHES_RAW"

# 排除目录（这些目录的变更不会被同步到子分支）
EXCLUDE_DIRS=(cases assets .repos)

# ─── 工具函数 ────────────────────────────────────────────────────────────────

log_info() { echo "[sync] $*"; }
log_warn() { echo "[sync] ⚠️  $*" >&2; }
log_error() { echo "[sync] ❌ $*" >&2; }

run_cmd() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

# ─── 前置检查 ────────────────────────────────────────────────────────────────

cd "$REPO_ROOT"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  log_error "当前分支为 ${CURRENT_BRANCH}，必须在 main 分支执行此脚本"
  exit 1
fi

# 检查工作区是否干净
if ! git diff --quiet || ! git diff --cached --quiet; then
  log_error "工作区存在未提交的变更，请先 commit 或 stash"
  exit 1
fi

MAIN_COMMIT=$(git rev-parse HEAD)
log_info "当前 main 分支 commit: ${MAIN_COMMIT:0:8}"

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "=== DRY RUN 模式，以下操作不会实际执行 ==="
fi

# ─── 主同步逻辑 ──────────────────────────────────────────────────────────────

REPORT_FILE="${REPO_ROOT}/.claude/sync-report-$(date +%Y%m%d-%H%M%S).md"
REPORT_LINES=()
REPORT_LINES+=("# main → 子分支同步报告")
REPORT_LINES+=("执行时间: $(date '+%Y-%m-%d %H:%M:%S')")
REPORT_LINES+=("main commit: ${MAIN_COMMIT:0:8}")
REPORT_LINES+=("")

for BRANCH in "${TARGET_BRANCHES[@]}"; do
  BRANCH="${BRANCH// /}"  # 去除可能的空格
  log_info "──────────────────────────────────────"
  log_info "同步到分支: ${BRANCH}"

  # 检查目标分支是否存在
  if ! git show-ref --verify --quiet "refs/heads/${BRANCH}" && \
     ! git show-ref --verify --quiet "refs/remotes/origin/${BRANCH}"; then
    log_warn "分支 ${BRANCH} 不存在，跳过"
    REPORT_LINES+=("## ${BRANCH}: ⚠️ 分支不存在，已跳过")
    continue
  fi

  # 切换到目标分支
  run_cmd git checkout "$BRANCH"
  run_cmd git pull origin "$BRANCH" --ff-only || {
    log_warn "无法 fast-forward 拉取 ${BRANCH}，尝试继续"
  }

  # 执行 merge --no-ff，允许失败（冲突时生成报告）
  MERGE_OUTPUT=""
  MERGE_EXIT=0
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] git merge --no-ff --no-commit main"
    echo "[dry-run] git merge --abort （如有冲突）"
  else
    MERGE_OUTPUT=$(git merge --no-ff --no-commit main 2>&1) || MERGE_EXIT=$?
  fi

  if [[ $MERGE_EXIT -ne 0 ]]; then
    # 检测冲突文件
    CONFLICT_FILES=$(git diff --name-only --diff-filter=U 2>/dev/null || true)

    # 判断冲突是否仅在排除目录中
    NON_EXCLUDE_CONFLICTS=""
    if [[ -n "$CONFLICT_FILES" ]]; then
      while IFS= read -r f; do
        EXCLUDED=false
        for dir in "${EXCLUDE_DIRS[@]}"; do
          if [[ "$f" == "${dir}/"* || "$f" == "${dir}" ]]; then
            EXCLUDED=true
            break
          fi
        done
        if [[ "$EXCLUDED" == "false" ]]; then
          NON_EXCLUDE_CONFLICTS="${NON_EXCLUDE_CONFLICTS}${f}\n"
        fi
      done <<< "$CONFLICT_FILES"
    fi

    git merge --abort 2>/dev/null || true

    if [[ -n "$NON_EXCLUDE_CONFLICTS" ]]; then
      log_error "${BRANCH}: 合并存在冲突（非排除目录），需要人工处理"
      log_error "冲突文件:\n${NON_EXCLUDE_CONFLICTS}"
      REPORT_LINES+=("## ${BRANCH}: ❌ 合并冲突（需人工处理）")
      REPORT_LINES+=("冲突文件:")
      REPORT_LINES+=("\`\`\`")
      REPORT_LINES+=("${NON_EXCLUDE_CONFLICTS}")
      REPORT_LINES+=("\`\`\`")
    else
      log_warn "${BRANCH}: 冲突仅在排除目录中，已中止 merge"
      REPORT_LINES+=("## ${BRANCH}: ⚠️ 冲突仅在排除目录（已跳过合并）")
    fi

    # 切回 main
    run_cmd git checkout main
    continue
  fi

  # 恢复排除目录（从目标分支自身的版本还原）
  for dir in "${EXCLUDE_DIRS[@]}"; do
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[dry-run] git checkout HEAD -- ${dir} （若目录存在）"
    else
      if git ls-tree -d HEAD "$dir" &>/dev/null 2>&1 || git ls-files --error-unmatch "${dir}/" &>/dev/null 2>&1; then
        git checkout HEAD -- "$dir" 2>/dev/null || true
      fi
    fi
  done

  # 提交合并
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] git commit -m 'chore: sync from main (${MAIN_COMMIT:0:8})'"
    echo "[dry-run] git push origin ${BRANCH}"
  else
    # 检查是否有实际变更需要提交
    if git diff --cached --quiet; then
      log_info "${BRANCH}: 无公共代码变更，已是最新"
      git merge --abort 2>/dev/null || true
      REPORT_LINES+=("## ${BRANCH}: ✅ 已是最新（无公共代码变更）")
    else
      git commit -m "chore: sync from main (${MAIN_COMMIT:0:8})"
      git push origin "$BRANCH"
      log_info "${BRANCH}: ✅ 同步完成并推送"
      REPORT_LINES+=("## ${BRANCH}: ✅ 同步完成")
      REPORT_LINES+=("合并 commit: $(git rev-parse HEAD | head -c 8)")
    fi
  fi

  # 切回 main
  run_cmd git checkout main
done

log_info "──────────────────────────────────────"
log_info "全部分支处理完毕"

# 仅在非 dry-run 且有冲突时写报告文件
if [[ "$DRY_RUN" == "false" ]]; then
  HAS_ISSUES=false
  for line in "${REPORT_LINES[@]}"; do
    if [[ "$line" == *"❌"* || "$line" == *"⚠️"* ]]; then
      HAS_ISSUES=true
      break
    fi
  done

  if [[ "$HAS_ISSUES" == "true" ]]; then
    printf '%s\n' "${REPORT_LINES[@]}" > "$REPORT_FILE"
    log_warn "存在警告/冲突，详情见: ${REPORT_FILE}"
  fi
fi
