const JSON_FIXTURE_SUFFIX = "_fmt_v2";

export function versionJsonFixtureName(baseName: string): string {
  return baseName.endsWith(JSON_FIXTURE_SUFFIX)
    ? baseName
    : `${baseName}${JSON_FIXTURE_SUFFIX}`;
}

export function buildSparkFixtureSql(
  baseTableName: string,
  selectSql: string,
): string {
  const tableName = versionJsonFixtureName(baseTableName);
  return [
    `DROP TABLE IF EXISTS pw_test.${tableName};`,
    `CREATE TABLE pw_test.${tableName} STORED AS PARQUET AS`,
    selectSql.trim(),
  ].join("\n");
}
