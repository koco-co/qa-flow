#!/usr/bin/env bun
/**
 * image-compress.ts — Compress images larger than max size using macOS `sips`.
 *
 * Usage:
 *   kata-cli image-compress compress --dir <path> [--max-size 2000] [--dry-run]
 *   kata-cli image-compress --help
 */

import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileResult {
  path: string;
  original: string;
  action: "compressed" | "skipped";
}

interface Output {
  processed: number;
  skipped: number;
  files: FileResult[];
}

interface SipsUnavailableOutput {
  error: string;
  skipped: true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSipsAvailable(): boolean {
  try {
    execSync("which sips", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getImageDimensions(
  filePath: string,
): { width: number; height: number } | null {
  try {
    const output = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
    const heightMatch = output.match(/pixelHeight:\s*(\d+)/);
    if (!widthMatch || !heightMatch) return null;
    return {
      width: Number.parseInt(widthMatch[1], 10),
      height: Number.parseInt(heightMatch[1], 10),
    };
  } catch {
    return null;
  }
}

function compressImage(filePath: string, maxSize: number): void {
  execSync(`sips -Z ${maxSize} "${filePath}"`, { stdio: "pipe" });
}

function scanImageFiles(dir: string): string[] {
  const resolved = resolve(dir);
  try {
    return readdirSync(resolved)
      .filter((f) => {
        const ext = extname(f).toLowerCase();
        return ext === ".png" || ext === ".jpg" || ext === ".jpeg";
      })
      .map((f) => join(resolved, f))
      .filter((f) => statSync(f).isFile());
  } catch {
    return [];
  }
}

// ─── Action ───────────────────────────────────────────────────────────────────

function runCompress(opts: { dir: string; maxSize: string; dryRun?: boolean }): void {
  if (!isSipsAvailable()) {
    const out: SipsUnavailableOutput = {
      error: "sips not available on this platform",
      skipped: true,
    };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(0);
  }

  const maxSize = Number.parseInt(opts.maxSize, 10);
  const dryRun = opts.dryRun === true;
  const files = scanImageFiles(opts.dir);

  let processed = 0;
  let skipped = 0;
  const results: FileResult[] = [];

  for (const filePath of files) {
    const dims = getImageDimensions(filePath);
    if (!dims) {
      skipped++;
      continue;
    }

    const { width, height } = dims;
    const original = `${width}x${height}`;

    if (width > maxSize || height > maxSize) {
      if (!dryRun) {
        compressImage(filePath, maxSize);
      }
      processed++;
      results.push({ path: filePath, original, action: "compressed" });
    } else {
      skipped++;
      results.push({ path: filePath, original, action: "skipped" });
    }
  }

  const out: Output = { processed, skipped, files: results };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

export const program = createCli({
  name: "image-compress",
  description: "Compress images larger than max size using macOS sips",
  rootAction: {
    options: [
      {
        flag: "--dir <path>",
        description: "Directory to scan for images (non-recursive)",
        required: true,
      },
      {
        flag: "--max-size <pixels>",
        description: "Maximum dimension in pixels",
        defaultValue: "2000",
      },
      {
        flag: "--dry-run",
        description: "Only report what would be compressed, don't write",
      },
    ],
    action: runCompress,
  },
});
