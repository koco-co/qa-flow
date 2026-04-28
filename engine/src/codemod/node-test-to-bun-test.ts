/**
 * Convert node:test + node:assert/strict to bun:test + expect().
 * Mechanical replacement only — does not optimize assertion strength.
 *
 * Limitations:
 * - assert.equal(a, b, "msg") drops the third (message) argument
 * - assert.ok(x) -> expect(x).toBeTruthy() (intentional, P7 E1-WEAK lint scopes to workspace/)
 */

/** Split balanced content at the first top-level comma, regex/string-aware. */
function splitArgs(content: string): string[] {
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

/** Find the matching close paren for a group starting at startIdx */
function matchCloseParen(input: string, startIdx: number): number {
  let depth = 1;
  let i = startIdx;
  while (i < input.length && depth > 0) {
    const ch = input[i]!;
    // skip string/backtick/regex literals to avoid mis-matching parens inside them
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

/** Heuristic: a `/` after `(`, `,`, `=`, `!`, or whitespace-start is a regex literal. */
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

/** Skip past a regex literal /pattern/flags starting at the opening `/`. */
function skipRegexLiteral(input: string, i: number): number {
  let j = i + 1;
  while (j < input.length) {
    if (input[j] === "\\") {
      j += 2;
      continue;
    }
    if (input[j] === "/") break;
    j++;
  }
  j++;
  while (j < input.length && /[gimsuydv]/.test(input[j]!)) j++;
  return j;
}

/**
 * Replace assert.throws/assert.doesNotThrow with balanced paren matching.
 * Handles arrow function bodies containing ) like Error("x").
 */
function replaceAssertThrows(input: string, withErr: boolean): string {
  const pattern = withErr ? /assert\.throws\(/g : /assert\.doesNotThrow\(/g;
  let result = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(input)) !== null) {
    result += input.slice(lastIndex, m.index);
    const closePos = matchCloseParen(input, m.index + m[0].length);
    const args = splitArgs(input.slice(m.index + m[0].length, closePos - 1));
    if (withErr && args.length >= 2) {
      result += `expect(${args[0]}).toThrow(${args[1]})`;
    } else if (withErr) {
      result += `expect(${args[0]}).toThrow()`;
    } else {
      result += `expect(${args[0]}).not.toThrow()`;
    }
    lastIndex = closePos;
  }
  result += input.slice(lastIndex);
  return result;
}

/**
 * Generic balanced-paren assert replacement.
 * Finds matches of `pattern` (e.g. /assert\.equal\(/g), extracts matched‑paren inner content,
 * splits by top-level comma, calls `fmt(args)` to produce the replacement.
 */
function replaceAssertWithParen(
  input: string,
  pattern: RegExp,
  fmt: (args: string[]) => string,
): string {
  let result = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(input)) !== null) {
    result += input.slice(lastIndex, m.index);
    const closePos = matchCloseParen(input, m.index + m[0].length);
    const args = splitArgs(input.slice(m.index + m[0].length, closePos - 1));
    result += fmt(args);
    lastIndex = closePos;
  }
  result += input.slice(lastIndex);
  return result;
}

export function transformNodeTestToBunTest(source: string): string {
  let out = source;

  // 1) Imports
  out = out.replace(/^import\s+assert\s+from\s+"node:assert\/strict";?\s*\n/gm, "");
  out = out.replace(
    /^import\s*\{\s*([^}]+)\s*\}\s+from\s+"node:test";?/gm,
    (_match, names: string) => {
      const set = new Set(
        names
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean),
      );
      set.add("expect");
      return `import { ${[...set].join(", ")} } from "bun:test";`;
    },
  );

  // 2) Asserts — all use balanced-paren matching (handles backtick/single-quote msg + nested calls)
  out = replaceAssertThrows(out, true);
  out = replaceAssertThrows(out, false);

  out = replaceAssertWithParen(
    out,
    /assert\.deepEqual\(/g,
    (args) => `expect(${args[0]}).toEqual(${args[1]})`,
  );
  out = replaceAssertWithParen(
    out,
    /assert\.notEqual\(/g,
    (args) => `expect(${args[0]}).not.toBe(${args[1]})`,
  );
  out = replaceAssertWithParen(
    out,
    /assert\.equal\(/g,
    (args) => `expect(${args[0]}).toBe(${args[1]})`,
  );
  out = replaceAssertWithParen(
    out,
    /assert\.doesNotMatch\(/g,
    (args) => `expect(${args[0]}).not.toMatch(${args[1]})`,
  );
  out = replaceAssertWithParen(
    out,
    /assert\.match\(/g,
    (args) => `expect(${args[0]}).toMatch(${args[1]})`,
  );
  // assert.ok: keep only first arg (drop optional msg)
  out = replaceAssertWithParen(out, /assert\.ok\(/g, (args) => `expect(${args[0]}).toBeTruthy()`);

  return out;
}
