import { randomBytes } from "node:crypto";
import { ANCHOR_REGEX, Q_ANCHOR_REGEX, SOURCE_FACTS_ANCHOR } from "./enhanced-doc-types.ts";

export function generateSectionAnchor(level: number, index?: number): string {
  if (index === undefined) return `s-${level}`;
  const uuid = randomBytes(2).toString("hex");
  return `s-${level}-${index}-${uuid}`;
}

export function generateQAnchor(counter: number): string {
  return `q${counter}`;
}

export function isValidSectionAnchor(anchor: string): boolean {
  if (anchor === SOURCE_FACTS_ANCHOR) return true;
  return ANCHOR_REGEX.test(anchor);
}

export function isValidQAnchor(anchor: string): boolean {
  return Q_ANCHOR_REGEX.test(anchor);
}

export type ParsedAnchor =
  | { kind: "section"; level: number; index?: number; uuid?: string }
  | { kind: "pending"; counter: number }
  | { kind: "appendix" }
  | null;

export function parseAnchor(anchor: string): ParsedAnchor {
  if (anchor === SOURCE_FACTS_ANCHOR) return { kind: "appendix" };
  const qMatch = anchor.match(/^q(\d+)$/);
  if (qMatch) return { kind: "pending", counter: Number(qMatch[1]) };
  const topMatch = anchor.match(/^s-(\d+)$/);
  if (topMatch) return { kind: "section", level: Number(topMatch[1]) };
  const subMatch = anchor.match(/^s-(\d+)-(\d+)-([0-9a-f]{4})$/);
  if (subMatch) {
    return {
      kind: "section",
      level: Number(subMatch[1]),
      index: Number(subMatch[2]),
      uuid: subMatch[3],
    };
  }
  return null;
}
