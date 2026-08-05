import { describe, it, expect, vi } from "vitest";
import { signLabReportToken, verifyLabReportToken, withFreshLabReportToken } from "@/lib/labReportUrlSigning";

// Regression tests: the lab-report PDF route has no session auth (it's the
// link texted to a patient over WhatsApp), so a signed, time-limited token
// is the only thing standing between a leaked link and permanent PHI
// access. These prove the token actually expires, can't be forged, and
// can't have its expiry extended by tampering with the timestamp alone.

describe("signLabReportToken / verifyLabReportToken", () => {
  it("accepts a freshly signed token for the same report id", () => {
    const token = signLabReportToken("report-1");
    expect(verifyLabReportToken("report-1", token)).toBe(true);
  });

  it("rejects a token signed for a different report id", () => {
    const token = signLabReportToken("report-1");
    expect(verifyLabReportToken("report-2", token)).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(verifyLabReportToken("report-1", null)).toBe(false);
  });

  it("rejects a garbage token", () => {
    expect(verifyLabReportToken("report-1", "not-a-real-token")).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = signLabReportToken("report-1", -1); // already expired
    expect(verifyLabReportToken("report-1", token)).toBe(false);
  });

  it("rejects a token with its expiry timestamp tampered forward", () => {
    const token = signLabReportToken("report-1", -10); // expired 10s ago
    const [, signature] = token.split(".");
    const forgedFutureExpiry = Math.floor(Date.now() / 1000) + 10000;
    const tampered = `${forgedFutureExpiry}.${signature}`; // same signature, different claimed expiry
    expect(verifyLabReportToken("report-1", tampered)).toBe(false);
  });

  it("expires after its TTL elapses", () => {
    vi.useFakeTimers();
    try {
      const token = signLabReportToken("report-1", 60); // valid for 60s
      expect(verifyLabReportToken("report-1", token)).toBe(true);
      vi.advanceTimersByTime(61_000);
      expect(verifyLabReportToken("report-1", token)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("withFreshLabReportToken", () => {
  it("appends a valid, verifiable token to the stored fileUrl", () => {
    const fileUrl = "http://localhost:3000/api/lab-reports/report-1/pdf";
    const url = withFreshLabReportToken(fileUrl, "report-1");
    const token = new URL(url).searchParams.get("token");
    expect(verifyLabReportToken("report-1", token)).toBe(true);
  });

  it("leaves a malformed/legacy fileUrl untouched instead of throwing", () => {
    expect(withFreshLabReportToken("not a url", "report-1")).toBe("not a url");
  });

  it("leaves an empty fileUrl untouched", () => {
    expect(withFreshLabReportToken("", "report-1")).toBe("");
  });
});
