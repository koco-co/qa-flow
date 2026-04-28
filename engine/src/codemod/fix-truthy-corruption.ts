/**
 * Fix Pattern B silent corruption from P7.5 codemod:
 *   expect(EXPR.method(ARGS).toBeTruthy())   →   expect(EXPR.method(ARGS)).toBeTruthy()
 *
 * The matcher was glued onto the inner expression instead of expect(...).
 * Handles: toBeTruthy, toBeFalsy, toBeDefined, toBeUndefined, toBeNull
 */

const MATCHERS = ["toBeTruthy", "toBeFalsy", "toBeDefined", "toBeUndefined", "toBeNull"];
const MATCHER_RE = new RegExp(`^(.*)\\.(${MATCHERS.join("|")})\\(\\)\\s*$`, "s");

function matchCloseParen(input: string, startIdx: number): number {
  let depth = 1;
  let i = startIdx;
  while (i < input.length && depth > 0) {
    const ch = input[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < input.length && input[i] !== q) {
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

export function fixTruthyCorruption(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const idx = source.indexOf("expect(", i);
    if (idx < 0) {
      out += source.slice(i);
      break;
    }
    out += source.slice(i, idx);
    const argStart = idx + "expect(".length;
    const argEnd = matchCloseParen(source, argStart);
    const inner = source.slice(argStart, argEnd - 1);
    const m = inner.match(MATCHER_RE);
    if (m) {
      out += `expect(${m[1]}).${m[2]}()`;
    } else {
      out += source.slice(idx, argEnd);
    }
    i = argEnd;
  }
  return out;
}
