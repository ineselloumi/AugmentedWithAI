// HMAC-signed unsubscribe tokens. The link in an email contains the email
// plus a signature; only someone holding UNSUBSCRIBE_SECRET (the server) can
// produce a valid signature, so an attacker can't unsubscribe arbitrary users.

import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s || s.length < 32) {
    throw new Error("UNSUBSCRIBE_SECRET is not set or too short (need 32+ chars)");
  }
  return s;
}

export function signUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHmac("sha256", getSecret()).update(normalized).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = signUnsubscribeToken(email);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch {
    return false;
  }
}
