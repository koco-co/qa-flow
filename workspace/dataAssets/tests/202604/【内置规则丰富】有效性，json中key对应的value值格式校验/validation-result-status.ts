const FAIL_LIKE_STATUS_PATTERN = /校验异常|校验未通过|校验不通过/;

export function isFailLikeValidationStatus(statusText: string): boolean {
  return FAIL_LIKE_STATUS_PATTERN.test(statusText);
}
