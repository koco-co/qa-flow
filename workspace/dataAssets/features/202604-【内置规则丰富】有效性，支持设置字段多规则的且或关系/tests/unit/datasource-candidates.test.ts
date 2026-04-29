import { describe, expect, test } from "bun:test";

import {
  rankDatasourceCandidates,
  type DatasourceCandidate,
  type DatasourceMatcher,
} from "./datasource-candidates";

const sparkMatcher: DatasourceMatcher = {
  optionPattern: /(sparkthrift|hadoop)/i,
  sourceTypePattern: /sparkthrift/i,
  database: "pw_test",
};

describe("rankDatasourceCandidates", () => {
  test("prefers datasource names that match the target database token exactly", () => {
    const ranked = rankDatasourceCandidates(
      [
        {
          id: 544,
          dataSourceName: "pw_test2_HADOOP",
          dtCenterSourceName: "pw_test2_HADOOP",
          sourceTypeValue: "SparkThrift2.x",
        },
        {
          id: 549,
          dataSourceName: "pw_test_HADOOP",
          dtCenterSourceName: "pw_test_HADOOP",
          sourceTypeValue: "SparkThrift2.x",
        },
      ] satisfies DatasourceCandidate[],
      sparkMatcher,
    );

    expect(ranked.map((item) => item.id)).toEqual([549, 544]);
  });

  test("filters out non-matching datasource types while keeping equally good matches stable", () => {
    const ranked = rankDatasourceCandidates(
      [
        {
          id: 543,
          dataSourceName: "pw_test_DORIS_doris3",
          dtCenterSourceName: "pw_test_DORIS_doris3",
          sourceTypeValue: "Doris3.x",
        },
        {
          id: 549,
          dataSourceName: "pw_test_HADOOP",
          dtCenterSourceName: "pw_test_HADOOP",
          sourceTypeValue: "SparkThrift2.x",
        },
        {
          id: 547,
          dataSourceName: "pw_test_HADOOP",
          dtCenterSourceName: "pw_test_HADOOP",
          sourceTypeValue: "SparkThrift2.x",
        },
      ] satisfies DatasourceCandidate[],
      sparkMatcher,
    );

    expect(ranked.map((item) => item.id)).toEqual([549, 547]);
  });
});
