import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/domain/csv";

describe("CSV export", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvCell('He said "hi", then left')).toBe('"He said ""hi"", then left"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("neutralises spreadsheet formulas from customer-supplied text", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+880171")).toBe("'+880171");
    expect(csvCell(-5)).toBe("-5"); // real numbers stay numeric
  });

  it("adds a UTF-8 BOM for Excel", () => {
    expect(toCsv([["৳", 1]]).startsWith("﻿৳,1")).toBe(true);
  });
});
