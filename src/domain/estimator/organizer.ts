import { z } from "zod";
import { formatPercent, roundHalfUp, roundToTaka } from "../money";
import { issuesToFieldErrors } from "../costing/schemas";
import { applyQuantityDiscount, finalizeRange, leadTime } from "./quantity";
import type { EstimateLine, EstimateOutcome, EstimatorCommonConfig, OrganizerConfig } from "./types";

export function organizerInputSchema(cfg: OrganizerConfig, common: EstimatorCommonConfig) {
  const L = cfg.limits;
  const between = (label: string, r: { min: number; max: number }) =>
    z
      .number({ invalid_type_error: `Enter the ${label.toLowerCase()}` })
      .min(r.min, `${label} must be at least ${r.min} mm`)
      .max(r.max, `${label} can be at most ${r.max} mm (largest single print)`);
  const count = (label: string, max: number, min = 0) =>
    z.number().int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `Up to ${max} ${label.toLowerCase()}`);
  return z.object({
    preset: z.string().max(40).optional(),
    width: between("Width", L.width),
    length: between("Length", L.length),
    height: between("Height", L.height),
    compartments: count("Compartments", L.maxCompartments, 1),
    penHolders: count("Pen holders", L.maxPenHolders),
    phoneStand: z.boolean(),
    drawers: count("Drawers", L.maxDrawers),
    cableManagement: z.boolean(),
    material: z.string().refine((k) => common.materials.some((m) => m.key === k && m.active), "Choose an available material"),
    colors: count("Colours", L.maxColors, 1),
    palette: z.array(z.string().refine((k) => common.colors.some((c) => c.key === k), "Unknown colour")).max(L.maxColors).default([]),
    quantity: z.number().int("Quantity must be a whole number").min(1, "At least 1").max(L.maxQuantity, `For more than ${L.maxQuantity} pieces, please request a quote`),
    customization: z.enum(["none", "text", "logo"]),
    customText: z.string().trim().max(40, "Keep the text to 40 characters").default(""),
    designAssistance: z.boolean(),
  }).superRefine((v, ctx) => {
    if (v.customization === "text" && !v.customText) {
      ctx.addIssue({ code: "custom", path: ["customText"], message: "Enter the text to add" });
    }
  });
}

export type OrganizerInput = z.infer<ReturnType<typeof organizerInputSchema>>;

/**
 * Shell-based weight approximation. Material grows with surface area (base + walls + dividers),
 * not with the enclosed volume, so doubling every dimension does NOT multiply material by eight.
 *   base      = W × L × base thickness
 *   walls     = 2 (W + L) × H × wall thickness
 *   dividers  = ((cols − 1) × L + (rows − 1) × W) × H × divider factor × wall thickness
 * Compartments are laid out in a near-square grid (cols = ⌈√n⌉, rows = ⌈n / cols⌉).
 */
export function organizerShellGrams(
  v: Pick<OrganizerInput, "width" | "length" | "height" | "compartments">,
  cfg: OrganizerConfig,
  density: number,
): number {
  const g = cfg.geometry;
  const cols = Math.ceil(Math.sqrt(v.compartments));
  const rows = Math.ceil(v.compartments / cols);
  const base = v.width * v.length * g.baseMm;
  const walls = 2 * (v.width + v.length) * v.height * g.wallMm;
  const dividers = ((cols - 1) * v.length + (rows - 1) * v.width) * v.height * g.dividerHeightFactor * g.wallMm;
  return ((base + walls + dividers) / 1000) * g.solidity * density;
}

export function estimateOrganizer(input: unknown, cfg: OrganizerConfig, common: EstimatorCommonConfig): EstimateOutcome {
  const parsed = organizerInputSchema(cfg, common).safeParse(input);
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const v = parsed.data;
  const mat = common.materials.find((m) => m.key === v.material)!;
  const f = cfg.features;

  const shellGrams = organizerShellGrams(v, cfg, mat.density);
  const featureGrams =
    v.penHolders * f.penHolder.grams +
    (v.phoneStand ? f.phoneStand.grams : 0) +
    v.drawers * f.drawer.grams +
    (v.cableManagement ? f.cableManagement.grams : 0);
  const grams = roundHalfUp(shellGrams + featureGrams, 0);
  const featureHours =
    v.penHolders * f.penHolder.hours +
    (v.phoneStand ? f.phoneStand.hours : 0) +
    v.drawers * f.drawer.hours +
    (v.cableManagement ? f.cableManagement.hours : 0);
  const hours = (cfg.gramsPerHour > 0 ? shellGrams / cfg.gramsPerHour : 0) + featureHours;

  const unitLines: EstimateLine[] = [
    { label: `Organizer body (~${roundHalfUp(shellGrams, 0)} g)`, amount: roundToTaka(shellGrams * cfg.pricePerGram), scope: "unit" },
    { label: `Printing time (~${roundHalfUp(hours, 1)} h)`, amount: roundToTaka(hours * cfg.pricePerPrintHour), scope: "unit" },
  ];
  if (v.compartments > 1) unitLines.push({ label: `${v.compartments} compartments`, amount: (v.compartments - 1) * cfg.compartmentFee, scope: "unit" });
  if (v.penHolders > 0) unitLines.push({ label: `${v.penHolders} pen holder(s)`, amount: v.penHolders * f.penHolder.price, scope: "unit" });
  if (v.phoneStand) unitLines.push({ label: "Phone stand", amount: f.phoneStand.price, scope: "unit" });
  if (v.drawers > 0) {
    unitLines.push({ label: `${v.drawers} drawer(s)`, amount: v.drawers * f.drawer.price, scope: "unit" });
    if (cfg.assemblyFeePerUnit > 0) unitLines.push({ label: "Assembly & finishing", amount: cfg.assemblyFeePerUnit, scope: "unit" });
  }
  if (v.cableManagement) unitLines.push({ label: "Cable management", amount: f.cableManagement.price, scope: "unit" });
  if (v.colors > 1) unitLines.push({ label: `${v.colors - 1} extra colour(s)`, amount: (v.colors - 1) * cfg.extraColorCharge, scope: "unit" });
  if (v.customization === "text") unitLines.push({ label: "Custom text", amount: cfg.customTextFee, scope: "unit" });
  if (v.customization === "logo") unitLines.push({ label: "Custom logo", amount: cfg.customLogoFee, scope: "unit" });

  const subtotal = unitLines.reduce((s, l) => s + l.amount, 0);
  if (mat.surchargePct > 0) {
    unitLines.push({ label: `${mat.label} material (+${formatPercent(mat.surchargePct, 0)})`, amount: roundToTaka(subtotal * mat.surchargePct), scope: "unit" });
  }
  const unitBeforeDiscount = unitLines.reduce((s, l) => s + l.amount, 0);
  const floorUnit = cfg.floor.perUnit + grams * cfg.floor.perGram + hours * cfg.floor.perHour;
  const d = applyQuantityDiscount(unitBeforeDiscount, v.quantity, common.quantityTiers, floorUnit);

  const notes: string[] = [];
  if (d.listUnit > unitBeforeDiscount) unitLines.push({ label: "Minimum price adjustment", amount: d.listUnit - unitBeforeDiscount, scope: "unit" });
  if (d.discountAmount > 0) unitLines.push({ label: `Quantity discount (${formatPercent(d.discountPct, 0)})`, amount: -d.discountAmount, scope: "unit" });
  if (d.floorApplied && d.discountPct > 0) notes.push("The quantity discount is limited so the price still covers production costs.");

  const preset = cfg.presets.find((p) => p.key === v.preset);
  const isUnchangedPreset =
    !!preset &&
    preset.width === v.width &&
    preset.length === v.length &&
    preset.height === v.height &&
    preset.compartments === v.compartments &&
    preset.penHolders === v.penHolders &&
    preset.phoneStand === v.phoneStand &&
    preset.drawers === v.drawers &&
    preset.cableManagement === v.cableManagement;

  const orderLines: EstimateLine[] = [];
  if (!isUnchangedPreset && cfg.baseDesignFee > 0) orderLines.push({ label: "Custom size setup (one-time)", amount: cfg.baseDesignFee, scope: "order" });
  if (v.designAssistance && cfg.designAssistanceFee > 0) orderLines.push({ label: "Design assistance (one-time)", amount: cfg.designAssistanceFee, scope: "order" });

  const raw = d.unit * v.quantity + orderLines.reduce((s, l) => s + l.amount, 0);
  const needsReview = v.customization === "logo" || v.drawers > 0 || v.designAssistance;
  if (raw < cfg.minimumOrderPrice) notes.push("Small orders are charged the minimum order price.");
  const range = finalizeRange(raw, cfg.minimumOrderPrice, floorUnit * v.quantity, needsReview, common);

  if (isUnchangedPreset) notes.push(`Based on our "${preset!.name}" design — no custom setup fee.`);
  if (needsReview) notes.push("Drawers, logos and design help need a quick review before we confirm the final price.");
  notes.push(`Approximately ${grams} g of ${mat.label} and ${roundHalfUp(hours, 1)} printing hours per organizer.`);

  return {
    ok: true,
    estimate: {
      unitPrice: d.unit,
      quantity: v.quantity,
      total: range.total,
      low: range.low,
      high: range.high,
      lines: [...unitLines, ...orderLines],
      needsReview,
      notes,
      approxGrams: grams,
      leadTimeDays: leadTime(common, false),
    },
  };
}
