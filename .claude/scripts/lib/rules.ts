import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot, projectRulesDir } from "./paths.ts";

export interface XmindRules {
  root_title_template: string;
  iteration_id: string;
}

const DEFAULTS: XmindRules = {
  root_title_template: "数据资产v{{prd_version}}迭代用例(#{{iteration_id}})",
  iteration_id: "23",
};

function parsePrefsFromContent(content: string, base: XmindRules): XmindRules {
  const result = { ...base };
  const tmplMatch = content.match(/root_title_template:\s*`([^`]+)`/);
  if (tmplMatch) result.root_title_template = tmplMatch[1];
  const idMatch = content.match(/iteration_id:\s*(\S+)/);
  if (idMatch) result.iteration_id = idMatch[1];
  return result;
}

export function loadXmindRules(project?: string): XmindRules {
  let result = { ...DEFAULTS };

  // 1. Load global rules
  try {
    const globalPath = resolve(repoRoot(), "rules/xmind-structure.md");
    if (existsSync(globalPath)) {
      const content = readFileSync(globalPath, "utf-8");
      result = parsePrefsFromContent(content, result);
    }
  } catch {
    // fallback to defaults
  }

  // 2. Overlay project-level rules if project is specified
  if (project) {
    try {
      const projPath = resolve(projectRulesDir(project), "xmind-structure.md");
      if (existsSync(projPath)) {
        const content = readFileSync(projPath, "utf-8");
        result = parsePrefsFromContent(content, result);
      }
    } catch {
      // fallback to global
    }
  }

  return result;
}

export function buildRootName(version: string | undefined, prefs?: XmindRules, project?: string): string {
  if (!version) return "";
  const p = prefs ?? loadXmindRules(project);
  const ver = version.replace(/^v/i, "");
  return p.root_title_template
    .replace("{{prd_version}}", ver)
    .replace("{{iteration_id}}", p.iteration_id);
}
