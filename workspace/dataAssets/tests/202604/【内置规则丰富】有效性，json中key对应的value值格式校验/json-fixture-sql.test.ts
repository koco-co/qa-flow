import { describe, expect, test } from "bun:test";

import {
  buildSparkFixtureSql,
  versionJsonFixtureName,
} from "./json-fixture-sql";

describe("versionJsonFixtureName", () => {
  test("adds the stable fixture revision suffix once", () => {
    expect(versionJsonFixtureName("quality_test_json_main_fail")).toBe(
      "quality_test_json_main_fail_fmt_v2",
    );
    expect(versionJsonFixtureName("quality_test_json_main_fail_fmt_v2")).toBe(
      "quality_test_json_main_fail_fmt_v2",
    );
  });
});

describe("buildSparkFixtureSql", () => {
  test("builds a CTAS statement for the versioned fixture table", () => {
    const sql = buildSparkFixtureSql(
      "quality_test_json_main_fail",
      `
SELECT 1 AS id, '{"person":{"name":"Tom"}}' AS info
UNION ALL
SELECT 2 AS id, '{"person":{"name":"王五"}}' AS info
      `,
    );

    expect(sql).toContain(
      "DROP TABLE IF EXISTS pw_test.quality_test_json_main_fail_fmt_v2;",
    );
    expect(sql).toContain(
      "CREATE TABLE pw_test.quality_test_json_main_fail_fmt_v2 STORED AS PARQUET AS",
    );
    expect(sql).toContain(`SELECT 1 AS id, '{"person":{"name":"Tom"}}' AS info`);
  });
});
