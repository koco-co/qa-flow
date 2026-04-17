// lib/knowledge.ts

export interface Frontmatter {
  title: string;
  type: "overview" | "term" | "module" | "pitfall";
  tags: string[];
  confidence: "high" | "medium" | "low";
  source: string;
  updated: string;
}

export interface ParsedFile {
  frontmatter: Frontmatter | null;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontmatter: null, body: raw };
  }
  const lines = raw.split("\n");
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { frontmatter: null, body: raw };
  }

  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join("\n");

  const fm: Partial<Frontmatter> = {};
  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "tags") {
      if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1).trim();
        if (inner === "") {
          fm.tags = [];
        } else {
          fm.tags = inner
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""));
        }
      } else {
        fm.tags = [];
      }
    } else if (key === "title") {
      fm.title = value;
    } else if (key === "type") {
      fm.type = value as Frontmatter["type"];
    } else if (key === "confidence") {
      fm.confidence = value as Frontmatter["confidence"];
    } else if (key === "source") {
      fm.source = value;
    } else if (key === "updated") {
      fm.updated = value;
    }
  }

  // Validate required fields
  if (
    typeof fm.title !== "string" ||
    typeof fm.type !== "string" ||
    !Array.isArray(fm.tags) ||
    typeof fm.confidence !== "string" ||
    typeof fm.source !== "string" ||
    typeof fm.updated !== "string"
  ) {
    return { frontmatter: null, body: raw };
  }

  return { frontmatter: fm as Frontmatter, body };
}

export function serializeFrontmatter(fm: Frontmatter): string {
  const lines = [
    "---",
    `title: ${fm.title}`,
    `type: ${fm.type}`,
    `tags: [${fm.tags.join(", ")}]`,
    `confidence: ${fm.confidence}`,
    `source: ${fm.source === "" ? '""' : fm.source}`,
    `updated: ${fm.updated}`,
    "---",
    "",
  ];
  return lines.join("\n");
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
