export const AVAILABLE_HOOKS = {
  "test-case-gen:init": "Before test-case-gen skill starts",
  "test-case-gen:output": "After test-case-gen produces output",
  "hotfix-case-gen:init": "Before hotfix-case-gen skill starts",
  "hotfix-case-gen:output": "After hotfix-case-gen produces output",
  "bug-report:init": "Before bug-report skill starts",
  "bug-report:output": "After bug-report produces output",
  "conflict-report:init": "Before conflict-report skill starts",
  "conflict-report:output": "After conflict-report produces output",
  "*:output": "After any skill produces output (wildcard)",
} as const;

export type HookName = keyof typeof AVAILABLE_HOOKS;

export function isValidHook(hook: string): hook is HookName {
  if (hook.startsWith("*:")) return true;
  return hook in AVAILABLE_HOOKS;
}
