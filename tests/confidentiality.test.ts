import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_ESTIMATOR_COMMON as common, DEFAULT_KEYCHAIN_CONFIG as kc, DEFAULT_ORGANIZER_CONFIG as oc } from "@/domain/estimator/defaults";
import { estimateKeychain } from "@/domain/estimator/keychain";
import { estimateOrganizer } from "@/domain/estimator/organizer";
import { toPublicCommon, toPublicEstimate, toPublicKeychain, toPublicOrganizer } from "@/domain/estimator/public";
import { toPublicProduct } from "@/server/mappers";

/**
 * Private business data must never reach the browser: not in public API responses, not in
 * props passed to client components, and not via client code importing private modules.
 */

const FORBIDDEN_KEYS = [
  "floor",
  "perGram",
  "perHour",
  "perUnit",
  "minUnitPrice",
  "basePrice", // estimator base prices are only exposed as computed line items
  "fillFactor",
  "density",
  "surchargePct",
  "solidityFactor",
  "pricePerExtraGram",
  "pricePerGram",
  "pricePerPrintHour",
  "gramsPerHour",
  "geometry",
  "price",
  "purchasePrice",
  "laborRatePerHour",
  "targetMargin",
];

function collectKeys(value: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, acc));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      acc.add(k);
      collectKeys(v, acc);
    }
  }
  return acc;
}

const expectNoForbidden = (value: unknown) => {
  const keys = collectKeys(value);
  expect(FORBIDDEN_KEYS.filter((k) => keys.has(k))).toEqual([]);
};

describe("public estimator data contains no private parameters", () => {
  it("public option projections", () => {
    expectNoForbidden(toPublicCommon(common));
    expectNoForbidden(toPublicKeychain(kc));
    expectNoForbidden(toPublicOrganizer(oc));
  });

  it("public estimate responses (whitelisted fields only)", () => {
    const k = estimateKeychain({ type: "text", text: "Rafi", width: 50, height: 20, thickness: 4, colors: 1, material: "pla", hardware: "split_ring", doubleSided: false, quantity: 200, designAssistance: false, rush: false }, kc, common);
    const o = estimateOrganizer({ width: 160, length: 100, height: 50, compartments: 3, penHolders: 0, phoneStand: false, drawers: 0, cableManagement: false, material: "pla", colors: 1, quantity: 50, customization: "none", designAssistance: false }, oc, common);
    if (!k.ok || !o.ok) throw new Error("expected ok");
    for (const e of [k.estimate, o.estimate]) {
      const pub = toPublicEstimate(e);
      expectNoForbidden(pub);
      expect(Object.keys(pub).sort()).toEqual(["approxGrams", "high", "leadTimeDays", "lines", "low", "needsReview", "notes", "quantity", "total", "unitPrice"]);
    }
  });

  it("public product mapping omits the private minimum unit price", () => {
    const now = new Date();
    const pub = toPublicProduct({
      id: "p1",
      slug: "x",
      name: "X",
      categoryId: "c1",
      category: { id: "c1", slug: "keychains", name: "Keychains", description: "", sortOrder: 0 },
      shortDescription: "",
      description: "",
      material: "PLA",
      dimensions: "",
      basePrice: 15000,
      minUnitPrice: 9500,
      sizeOptions: [],
      materialOptions: [],
      colors: [],
      personalization: [],
      images: [],
      leadTimeMinDays: 1,
      leadTimeMaxDays: 2,
      availability: "made_to_order",
      allowQuantityDiscount: true,
      maxQuantity: 10,
      featured: false,
      published: true,
      isSample: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
    expect("minUnitPrice" in pub).toBe(false);
    expect(JSON.stringify(pub)).not.toContain("9500");
  });
});

/* ------------------------------------------------------------------ Static import boundary */

const SRC = path.resolve(__dirname, "../src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

const files = walk(SRC).map((p) => ({ p: path.relative(SRC, p).replace(/\\/g, "/"), src: readFileSync(p, "utf8") }));
const isClient = (src: string) => /^\s*["']use client["']/.test(src);
const valueImports = (src: string) =>
  [...src.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]!);

describe("client bundle boundary", () => {
  const clientFiles = files.filter((f) => isClient(f.src));

  it("finds the client components", () => {
    expect(clientFiles.length).toBeGreaterThan(10);
  });

  it("client components never import server modules other than server actions", () => {
    const offenders = clientFiles.flatMap((f) =>
      valueImports(f.src)
        .filter((m) => m.startsWith("@/server/") && !m.startsWith("@/server/actions/"))
        .map((m) => `${f.p} → ${m}`),
    );
    expect(offenders).toEqual([]);
  });

  it("public client components never import private estimator pricing logic or defaults", () => {
    const privateModules = ["@/domain/estimator/keychain", "@/domain/estimator/organizer", "@/domain/estimator/catalog", "@/domain/estimator/quantity", "@/domain/estimator/defaults", "@/domain/costing/defaults"];
    const publicClient = clientFiles.filter((f) => f.p.startsWith("components/site/") || f.p.startsWith("components/estimate/") || f.p.startsWith("app/(site)/"));
    const offenders = publicClient.flatMap((f) => valueImports(f.src).filter((m) => privateModules.includes(m)).map((m) => `${f.p} → ${m}`));
    expect(offenders).toEqual([]);
  });

  it("server modules that read private data are marked server-only", () => {
    for (const name of ["server/db.ts", "server/settings.ts", "server/estimates.ts", "server/mappers.ts", "server/quotes.ts", "server/storage.ts", "server/auth/session.ts", "server/calculator-data.ts", "server/dashboard.ts"]) {
      const f = files.find((x) => x.p === name);
      expect(f, name).toBeDefined();
      expect(f!.src, name).toMatch(/import ["']server-only["']/);
    }
  });

  it("every admin page and admin API route checks authorisation on the server", () => {
    const adminFiles = files.filter((f) => /^app\/admin\/\(panel\)\/.*page\.tsx$/.test(f.p) || /^app\/api\/admin\/.*route\.ts$/.test(f.p));
    expect(adminFiles.length).toBeGreaterThan(15);
    const missing = adminFiles.filter((f) => !/requireAdmin\(\)|adminOrNull\(\)/.test(f.src)).map((f) => f.p);
    expect(missing).toEqual([]);
  });

  it("every server action checks authorisation (except login)", () => {
    const actionFiles = files.filter((f) => f.p.startsWith("server/actions/") && f.p !== "server/actions/auth.ts");
    for (const f of actionFiles) {
      const exported = [...f.src.matchAll(/export async function (\w+)\s*\(/g)].map((m) => m[1]!);
      for (const fn of exported) {
        const body = f.src.slice(f.src.indexOf(`export async function ${fn}`));
        const next = body.indexOf("\nexport ", 10);
        expect(body.slice(0, next === -1 ? undefined : next), `${f.p}#${fn}`).toMatch(/await requireAdmin\(\)/);
      }
    }
  });
});
