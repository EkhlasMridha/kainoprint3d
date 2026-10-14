/* eslint-disable no-console */
import { PrismaClient, type Prisma } from "@prisma/client";
import { DEFAULT_COSTING_SETTINGS, defaultJobInput } from "../src/domain/costing/defaults";
import { evaluateJob, storageColumns, type ChosenTier } from "../src/domain/costing/record";
import type { JobInput } from "../src/domain/costing/types";
import { DEFAULT_ESTIMATOR_COMMON, DEFAULT_KEYCHAIN_CONFIG, DEFAULT_ORGANIZER_CONFIG } from "../src/domain/estimator/defaults";
import { DEFAULT_BUSINESS, DEFAULT_LANDING } from "../src/domain/site";
import { hashPassword } from "../src/server/auth/password";
import { toMaterialProfile, toPrinterProfile } from "../src/server/profiles";
import { SAMPLE_CATEGORIES, SAMPLE_MATERIALS, SAMPLE_PRINTERS, SAMPLE_PRODUCTS } from "./seed-data";

const db = new PrismaClient();
const json = (v: unknown) => v as Prisma.InputJsonValue;

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "owner@kainoprint3d.com").toLowerCase().trim();
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") throw new Error("ADMIN_PASSWORD must be set to seed a production database.");
    password = "change-me-please-123";
    console.warn(`⚠ ADMIN_PASSWORD not set — using the development default. Change it before going live.`);
  }
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Admin ${email} already exists (password unchanged).`);
    return;
  }
  await db.adminUser.create({ data: { email, name: process.env.ADMIN_NAME || "Kaino Owner", passwordHash: await hashPassword(password) } });
  console.log(`✓ Admin user created: ${email}`);
}

async function seedSettings() {
  const defaults: Record<string, unknown> = {
    business: DEFAULT_BUSINESS,
    landing: DEFAULT_LANDING,
    costing: DEFAULT_COSTING_SETTINGS,
    "estimator.common": DEFAULT_ESTIMATOR_COMMON,
    "estimator.keychain": DEFAULT_KEYCHAIN_CONFIG,
    "estimator.organizer": DEFAULT_ORGANIZER_CONFIG,
  };
  for (const [key, value] of Object.entries(defaults)) {
    // Create only — never overwrite settings the owner has already edited.
    await db.setting.upsert({ where: { key }, create: { key, value: json(value) }, update: {} });
  }
  console.log("✓ Settings ensured");
}

async function seedCatalog() {
  if ((await db.product.count()) > 0) {
    console.log("• Products already present — skipping catalog seed.");
    return;
  }
  const categories = new Map<string, string>();
  for (const c of SAMPLE_CATEGORIES) {
    const row = await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
    categories.set(c.slug, row.id);
  }
  for (const p of SAMPLE_PRODUCTS) {
    const { category, sizeOptions, materialOptions, colors, personalization, images, ...rest } = p;
    await db.product.create({
      data: {
        ...rest,
        categoryId: categories.get(category)!,
        sizeOptions: json(sizeOptions),
        materialOptions: json(materialOptions),
        colors: json(colors),
        personalization: json(personalization),
        images: json(images),
        isSample: true,
      },
    });
  }
  console.log(`✓ ${SAMPLE_PRODUCTS.length} sample products in ${SAMPLE_CATEGORIES.length} categories`);
}

async function seedEquipment() {
  if ((await db.printer.count()) === 0) {
    for (const p of SAMPLE_PRINTERS) await db.printer.create({ data: p });
    console.log(`✓ ${SAMPLE_PRINTERS.length} printers`);
  }
  if ((await db.material.count()) === 0) {
    for (const m of SAMPLE_MATERIALS) await db.material.create({ data: m });
    console.log(`✓ ${SAMPLE_MATERIALS.length} materials`);
  }
}

interface SampleCalc {
  product: string;
  printer: string;
  material: string;
  monthly: number;
  daysAgo: number;
  tier?: ChosenTier;
  customPrice?: number;
  job: (j: JobInput) => JobInput;
}

const SAMPLE_CALCS: SampleCalc[] = [
  {
    product: "classic-name-keychain",
    printer: "Bambu Lab A1 mini",
    material: "PLA+ Black",
    monthly: 120,
    daysAgo: 3,
    tier: "custom",
    customPrice: 150_00,
    job: (j) => ({
      ...j,
      name: "Classic Name Keychain — plate of 10",
      quantity: 20,
      itemsPerPlate: 10,
      printHoursPerPlate: 1.6,
      material: { ...j.material, mode: "slicer_total", slicerTotalGrams: 48 },
      labor: { perPlate: { setup: 5, removal: 3 }, perItem: { postProcessing: 1, assembly: 0.5, inspection: 0.5, packaging: 1.5 }, perBatch: { modelPrep: 10, communication: 10 } },
      direct: { packagingPerItem: 8_00, hardwarePerItem: 6_00, otherPerBatch: 0 },
      premium: { personalized: true, rush: false, extraServiceFee: 0 },
    }),
  },
  {
    product: "heart-name-locket",
    printer: "Bambu Lab P1S",
    material: "Silk PLA Gold",
    monthly: 30,
    daysAgo: 9,
    tier: "custom",
    customPrice: 280_00,
    job: (j) => ({
      ...j,
      name: "Heart Name Locket — batch of 5",
      quantity: 5,
      itemsPerPlate: 5,
      printHoursPerPlate: 2.2,
      material: { ...j.material, mode: "components", modelGrams: 26, supportGrams: 0, purgeGrams: 4, slicerTotalGrams: 0 },
      labor: { perPlate: { setup: 6, removal: 3 }, perItem: { postProcessing: 3, assembly: 1, inspection: 1, packaging: 2 }, perBatch: { modelPrep: 10, communication: 10 } },
      direct: { packagingPerItem: 15_00, hardwarePerItem: 40_00, otherPerBatch: 0 },
      premium: { personalized: true, rush: false, extraServiceFee: 0 },
    }),
  },
  {
    product: "minimal-desk-tray",
    printer: "Bambu Lab P1S",
    material: "PLA Basic White",
    monthly: 15,
    daysAgo: 16,
    tier: "custom",
    customPrice: 750_00,
    job: (j) => ({
      ...j,
      name: "Minimal Desk Tray — single",
      quantity: 1,
      itemsPerPlate: 1,
      printHoursPerPlate: 6.5,
      material: { ...j.material, mode: "slicer_total", slicerTotalGrams: 165 },
      labor: { perPlate: { setup: 5, removal: 2 }, perItem: { postProcessing: 5, assembly: 0, inspection: 2, packaging: 4 }, perBatch: { modelPrep: 5, communication: 5 } },
      direct: { packagingPerItem: 25_00, hardwarePerItem: 0, otherPerBatch: 0 },
    }),
  },
  {
    product: "phone-stand-organizer",
    printer: "Bambu Lab P1S",
    material: "PLA+ Black",
    monthly: 10,
    daysAgo: 24,
    tier: "custom",
    customPrice: 1_150_00,
    job: (j) => ({
      ...j,
      name: "Phone Stand Organizer — single",
      quantity: 1,
      itemsPerPlate: 1,
      printHoursPerPlate: 9,
      material: { ...j.material, mode: "slicer_total", slicerTotalGrams: 240 },
      labor: { perPlate: { setup: 5, removal: 3 }, perItem: { postProcessing: 10, assembly: 0, inspection: 3, packaging: 5 }, perBatch: { modelPrep: 5, communication: 10 } },
      direct: { packagingPerItem: 35_00, hardwarePerItem: 0, otherPerBatch: 0 },
    }),
  },
  {
    product: "cable-clip-set",
    printer: "Creality Ender-3 V3 SE",
    material: "PETG Grey",
    monthly: 25,
    daysAgo: 35,
    tier: "custom",
    customPrice: 180_00,
    job: (j) => ({
      ...j,
      name: "Cable Clip Set — 6 clips per set",
      quantity: 4,
      itemsPerPlate: 2,
      printHoursPerPlate: 2.4,
      material: { ...j.material, mode: "slicer_total", slicerTotalGrams: 56 },
      labor: { perPlate: { setup: 5, removal: 3 }, perItem: { postProcessing: 3, assembly: 2, inspection: 1, packaging: 2 }, perBatch: { modelPrep: 0, communication: 5 } },
      direct: { packagingPerItem: 8_00, hardwarePerItem: 20_00, otherPerBatch: 0 },
    }),
  },
  {
    product: "hexagon-pen-cup",
    printer: "Creality Ender-3 V3 SE",
    material: "PETG Grey",
    monthly: 12,
    daysAgo: 52,
    tier: "standard",
    job: (j) => ({
      ...j,
      name: "Hexagon Pen Cup — single",
      quantity: 1,
      itemsPerPlate: 1,
      printHoursPerPlate: 4.2,
      material: { ...j.material, mode: "slicer_total", slicerTotalGrams: 95 },
      labor: { perPlate: { setup: 5, removal: 2 }, perItem: { postProcessing: 3, assembly: 0, inspection: 1, packaging: 3 }, perBatch: { modelPrep: 0, communication: 5 } },
      direct: { packagingPerItem: 15_00, hardwarePerItem: 0, otherPerBatch: 0 },
    }),
  },
];

async function seedCalculations() {
  if ((await db.costCalculation.count()) > 0) {
    console.log("• Cost calculations already present — skipping.");
    return;
  }
  const settings = DEFAULT_COSTING_SETTINGS;
  for (const s of SAMPLE_CALCS) {
    const [product, printer, material] = await Promise.all([
      db.product.findUnique({ where: { slug: s.product } }),
      db.printer.findFirst({ where: { name: s.printer } }),
      db.material.findFirst({ where: { name: s.material } }),
    ]);
    if (!printer || !material) continue;
    const job = s.job(defaultJobInput(settings));
    const ctx = { printer: toPrinterProfile(printer), material: toMaterialProfile(material), settings };
    const ev = evaluateJob(job, ctx, s.tier ?? "standard", s.customPrice);
    const createdAt = new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000);
    await db.costCalculation.create({
      data: {
        name: job.name,
        productId: product?.id,
        printerId: printer.id,
        materialId: material.id,
        input: json(job),
        snapshot: json(ctx),
        result: json({ cost: ev.cost, pricing: ev.pricing, check: ev.check }),
        expectedMonthlyUnits: s.monthly,
        notes: "Sample calculation created by the seed script.",
        createdAt,
        ...storageColumns(job, ev),
        components: {
          create: ev.cost.lines.map((l, i) => ({ key: l.key, label: l.label, amount: l.amount, formula: l.formula, sortOrder: i })),
        },
      },
    });
  }
  console.log(`✓ ${SAMPLE_CALCS.length} sample cost calculations`);
}

async function main() {
  await seedAdmin();
  await seedSettings();
  await seedEquipment();
  await seedCatalog();
  await seedCalculations();
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
