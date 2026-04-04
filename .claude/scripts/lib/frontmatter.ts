export interface FrontMatter {
  [key: string]: string | number | boolean | string[] | undefined;
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
      } else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - "${item}"`);
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
