/**
 * Second-pass codemod: strip matcher messages from bun:test calls.
 *
 * P7.5 codemod regex (?:,\s*"[^"]*")? only matched double-quoted msgs,
 * leaving template-literal and single-quoted msgs absorbed as the expected
 * arg. bun:test matchers do not accept msg, so calls like
 *   expect(code).toBe(0, `exit ${stderr}`)
 * silently fail or throw. This codemod normalizes them to single-arg form.
 */

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
