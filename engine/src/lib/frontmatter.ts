export interface RepoFrontMatter {
  path: string;
  branch: string;
  commit?: string;
}

export interface FrontMatter {
  [key: string]: string | number | boolean | string[] | RepoFrontMatter[] | undefined;
}

export interface ParsedMarkdown {
  frontMatter: FrontMatter;
  body: string;
}

export function parseFrontMatter(content: string): ParsedMarkdown {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontMatter: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2];
  const fm: FrontMatter = {};
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Handle inline object: `  - { path: "...", branch: "..." }`
    if (trimmed.startsWith("- {") && trimmed.endsWith("}") && currentKey && currentArray) {
      const inner = trimmed.slice(3, -1).trim();
      const obj: Record<string, string> = {};
      for (const pair of inner.split(",")) {
        const ci = pair.indexOf(":");
        if (ci === -1) continue;
        const k = pair.slice(0, ci).trim();
        const v = pair.slice(ci + 1).trim().replace(/^["']|["']$/g, "");
        obj[k] = v;
      }
      (currentArray as unknown[]).push(obj);
      fm[currentKey] = currentArray;
      continue;
    }

    if (trimmed.startsWith("- ") && currentKey && currentArray) {
      currentArray.push(
        trimmed
          .slice(2)
          .trim()
          .replace(/^["']|["']$/g, ""),
      );
      fm[currentKey] = currentArray;
      continue;
    }

    if (currentArray) currentArray = null;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    if (value === "" || value === "[]") {
      currentKey = key;
      currentArray = [];
      fm[key] = currentArray;
      continue;
    }

    value = value.replace(/^["']|["']$/g, "");
    if (value === "true") fm[key] = true;
    else if (value === "false") fm[key] = false;
    else if (/^\d+$/.test(value)) fm[key] = Number.parseInt(value, 10);
    else fm[key] = value;
    currentKey = key;
    currentArray = null;
  }

  return { frontMatter: fm, body };
}

export function serializeFrontMatter(fm: FrontMatter): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (typeof value[0] === "string") {
        lines.push(`${key}:`);
        for (const item of value as string[]) lines.push(`  - "${item}"`);
      } else {
        lines.push(`${key}:`);
        for (const item of value as RepoFrontMatter[]) {
          const obj = item as Record<string, string | undefined>;
          const parts = Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}: "${v}"`)
            .join(", ");
          lines.push(`  - { ${parts} }`);
        }
      }
    } else if (typeof value === "string") {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export function buildMarkdown(fm: FrontMatter, body: string): string {
  return `${serializeFrontMatter(fm)}\n\n${body}`;
}

export function countCases(body: string): number {
  return (body.match(/^#{5}\s+/gm) ?? []).length;
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
