/**
 * Money helpers.
 *
 * All persisted monetary values are integer **poisha** (1 BDT = 100 poisha) to avoid binary
 * floating-point drift. Intermediate rates (e.g. cost per gram, cost per machine hour) are allowed
 * to be fractional poisha; every reported cost line is rounded half-up to whole poisha exactly once,
 * and totals are the sum of the rounded lines so every breakdown adds up exactly.
 */

export type Poisha = number;

export const POISHA_PER_TAKA = 100;

/** Half-up rounding that is robust to binary representation (e.g. 1.005 → 1.01). */
export function roundHalfUp(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) throw new RangeError(`Cannot round non-finite value: ${value}`);
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  // Nudge by a relative epsilon so values like 2.675 (stored as 2.67499999…) round up as written.
  const rounded = Math.round(scaled * (1 + Number.EPSILON * 4) + Number.EPSILON);
  return (Math.sign(value) * rounded) / factor;
}

/** Round a (possibly fractional) poisha amount to a whole poisha, half-up. */
export function roundPoisha(value: number): Poisha {
  const r = roundHalfUp(value, 0);
  return r === 0 ? 0 : r; // normalise -0
}

/** Round poisha to the nearest whole taka (customer-facing line items). */
export function roundToTaka(poisha: number): Poisha {
  return roundPoisha(roundHalfUp(poisha / POISHA_PER_TAKA) * POISHA_PER_TAKA);
}

/** Convert a taka amount (as typed by a user, e.g. 12.5) to integer poisha. */
export function takaToPoisha(taka: number): Poisha {
  return roundPoisha(taka * POISHA_PER_TAKA);
}

export function poishaToTaka(poisha: Poisha): number {
  return poisha / POISHA_PER_TAKA;
}

/** Allowed BDT price rounding steps (in taka). 0 = round up to the next whole poisha only. */
export const ROUNDING_STEPS = [0, 1, 5, 10, 50, 100] as const;
export type RoundingStep = (typeof ROUNDING_STEPS)[number];

/**
 * Round a price UP to the nearest step (in taka). Rounding is always upward so a rounded price
 * can never fall below the computed requirement it was derived from.
 */
export function roundUpToStep(poisha: number, stepTaka: RoundingStep): Poisha {
  if (!Number.isFinite(poisha)) throw new RangeError("Cannot round a non-finite price");
  // Remove sub-poisha float noise before ceiling (e.g. 1000.0000000002 → 1000).
  const clean = roundHalfUp(poisha, 6);
  if (stepTaka === 0) return Math.ceil(clean);
  const step = stepTaka * POISHA_PER_TAKA;
  return Math.ceil(clean / step) * step;
}

/** Round a price to the NEAREST step (used only for display ranges, never for floors). */
export function roundToNearestStep(poisha: number, stepTaka: RoundingStep): Poisha {
  if (stepTaka === 0) return roundPoisha(poisha);
  const step = stepTaka * POISHA_PER_TAKA;
  return roundHalfUp(poisha / step) * step;
}

const groupFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format poisha as Bangladeshi taka using South-Asian digit grouping (৳1,25,000).
 * Whole-taka amounts are shown without decimals unless `decimals` is forced.
 */
export function formatBDT(poisha: number, opts: { decimals?: boolean | "auto" } = {}): string {
  const mode = opts.decimals ?? "auto";
  const p = roundPoisha(poisha);
  const negative = p < 0;
  const abs = Math.abs(p);
  const showDecimals = mode === true || (mode === "auto" && abs % 100 !== 0);
  const body = showDecimals ? decimalFormatter.format(abs / 100) : groupFormatter.format(abs / 100);
  return `${negative ? "−" : ""}৳${body}`;
}

/** Format a fractional-poisha rate such as cost per gram (৳2.4583/g). */
export function formatRate(poisha: number, unit: string, fractionDigits = 2): string {
  const taka = poisha / 100;
  return `৳${taka.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}/${unit}`;
}

export function formatPercent(ratio: number, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
