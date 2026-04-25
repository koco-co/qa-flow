import { createPublicKey, publicEncrypt, constants } from "node:crypto";

export function rsaEncrypt(message: string, publicKeyBase64: string): string {
  const keyDer = Buffer.from(publicKeyBase64, "base64");
  const key = createPublicKey({ key: keyDer, format: "der", type: "spki" });
  const ciphertext = publicEncrypt(
    { key, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(message, "utf-8"),
  );
  return ciphertext.toString("base64");
}
