import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../lib/paths.ts";
import { renderScanReport } from "../lib/scan-report-render.ts";

describe("renderScanReport", () => {
  const fixturePath = join(repoRoot(), "engine/tests/fixtures/scan-report-sample.json");
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

  test("produces an HTML doc with required structural anchors", () => {
    const html = renderScanReport(fixture.meta, fixture.report);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<title>");
    expect(html).toContain("dt-insight-engine");
    expect(html).toContain("release_6.3.x");
    expect(html).toContain("release_6.3.0_dev");
    expect(html).toContain('id="b-001"');
    expect(html).toContain("Tag bulk delete");
    // E1 nav present
    expect(html).toContain('class="toc"');
    // E2 step bubbles
    expect(html).toContain('class="steps"');
    // E3 severity rail class
    expect(html).toContain("sev-major");
    // E4 summary
    expect(html).toContain('class="summary"');
    // diff hunk preserved
    expect(html).toContain("referenceCheck");
  });

  test("groups bugs by module for the TOC", () => {
    const html = renderScanReport(fixture.meta, fixture.report);
    // Tag Center is the only module — appears as a group title
    expect(html).toContain("Tag Center");
  });

  test("computes per-severity counts", () => {
    const html = renderScanReport(fixture.meta, fixture.report);
    // 1 major, 0 critical/normal/minor
    expect(html).toMatch(/<div class="num">1<\/div><div class="lbl">Major<\/div>/);
    expect(html).toMatch(/<div class="num">0<\/div><div class="lbl">Critical<\/div>/);
  });
});
