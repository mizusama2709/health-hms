import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

// Regression tests for CSV/formula injection (CWE-1236): patient names and
// phone numbers (attacker-influenceable via self-registration or a WhatsApp
// lead capture) flow into report exports. A cell starting with =, +, -, or
// @ is interpreted as a formula by Excel/Sheets when the exported file is
// opened — e.g. =HYPERLINK("http://evil","x") or a DDE payload — so those
// must be neutralized, not passed through raw.

describe("toCsv — formula injection", () => {
  it.each([
    ["=HYPERLINK(evil)", "'=HYPERLINK(evil)"],
    ["+1+1", "'+1+1"],
    ["-2+3", "'-2+3"],
    ["@SUM(1+1)", "'@SUM(1+1)"],
  ])("neutralizes a cell starting with %s", (input, expected) => {
    const csv = toCsv(["Name"], [[input]]);
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toBe(expected);
    expect(/^[=+\-@]/.test(dataLine)).toBe(false);
  });

  it("leaves an ordinary name untouched", () => {
    const csv = toCsv(["Name"], [["Priya Sharma"]]);
    expect(csv.split("\n")[1]).toBe("Priya Sharma");
  });

  it("leaves a normal negative number or hyphenated word alone in spirit but still neutralizes a leading hyphen", () => {
    // A leading "-" is still ambiguous with a formula in Excel, so the
    // mitigation applies uniformly — this documents the (safe) trade-off.
    const csv = toCsv(["Amount"], [["-42"]]);
    expect(csv.split("\n")[1]).toBe("'-42");
  });

  it("still quotes cells containing commas or quotes after neutralizing a leading formula character", () => {
    const csv = toCsv(["Name"], [['=A,B"C']]);
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toBe(`"'=A,B""C"`);
  });

  it("handles null/undefined cells without throwing", () => {
    const csv = toCsv(["A", "B"], [[null, undefined]]);
    expect(csv.split("\n")[1]).toBe(",");
  });
});
