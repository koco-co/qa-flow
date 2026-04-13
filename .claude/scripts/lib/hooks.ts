export const AVAILABLE_HOOKS = {
  "test-case-gen:init": "Before test-case-gen skill starts",
  "test-case-gen:output": "After test-case-gen produces output",
  "code-analysis:init": "Before code-analysis skill starts",
  "code-analysis:output": "After code-analysis produces output",
  "*:output": "After any skill produces output (wildcard)",
} as const;

export type HookName = keyof typeof AVAILABLE_HOOKS;

export function isValidHook(hook: string): hook is HookName {
  if (hook.startsWith("*:")) return true;
  return hook in AVAILABLE_HOOKS;
}
