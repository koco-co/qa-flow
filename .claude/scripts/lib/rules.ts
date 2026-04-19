import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot, projectRulesDir } from "./paths.ts";

export interface XmindRules {
  root_title_template: string;
  iteration_id: string;
}

// 中性默认值。如需带产品名前缀（如「数据资产v6.4.10迭代用例(#23)」），
// 在项目级 `workspace/{project}/rules/xmind-structure.md` 中 override
// `root_title_template` 与 `iteration_id` 即可。模板支持 {{project_name}}、{{prd_version}}、{{iteration_id}} 三个占位符。
const DEFAULTS: XmindRules = {
  root_title_template: "{{project_name}}v{{prd_version}}迭代用例(#{{iteration_id}})",
  iteration_id: "23",
};

function parseRulesFromContent(content: string, base: XmindRules): XmindRules {
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
      result = parseRulesFromContent(content, result);
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
        result = parseRulesFromContent(content, result);
      }
    } catch {
      // fallback to global
    }
  }

  return result;
}

export function buildRootName(
  version: string | undefined,
  rules?: XmindRules,
  project?: string,
  projectName?: string,
): string {
  if (!version) return "";
  const p = rules ?? loadXmindRules(project);
  const ver = version.replace(/^v/i, "");
  return p.root_title_template
    .replace("{{project_name}}", projectName ?? "")
    .replace("{{prd_version}}", ver)
    .replace("{{iteration_id}}", p.iteration_id);
}
