import { describe, expect, it } from "vitest";
import { parseSlicerSummary } from "@/domain/costing/slicer";

describe("parseSlicerSummary", () => {
  it("reads Bambu Studio / OrcaSlicer UI text", () => {
    const r = parseSlicerSummary("Model printing time: 1h30m\nTotal time: 1h 36m\nTotal filament: 48.23 g\nCost: 1.20");
    expect(r.grams).toBe(48.23);
    expect(r.hours).toBeCloseTo(1.6, 4);
  });

  it("reads G-code header comments", () => {
    const r = parseSlicerSummary("; filament used [mm] = 15900.12\n; total filament used [g] = 47.6\n; estimated printing time (normal mode) = 2h 5m 30s");
    expect(r.grams).toBe(47.6);
    expect(r.hours).toBeCloseTo(2 + 5 / 60 + 30 / 3600, 4);
  });

  it("handles days and colon durations", () => {
    expect(parseSlicerSummary("Total time: 1d 2h 30m\nWeight: 812 g").hours).toBeCloseTo(26.5, 4);
    expect(parseSlicerSummary("48 g\n1:36").hours).toBeCloseTo(1.6, 4);
  });

  it("returns nulls for unrelated text", () => {
    expect(parseSlicerSummary("hello world")).toEqual({ grams: null, hours: null });
  });
});
