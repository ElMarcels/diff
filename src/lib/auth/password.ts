import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for DIFF's own accounts (no third-party auth service).
 *
 * Format: scrypt$N$r$p$<salt base64>$<hash base64>
 * scrypt is memory-hard, ships with Node, and needs no native dependency, so
 * the same code runs on Vercel's serverless functions and on a VPS.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAXMEM = 64 * 1024 * 1024; // scrypt needs ~128*N*r bytes; give it headroom

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64"), derived.toString("base64")].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const derived = scryptSync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Runs a dummy derivation so unknown emails cost the same as known ones. */
export function burnPasswordCheck(): void {
  scryptSync("diff-timing-equalizer", randomBytes(16), KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });
}
