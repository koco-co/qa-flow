export type DatasourceMatcher = {
  readonly optionPattern: RegExp;
  readonly sourceTypePattern: RegExp;
  readonly database: string;
};

export type DatasourceCandidate = {
  readonly id?: string | number;
  readonly dataSourceName?: string;
  readonly dtCenterSourceName?: string;
  readonly sourceTypeValue?: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getNameScore(name: string, database: string): number {
  const normalizedName = name.toLowerCase();
  const normalizedDatabase = database.toLowerCase();
  if (!normalizedName || !normalizedDatabase) {
    return 0;
  }

  let score = 0;
  if (normalizedName === normalizedDatabase) {
    score += 40;
  }
  if (
    normalizedName.startsWith(`${normalizedDatabase}_`) ||
    normalizedName.startsWith(`${normalizedDatabase}-`) ||
    normalizedName.startsWith(`${normalizedDatabase}.`)
  ) {
    score += 30;
  }
  if (
    new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(normalizedDatabase)}($|[^a-z0-9])`,
      "i",
    ).test(normalizedName)
  ) {
    score += 20;
  }
  if (normalizedName.includes(normalizedDatabase)) {
    score += 5;
  }

  return score;
}

function getCandidateScore(
  item: DatasourceCandidate,
  matcher: DatasourceMatcher,
): number {
  const dataSourceName = String(item.dataSourceName ?? "");
  const dtCenterSourceName = String(item.dtCenterSourceName ?? "");
  const joinedName = `${dataSourceName} ${dtCenterSourceName}`;
  const matchesTypeOrName =
    matcher.optionPattern.test(joinedName) ||
    matcher.sourceTypePattern.test(String(item.sourceTypeValue ?? ""));
  if (!matchesTypeOrName) {
    return 0;
  }
  let score = 0;

  if (matcher.optionPattern.test(joinedName)) {
    score += 4;
  }
  if (matcher.sourceTypePattern.test(String(item.sourceTypeValue ?? ""))) {
    score += 2;
  }

  score += getNameScore(dataSourceName, matcher.database);
  if (dtCenterSourceName !== dataSourceName) {
    score += getNameScore(dtCenterSourceName, matcher.database);
  }

  return score;
}

export function matchesDatasourceCandidate(
  item: DatasourceCandidate,
  matcher: DatasourceMatcher,
): boolean {
  return getCandidateScore(item, matcher) > 0;
}

export function rankDatasourceCandidates<T extends DatasourceCandidate>(
  items: readonly T[],
  matcher: DatasourceMatcher,
): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      score: getCandidateScore(item, matcher),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.item);
}
