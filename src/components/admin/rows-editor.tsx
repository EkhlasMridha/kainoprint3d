"use client";

import { useState } from "react";
import { cn } from "../ui/cn";
import { Input, Select } from "../ui/field";

export type Row = Record<string, string | number | boolean>;

export interface Column {
  key: string;
  label: string;
  type: "text" | "number" | "checkbox" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  width?: string;
  step?: string;
}

/**
 * Editable list of rows serialised into a hidden JSON input named `name`.
 * Values stay in display units (taka, percent); the server action converts and validates them.
 */
export function RowsEditor({
  name,
  columns,
  initial,
  blank,
  addLabel = "Add row",
  error,
  maxRows = 50,
}: {
  name: string;
  columns: Column[];
  initial: Row[];
  blank: Row;
  addLabel?: string;
  error?: string;
  maxRows?: number;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const set = (i: number, key: string, value: string | number | boolean) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const next = r.slice();
      const t = next[i + d];
      if (!t) return r;
      next[i + d] = next[i]!;
      next[i] = t;
      return next;
    });

  return (
    <div className="min-w-0">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-paper text-left text-xs text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2 font-medium" style={{ width: c.width }}>
                  {c.label}
                  {c.unit ? <span className="text-subtle"> ({c.unit})</span> : null}
                </th>
              ))}
              <th className="w-20" aria-label="Row actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 align-middle">
                    {c.type === "checkbox" ? (
                      <input type="checkbox" aria-label={`${c.label} (row ${i + 1})`} className="size-4 accent-ink" checked={!!row[c.key]} onChange={(e) => set(i, c.key, e.target.checked)} />
                    ) : c.type === "select" ? (
                      <Select aria-label={`${c.label} (row ${i + 1})`} value={String(row[c.key] ?? "")} onChange={(e) => set(i, c.key, e.target.value)} className="py-1.5">
                        {c.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        aria-label={`${c.label} (row ${i + 1})`}
                        type={c.type === "number" ? "number" : "text"}
                        step={c.step ?? "any"}
                        placeholder={c.placeholder}
                        value={String(row[c.key] ?? "")}
                        onChange={(e) => set(i, c.key, c.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                        className={cn("py-1.5", c.type === "number" && "num")}
                      />
                    )}
                  </td>
                ))}
                <td className="px-1 py-1.5 text-right whitespace-nowrap">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-1 text-muted hover:bg-panel disabled:opacity-30" aria-label={`Move row ${i + 1} up`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded px-1.5 py-1 text-muted hover:bg-panel disabled:opacity-30" aria-label={`Move row ${i + 1} down`}>
                    ↓
                  </button>
                  <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="rounded px-1.5 py-1 text-loss hover:bg-loss-bg" aria-label={`Remove row ${i + 1}`}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-xs text-muted">
                  Nothing added yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => setRows((r) => [...r, { ...blank }])} disabled={rows.length >= maxRows} className="text-sm font-medium hover:underline disabled:opacity-40">
          + {addLabel}
        </button>
        {error ? <p className="text-xs font-medium text-loss">{error}</p> : null}
      </div>
    </div>
  );
}
