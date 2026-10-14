import { takaToPoisha } from "@/domain/money";

/** Helpers for reading admin FormData. Admin forms enter money in taka and rates in percent. */

export const fdStr = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

/** Number or NaN (so Zod reports "must be a number" instead of silently using 0). */
export const fdNum = (fd: FormData, key: string): number => {
  const s = fdStr(fd, key).replace(/,/g, "");
  return s === "" ? Number.NaN : Number(s);
};

export const fdNumOr = (fd: FormData, key: string, fallback: number): number => {
  const n = fdNum(fd, key);
  return Number.isNaN(n) ? fallback : n;
};

/** Taka (as typed) → integer poisha. Empty → NaN. */
export const fdTaka = (fd: FormData, key: string): number => {
  const n = fdNum(fd, key);
  return Number.isFinite(n) ? takaToPoisha(n) : Number.NaN;
};

export const fdTakaOr = (fd: FormData, key: string, fallback = 0): number => {
  const n = fdNum(fd, key);
  return Number.isFinite(n) ? takaToPoisha(n) : fallback;
};

/** Percent (e.g. 5 for 5%) → fraction. */
export const fdPct = (fd: FormData, key: string): number => {
  const n = fdNum(fd, key);
  return Number.isFinite(n) ? n / 100 : Number.NaN;
};

export const fdBool = (fd: FormData, key: string): boolean => {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
};

export function fdJson<T = unknown>(fd: FormData, key: string): T | undefined {
  const s = fdStr(fd, key);
  if (!s) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false };
