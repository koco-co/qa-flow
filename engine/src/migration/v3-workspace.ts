import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Feature, MigrationLog, MigrationOp } from "./types.ts";

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function discoverFeatures(projectDir: string, kataRoot?: string): Feature[] {
  const map = new Map<string, Feature>();
  const key = (ym: string, slug: string) => `${ym}::${slug}`;
  const upsert = (ym: string, slug: string, patch: Partial<Feature>) => {
    const k = key(ym, slug);
    const existing = map.get(k) ?? { yyyymm: ym, slug };
    map.set(k, { ...existing, ...patch });
  };

  // 1. prds/{ym}/{slug}/
  const prdsRoot = join(projectDir, "prds");
  for (const ym of safeReaddir(prdsRoot)) {
    const ymDir = join(prdsRoot, ym);
    if (!isDir(ymDir)) continue;
    if (!/^\d{6}$/.test(ym)) continue;
    for (const slug of safeReaddir(ymDir)) {
      const slugDir = join(ymDir, slug);
      if (!isDir(slugDir)) continue;
      const candidateMd = join(slugDir, `${slug}.md`);
      upsert(ym, slug, {
        prdDir: slugDir,
        prdMdPath: existsSync(candidateMd) ? candidateMd : undefined,
      });
    }
  }

  // 2. archive/{ym}/{slug}.md
  const archiveRoot = join(projectDir, "archive");
  for (const ym of safeReaddir(archiveRoot)) {
    const ymDir = join(archiveRoot, ym);
    if (!isDir(ymDir)) continue;
    if (!/^\d{6}$/.test(ym)) continue;
    for (const file of safeReaddir(ymDir)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.slice(0, -3);
      upsert(ym, slug, { archivePath: join(ymDir, file) });
    }
  }

  // 3. xmind/{ym}/{slug}.xmind
  const xmindRoot = join(projectDir, "xmind");
  for (const ym of safeReaddir(xmindRoot)) {
    const ymDir = join(xmindRoot, ym);
    if (!isDir(ymDir)) continue;
    if (!/^\d{6}$/.test(ym)) continue;
    for (const file of safeReaddir(ymDir)) {
      if (!file.endsWith(".xmind")) continue;
      const slug = file.slice(0, -6);
      upsert(ym, slug, { xmindPath: join(ymDir, file) });
    }
  }

  // 4. tests/{ym}/{slug}/
  const testsRoot = join(projectDir, "tests");
  for (const ym of safeReaddir(testsRoot)) {
    if (!/^\d{6}$/.test(ym)) continue;
    const ymDir = join(testsRoot, ym);
    if (!isDir(ymDir)) continue;
    for (const slug of safeReaddir(ymDir)) {
      const slugDir = join(ymDir, slug);
      if (!isDir(slugDir)) continue;
      upsert(ym, slug, { testsPath: slugDir });
    }
  }

  // 5. .kata/{project}/sessions/{workflow}/{slug}.json
  if (kataRoot) {
    const projectName = projectDir.split("/").pop()!;
    const sessionsRoot = join(kataRoot, projectName, "sessions");
    for (const workflow of safeReaddir(sessionsRoot)) {
      const wfDir = join(sessionsRoot, workflow);
      if (!isDir(wfDir)) continue;
      for (const file of safeReaddir(wfDir)) {
        if (!file.endsWith(".json")) continue;
        const slug = file.slice(0, -5);
        for (const feature of map.values()) {
          if (feature.slug === slug) {
            const k = key(feature.yyyymm, feature.slug);
            const existing = map.get(k)!;
            map.set(k, {
              ...existing,
              kataSessionPaths: [...(existing.kataSessionPaths ?? []), join(wfDir, file)],
            });
          }
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.yyyymm === b.yyyymm ? a.slug.localeCompare(b.slug) : a.yyyymm.localeCompare(b.yyyymm),
  );
}

export function planMigration(features: Feature[], projectDir: string): MigrationOp[] {
  throw new Error("not implemented");
}

export function applyMigration(
  ops: MigrationOp[],
  options: { mode: "dry" | "real"; project: string; logPath: string },
): MigrationLog {
  throw new Error("not implemented");
}

export function rollbackFromLog(logPath: string): MigrationLog {
  throw new Error("not implemented");
}
