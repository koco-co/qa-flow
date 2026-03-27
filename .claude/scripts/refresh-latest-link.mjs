/**
 * refresh-latest-link.mjs
 * CLI 包装：刷新仓库根目录 latest-* 快捷链接
 *
 * 用法:
 *   node refresh-latest-link.mjs <actual-path> <latest-link-name>
 */
import { refreshLatestLink } from "./latest-link-utils.mjs";

const [actualPath, linkName] = process.argv.slice(2);

if (!actualPath || !linkName) {
  console.error("Usage: node refresh-latest-link.mjs <actual-path> <latest-link-name>");
  process.exit(1);
}

try {
  const linkPath = refreshLatestLink(actualPath, linkName);
  console.log(`最新快捷链接已刷新：${linkPath}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
