"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { issuesToFieldErrors } from "@/domain/costing/schemas";
import { takaToPoisha } from "@/domain/money";
import { requireAdmin } from "../auth/session";
import { fdBool, fdJson, fdNum, fdPct, fdStr, fdTaka, type ActionState } from "../form-data";
import { saveSetting, type SettingKey } from "../settings";

type Rows = Record<string, unknown>[];
const rows = (fd: FormData, k: string): Rows => fdJson<Rows>(fd, k) ?? [];
/** Row value in taka → poisha (NaN if missing so validation catches it). */
const rTaka = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? takaToPoisha(v) : Number.NaN);
/** Row value in percent → fraction. */
const rPct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v / 100 : Number.NaN);
const rNum = (v: unknown) => (typeof v === "number" ? v : v === "" || v === undefined ? Number.NaN : Number(v));
const rStr = (v: unknown) => (typeof v === "string" ? v : String(v ?? ""));

async function persist(key: SettingKey, value: unknown, paths: string[]): Promise<ActionState> {
  try {
    await saveSetting(key, value);
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, errors: issuesToFieldErrors(e), message: "Please fix the highlighted fields." };
    throw e;
  }
  for (const p of paths) revalidatePath(p, "layout");
  return { ok: true, message: "Settings saved." };
}

/* ------------------------------------------------------------------ Costing */

export async function saveCostingSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const value = {
    laborRatePerHour: fdTaka(fd, "laborRatePerHour"),
    designRatePerHour: fdTaka(fd, "designRatePerHour"),
    overhead: {
      method: fdStr(fd, "overhead.method"),
      items: rows(fd, "overhead.items").map((r, i) => ({
        id: rStr(r.id) || `item-${i}-${Date.now().toString(36)}`,
        label: rStr(r.label),
        category: rStr(r.category),
        monthlyAmount: rTaka(r.monthlyAmount),
        included: !!r.included,
      })),
      monthlyMachineHours: fdNum(fd, "overhead.monthlyMachineHours"),
      monthlyLaborHours: fdNum(fd, "overhead.monthlyLaborHours"),
      monthlyProductionUnits: fdNum(fd, "overhead.monthlyProductionUnits"),
    },
    defaultFailureConsumption: fdPct(fd, "defaultFailureConsumption"),
    pricing: {
      targetMargin: fdPct(fd, "pricing.targetMargin"),
      premiumMargin: fdPct(fd, "pricing.premiumMargin"),
      lowMarginThreshold: fdPct(fd, "pricing.lowMarginThreshold"),
      percentFees: rows(fd, "pricing.percentFees").map((r) => ({ label: rStr(r.label), rate: rPct(r.rate) })),
      fixedFeePerOrder: fdTaka(fd, "pricing.fixedFeePerOrder"),
      tax: { mode: fdStr(fd, "pricing.tax.mode"), rate: fdPct(fd, "pricing.tax.rate"), label: fdStr(fd, "pricing.tax.label") || "VAT" },
      roundingStep: fdNum(fd, "pricing.roundingStep"),
      premium: {
        personalizationMinutesPerItem: fdNum(fd, "pricing.premium.personalizationMinutesPerItem"),
        smallOrderThreshold: fdNum(fd, "pricing.premium.smallOrderThreshold"),
        smallOrderFee: fdTaka(fd, "pricing.premium.smallOrderFee"),
        rushFeePerMachineHour: fdTaka(fd, "pricing.premium.rushFeePerMachineHour"),
      },
    },
  };
  return persist("costing", value, ["/admin"]);
}

/* ------------------------------------------------------------------ Estimators */

export async function saveEstimatorCommon(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const value = {
    materials: rows(fd, "materials").map((r) => ({
      key: rStr(r.key),
      label: rStr(r.label),
      description: rStr(r.description),
      density: rNum(r.density),
      surchargePct: rPct(r.surchargePct),
      active: !!r.active,
    })),
    colors: rows(fd, "colors").map((r) => ({ key: rStr(r.key), label: rStr(r.label), hex: rStr(r.hex) })),
    quantityTiers: rows(fd, "quantityTiers").map((r) => ({ minQty: rNum(r.minQty), discountPct: rPct(r.discountPct) })),
    roundingStep: fdNum(fd, "roundingStep"),
    range: { lowPct: fdPct(fd, "range.lowPct"), highPct: fdPct(fd, "range.highPct"), reviewHighPct: fdPct(fd, "range.reviewHighPct") },
    rushPct: fdPct(fd, "rushPct"),
    rushMinimumFee: fdTaka(fd, "rushMinimumFee"),
    leadTimeDays: { min: fdNum(fd, "leadTimeDays.min"), max: fdNum(fd, "leadTimeDays.max") },
    rushLeadTimeDays: { min: fdNum(fd, "rushLeadTimeDays.min"), max: fdNum(fd, "rushLeadTimeDays.max") },
    solidityFactor: fdPct(fd, "solidityFactor"),
    maxUploadMb: fdNum(fd, "maxUploadMb"),
  };
  return persist("estimator.common", value, ["/"]);
}

const range = (fd: FormData, k: string) => ({ min: fdNum(fd, `${k}.min`), max: fdNum(fd, `${k}.max`) });
const floor = (fd: FormData) => ({ perUnit: fdTaka(fd, "floor.perUnit"), perGram: fdTaka(fd, "floor.perGram"), perHour: fdTaka(fd, "floor.perHour") });

export async function saveKeychainConfig(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const value = {
    types: rows(fd, "types").map((r) => ({
      key: rStr(r.key),
      label: rStr(r.label),
      description: rStr(r.description),
      basePrice: rTaka(r.basePrice),
      fillFactor: rPct(r.fillFactor),
      needsReview: !!r.needsReview,
      requiresDesignFee: !!r.requiresDesignFee,
    })),
    limits: {
      width: range(fd, "limits.width"),
      height: range(fd, "limits.height"),
      thickness: range(fd, "limits.thickness"),
      maxTextLength: fdNum(fd, "limits.maxTextLength"),
      maxColors: fdNum(fd, "limits.maxColors"),
      maxQuantity: fdNum(fd, "limits.maxQuantity"),
    },
    includedGrams: fdNum(fd, "includedGrams"),
    pricePerExtraGram: fdTaka(fd, "pricePerExtraGram"),
    includedCharacters: fdNum(fd, "includedCharacters"),
    pricePerExtraCharacter: fdTaka(fd, "pricePerExtraCharacter"),
    extraColorCharge: fdTaka(fd, "extraColorCharge"),
    doubleSidedFee: fdTaka(fd, "doubleSidedFee"),
    personalizationFee: fdTaka(fd, "personalizationFee"),
    designFee: fdTaka(fd, "designFee"),
    minimumOrderPrice: fdTaka(fd, "minimumOrderPrice"),
    hardware: rows(fd, "hardware").map((r) => ({ key: rStr(r.key), label: rStr(r.label), price: rTaka(r.price) })),
    gramsPerHour: fdNum(fd, "gramsPerHour"),
    floor: floor(fd),
  };
  return persist("estimator.keychain", value, ["/"]);
}

export async function saveOrganizerConfig(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const feature = (k: string) => ({ grams: fdNum(fd, `features.${k}.grams`), hours: fdNum(fd, `features.${k}.hours`), price: fdTaka(fd, `features.${k}.price`) });
  const value = {
    limits: {
      width: range(fd, "limits.width"),
      length: range(fd, "limits.length"),
      height: range(fd, "limits.height"),
      maxCompartments: fdNum(fd, "limits.maxCompartments"),
      maxPenHolders: fdNum(fd, "limits.maxPenHolders"),
      maxDrawers: fdNum(fd, "limits.maxDrawers"),
      maxColors: fdNum(fd, "limits.maxColors"),
      maxQuantity: fdNum(fd, "limits.maxQuantity"),
    },
    geometry: {
      wallMm: fdNum(fd, "geometry.wallMm"),
      baseMm: fdNum(fd, "geometry.baseMm"),
      dividerHeightFactor: fdPct(fd, "geometry.dividerHeightFactor"),
      solidity: fdPct(fd, "geometry.solidity"),
    },
    gramsPerHour: fdNum(fd, "gramsPerHour"),
    pricePerGram: fdTaka(fd, "pricePerGram"),
    pricePerPrintHour: fdTaka(fd, "pricePerPrintHour"),
    baseDesignFee: fdTaka(fd, "baseDesignFee"),
    designAssistanceFee: fdTaka(fd, "designAssistanceFee"),
    compartmentFee: fdTaka(fd, "compartmentFee"),
    extraColorCharge: fdTaka(fd, "extraColorCharge"),
    features: { penHolder: feature("penHolder"), phoneStand: feature("phoneStand"), drawer: feature("drawer"), cableManagement: feature("cableManagement") },
    assemblyFeePerUnit: fdTaka(fd, "assemblyFeePerUnit"),
    customTextFee: fdTaka(fd, "customTextFee"),
    customLogoFee: fdTaka(fd, "customLogoFee"),
    minimumOrderPrice: fdTaka(fd, "minimumOrderPrice"),
    presets: rows(fd, "presets").map((r) => ({
      key: rStr(r.key),
      name: rStr(r.name),
      description: rStr(r.description),
      width: rNum(r.width),
      length: rNum(r.length),
      height: rNum(r.height),
      compartments: rNum(r.compartments),
      penHolders: rNum(r.penHolders),
      phoneStand: !!r.phoneStand,
      drawers: rNum(r.drawers),
      cableManagement: !!r.cableManagement,
    })),
    floor: floor(fd),
  };
  return persist("estimator.organizer", value, ["/"]);
}

/* ------------------------------------------------------------------ Site */

export async function saveBusiness(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const keys = ["name", "tagline", "email", "phone", "whatsapp", "facebookUrl", "instagramUrl", "address", "serviceArea", "hours"] as const;
  return persist("business", Object.fromEntries(keys.map((k) => [k, fdStr(fd, k)])), ["/"]);
}

export async function saveLanding(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const keys = ["heroEyebrow", "heroHeadline", "heroSubheadline", "servicesIntro", "aboutTitle", "aboutBody", "estimateDisclaimer"] as const;
  return persist("landing", { ...Object.fromEntries(keys.map((k) => [k, fdStr(fd, k)])), showSampleNotice: fdBool(fd, "showSampleNotice") }, ["/"]);
}
