/**
 * Convert node:test + node:assert/strict to bun:test + expect().
 * Mechanical replacement only — does not optimize assertion strength.
 *
 * Limitations:
 * - assert.equal(a, b, "msg") drops the third (message) argument
 * - assert.ok(x) -> expect(x).toBeTruthy() (intentional, P7 E1-WEAK lint scopes to workspace/)
 */

/** Split balanced content at the first top-level comma. */
function splitArgs(content: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      args.push(content.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(content.slice(start).trim());
  return args;
}

/** Find the matching close paren for a group starting at startIdx */
function matchCloseParen(input: string, startIdx: number): number {
  let depth = 1;
  let i = startIdx;
  while (i < input.length && depth > 0) {
    if (input[i] === "(") depth++;
    else if (input[i] === ")") depth--;
    i++;
  }
  return i;
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

export function transformNodeTestToBunTest(source: string): string {
  let out = source;

  // 1) Imports
  out = out.replace(
    /^import\s+assert\s+from\s+"node:assert\/strict";?\s*\n/gm,
    "",
  );
  out = out.replace(
    /^import\s*\{\s*([^}]+)\s*\}\s+from\s+"node:test";?/gm,
    (_match, names: string) => {
      const set = new Set(
        names.split(",").map((n) => n.trim()).filter(Boolean),
      );
      set.add("expect");
      return `import { ${[...set].join(", ")} } from "bun:test";`;
    },
  );

  // 2) Asserts (order matters: longer / more specific first)
  // throws with error matching first (more specific)
  out = replaceAssertThrows(out, true);
  out = replaceAssertThrows(out, false);

  out = out.replace(
    /assert\.deepEqual\((.+?),\s*(.+?)(?:,\s*"[^"]*")?\)/gs,
    "expect($1).toEqual($2)",
  );
  out = out.replace(
    /assert\.notEqual\((.+?),\s*(.+?)(?:,\s*"[^"]*")?\)/gs,
    "expect($1).not.toBe($2)",
  );
  out = out.replace(
    /assert\.equal\((.+?),\s*(.+?)(?:,\s*"[^"]*")?\)/gs,
    "expect($1).toBe($2)",
  );
  out = out.replace(
    /assert\.doesNotMatch\((.+?),\s*(.+?)(?:,\s*"[^"]*")?\)/gs,
    "expect($1).not.toMatch($2)",
  );
  out = out.replace(
    /assert\.match\((.+?),\s*(.+?)(?:,\s*"[^"]*")?\)/gs,
    "expect($1).toMatch($2)",
  );
  // assert.ok last (most permissive)
  out = out.replace(
    /assert\.ok\((.+?)(?:,\s*"[^"]*")?\)/gs,
    "expect($1).toBeTruthy()",
  );

  return out;
}
