import type { Module } from "./types.ts";

export function countCasesInModules(modules: Module[]): number {
  let count = 0;
  for (const mod of modules) {
    for (const page of mod.pages) {
      if (page.test_cases) count += page.test_cases.length;
      if (page.sub_groups) {
        for (const sg of page.sub_groups) {
          count += sg.test_cases.length;
        }
      }
    }
  }
  return count;
}

export const PRIORITY_MAP: Record<string, string> = {
  P0: "p1",
  P1: "p2",
  P2: "p3",
};
