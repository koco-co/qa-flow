import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getDb } from "./client.ts";

export function syncArchiveToDb(project: string, archiveDir: string): void {
  const db = getDb();

  db.prepare(
    "INSERT OR IGNORE INTO projects (id, name) VALUES (?, ?)",
  ).run(project, project);

  function scanDir(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;

      const content = readFileSync(fullPath, "utf8");

      // Simple frontmatter parse without gray-matter dependency
      const match = content.match(/^---\n([\s\S]*?)\n---\n/);
      if (!match) continue;

      const fm = match[1];
      const title = fm.match(/^title:\s*(.+)$/m)?.[1];
      if (!title) continue;

      const priority = fm.match(/^priority:\s*(.+)$/m)?.[1] ?? "P3";
      const tagsMatch = fm.match(/^tags:\s*(\[.*?\]|.+)$/m);
      const tags = tagsMatch ? tagsMatch[1] : "[]";
      const fileRel = relative(archiveDir, fullPath);

      db.prepare(`
        INSERT OR REPLACE INTO test_cases
          (project, title, priority, file_path, tags, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(project, title.trim(), priority.trim(), fileRel, tags);
    }
  }

  scanDir(archiveDir);
  console.error(`[db] synced ${project} from ${archiveDir}`);
}
