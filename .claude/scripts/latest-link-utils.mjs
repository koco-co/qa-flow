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
const repoRoot = resolve(__dirname, "..", "..");
const LATEST_LINK_PATTERN = /^latest-[^/\\]+$/;

function pathExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export function refreshLatestLink(targetPath, linkName) {
  if (!LATEST_LINK_PATTERN.test(linkName)) {
    throw new Error(`非法快捷链接名：${linkName}`);
  }

  const resolvedTargetPath = resolve(targetPath);
  if (!existsSync(resolvedTargetPath)) {
    throw new Error(`目标文件不存在：${resolvedTargetPath}`);
  }

  const linkPath = resolve(repoRoot, basename(linkName));
  if (pathExists(linkPath)) {
    unlinkSync(linkPath);
  }

  const linkTarget = relative(repoRoot, resolvedTargetPath) || basename(resolvedTargetPath);
  symlinkSync(linkTarget, linkPath);
  return linkPath;
}
