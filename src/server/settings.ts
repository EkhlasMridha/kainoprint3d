import "server-only";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";
import { DEFAULT_COSTING_SETTINGS } from "@/domain/costing/defaults";
import { costingSettingsSchema } from "@/domain/costing/schemas";
import type { CostingSettings } from "@/domain/costing/types";
import { DEFAULT_ESTIMATOR_COMMON, DEFAULT_KEYCHAIN_CONFIG, DEFAULT_ORGANIZER_CONFIG } from "@/domain/estimator/defaults";
import { estimatorCommonSchema, keychainConfigSchema, organizerConfigSchema } from "@/domain/estimator/schemas";
import type { EstimatorCommonConfig, KeychainConfig, OrganizerConfig } from "@/domain/estimator/types";
import { DEFAULT_BUSINESS, DEFAULT_LANDING, businessSchema, landingSchema, type BusinessInfo, type LandingContent } from "@/domain/site";
import { db } from "./db";

interface SettingDef<T> {
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  fallback: T;
}

export const SETTINGS = {
  business: { schema: businessSchema, fallback: DEFAULT_BUSINESS } as SettingDef<BusinessInfo>,
  landing: { schema: landingSchema, fallback: DEFAULT_LANDING } as SettingDef<LandingContent>,
  costing: { schema: costingSettingsSchema, fallback: DEFAULT_COSTING_SETTINGS } as SettingDef<CostingSettings>,
  "estimator.common": { schema: estimatorCommonSchema, fallback: DEFAULT_ESTIMATOR_COMMON } as SettingDef<EstimatorCommonConfig>,
  "estimator.keychain": { schema: keychainConfigSchema, fallback: DEFAULT_KEYCHAIN_CONFIG } as SettingDef<KeychainConfig>,
  "estimator.organizer": { schema: organizerConfigSchema, fallback: DEFAULT_ORGANIZER_CONFIG } as SettingDef<OrganizerConfig>,
};

export type SettingKey = keyof typeof SETTINGS;
type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]["fallback"];

/** Read a setting, validated against its schema. Falls back to defaults if missing or invalid. */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const def = SETTINGS[key] as SettingDef<SettingValue<K>>;
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return def.fallback;
  const parsed = def.schema.safeParse(row.value);
  if (!parsed.success) {
    console.error(`[settings] Stored value for "${key}" is invalid; using defaults.`, parsed.error.issues.slice(0, 3));
    return def.fallback;
  }
  return parsed.data;
}

/** Validate and persist a setting. Throws a ZodError for invalid input. */
export async function saveSetting<K extends SettingKey>(key: K, value: unknown): Promise<SettingValue<K>> {
  const def = SETTINGS[key] as SettingDef<SettingValue<K>>;
  const parsed = def.schema.parse(value);
  const json = parsed as unknown as Prisma.InputJsonValue;
  await db.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
  return parsed;
}
