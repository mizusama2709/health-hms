import { createHmac, timingSafeEqual } from "node:crypto";

// PDF download routes for all four patient-facing document types (lab
// report, invoice, prescription, consultation summary) are intentionally
// unauthenticated by session — these are the links texted to a patient
// over WhatsApp, and patients have no portal login to attach a session to.
// Without this, a bare cuid alone granted permanent, unrevocable access to
// real PHI if a link ever leaked (forwarding, browser history sync, a
// shared device). This adds a signed, time-limited token instead: the
// link still needs no login, but it stops working after
// DOCUMENT_TOKEN_TTL_SECONDS, and can't be forged or have its expiry
// extended without the server secret. The document type is part of the
// signed payload, so a token minted for one document can't be replayed
// against a different type even if ids ever collided across tables.
export type DocumentType = "lab_report" | "invoice" | "prescription" | "consultation_summary";

const DOCUMENT_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function sign(type: DocumentType, id: string, expiresAt: number): string {
  return createHmac("sha256", getSecret()).update(`${type}.${id}.${expiresAt}`).digest("hex");
}

export function signDocumentToken(type: DocumentType, id: string, ttlSeconds = DOCUMENT_TOKEN_TTL_SECONDS): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${expiresAt}.${sign(type, id, expiresAt)}`;
}

export function verifyDocumentToken(type: DocumentType, id: string, token: string | null): boolean {
  if (!token) return false;
  const [expiresAtStr, signature] = token.split(".");
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (Math.floor(Date.now() / 1000) > expiresAt) return false;

  const expected = sign(type, id, expiresAt);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

// The DB stores a stable base fileUrl; every place that actually hands the
// link to someone — a fresh WhatsApp send, an admin page render — mints a
// fresh, freshly-expiring token rather than reusing a baked-in one, so
// admin-page views are implicitly gated by needing an authenticated render
// to obtain a valid token in the first place.
export function withFreshDocumentToken(fileUrl: string, type: DocumentType, id: string): string {
  if (!fileUrl) return fileUrl;
  try {
    const url = new URL(fileUrl);
    url.searchParams.set("token", signDocumentToken(type, id));
    return url.toString();
  } catch {
    return fileUrl; // malformed/legacy URL — leave it exactly as stored rather than throwing
  }
}
