import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2 defaults: Argon2id, m=19456 KiB, t=2, p=1 (OWASP recommended minimum).
export function hashPassword(plain: string) {
  return hash(plain);
}

export async function verifyPassword(passwordHash: string, plain: string) {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false; // malformed hash
  }
}

// Pre-computed hash used to keep login timing similar when the user does not exist.
let dummyHash: Promise<string> | undefined;
export async function burnVerifyTime(plain: string) {
  dummyHash ??= hash("timing-equaliser-not-a-real-password");
  await verifyPassword(await dummyHash, plain);
}
