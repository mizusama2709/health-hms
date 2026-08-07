import { describe, it, expect, vi } from "vitest";
import { signDocumentToken, verifyDocumentToken, withFreshDocumentToken } from "@/lib/documentUrlSigning";

// Regression tests: every patient-facing document PDF route (lab report,
// invoice, prescription, consultation summary) has no session auth — these
// are the links texted to a patient over WhatsApp, and patients have no
// portal login. A signed, time-limited token is the only thing standing
// between a leaked link and permanent PHI access. These prove the token
// actually expires, can't be forged, can't have its expiry extended by
// tampering, and can't be replayed against a different document type.

describe("signDocumentToken / verifyDocumentToken", () => {
  it("accepts a freshly signed token for the same type and id", () => {
    const token = signDocumentToken("lab_report", "doc-1");
    expect(verifyDocumentToken("lab_report", "doc-1", token)).toBe(true);
  });

  it("rejects a token signed for a different document id", () => {
    const token = signDocumentToken("lab_report", "doc-1");
    expect(verifyDocumentToken("lab_report", "doc-2", token)).toBe(false);
  });

  it("rejects a token replayed against a different document type with the same id", () => {
    const token = signDocumentToken("invoice", "shared-id");
    expect(verifyDocumentToken("prescription", "shared-id", token)).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(verifyDocumentToken("lab_report", "doc-1", null)).toBe(false);
  });

  it("rejects a garbage token", () => {
    expect(verifyDocumentToken("lab_report", "doc-1", "not-a-real-token")).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = signDocumentToken("lab_report", "doc-1", -1); // already expired
    expect(verifyDocumentToken("lab_report", "doc-1", token)).toBe(false);
  });

  it("rejects a token with its expiry timestamp tampered forward", () => {
    const token = signDocumentToken("lab_report", "doc-1", -10); // expired 10s ago
    const [, signature] = token.split(".");
    const forgedFutureExpiry = Math.floor(Date.now() / 1000) + 10000;
    const tampered = `${forgedFutureExpiry}.${signature}`; // same signature, different claimed expiry
    expect(verifyDocumentToken("lab_report", "doc-1", tampered)).toBe(false);
  });

  it("expires after its TTL elapses", () => {
    vi.useFakeTimers();
    try {
      const token = signDocumentToken("invoice", "doc-1", 60); // valid for 60s
      expect(verifyDocumentToken("invoice", "doc-1", token)).toBe(true);
      vi.advanceTimersByTime(61_000);
      expect(verifyDocumentToken("invoice", "doc-1", token)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("withFreshDocumentToken", () => {
  it("appends a valid, verifiable token to the stored fileUrl", () => {
    const fileUrl = "http://localhost:3000/api/lab-reports/doc-1/pdf";
    const url = withFreshDocumentToken(fileUrl, "lab_report", "doc-1");
    const token = new URL(url).searchParams.get("token");
    expect(verifyDocumentToken("lab_report", "doc-1", token)).toBe(true);
  });

  it("leaves a malformed/legacy fileUrl untouched instead of throwing", () => {
    expect(withFreshDocumentToken("not a url", "lab_report", "doc-1")).toBe("not a url");
  });

  it("leaves an empty fileUrl untouched", () => {
    expect(withFreshDocumentToken("", "lab_report", "doc-1")).toBe("");
  });
});
