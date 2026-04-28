import { readdirSync, statSync, existsSync, mkdirSync, renameSync, writeFileSync, readFileSync, rmdirSync } from "node:fs";
import { createHash } from "node:crypto";
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

export function discoverFeatures(projectDir: string, kataRoot?: string): { features: Feature[]; skipped: string[] } {
  const map = new Map<string, Feature>();
  const skipped: string[] = [];
  const key = (ym: string, slug: string) => `${ym}::${slug}`;
  const upsert = (ym: string, slug: string, patch: Partial<Feature>) => {
    const k = key(ym, slug);
    const existing = map.get(k) ?? { yyyymm: ym, slug };
    map.set(k, { ...existing, ...patch });
  };

  const collectSkipped = (root: string, allowedExceptions: string[] = []) => {
    for (const name of safeReaddir(root)) {
      const full = join(root, name);
      if (!isDir(full)) continue;
      if (/^\d{6}$/.test(name)) continue;
      if (allowedExceptions.includes(name)) continue;
      if (!skipped.includes(full)) skipped.push(full);
    }
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
  collectSkipped(prdsRoot);

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
  collectSkipped(archiveRoot);

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
  collectSkipped(xmindRoot);

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
  collectSkipped(testsRoot, ["fixtures", "helpers"]);

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

  return {
    features: Array.from(map.values()).sort((a, b) =>
      a.yyyymm === b.yyyymm ? a.slug.localeCompare(b.slug) : a.yyyymm.localeCompare(b.yyyymm),
    ),
    skipped: skipped.sort(),
  };
}

function featureTarget(projectDir: string, f: Feature): string {
  return join(projectDir, "features", `${f.yyyymm}-${f.slug}`);
}

function listFiles(dir: string): string[] {
  return safeReaddir(dir).map((name) => join(dir, name));
}

export function planMigration(features: Feature[], projectDir: string): MigrationOp[] {
  const ops: MigrationOp[] = [];
  const dirsToCreate = new Set<string>();

  // Phase A: collect all dirs to mkdir
  dirsToCreate.add(join(projectDir, "features"));
  for (const f of features) dirsToCreate.add(featureTarget(projectDir, f));

  const fixturesSrc = join(projectDir, "tests", "fixtures");
  const helpersSrc = join(projectDir, "tests", "helpers");
  const sharedDir = join(projectDir, "shared");
  const willMoveShared = isDir(fixturesSrc) || isDir(helpersSrc);
  if (willMoveShared) dirsToCreate.add(sharedDir);

  for (const d of [...dirsToCreate].sort()) {
    ops.push({ type: "mkdir", dst: d });
  }

  ops.push({ type: "log", message: "── feature migrations ──" });

  // Phase B: per-feature mvs
  for (const f of features) {
    const target = featureTarget(projectDir, f);
    ops.push({ type: "log", message: `feature ${f.yyyymm}-${f.slug}` });

    if (f.prdDir) {
      for (const item of listFiles(f.prdDir)) {
        const base = item.split("/").pop()!;
        let dstName: string;
        if (item === f.prdMdPath) dstName = "prd.md";
        else dstName = base;
        ops.push({ type: "mv", src: item, dst: join(target, dstName) });
      }
    }
    if (f.archivePath) {
      ops.push({ type: "mv", src: f.archivePath, dst: join(target, "archive.md") });
    }
    if (f.xmindPath) {
      ops.push({ type: "mv", src: f.xmindPath, dst: join(target, "cases.xmind") });
    }
    if (f.testsPath) {
      ops.push({ type: "mv", src: f.testsPath, dst: join(target, "tests") });
    }
    if (f.kataSessionPaths && f.kataSessionPaths.length > 0) {
      const stateDir = join(target, ".state");
      ops.push({ type: "mkdir", dst: stateDir });
      for (const sess of f.kataSessionPaths) {
        const base = sess.split("/").pop()!;
        ops.push({ type: "mv", src: sess, dst: join(stateDir, base) });
      }
    }
  }

  // Phase C: shared/
  if (willMoveShared) {
    ops.push({ type: "log", message: "── shared/ migrations ──" });
    if (isDir(fixturesSrc)) ops.push({ type: "mv", src: fixturesSrc, dst: join(sharedDir, "fixtures") });
    if (isDir(helpersSrc)) ops.push({ type: "mv", src: helpersSrc, dst: join(sharedDir, "helpers") });
  }

  return ops;
}

function fileChecksum(path: string): string | undefined {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return undefined;
  }
}

export function applyMigration(
  ops: MigrationOp[],
  options: { mode: "dry" | "real"; project: string; logPath: string; skipped?: string[] },
): MigrationLog {
  const log: MigrationLog = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    project: options.project,
    mode: options.mode,
    features: [],
    skipped: options.skipped ?? [],
    operations: [],
    warnings: [],
  };

  const FLUSH_EVERY = 10;
  let mvCount = 0;

  for (const op of ops) {
    if (op.type === "log") {
      log.operations.push({ ...op });
      continue;
    }
    if (op.type === "mkdir") {
      if (options.mode === "real") {
        mkdirSync(op.dst!, { recursive: true });
      }
      log.operations.push({ ...op });
      continue;
    }
    if (op.type === "mv") {
      const checksum = options.mode === "real" ? fileChecksum(op.src!) : undefined;
      if (options.mode === "real") {
        if (!existsSync(op.src!)) {
          log.warnings.push(`mv: src missing ${op.src}`);
          continue;
        }
        renameSync(op.src!, op.dst!);
        mvCount += 1;
        if (mvCount % FLUSH_EVERY === 0) {
          writeFileSync(options.logPath, JSON.stringify(log, null, 2));
        }
      }
      log.operations.push({ ...op, checksumBefore: checksum });
      continue;
    }
  }

  writeFileSync(options.logPath, JSON.stringify(log, null, 2));
  return log;
}

export function rollbackFromLog(logPath: string): MigrationLog {
  const log: MigrationLog = JSON.parse(readFileSync(logPath, "utf8"));
  if (log.mode !== "real") {
    throw new Error(`rollbackFromLog: log mode must be 'real', got '${log.mode}'`);
  }
  for (const op of [...log.operations].reverse()) {
    if (op.type === "mv") {
      if (!existsSync(op.dst!)) {
        log.warnings.push(`rollback mv: dst missing ${op.dst}`);
        continue;
      }
      renameSync(op.dst!, op.src!);
    } else if (op.type === "mkdir") {
      try {
        rmdirSync(op.dst!);
      } catch {
        log.warnings.push(`rollback mkdir: dir not empty ${op.dst}`);
      }
    }
  }
  return log;
}
