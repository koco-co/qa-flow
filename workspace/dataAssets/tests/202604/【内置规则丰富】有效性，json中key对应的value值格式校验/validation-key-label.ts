function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildValidationKeyLabelPattern(keyPath: string): RegExp {
  const dottedVariant = keyPath.replace("-", ".");
  return new RegExp(`(?:${escapeRegExp(keyPath)}|${escapeRegExp(dottedVariant)})`);
}
