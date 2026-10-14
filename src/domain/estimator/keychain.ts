import { z } from "zod";
import { formatPercent, roundHalfUp, roundToTaka } from "../money";
import { issuesToFieldErrors } from "../costing/schemas";
import { applyQuantityDiscount, finalizeRange, leadTime } from "./quantity";
import type { EstimateLine, EstimateOutcome, EstimatorCommonConfig, KeychainConfig } from "./types";

export function keychainInputSchema(cfg: KeychainConfig, common: EstimatorCommonConfig) {
  const L = cfg.limits;
  const between = (label: string, r: { min: number; max: number }, unit = "mm") =>
    z
      .number({ invalid_type_error: `Enter the ${label.toLowerCase()}` })
      .min(r.min, `${label} must be at least ${r.min} ${unit}`)
      .max(r.max, `${label} can be at most ${r.max} ${unit}`);
  return z
    .object({
      type: z.enum(["text", "logo", "shape", "custom"]),
      text: z.string().trim().max(L.maxTextLength, `Keep the text to ${L.maxTextLength} characters`).default(""),
      width: between("Width", L.width),
      height: between("Height", L.height),
      thickness: between("Thickness", L.thickness),
      colors: z.number().int().min(1, "At least one colour").max(L.maxColors, `Up to ${L.maxColors} colours`),
      /** Chosen colour keys (informational; the price depends only on the colour count). */
      palette: z.array(z.string().refine((k) => common.colors.some((c) => c.key === k), "Unknown colour")).max(L.maxColors).default([]),
      material: z.string().refine((k) => common.materials.some((m) => m.key === k && m.active), "Choose an available material"),
      hardware: z.string().refine((k) => cfg.hardware.some((h) => h.key === k), "Choose a ring option"),
      doubleSided: z.boolean(),
      quantity: z.number().int("Quantity must be a whole number").min(1, "At least 1").max(L.maxQuantity, `For more than ${L.maxQuantity} pieces, please request a quote`),
      designAssistance: z.boolean(),
      rush: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.type === "text" && v.text.replace(/\s/g, "").length === 0) {
        ctx.addIssue({ code: "custom", path: ["text"], message: "Enter the name or text to print" });
      }
    });
}

export type KeychainInput = z.infer<ReturnType<typeof keychainInputSchema>>;

/**
 * Approximate keychain weight: bounding box × fill factor × solidity × density.
 * This is an indicative approximation only; exact usage is known after slicing the real model.
 */
export function keychainGrams(
  input: Pick<KeychainInput, "type" | "width" | "height" | "thickness" | "material">,
  cfg: KeychainConfig,
  common: EstimatorCommonConfig,
): number {
  const type = cfg.types.find((t) => t.key === input.type);
  const mat = common.materials.find((m) => m.key === input.material);
  if (!type || !mat) return 0;
  const volumeCm3 = (input.width * input.height * input.thickness * type.fillFactor) / 1000;
  return roundHalfUp(volumeCm3 * common.solidityFactor * mat.density, 1);
}

export function estimateKeychain(input: unknown, cfg: KeychainConfig, common: EstimatorCommonConfig): EstimateOutcome {
  const parsed = keychainInputSchema(cfg, common).safeParse(input);
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const v = parsed.data;
  const type = cfg.types.find((t) => t.key === v.type)!;
  const mat = common.materials.find((m) => m.key === v.material)!;
  const hw = cfg.hardware.find((h) => h.key === v.hardware)!;

  const grams = keychainGrams(v, cfg, common);
  const unitLines: EstimateLine[] = [{ label: `${type.label} keychain (base)`, amount: type.basePrice, scope: "unit" }];
  const extraGrams = Math.max(0, grams - cfg.includedGrams);
  if (extraGrams > 0) {
    unitLines.push({ label: `Larger size (~${roundHalfUp(extraGrams, 1)} g extra material)`, amount: roundToTaka(extraGrams * cfg.pricePerExtraGram), scope: "unit" });
  }
  if (v.type === "text") {
    if (cfg.personalizationFee > 0) unitLines.push({ label: "Name personalisation", amount: cfg.personalizationFee, scope: "unit" });
    const chars = v.text.replace(/\s/g, "").length;
    const extraChars = Math.max(0, chars - cfg.includedCharacters);
    if (extraChars > 0) {
      unitLines.push({ label: `${extraChars} extra character(s)`, amount: extraChars * cfg.pricePerExtraCharacter, scope: "unit" });
    }
  }
  if (v.colors > 1) unitLines.push({ label: `${v.colors - 1} extra colour(s)`, amount: (v.colors - 1) * cfg.extraColorCharge, scope: "unit" });
  if (v.doubleSided) unitLines.push({ label: "Double-sided design", amount: cfg.doubleSidedFee, scope: "unit" });
  if (hw.price > 0) unitLines.push({ label: hw.label, amount: hw.price, scope: "unit" });

  const subtotal = unitLines.reduce((s, l) => s + l.amount, 0);
  if (mat.surchargePct > 0) {
    unitLines.push({ label: `${mat.label} material (+${formatPercent(mat.surchargePct, 0)})`, amount: roundToTaka(subtotal * mat.surchargePct), scope: "unit" });
  }
  const unitBeforeDiscount = unitLines.reduce((s, l) => s + l.amount, 0);

  const hours = cfg.gramsPerHour > 0 ? grams / cfg.gramsPerHour : 0;
  const floorUnit = cfg.floor.perUnit + grams * cfg.floor.perGram + hours * cfg.floor.perHour;
  const d = applyQuantityDiscount(unitBeforeDiscount, v.quantity, common.quantityTiers, floorUnit);

  const notes: string[] = [];
  const orderLines: EstimateLine[] = [];
  if (d.listUnit > unitBeforeDiscount) {
    unitLines.push({ label: "Minimum price adjustment", amount: d.listUnit - unitBeforeDiscount, scope: "unit" });
  }
  if (d.discountAmount > 0) {
    unitLines.push({ label: `Quantity discount (${formatPercent(d.discountPct, 0)})`, amount: -d.discountAmount, scope: "unit" });
  }
  if (d.floorApplied && d.discountPct > 0) notes.push("The quantity discount is limited so the price still covers production costs.");

  const needsDesign = v.designAssistance || type.requiresDesignFee;
  if (needsDesign && cfg.designFee > 0) orderLines.push({ label: "Design preparation (one-time)", amount: cfg.designFee, scope: "order" });

  let raw = d.unit * v.quantity + orderLines.reduce((s, l) => s + l.amount, 0);
  if (v.rush) {
    const rush = Math.max(roundToTaka(raw * common.rushPct), common.rushMinimumFee);
    orderLines.push({ label: `Rush production (+${formatPercent(common.rushPct, 0)})`, amount: rush, scope: "order" });
    raw += rush;
  }

  const needsReview = type.needsReview;
  if (raw < cfg.minimumOrderPrice) notes.push("Small orders are charged the minimum order price.");
  const range = finalizeRange(raw, cfg.minimumOrderPrice, floorUnit * v.quantity, needsReview, common);
  if (needsReview) {
    notes.push(
      v.type === "logo"
        ? "Logos need a quick design review — this is a preliminary estimate until we have prepared your model."
        : "Custom shapes need a design review — this is a preliminary estimate until the model is prepared and sliced.",
    );
  }
  notes.push(`Approximate weight ~${grams} g in ${mat.label}. The exact amount is confirmed after we prepare your file.`);

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
      leadTimeDays: leadTime(common, v.rush),
    },
  };
}
