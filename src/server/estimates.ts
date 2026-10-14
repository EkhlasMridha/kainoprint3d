import "server-only";
import { estimateCatalogProduct } from "@/domain/estimator/catalog";
import { estimateKeychain, keychainInputSchema, type KeychainInput } from "@/domain/estimator/keychain";
import { estimateOrganizer, organizerInputSchema, type OrganizerInput } from "@/domain/estimator/organizer";
import {
  toPublicCommon,
  toPublicEstimate,
  toPublicKeychain,
  toPublicOrganizer,
  type PublicEstimate,
} from "@/domain/estimator/public";
import { formatBDT } from "@/domain/money";
import type { QuoteSummaryLine } from "@/domain/quote";
import { db } from "./db";
import { toCatalogPricing, toPublicProduct } from "./mappers";
import { getSetting } from "./settings";

/**
 * Public estimate service. Loads the PRIVATE configuration on the server, runs the estimator and
 * returns only whitelisted, customer-facing fields (see toPublicEstimate). Nothing in this module
 * is importable from client components (`server-only`).
 */

export type PublicEstimateResponse = { ok: true; estimate: PublicEstimate } | { ok: false; errors: Record<string, string> };

export async function publicOptions() {
  const [common, keychain, organizer] = await Promise.all([
    getSetting("estimator.common"),
    getSetting("estimator.keychain"),
    getSetting("estimator.organizer"),
  ]);
  return {
    common: toPublicCommon(common),
    keychain: toPublicKeychain(keychain),
    organizer: toPublicOrganizer(organizer),
    minimumOrder: { keychain: keychain.minimumOrderPrice, organizer: organizer.minimumOrderPrice },
  };
}

export async function runPublicEstimate(kind: string, input: unknown, productSlug?: string): Promise<PublicEstimateResponse> {
  const common = await getSetting("estimator.common");
  if (kind === "keychain") {
    const r = estimateKeychain(input, await getSetting("estimator.keychain"), common);
    return r.ok ? { ok: true, estimate: toPublicEstimate(r.estimate) } : r;
  }
  if (kind === "organizer") {
    const r = estimateOrganizer(input, await getSetting("estimator.organizer"), common);
    return r.ok ? { ok: true, estimate: toPublicEstimate(r.estimate) } : r;
  }
  if (kind === "product" && productSlug) {
    const product = await db.product.findFirst({ where: { slug: productSlug, published: true } });
    if (!product) return { ok: false, errors: { _form: "Product not found" } };
    if (product.availability === "unavailable") return { ok: false, errors: { _form: "This product is temporarily unavailable" } };
    const r = estimateCatalogProduct(input, toCatalogPricing(product), common);
    return r.ok ? { ok: true, estimate: toPublicEstimate(r.estimate) } : r;
  }
  return { ok: false, errors: { _form: "Unknown estimator" } };
}

/** Human-readable configuration summary for quote requests (server-validated input only). */
export async function summarizeConfiguration(
  kind: "keychain" | "organizer" | "product",
  input: unknown,
  productSlug?: string,
): Promise<{ title: string; summary: QuoteSummaryLine[]; quantity: number; productId?: string } | null> {
  const common = await getSetting("estimator.common");
  const colorName = (k: string) => common.colors.find((c) => c.key === k)?.label ?? k;
  const materialName = (k: string) => common.materials.find((m) => m.key === k)?.label ?? k;

  if (kind === "keychain") {
    const cfg = await getSetting("estimator.keychain");
    const parsed = keychainInputSchema(cfg, common).safeParse(input);
    if (!parsed.success) return null;
    const v: KeychainInput = parsed.data;
    const type = cfg.types.find((t) => t.key === v.type);
    return {
      title: `Custom keychain — ${type?.label ?? v.type}`,
      quantity: v.quantity,
      summary: [
        ...(v.text ? [{ label: "Text", value: v.text }] : []),
        { label: "Size", value: `${v.width} × ${v.height} × ${v.thickness} mm` },
        { label: "Colours", value: v.palette.length ? v.palette.map(colorName).join(", ") : String(v.colors) },
        { label: "Material", value: materialName(v.material) },
        { label: "Ring", value: cfg.hardware.find((h) => h.key === v.hardware)?.label ?? v.hardware },
        { label: "Sides", value: v.doubleSided ? "Double-sided" : "Single-sided" },
        { label: "Design help", value: v.designAssistance ? "Yes" : "No" },
        { label: "Rush", value: v.rush ? "Yes" : "No" },
      ],
    };
  }
  if (kind === "organizer") {
    const cfg = await getSetting("estimator.organizer");
    const parsed = organizerInputSchema(cfg, common).safeParse(input);
    if (!parsed.success) return null;
    const v: OrganizerInput = parsed.data;
    const preset = cfg.presets.find((p) => p.key === v.preset);
    const features = [
      v.penHolders ? `${v.penHolders} pen holder(s)` : "",
      v.phoneStand ? "phone stand" : "",
      v.drawers ? `${v.drawers} drawer(s)` : "",
      v.cableManagement ? "cable management" : "",
    ].filter(Boolean);
    return {
      title: `Desk organizer — ${preset ? `based on "${preset.name}"` : "custom"}`,
      quantity: v.quantity,
      summary: [
        { label: "Size", value: `${v.width} × ${v.length} × ${v.height} mm (W × L × H)` },
        { label: "Compartments", value: String(v.compartments) },
        { label: "Features", value: features.length ? features.join(", ") : "None" },
        { label: "Material", value: materialName(v.material) },
        { label: "Colours", value: v.palette.length ? v.palette.map(colorName).join(", ") : String(v.colors) },
        { label: "Customisation", value: v.customization === "text" ? `Text: ${v.customText}` : v.customization === "logo" ? "Logo" : "None" },
        { label: "Design help", value: v.designAssistance ? "Yes" : "No" },
      ],
    };
  }
  if (kind === "product" && productSlug) {
    const row = await db.product.findFirst({ where: { slug: productSlug, published: true }, include: { category: true } });
    if (!row) return null;
    const p = toPublicProduct(row);
    const sel = input as { size?: string; material?: string; color?: string; personalization?: Record<string, string>; quantity?: number };
    const summary: QuoteSummaryLine[] = [];
    const size = p.sizeOptions.find((s) => s.key === sel.size);
    if (size) summary.push({ label: "Size", value: `${size.label}${size.dimensions ? ` (${size.dimensions})` : ""}` });
    const mat = p.materialOptions.find((m) => m.key === sel.material);
    if (mat) summary.push({ label: "Material", value: mat.label });
    if (sel.color) summary.push({ label: "Colour", value: sel.color });
    for (const f of p.personalization) {
      const val = sel.personalization?.[f.key];
      if (val) summary.push({ label: f.label, value: val });
    }
    return { title: p.name, summary, quantity: Number(sel.quantity) || 1, productId: row.id };
  }
  return null;
}

export function describeEstimate(e: PublicEstimate): string {
  return e.low === e.high ? formatBDT(e.total) : `${formatBDT(e.low)} – ${formatBDT(e.high)}`;
}
