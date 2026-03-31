/**
 * latest-link-utils.mjs
 * 统一管理仓库根目录 latest-* 快捷链接
 */
import {
  existsSync,
  lstatSync,
  symlinkSync,
  unlinkSync,
} from "fs";
import { resolve, dirname, relative, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");

function pathExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 在仓库根目录创建或刷新显式命名的符号链接
 * @param {string} targetPath - 实际输出文件的绝对或相对路径
 * @param {string} linkName - 根目录快捷链接文件名（如 latest-output.xmind）
 * @returns {string} 创建的链接绝对路径
 */
export function refreshLatestLink(targetPath, linkName) {
  const resolvedTargetPath = resolve(targetPath);
  if (!existsSync(resolvedTargetPath)) {
    throw new Error(`目标文件不存在：${resolvedTargetPath}`);
  }

  const normalizedLinkName = String(linkName || "").trim();
  if (!normalizedLinkName) {
    throw new Error("缺少 linkName：请显式传入根目录快捷链接文件名");
  }
  if (basename(normalizedLinkName) !== normalizedLinkName) {
    throw new Error(`linkName 必须是文件名，不能包含路径：${normalizedLinkName}`);
  }

  const linkPath = resolve(repoRoot, normalizedLinkName);
  if (pathExists(linkPath)) {
    unlinkSync(linkPath);
  }

  const linkTarget = relative(repoRoot, resolvedTargetPath) || basename(resolvedTargetPath);
  symlinkSync(linkTarget, linkPath);
  return linkPath;
}
