/**
 * test-no-hardcoded-paths.mjs
 * STRU-02 regression gate: ensures no shared script contains hardcoded cases/ path literals.
 *
 * Run: node --test .claude/tests/test-no-hardcoded-paths.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = resolve(__dirname, '../shared/scripts');

const FORBIDDEN_LITERALS = [
  '"cases/xmind/',
  '"cases/archive/',
  '"cases/requirements/',
  '"cases/history/',
  "'cases/xmind/",
  "'cases/archive/",
  "'cases/requirements/",
  "'cases/history/",
  '`cases/xmind/',
  '`cases/archive/',
  '`cases/requirements/',
  '`cases/history/',
];

// Files where path-segment matching is acceptable (content-pattern matching, not path construction)
const ALLOWLIST_FILES = [
  'front-matter-utils.mjs',
];

describe('STRU-02: No hardcoded cases/ path literals in shared scripts', () => {
  const files = readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.mjs') && !f.endsWith('.test.mjs'));

  it('scans at least 5 script files (sanity check)', () => {
    assert.ok(files.length >= 5, `Expected >= 5 .mjs files, found ${files.length}`);
  });

  for (const file of files) {
    if (ALLOWLIST_FILES.includes(file)) continue;

    it(`${file} contains no hardcoded cases/ path literals`, () => {
      const source = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
      // Strip comment lines to avoid false positives on JSDoc / inline comments
      const codeLines = source.split('\n').filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*');
      }).join('\n');

      for (const literal of FORBIDDEN_LITERALS) {
        assert.ok(
          !codeLines.includes(literal),
          `${file} contains hardcoded path literal: ${literal}`
        );
      }
    });
  }
});
