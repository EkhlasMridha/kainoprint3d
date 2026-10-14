import { describe, expect, it } from "vitest";
import { estimateCatalogProduct, type CatalogPricing } from "@/domain/estimator/catalog";
import { DEFAULT_ESTIMATOR_COMMON as common, DEFAULT_KEYCHAIN_CONFIG as kc, DEFAULT_ORGANIZER_CONFIG as oc } from "@/domain/estimator/defaults";
import { estimateKeychain, keychainGrams } from "@/domain/estimator/keychain";
import { estimateOrganizer, organizerShellGrams } from "@/domain/estimator/organizer";
import { applyQuantityDiscount, discountFor } from "@/domain/estimator/quantity";

const keychain = (over: Record<string, unknown> = {}) => ({
  type: "text",
  text: "Nusrat",
  width: 50,
  height: 20,
  thickness: 4,
  colors: 2,
  material: "pla",
  hardware: "split_ring",
  doubleSided: false,
  quantity: 1,
  designAssistance: false,
  rush: false,
  ...over,
});

const organizer = (over: Record<string, unknown> = {}) => ({
  preset: "minimal",
  width: 160,
  length: 100,
  height: 50,
  compartments: 3,
  penHolders: 0,
  phoneStand: false,
  drawers: 0,
  cableManagement: false,
  material: "pla",
  colors: 1,
  quantity: 1,
  customization: "none",
  customText: "",
  designAssistance: false,
  ...over,
});

describe("quantity discounts", () => {
  const tiers = [
    { minQty: 10, discountPct: 0.1 },
    { minQty: 50, discountPct: 0.2 },
  ];

  it("selects the highest reached tier", () => {
    expect(discountFor(9, tiers)).toBe(0);
    expect(discountFor(10, tiers)).toBe(0.1);
    expect(discountFor(75, tiers)).toBe(0.2);
  });

  it("never discounts below the minimum sustainable price", () => {
    const d = applyQuantityDiscount(100_00, 50, tiers, 90_00);
    expect(d.unit).toBe(90_00); // 20% would give ৳80
    expect(d.floorApplied).toBe(true);
    const ok = applyQuantityDiscount(100_00, 50, tiers, 70_00);
    expect(ok.unit).toBe(80_00);
    expect(ok.floorApplied).toBe(false);
  });

  it("raises a list price that is configured below the floor", () => {
    const d = applyQuantityDiscount(50_00, 1, tiers, 60_00);
    expect(d.unit).toBe(60_00);
    expect(d.listUnit).toBe(60_00);
  });
});

describe("keychain estimator", () => {
  it("approximates weight from size, fill factor, solidity and density", () => {
    // 50 × 20 × 4 mm × 0.55 fill = 2.2 cm³ × 0.75 × 1.24 g/cm³ = 2.046 g
    expect(keychainGrams({ type: "text", width: 50, height: 20, thickness: 4, material: "pla" }, kc, common)).toBe(2);
  });

  it("returns a priced, itemised estimate", () => {
    const r = estimateKeychain(keychain(), kc, common);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const e = r.estimate;
    // base ৳120 + 1 extra colour ৳30 = ৳150, above the ৳150 minimum order
    expect(e.unitPrice).toBe(150_00);
    expect(e.total).toBe(150_00);
    expect(e.low).toBeLessThanOrEqual(e.total);
    expect(e.high).toBeGreaterThanOrEqual(e.total);
    expect(e.needsReview).toBe(false);
  });

  it("charges extra characters beyond the included count", () => {
    const r = estimateKeychain(keychain({ text: "Mohammad Rahman", colors: 1 }), kc, common);
    if (!r.ok) throw new Error("expected ok");
    expect(r.estimate.lines.some((l) => /extra character/.test(l.label) && l.amount === 6 * 500)).toBe(true);
  });

  it("marks logos as preliminary and adds the one-time design fee", () => {
    const r = estimateKeychain(keychain({ type: "logo", text: "" }), kc, common);
    if (!r.ok) throw new Error("expected ok");
    expect(r.estimate.needsReview).toBe(true);
    expect(r.estimate.lines.some((l) => l.scope === "order" && l.amount === kc.designFee)).toBe(true);
    expect(r.estimate.notes.join(" ")).toMatch(/preliminary/);
  });

  it("applies quantity discounts without dropping below the cost floor", () => {
    const r = estimateKeychain(keychain({ quantity: 100, colors: 1 }), kc, common);
    if (!r.ok) throw new Error("expected ok");
    const floorUnit = kc.floor.perUnit + r.estimate.approxGrams * kc.floor.perGram + (r.estimate.approxGrams / kc.gramsPerHour) * kc.floor.perHour;
    expect(r.estimate.unitPrice).toBeGreaterThanOrEqual(Math.ceil(floorUnit));
    expect(r.estimate.unitPrice).toBeLessThan(120_00);
  });

  it("enforces the minimum order price", () => {
    const r = estimateKeychain(keychain({ colors: 1 }), kc, common);
    if (!r.ok) throw new Error("expected ok");
    expect(r.estimate.total).toBe(kc.minimumOrderPrice);
  });

  it("enforces size, colour, text and quantity limits", () => {
    const tooWide = estimateKeychain(keychain({ width: 500 }), kc, common);
    expect(tooWide.ok).toBe(false);
    if (!tooWide.ok) expect(tooWide.errors.width).toMatch(/at most/);
    expect(estimateKeychain(keychain({ thickness: 0 }), kc, common).ok).toBe(false);
    expect(estimateKeychain(keychain({ colors: 9 }), kc, common).ok).toBe(false);
    expect(estimateKeychain(keychain({ text: "" }), kc, common).ok).toBe(false);
    expect(estimateKeychain(keychain({ quantity: 0 }), kc, common).ok).toBe(false);
    expect(estimateKeychain(keychain({ quantity: 100000 }), kc, common).ok).toBe(false);
    expect(estimateKeychain(keychain({ material: "unobtainium" }), kc, common).ok).toBe(false);
    expect(estimateKeychain({ nonsense: true }, kc, common).ok).toBe(false);
    expect(estimateKeychain(keychain({ width: "50" }), kc, common).ok).toBe(false);
  });

  it("rush adds a fee and shortens lead time", () => {
    const r = estimateKeychain(keychain({ rush: true, quantity: 5 }), kc, common);
    if (!r.ok) throw new Error("expected ok");
    expect(r.estimate.lines.some((l) => /Rush/.test(l.label))).toBe(true);
    expect(r.estimate.leadTimeDays).toEqual(common.rushLeadTimeDays);
  });
});

describe("desk organizer estimator", () => {
  it("material scales with surface area, not volume", () => {
    const small = organizerShellGrams({ width: 100, length: 100, height: 50, compartments: 1 }, oc, 1.24);
    const big = organizerShellGrams({ width: 200, length: 200, height: 100, compartments: 1 }, oc, 1.24);
    expect(big / small).toBeCloseTo(4, 5); // 2× every dimension → 4× material, not 8×
  });

  it("waives the setup fee for an unchanged preset", () => {
    const preset = estimateOrganizer(organizer(), oc, common);
    const custom = estimateOrganizer(organizer({ width: 170 }), oc, common);
    if (!preset.ok || !custom.ok) throw new Error("expected ok");
    expect(preset.estimate.lines.some((l) => /setup/.test(l.label))).toBe(false);
    expect(custom.estimate.lines.some((l) => /setup/.test(l.label))).toBe(true);
  });

  it("adds feature prices and flags drawers for review", () => {
    const r = estimateOrganizer(organizer({ preset: undefined, drawers: 1, phoneStand: true }), oc, common);
    if (!r.ok) throw new Error("expected ok");
    expect(r.estimate.lines.some((l) => l.label === "Phone stand")).toBe(true);
    expect(r.estimate.lines.some((l) => /drawer/.test(l.label))).toBe(true);
    expect(r.estimate.needsReview).toBe(true);
  });

  it("validates dimensions against the printable size", () => {
    const r = estimateOrganizer(organizer({ width: 400 }), oc, common);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.width).toMatch(/at most 250/);
    expect(estimateOrganizer(organizer({ height: 10 }), oc, common).ok).toBe(false);
    expect(estimateOrganizer(organizer({ compartments: 0 }), oc, common).ok).toBe(false);
    expect(estimateOrganizer(organizer({ compartments: 13 }), oc, common).ok).toBe(false);
    expect(estimateOrganizer(organizer({ customization: "text", customText: "" }), oc, common).ok).toBe(false);
  });

  it("every preset produces a valid estimate", () => {
    for (const p of oc.presets) {
      const r = estimateOrganizer(organizer({ ...p, preset: p.key }), oc, common);
      expect(r.ok, p.key).toBe(true);
    }
  });
});

describe("catalog product estimator", () => {
  const product: CatalogPricing = {
    name: "Name keychain",
    basePrice: 150_00,
    minUnitPrice: 120_00,
    sizeOptions: [
      { key: "s", label: "Small", dimensions: "40 mm", priceDelta: 0 },
      { key: "l", label: "Large", dimensions: "60 mm", priceDelta: 30_00 },
    ],
    materialOptions: [],
    colors: ["Black", "White"],
    personalization: [{ key: "name", label: "Name", type: "text", maxLength: 12, options: [], required: true, price: 0 }],
    allowQuantityDiscount: true,
    leadTimeMinDays: 2,
    leadTimeMaxDays: 4,
    maxQuantity: 200,
  };

  it("prices the selected options", () => {
    const r = estimateCatalogProduct({ size: "l", color: "Black", personalization: { name: "Rafi" }, quantity: 2 }, product, common);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.estimate.unitPrice).toBe(180_00);
    expect(r.estimate.total).toBe(360_00);
  });

  it("floors bulk discounts at the product minimum unit price", () => {
    const r = estimateCatalogProduct({ size: "s", color: "Black", personalization: { name: "Rafi" }, quantity: 100 }, product, common);
    if (!r.ok) throw new Error("expected ok");
    expect(r.estimate.unitPrice).toBe(120_00); // 20% off ৳150 would be ৳120 — exactly the floor
    const r2 = estimateCatalogProduct({ size: "s", color: "Black", personalization: { name: "Rafi" }, quantity: 100 }, { ...product, minUnitPrice: 130_00 }, common);
    if (!r2.ok) throw new Error("expected ok");
    expect(r2.estimate.unitPrice).toBe(130_00);
  });

  it("validates required personalisation and options", () => {
    const r = estimateCatalogProduct({ size: "x", color: "Purple", personalization: {}, quantity: 1 }, product, common);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.size).toBeDefined();
      expect(r.errors.color).toBeDefined();
      expect(r.errors["personalization.name"]).toBeDefined();
    }
  });
});
