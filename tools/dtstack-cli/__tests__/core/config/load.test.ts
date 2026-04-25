import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { loadConfig } from "../../../src/core/config/load";

describe("loadConfig", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "dtcli-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("parses YAML and returns shape", () => {
    const file = join(dir, "c.yaml");
    writeFileSync(file, `
defaultEnv: ci78
environments:
  ci78:
    baseUrl: http://x
    login:
      username: u
      password: p
datasources:
  d1:
    type: doris
    host: h
    port: 9030
    username: u
    password: ""
`);
    const cfg = loadConfig(file);
    expect(cfg.defaultEnv).toBe("ci78");
    expect(cfg.environments.ci78.baseUrl).toBe("http://x");
    expect(cfg.datasources.d1.port).toBe(9030);
  });

  test("interpolates ${ENV_VAR}", () => {
    process.env.MY_PWD = "secret";
    const file = join(dir, "c.yaml");
    writeFileSync(file, `
environments:
  ci78:
    baseUrl: http://x
    login:
      username: u
      password: \${MY_PWD}
datasources: {}
`);
    const cfg = loadConfig(file);
    expect(cfg.environments.ci78.login?.password).toBe("secret");
    delete process.env.MY_PWD;
  });

  test("missing env var becomes empty string", () => {
    delete process.env.NOT_SET;
    const file = join(dir, "c.yaml");
    writeFileSync(file, `
environments: {}
datasources:
  x:
    type: mysql
    host: h
    port: 3306
    username: u
    password: \${NOT_SET}
`);
    const cfg = loadConfig(file);
    expect(cfg.datasources.x.password).toBe("");
  });
});
