/** Minimal RFC 4180 CSV writer with spreadsheet formula-injection protection. */

export type CsvCell = string | number | boolean | null | undefined;

export function csvCell(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = String(v);
  // Cells starting with these characters can be executed as formulas by spreadsheet apps.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: CsvCell[][]): string {
  // BOM so Excel opens UTF-8 (৳, ×) correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Poisha → taka with 2 decimals, as a number for spreadsheets. */
export const takaCell = (poisha: number | null | undefined) => (poisha === null || poisha === undefined ? null : Math.round(poisha) / 100);
