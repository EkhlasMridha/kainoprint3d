import { describe, expect, it } from "vitest";
import { formatBDT, roundHalfUp, roundPoisha, roundToNearestStep, roundUpToStep, takaToPoisha } from "@/domain/money";

describe("money", () => {
  it("rounds half-up despite binary representation", () => {
    expect(roundHalfUp(1.005, 2)).toBe(1.01);
    expect(roundHalfUp(2.675, 2)).toBe(2.68);
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(-0.5)).toBe(-1);
    expect(roundPoisha(3306.6666)).toBe(3307);
  });

  it("converts taka to integer poisha without drift", () => {
    expect(takaToPoisha(0.1 + 0.2)).toBe(30);
    expect(takaToPoisha(19.99)).toBe(1999);
    expect(takaToPoisha(1234.565)).toBe(123457);
  });

  it("rounds prices UP to BDT steps", () => {
    expect(roundUpToStep(15804.5, 0)).toBe(15805);
    expect(roundUpToStep(15804.5, 1)).toBe(15900);
    expect(roundUpToStep(15804.5, 5)).toBe(16000);
    expect(roundUpToStep(15804.5, 10)).toBe(16000);
    expect(roundUpToStep(15804.5, 50)).toBe(20000);
    expect(roundUpToStep(15000, 50)).toBe(15000); // exact multiples stay put
    expect(roundUpToStep(15000.0000000002, 5)).toBe(15000); // float noise does not bump a step
  });

  it("rounds to the nearest step for display ranges", () => {
    expect(roundToNearestStep(15240, 5)).toBe(15000);
    expect(roundToNearestStep(15260, 5)).toBe(15500);
  });

  it("formats BDT with South Asian grouping", () => {
    expect(formatBDT(12_500_000)).toBe("৳1,25,000");
    expect(formatBDT(15805)).toBe("৳158.05");
    expect(formatBDT(-500)).toBe("−৳5");
  });
});
