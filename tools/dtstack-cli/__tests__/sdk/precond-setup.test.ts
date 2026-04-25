import { describe, expect, mock, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { precondSetup } from "../../src/sdk/precond-setup";
import type { DtStackClientLike } from "../../src/core/http/client";

function makeClient(routes: Record<string, unknown>): DtStackClientLike {
  return {
    post: mock(async (path: string) => ({ code: 1, data: routes[path] ?? null })),
    postWithProjectId: mock(async (path: string) => ({ code: 1, data: routes[path] ?? null })),
  } as unknown as DtStackClientLike;
}

describe("precondSetup", () => {
  test("loads tables from yaml when tablesFromFile provided", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dtcli-pc-"));
    const file = join(dir, "tables.yaml");
    writeFileSync(file, "tables:\n  - name: t1\n    sql: 'CREATE TABLE t1 (id int)'\n");
    try {
      const client = makeClient({
        "/api/rdos/common/project/getProjects": [{ id: 1, projectName: "p1" }],
        "/api/rdos/batch/batchDataSource/list": [{ id: 9, dataName: "doris-x", dataSourceType: 119, schemaName: "s" }],
        "/dassets/v1/dataSource/pageQuery": { records: [{ id: 1, dataSourceName: "doris-x" }] },
        "/dmetadata/v1/dataSource/listMetadataDataSource": [],
      });
      const result = await precondSetup({
        client, project: "p1", datasource: "Doris", tablesFromFile: file, skipSync: true,
      });
      expect(result.tablesCreated).toEqual(["t1"]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("inline tables option works without file", async () => {
    const client = makeClient({
      "/api/rdos/common/project/getProjects": [{ id: 1, projectName: "p1" }],
      "/api/rdos/batch/batchDataSource/list": [{ id: 9, dataName: "doris-x", dataSourceType: 119, schemaName: "s" }],
      "/dassets/v1/dataSource/pageQuery": { records: [{ id: 1, dataSourceName: "doris-x" }] },
      "/dmetadata/v1/dataSource/listMetadataDataSource": [],
    });
    const result = await precondSetup({
      client, project: "p1", datasource: "Doris",
      tables: [{ name: "t1", sql: "CREATE TABLE t1 (id int)" }],
      skipSync: true,
    });
    expect(result.tablesCreated).toEqual(["t1"]);
  });
});
