import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ROOT_HELP, SQL_EXEC_HELP, SQL_PING_HELP, PROJECT_ENSURE_HELP,
  PRECOND_SETUP_HELP, LOGIN_HELP, LOGOUT_HELP, WHOAMI_HELP,
} from "../../src/help/index";

const usage = readFileSync("tools/dtstack-cli/docs/usage.md", "utf-8");

describe("docs/usage.md mirrors help texts", () => {
  for (const [name, text] of [
    ["ROOT_HELP", ROOT_HELP],
    ["SQL_EXEC_HELP", SQL_EXEC_HELP],
    ["SQL_PING_HELP", SQL_PING_HELP],
    ["PROJECT_ENSURE_HELP", PROJECT_ENSURE_HELP],
    ["PRECOND_SETUP_HELP", PRECOND_SETUP_HELP],
    ["LOGIN_HELP", LOGIN_HELP],
    ["LOGOUT_HELP", LOGOUT_HELP],
    ["WHOAMI_HELP", WHOAMI_HELP],
  ] as const) {
    test(`usage.md contains ${name}`, () => {
      expect(usage).toContain(text.trimEnd());
    });
  }
});
