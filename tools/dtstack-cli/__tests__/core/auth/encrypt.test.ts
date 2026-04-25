import { describe, expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rsaEncrypt } from "../../../src/core/auth/encrypt";

describe("rsaEncrypt", () => {
  test("produces 256-byte ciphertext for 2048-bit key", () => {
    const { publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const ct = rsaEncrypt("hello", publicKey.toString("base64"));
    expect(Buffer.from(ct, "base64").length).toBe(256);
  });

  test("source uses RSA_PKCS1_PADDING (the DTStack server contract)", () => {
    const src = readFileSync(
      join(import.meta.dirname, "../../../src/core/auth/encrypt.ts"),
      "utf-8",
    );
    expect(src).toContain("RSA_PKCS1_PADDING");
    expect(src).not.toContain("OAEP");
  });
});
