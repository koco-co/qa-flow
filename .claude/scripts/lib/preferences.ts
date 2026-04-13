import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot } from "./paths.ts";

export interface XmindPreferences {
  root_title_template: string;
  iteration_id: string;
}

const DEFAULTS: XmindPreferences = {
  root_title_template: "数据资产v{{prd_version}}迭代用例(#{{iteration_id}})",
  iteration_id: "23",
};

export function loadXmindPreferences(): XmindPreferences {
  const result = { ...DEFAULTS };

  try {
    const prefPath = resolve(repoRoot(), "preferences/xmind-structure.md");
    if (!existsSync(prefPath)) return result;

    const content = readFileSync(prefPath, "utf-8");

    const tmplMatch = content.match(/root_title_template:\s*`([^`]+)`/);
    if (tmplMatch) result.root_title_template = tmplMatch[1];

    const idMatch = content.match(/iteration_id:\s*(\S+)/);
    if (idMatch) result.iteration_id = idMatch[1];
  } catch {
    // fallback to defaults
  }
  return result;
}

export function buildRootName(version: string | undefined, prefs?: XmindPreferences): string {
  if (!version) return "";
  const p = prefs ?? loadXmindPreferences();
  const ver = version.replace(/^v/i, "");
  return p.root_title_template
    .replace("{{prd_version}}", ver)
    .replace("{{iteration_id}}", p.iteration_id);
}
