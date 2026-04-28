/**
 * Second-pass codemod: strip matcher messages from bun:test calls.
 *
 * P7.5 codemod regex (?:,\s*"[^"]*")? only matched double-quoted msgs,
 * leaving template-literal and single-quoted msgs absorbed as the expected
 * arg. bun:test matchers do not accept msg, so calls like
 *   expect(code).toBe(0, `exit ${stderr}`)
 * silently fail or throw. This codemod normalizes them to single-arg form.
 */

/**
 * Regex-aware balanced-paren matcher: skips string literals (" ' `) and
 * regex literals (/pattern/) to avoid mis-counting parens inside them.
 */
function skipRegexLiteral(input: string, i: number): number {
  // i points to the opening `/`; skip to closing `/` accounting for \/
  let j = i + 1;
  while (j < input.length) {
    if (input[j] === "\\") {
      j += 2;
      continue;
    }
    if (input[j] === "/") break;
    j++;
  }
  // skip past closing / and any flags
  j++; // past closing /
  while (j < input.length && /[gimsuydv]/.test(input[j]!)) j++;
  return j;
}

export function matchCloseParen(input: string, startIdx: number): number {
  let depth = 1;
  let i = startIdx;
  while (i < input.length && depth > 0) {
    const ch = input[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "/" && isRegexStart(input, i)) {
      i = skipRegexLiteral(input, i);
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    i++;
  }
  return i;
}

export function splitArgs(content: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < content.length) {
    const ch = content[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "/" && isRegexStart(content, i)) {
      i = skipRegexLiteral(content, i);
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      args.push(content.slice(start, i).trim());
      start = i + 1;
    }
    i++;
  }
  args.push(content.slice(start).trim());
  return args;
}

/** Heuristic: a `/` after `(`, `,`, `=`, `!`, or at start of content is a regex literal. */
function isRegexStart(input: string, i: number): boolean {
  if (i === 0) return true;
  const prev = input[i - 1]!;
  return (
    prev === "(" ||
    prev === "," ||
    prev === "=" ||
    prev === "!" ||
    prev === "&" ||
    prev === "|" ||
    prev === "{" ||
    prev === "[" ||
    prev === " " ||
    prev === "\t" ||
    prev === "\n"
  );
}

export function stripMatcherMessage(source: string): string {
  let result = "";
  // Find each `\.(matcher)\(` occurrence and process
  const re = /\.(toBe|toEqual|toMatch|toThrow)\(/g;
  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = re.exec(source)) !== null) {
    result += source.slice(lastIndex, m.index);
    const openParen = m.index + m[0].length;
    const closeParen = matchCloseParen(source, openParen);
    const inner = source.slice(openParen, closeParen - 1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      // keep only first arg (drop msg)
      result += `.${m[1]}(${args[0]})`;
    } else {
      // unchanged
      result += `.${m[1]}(${inner})`;
    }
    lastIndex = closeParen;
  }
  result += source.slice(lastIndex);
  return result;
}
